import type { Contractor } from "../data/normalizeContractor";
import type { RecommendationRequest } from "../validation/recommendationSchema";
import { localSemantic } from "./localSemantic";
import type { DecisionObjective, DecisionStrategy } from "./types";

const BASIS_POINTS = 10_000;
const SHORTLIST_LIMIT = 3;
type DecisionRole = "PREFERENCE" | "BUDGET" | "ALTERNATIVE" | null;

export interface ObjectiveVector {
  id: string;
  price: number;
  budgetEfficiencyBps: number;
  preferenceFitBps?: number;
}
export interface ParetoRankedVector extends ObjectiveVector { paretoRank: number }
export interface FrontierCandidate extends ParetoRankedVector {
  contractor: Contractor;
  role: DecisionRole;
  crowdingDistance?: number;
}
export interface DecisionFrontier {
  strategy: DecisionStrategy;
  activeObjectives: DecisionObjective[];
  selected: FrontierCandidate[];
}

const stableOrder = <T extends { price: number; id: string }>(a: T, b: T) => a.price - b.price || compareId(a.id, b.id);
function compareId(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0; }
function objectiveValue(vector: ObjectiveVector, objective: DecisionObjective): number {
  return objective === "budgetEfficiency" ? vector.budgetEfficiencyBps : vector.preferenceFitBps ?? 0;
}

export function dominates(a: ObjectiveVector, b: ObjectiveVector, objectives: DecisionObjective[]): boolean {
  let strictlyBetter = false;
  for (const objective of objectives) {
    const left = objectiveValue(a, objective);
    const right = objectiveValue(b, objective);
    if (left < right) return false;
    if (left > right) strictlyBetter = true;
  }
  return strictlyBetter;
}

export function nonDominatedSort<T extends ObjectiveVector>(candidates: T[], objectives: DecisionObjective[]): Array<Array<T & { paretoRank: number }>> {
  let remaining = [...candidates].sort(stableOrder);
  const fronts: Array<Array<T & { paretoRank: number }>> = [];
  let rank = 1;
  while (remaining.length) {
    const front = remaining.filter(candidate => !remaining.some(other => other !== candidate && dominates(other, candidate, objectives)));
    // Equal objective vectors are mutually non-dominating, so this is a safe guard for malformed input.
    if (!front.length) break;
    const frontIds = new Set(front.map(candidate => candidate.id));
    fronts.push(front.map(candidate => ({ ...candidate, paretoRank: rank })));
    remaining = remaining.filter(candidate => !frontIds.has(candidate.id));
    rank++;
  }
  return fronts;
}

export function crowdingDistances<T extends ObjectiveVector>(front: T[], objectives: DecisionObjective[]): Map<string, number> {
  const distances = new Map(front.map(candidate => [candidate.id, 0]));
  if (front.length < 2) return distances;
  for (const objective of objectives) {
    const groups = new Map<number, T[]>();
    for (const candidate of front) {
      const value = objectiveValue(candidate, objective);
      groups.set(value, [...(groups.get(value) ?? []), candidate]);
    }
    const values = [...groups.keys()].sort((a, b) => a - b);
    if (values.length < 2) continue;
    const minimum = values[0];
    const maximum = values[values.length - 1];
    for (const candidate of [...groups.get(minimum)!, ...groups.get(maximum)!]) distances.set(candidate.id, Number.POSITIVE_INFINITY);
    const range = maximum - minimum;
    for (let index = 1; index < values.length - 1; index++) {
      const groupDistance = Math.round(((values[index + 1] - values[index - 1]) / range) * BASIS_POINTS);
      for (const candidate of groups.get(values[index])!) {
        const current = distances.get(candidate.id)!;
        if (Number.isFinite(current)) distances.set(candidate.id, current + groupDistance);
      }
    }
  }
  return distances;
}

