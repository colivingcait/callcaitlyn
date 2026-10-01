/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Public listing and booking pages are also served on www.colivingcait.com.
  // Prefix Next's JS/CSS so they don't collide with that site's /_next.
  // Next 15 rewrites /crm-static/_next/* back to /_next/* on its own.
  assetPrefix: "/crm-static",
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
    // Unlock, offer, and booking server actions are posted from
    // www.colivingcait.com while this app runs them. Without these
    // origins Next rejects the request as a cross-origin action.
    serverActions: {
      allowedOrigins: ["www.colivingcait.com", "colivingcait.com"],
    },
  },
  async rewrites() {
    return {
      beforeFiles: [
        // Alias paths the marketing site proxies to. Kept off /listing and
        // /book so this host can later 301 those URLs without a loop.
        { source: "/public-listings", destination: "/listing" },
        { source: "/public-listings/:path*", destination: "/listing/:path*" },
        { source: "/public-book", destination: "/book" },
        { source: "/public-book/:path*", destination: "/book/:path*" },
      ],
    };
  },
  // Dynamic OG routes read these TTFs at request time. The path is built
  // with process.cwd(), which the file tracer does not follow on its own.
  outputFileTracingIncludes: {
    "/listing/**": ["./assets/fonts/**/*"],
  },
  async headers() {
    return [
      {
        // public/images/checkin/caitlyn.jpg is PNG bytes with a .jpg name.
        // Extension-based image/jpeg makes WebKit leave the <img> blank.
        source: "/images/checkin/caitlyn.jpg",
        headers: [{ key: "Content-Type", value: "image/png" }],
      },
    ];
  },
};

export default nextConfig;
