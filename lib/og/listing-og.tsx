import React from "react";
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadIndexOgFonts, loadOgFonts } from "@/lib/og/fonts";
import { OG_SIZE } from "@/lib/og/listing-metadata";
import { fitOgLocationLine, OG_PHOTO_PAD_X, ogPhotoContentWidth, ogPriceFontSize, type OgListingCard } from "@/lib/listings/og-card";
import { getIndexOgInteriorPhotoUrls } from "@/lib/listings/public-data";

const TERRACOTTA = "#A8462A";
const CREAM = "#F7F1E8";
const PEACH = "#F4CBB5";

const INDEX_ALT = "Available Listings | Caitlyn Verdugo, KW Metro Atlanta";
const PLAIN_PAD_X = 72;

async function photoDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 32 || bytes.length > 8_000_000) return null;
    const mime = imageMime(bytes, response.headers.get("content-type"));
    if (!mime) return null;
    return `data:${mime};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

function imageMime(bytes: Buffer, header: string | null): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  const declared = header?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (declared === "image/jpeg" || declared === "image/png") return declared;
  return null;
}

function agentLockup(nameSize: number, metaSize: number, metaGap: number) {
  return (
    <div style={{ display: "flex", flexDirection: "column", fontFamily: "Archivo", fontSize: nameSize, fontWeight: 600, color: CREAM }}>
      <div>Caitlyn Verdugo</div>
      <div style={{ fontWeight: 500, fontSize: metaSize, opacity: 0.8, marginTop: metaGap }}>Keller Williams Metro Atlanta</div>
    </div>
  );
}

const INK = "#1C1917";
const INDEX_CREAM = "#FAF7F2";
const GOLD = "#C4955A";
const INDEX_PLACEHOLDERS = ["#E7E1D8", "#DDD4C8"];

function indexPhotoSlot(src: string | null, index: number) {
  if (!src) {
    return <div style={{ flex: 1, background: INDEX_PLACEHOLDERS[index], display: "flex" }} />;
  }
  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" width={520} height={307} style={{ width: 520, height: 307, objectFit: "cover" }} />
    </div>
  );
}

function IndexCard({ photos, wordmark }: { photos: [string | null, string | null]; wordmark: string }) {
  return (
    <div style={{ width: 1200, height: 630, display: "flex", background: INDEX_CREAM, overflow: "hidden" }}>
      <div
        style={{
          width: 680,
          height: 630,
          background: INDEX_CREAM,
          color: INK,
          padding: "64px 56px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ width: 32, height: 1, background: GOLD, display: "flex" }} />
          <div
            style={{
              marginLeft: 12,
              fontFamily: "DM Sans",
              fontWeight: 300,
              fontSize: 10,
              letterSpacing: 2,
              color: GOLD,
              lineHeight: 1.4,
            }}
          >
            LISTINGS · ATLANTA METRO
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 28, fontFamily: "Cormorant Garamond", fontWeight: 400, fontSize: 92, lineHeight: 0.92, color: INK }}>
          <div>Available</div>
          <div style={{ fontStyle: "italic", fontWeight: 300, color: GOLD, lineHeight: 1 }}>listings</div>
        </div>
        <div style={{ display: "flex", flex: 1 }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={wordmark} alt="" width={250} height={52} style={{ width: 250, height: 52, objectFit: "contain", objectPosition: "left" }} />
      </div>
      <div style={{ width: 520, height: 630, background: INDEX_CREAM, display: "flex", flexDirection: "column" }}>
        {indexPhotoSlot(photos[0], 0)}
        <div style={{ height: 16, background: INDEX_CREAM, display: "flex" }} />
        {indexPhotoSlot(photos[1], 1)}
      </div>
    </div>
  );
}

function statusPill(label: string) {
  return (
    <div
      style={{
        display: "flex",
        alignSelf: "flex-start",
        background: CREAM,
        color: TERRACOTTA,
        padding: "10px 18px",
        borderRadius: 999,
        fontFamily: "Archivo",
        fontWeight: 600,
        fontSize: 20,
        letterSpacing: 1.6,
      }}
    >
      {label.toUpperCase()}
    </div>
  );
}

function ListingCopy({ card, contentWidth }: { card: OgListingCard; contentWidth: number }) {
  const kicker = fitOgLocationLine(card.locationLine, contentWidth);
  const priceSize = card.price ? ogPriceFontSize(card.price, contentWidth) : card.priceSize;
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div
        style={{
          fontFamily: "Archivo",
          fontWeight: 600,
          fontSize: kicker.fontSize,
          letterSpacing: kicker.letterSpacing,
          opacity: 0.85,
          lineHeight: 1.15,
          whiteSpace: "nowrap",
          color: CREAM,
        }}
      >
        {kicker.text}
      </div>
      {card.price ? (
        <div style={{ marginTop: 18, fontFamily: "Newsreader", fontWeight: 400, fontSize: priceSize, lineHeight: 1, whiteSpace: "nowrap", color: CREAM }}>{card.price}</div>
      ) : null}
      {card.specs ? (
        <div style={{ marginTop: 20, fontFamily: "Archivo", fontWeight: 600, fontSize: 30, color: CREAM }}>{card.specs}</div>
      ) : null}
      {card.hook ? (
        <div style={{ marginTop: 14, fontFamily: "Newsreader", fontStyle: "italic", fontWeight: 400, fontSize: 34, lineHeight: 1.15, color: PEACH }}>{card.hook}</div>
      ) : null}
      <div style={{ display: "flex", flex: 1 }} />
      {agentLockup(24, 20, 4)}
    </div>
  );
}

function ListingCard({ card, photo }: { card: OgListingCard; photo: string | null }) {
  if (!photo) {
    return (
      <div style={{ width: 1200, height: 630, display: "flex", background: TERRACOTTA, color: CREAM, padding: `60px ${PLAIN_PAD_X}px`, overflow: "hidden" }}>
        <div style={{ display: "flex", flexDirection: "column", width: 720, flex: 1 }}>
          {statusPill(card.statusLabel)}
          <div style={{ height: 28, display: "flex" }} />
          <ListingCopy card={card} contentWidth={OG_SIZE.width - PLAIN_PAD_X * 2} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: 1200, height: 630, display: "flex", overflow: "hidden", background: TERRACOTTA }}>
      <div style={{ width: 700, height: 630, display: "flex", position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt="" width={700} height={630} style={{ width: 700, height: 630, objectFit: "cover" }} />
        <div style={{ position: "absolute", top: 32, left: 32, display: "flex" }}>{statusPill(card.statusLabel)}</div>
      </div>
      <div style={{ width: 500, height: 630, background: TERRACOTTA, color: CREAM, padding: `60px ${OG_PHOTO_PAD_X}px`, display: "flex", flexDirection: "column" }}>
        <ListingCopy card={card} contentWidth={ogPhotoContentWidth()} />
      </div>
    </div>
  );
}

async function embeddedIndexOgPhotos(): Promise<[string | null, string | null]> {
  const urls = await getIndexOgInteriorPhotoUrls();
  const embedded = await Promise.all(urls.map((url) => (url ? photoDataUrl(url) : Promise.resolve(null))));
  return [embedded[0] ?? null, embedded[1] ?? null];
}

async function indexWordmarkDataUrl(): Promise<string> {
  const bytes = await readFile(path.join(process.cwd(), "assets/brand/colivingcait-wordmark.png"));
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

function indexImageResponse(
  photos: [string | null, string | null],
  wordmark: string,
  fonts: Awaited<ReturnType<typeof loadIndexOgFonts>>,
) {
  return new ImageResponse(<IndexCard photos={photos} wordmark={wordmark} />, {
    ...OG_SIZE,
    fonts,
  });
}

export async function renderIndexOgCardPng(photos: [string | null, string | null]): Promise<Buffer> {
  const [fonts, wordmark] = await Promise.all([loadIndexOgFonts(), indexWordmarkDataUrl()]);
  return Buffer.from(await indexImageResponse(photos, wordmark, fonts).arrayBuffer());
}

export async function renderIndexOgImage() {
  const photos = await embeddedIndexOgPhotos();
  try {
    const bytes = await renderIndexOgCardPng(photos);
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "image/png" } });
  } catch {
    const bytes = await renderIndexOgCardPng([null, null]);
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "image/png" } });
  }
}

function listingImage(card: OgListingCard, photo: string | null, fonts: Awaited<ReturnType<typeof loadOgFonts>>) {
  return new ImageResponse(<ListingCard card={card} photo={photo} />, {
    ...OG_SIZE,
    fonts,
  });
}

export async function renderListingCardPng(card: OgListingCard, photo: string | null): Promise<Buffer> {
  const fonts = await loadOgFonts();
  return Buffer.from(await listingImage(card, photo, fonts).arrayBuffer());
}

async function rasterize(card: OgListingCard, photo: string | null, fonts: Awaited<ReturnType<typeof loadOgFonts>>) {
  const bytes = Buffer.from(await listingImage(card, photo, fonts).arrayBuffer());
  return new Response(bytes, {
    headers: { "Content-Type": "image/png" },
  });
}

export async function renderListingOgImage(card: OgListingCard) {
  const fonts = await loadOgFonts();
  const photo = card.heroUrl ? await photoDataUrl(card.heroUrl) : null;
  if (!photo) return rasterize(card, null, fonts);
  try {
    return await rasterize(card, photo, fonts);
  } catch {
    return rasterize(card, null, fonts);
  }
}

export { INDEX_ALT };
