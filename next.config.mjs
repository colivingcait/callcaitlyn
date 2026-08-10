/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Without this, navigating to a page you already visited this session
  // (e.g. Commissions) can reuse a cached client-side render for up to 30s
  // even after data changed elsewhere (editing a deal on a contact page,
  // then clicking over to Commissions) - every route here reads live
  // financial/CRM data, so it should never show a stale number just because
  // you'd looked at that page recently.
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
};

export default nextConfig;