function roleOrder(role: DecisionRole): number {
  return role === "PREFERENCE" ? 0 : role === "BUDGET" ? 1 : role === "ALTERNATIVE" ? 2 : 3;
}

function assignRoles(selected: FrontierCandidate[], hasPreference: boolean): void {
  if (!selected.length) return;
  const byPreference = (a: FrontierCandidate, b: FrontierCandidate) => (b.preferenceFitBps ?? 0) - (a.preferenceFitBps ?? 0) || stableOrder(a, b);
  const preferenceAnchor = hasPreference ? [...selected].sort(byPreference)[0] : undefined;
  if (preferenceAnchor) preferenceAnchor.role = "PREFERENCE";
  const remaining = selected.filter(candidate => candidate !== preferenceAnchor);
  const budgetAnchor = [...remaining].sort((a, b) => b.budgetEfficiencyBps - a.budgetEfficiencyBps || byPreference(a, b))[0];
  if (budgetAnchor) budgetAnchor.role = "BUDGET";
  for (const candidate of remaining) {
    if (candidate !== budgetAnchor) candidate.role = hasPreference ? "ALTERNATIVE" : null;
  }
}

function selectionOrder(a: FrontierCandidate, b: FrontierCandidate): number {
  return a.paretoRank - b.paretoRank || roleOrder(a.role) - roleOrder(b.role) || stableOrder(a, b);
}

export function selectDecisionFrontier(profiles: Contractor[], request: RecommendationRequest, limit = SHORTLIST_LIMIT): DecisionFrontier {
  const hasPreference = Boolean(request.preference?.trim());
  const activeObjectives: DecisionObjective[] = hasPreference ? ["budgetEfficiency", "preferenceFit"] : ["budgetEfficiency"];
  const strategy: DecisionStrategy = hasPreference ? "PARETO" : "SINGLE_OBJECTIVE";
  if (!profiles.length || limit <= 0) return { strategy, activeObjectives, selected: [] };

  const prices = profiles.map(profile => profile.price_from_kzt);
  const lowestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices);
  const priceRange = highestPrice - lowestPrice;
  const vectors = profiles.map(contractor => ({
    id: contractor.id,
    price: contractor.price_from_kzt,
    contractor,
    budgetEfficiencyBps: priceRange === 0 ? BASIS_POINTS : Math.round(((highestPrice - contractor.price_from_kzt) / priceRange) * BASIS_POINTS),
    ...(hasPreference ? { preferenceFitBps: Math.round(localSemantic(request.preference, contractor.description).score * BASIS_POINTS) } : {}),
    role: null as DecisionRole,
  }));

  let selected: FrontierCandidate[] = [];
  if (strategy === "SINGLE_OBJECTIVE") {
    selected = [...vectors].sort((a, b) => b.budgetEfficiencyBps - a.budgetEfficiencyBps || stableOrder(a, b))
      .slice(0, Math.min(limit, SHORTLIST_LIMIT)).map(candidate => ({ ...candidate, paretoRank: 0 }));
  } else {
    const fronts = nonDominatedSort(vectors, activeObjectives);
    const target = Math.min(limit, SHORTLIST_LIMIT);
    for (const front of fronts) {
      const remaining = target - selected.length;
      if (front.length <= remaining) {
        selected.push(...front.map(candidate => ({ ...candidate })));
      } else {
        const distances = crowdingDistances(front, activeObjectives);
        const boundaryFirst = [...front].sort((a, b) => {
          const distance = distances.get(b.id)! - distances.get(a.id)!;
          return Number.isNaN(distance) || distance === 0 ? stableOrder(a, b) : distance;
        });
        selected.push(...boundaryFirst.slice(0, remaining).map(candidate => ({ ...candidate, crowdingDistance: distances.get(candidate.id) })));
        break;
      }
      if (selected.length === target) break;
    }
  }

  assignRoles(selected, hasPreference);
  selected.sort(selectionOrder);
  return { strategy, activeObjectives, selected };
}
