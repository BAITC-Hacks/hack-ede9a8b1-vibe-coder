import type { NextConfig } from "next";
const config: NextConfig = {
  turbopack: { root: process.cwd() },
  outputFileTracingIncludes: { "/api/recommend": ["./data/contractors.csv"] },
};
export default config;
