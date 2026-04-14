import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  typedRoutes: true,
  serverExternalPackages: ["@prisma/client", "pg"],
};

export default nextConfig;
