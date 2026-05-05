import path from "node:path";
import { execSync } from "node:child_process";
import type { NextConfig } from "next";

// Use standalone output only for self-hosted / Docker deployments.
// Set NEXT_OUTPUT=standalone in the environment to enable it.
// Vercel handles its own output format and does not need this.
const isStandalone = process.env.NEXT_OUTPUT === "standalone";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "..", ".."),
  ...(isStandalone && { output: "standalone" }),
  generateBuildId: async () => {
    return execSync("git rev-parse HEAD").toString().trim();
  },
};

export default nextConfig;
