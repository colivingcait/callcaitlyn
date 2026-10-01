import { deflateSync, inflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildOgListingCard, type OgListingSource } from "@/lib/listings/og-card";
import { renderListingCardPng } from "@/lib/og/listing-og";

const outDir = process.argv[2] || "/tmp/og-cards";

function crc32(buf: Buffer): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type), data]);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), 8 + data.length);
  return out;
}

function encodeRgbPng(width: number, height: number, pixel: (x: number, y: number) => [number, number, number]): Buffer {
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const row = y * (1 + width * 3);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixel(x, y);
      const i = row + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function photoDataUrl(): string {
  const png = encodeRgbPng(700, 630, (x, y) => {
    const t = x / 700;
    const v = y / 630;
    return [Math.round(90 + t * 80 + v * 20), Math.round(70 + (1 - t) * 40), Math.round(55 + v * 30)];
  });
  return `data:image/png;base64,${png.toString("base64")}`;
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePng(buf: Buffer): { width: number; height: number; data: Buffer; bpp: number } {
  let o = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat: Buffer[] = [];
  while (o < buf.length) {
    const len = buf.readUInt32BE(o);
    o += 4;
    const type = buf.toString("ascii", o, o + 4);
    o += 4;
    const data = buf.subarray(o, o + len);
    o += len + 4;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
  }
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (!bpp) throw new Error(`unsupported png color type ${colorType}`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const rowStart = y * (stride + 1) + 1;
    const prev = y === 0 ? Buffer.alloc(stride) : out.subarray((y - 1) * stride, y * stride);
    const row = out.subarray(y * stride, (y + 1) * stride);
    for (let i = 0; i < stride; i++) {
      const x = raw[rowStart + i];
      const a = i >= bpp ? row[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      if (filter === 0) row[i] = x;
      else if (filter === 1) row[i] = (x + a) & 255;
      else if (filter === 2) row[i] = (x + b) & 255;
      else if (filter === 3) row[i] = (x + Math.floor((a + b) / 2)) & 255;
      else if (filter === 4) row[i] = (x + paeth(a, b, c)) & 255;
      else throw new Error(`bad png filter ${filter}`);
    }
  }
  return { width, height, data: out, bpp };
}

function sample(png: { data: Buffer; bpp: number; width: number }, x: number, y: number): [number, number, number] {
  const i = (y * png.width + x) * png.bpp;
  return [png.data[i], png.data[i + 1], png.data[i + 2]];
}

function isTerracotta(r: number, g: number, b: number): boolean {
  return Math.abs(r - 168) < 28 && Math.abs(g - 70) < 28 && Math.abs(b - 42) < 28;
}

type Band = { y0: number; y1: number; min: number; max: number };

function textBands(png: ReturnType<typeof decodePng>, x0: number): Band[] {
  const bands: Band[] = [];
  let band: Band | null = null;
  for (let y = 0; y < png.height; y++) {
    let min = -1;
    let max = -1;
    let count = 0;
    for (let x = x0; x < png.width; x++) {
      const [r, g, b] = sample(png, x, y);
      if (!isTerracotta(r, g, b)) {
        if (min < 0) min = x;
        max = x;
        count += 1;
      }
    }
    if (count > 8) {
      if (!band) band = { y0: y, y1: y, min, max };
      else {
        band.y1 = y;
        band.min = Math.min(band.min, min);
        band.max = Math.max(band.max, max);
      }
    } else if (band) {
      bands.push(band);
      band = null;
    }
  }
  if (band) bands.push(band);
  return bands;
}

function card(partial: Partial<OgListingSource> & Pick<OgListingSource, "submarket" | "list_price">): ReturnType<typeof buildOgListingCard> {
  return buildOgListingCard({
    nickname: partial.nickname ?? "Sample",
    submarket: partial.submarket,
    status: partial.status ?? "active",
    list_price: partial.list_price,
    beds: partial.beds ?? 8,
    baths: partial.baths ?? 4,
    sqft: partial.sqft ?? 2800,
    story: partial.story ?? "House-hack ready",
    public_description: partial.public_description ?? null,
    photos: partial.photos ?? [],
  });
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const photo = photoDataUrl();
  const cases: Array<{ name: string; card: ReturnType<typeof buildOgListingCard>; photo: string | null }> = [
    {
      name: "stone-mountain-ten-like",
      card: card({ nickname: "Stone Mountain Ten", submarket: "Stone Mountain", list_price: 300000, beds: 10, baths: 8, sqft: 3200, story: "Ten private suites" }),
      photo,
    },
    {
      name: "price-1250000",
      card: card({
        nickname: "North Druid Hills",
        submarket: "North Druid Hills",
        list_price: 1250000,
        beds: 8,
        baths: 6,
        sqft: 4100,
        story: "A full house-hack",
      }),
      photo,
    },
    {
      name: "no-photo",
      card: card({ nickname: "The Conley Eight", submarket: "Conley", list_price: 275000, beds: 8, baths: 2, sqft: 2100, story: "Eight suites, no photo yet" }),
      photo: null,
    },
  ];

  for (const item of cases) {
    const bytes = await renderListingCardPng(item.card, item.photo);
    const png = decodePng(bytes);
    if (png.width !== 1200 || png.height !== 630) throw new Error(`${item.name} is ${png.width}x${png.height}`);
    const path = join(outDir, `${item.name}.png`);
    writeFileSync(path, bytes);
    const bands = textBands(png, item.photo ? 700 : 0);
    console.log(item.name, item.card.price, item.card.locationLine, bands.slice(0, 3));
    if (item.photo) {
      const location = bands[0];
      const price = bands[1];
      if (!location || !price) throw new Error(`${item.name} missing location or price`);
      if (location.y1 - location.y0 > 22) throw new Error(`${item.name} location wraps`);
      if (price.y1 - price.y0 > 110) throw new Error(`${item.name} price wraps`);
      if (location.max >= 1200 - 48) throw new Error(`${item.name} location reaches x=${location.max}`);
      if (price.max >= 1200 - 48) throw new Error(`${item.name} price reaches x=${price.max}`);
    } else {
      const badge = bands[0];
      if (!badge) throw new Error("no-photo badge missing");
      const width = badge.max - badge.min + 1;
      const height = badge.y1 - badge.y0 + 1;
      if (width > 220 || height > 56) throw new Error(`no-photo badge is a bar (${width}x${height})`);
    }
    console.log("wrote", path);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
