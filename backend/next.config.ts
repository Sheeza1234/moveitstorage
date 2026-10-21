import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optional: build/run into another folder (e.g. NEXT_DIST_DIR=.next-test) so a second copy never touches a running dev server's cache.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
