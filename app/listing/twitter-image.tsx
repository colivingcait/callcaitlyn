import { INDEX_ALT, renderIndexOgImage } from "@/lib/og/listing-og";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = INDEX_ALT;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderIndexOgImage();
}
