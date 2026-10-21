import type { NextConfig } from "next";

/**
 * The frontend contains only the web pages. All data and sign-in calls (/api/*) are forwarded to the backend
 * service, so the browser keeps talking to one origin (cookies and the CSRF check keep working).
 * Set BACKEND_URL to the deployed backend (e.g. https://moveit-storage-api.example.com).
 */
const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:4000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
