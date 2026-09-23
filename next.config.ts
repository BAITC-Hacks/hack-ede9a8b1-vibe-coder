import type { NextConfig } from "next";
const config: NextConfig = {
  turbopack: { root: process.cwd() },
  outputFileTracingIncludes: { "/api/recommend": ["./data/contractors.csv", "./data/contractors.synthetic.csv"] },
};
export default config;
