import type { NextConfig } from "next";
const config: NextConfig = {
  outputFileTracingIncludes: { "/api/recommend": ["./data/contractors.csv"] },
};
export default config;
