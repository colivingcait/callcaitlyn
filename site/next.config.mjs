import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This app lives in a subdirectory of a repo that also has its own
  // lockfile at the root (the separate CRM app) - without this, Next.js
  // guesses the repo root as the workspace root and resolves config
  // (like .eslintrc) from the wrong directory.
  outputFileTracingRoot: path.join(process.cwd()),
};

export default nextConfig;
