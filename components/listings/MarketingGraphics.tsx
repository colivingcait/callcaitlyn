"use client";

import { useEffect, useRef } from "react";
import { Download } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Listing = { address: string; listPrice: number | null; specs: string; photoUrl: string | null };

// Real export-ready PNGs rendered in-app - not Canva (no integration
// exists), just the three sizes she actually posts at, filled from the
// listing's own fields and first photo. Downloadable, then droppable into
// Canva afterwards if she wants to keep editing.
function useCanvasLayout(canvasRef: React.RefObject<HTMLCanvasElement | null>, width: number, height: number, listing: Listing, layout: "square" | "story" | "link") {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;

    function drawBase(photo: HTMLImageElement | null) {
      if (cancelled) return;
      ctx!.fillStyle = "#e7e5e4";
      ctx!.fillRect(0, 0, width, height);

      if (layout === "link") {
        const photoW = width * 0.56;
        if (photo) {
          const scale = Math.max(photoW / photo.width, height / photo.height);
          const w = photo.width * scale;
          const h = photo.height * scale;
          ctx!.drawImage(photo, (photoW - w) / 2, (height - h) / 2, w, h);
        }
        ctx!.fillStyle = "#ffffff";
        ctx!.fillRect(photoW, 0, width - photoW, height);
        ctx!.fillStyle = "#ac3826";
        ctx!.font = `600 ${width * 0.018}px Inter, sans-serif`;
        ctx!.fillText("NEW LISTING", photoW + width * 0.03, height * 0.32);
        ctx!.fillStyle = "#1c1917";
        ctx!.font = `600 ${width * 0.04}px Georgia, serif`;
        ctx!.fillText(formatCurrency(listing.listPrice), photoW + width * 0.03, height * 0.48);
        ctx!.fillStyle = "#57534e";
        ctx!.font = `${width * 0.016}px Inter, sans-serif`;
        wrapText(ctx!, listing.specs, photoW + width * 0.03, height * 0.62, width - photoW - width * 0.06, width * 0.02);
        return;
      }

      const photoH = layout === "square" ? height * 0.68 : height;
      if (photo) {
        const scale = Math.max(width / photo.width, photoH / photo.height);
        const w = photo.width * scale;
        const h = photo.height * scale;
        ctx!.drawImage(photo, (width - w) / 2, (photoH - h) / 2 - (layout === "story" ? 0 : 0), w, h);
      }

      const bandH = height - photoH;
      ctx!.fillStyle = layout === "square" ? "#1c1917" : "#ffffff";
      ctx!.fillRect(0, photoH, width, bandH);

      const textColor = layout === "square" ? "#ffffff" : "#1c1917";
      const subColor = layout === "square" ? "rgba(255,255,255,.75)" : "#78716c";
      const pad = width * 0.04;

      if (layout === "square") {
        ctx!.fillStyle = "rgba(255,255,255,.6)";
        ctx!.font = `600 ${width * 0.02}px Inter, sans-serif`;
        ctx!.fillText("JUST LISTED", pad, photoH + bandH * 0.28);
      }

      ctx!.fillStyle = textColor;
      ctx!.font = `600 ${width * (layout === "square" ? 0.045 : 0.035)}px Georgia, serif`;
      ctx!.fillText(formatCurrency(listing.listPrice), pad, photoH + bandH * (layout === "square" ? 0.55 : 0.45));

      ctx!.fillStyle = subColor;
      ctx!.font = `${width * 0.018}px Inter, sans-serif`;
      ctx!.fillText(`${listing.address} · ${listing.specs}`, pad, photoH + bandH * (layout === "square" ? 0.8 : 0.75));
    }

    if (listing.photoUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => drawBase(img);
      img.onerror = () => drawBase(null);
      img.src = listing.photoUrl;
    } else {
      drawBase(null);
    }

    return () => {
      cancelled = true;
    };
  }, [canvasRef, width, height, listing, layout]);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(" ");
  let line = "";
  let curY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, curY);
      line = word;
      curY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, curY);
}

function download(canvas: HTMLCanvasElement | null, filename: string) {
  if (!canvas) return;
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

function GraphicCanvas({ width, height, listing, layout, label, filename }: { width: number; height: number; listing: Listing; layout: "square" | "story" | "link"; label: string; filename: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useCanvasLayout(canvasRef, width, height, listing, layout);

  return (
    <div>
      <canvas ref={canvasRef} className="w-full rounded-xl border border-neutral-200" style={{ aspectRatio: `${width} / ${height}` }} />
      <div className="mt-1.5 flex items-center justify-between">
        <p className="text-xs text-neutral-500">{label}</p>
        <button type="button" onClick={() => download(canvasRef.current, filename)} className="flex items-center gap-1 text-xs font-semibold text-brand-700">
          <Download size={12} /> PNG
        </button>
      </div>
    </div>
  );
}

export function MarketingGraphics({ address, listPrice, specs, photoUrl }: { address: string; listPrice: number | null; specs: string; photoUrl: string | null }) {
  const listing: Listing = { address, listPrice, specs, photoUrl };
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <GraphicCanvas width={1080} height={1080} listing={listing} layout="square" label="Square · 1080×1080" filename="square.png" />
      <GraphicCanvas width={1080} height={1920} listing={listing} layout="story" label="Story · 1080×1920" filename="story.png" />
      <GraphicCanvas width={1200} height={630} listing={listing} layout="link" label="Link preview · 1200×630" filename="link-preview.png" />
    </div>
  );
}
