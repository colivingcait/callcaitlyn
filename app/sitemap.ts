import type { MetadataRoute } from "next";

const BASE = process.env.APP_BASE_URL ?? "https://crm.callcaitlyn.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/login`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/book`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/listing`, changeFrequency: "weekly", priority: 0.8 },
  ];
}
