import type { MetadataRoute } from "next";

const BASE = process.env.APP_BASE_URL ?? "https://crm.callcaitlyn.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/book", "/listing", "/checkin/", "/confirm/", "/n/"],
      disallow: ["/api/", "/contacts", "/messages", "/pipeline", "/settings", "/dialer", "/insights", "/notes", "/listings", "/commissions", "/sequences", "/events", "/reports", "/sphere", "/recruiting", "/numbers", "/scheduling"],
    },
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
