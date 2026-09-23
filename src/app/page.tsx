import { loadContractors, catalogOptions } from "@/lib/data/loadContractors";
import { RecommendationForm } from "@/components/RecommendationForm";
import Link from "next/link";
export default function Home() {
  const profiles = loadContractors();
  return <main className="shell">
    <header className="topbar"><Link className="brand" href="/"><span className="brand-icon">a</span> alem<span>match</span>·</Link><span className="catalog-label">● &nbsp; {profiles.length} профилей в каталоге</span></header>
    <section className="intro"><p className="eyebrow">ВАШЕ СОБЫТИЕ. ВАША КОМАНДА.</p><h1>Подходящие люди.<br /><span>Понятный выбор.</span></h1><p className="lead">До трёх подрядчиков для вашего события —<br /> с проверкой условий и объяснением каждого выбора.</p></section>
    <RecommendationForm options={catalogOptions(profiles)} />
    <footer>HackAlem 2026 <span>Условия проверяет код. AI помогает объяснить выбор.</span></footer>
  </main>;
}
