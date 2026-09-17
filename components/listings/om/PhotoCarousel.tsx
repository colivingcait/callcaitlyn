"use client";

import { useEffect, useState } from "react";
import type { PadsplitPhoto } from "@/types/database";

// Slide/thumb/keyboard behavior straight from the design spec: prev/next
// wrap, thumb rail jumps directly, track animates via translateX, arrow
// keys move it (ignored while a form field has focus).
export function PhotoCarousel({ photos, nickname }: { photos: PadsplitPhoto[]; nickname: string }) {
  const [index, setIndex] = useState(0);
  const count = photos.length;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + count) % count);
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % count);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count]);

  if (count === 0) {
    return (
      <div style={{ marginTop: 44, position: "relative", overflow: "hidden", background: "#2a231f" }}>
        <div style={{ aspectRatio: "21 / 9" }} />
      </div>
    );
  }

  const go = (i: number) => setIndex(((i % count) + count) % count);

  return (
    <div>
      <div style={{ marginTop: 44, position: "relative", overflow: "hidden", background: "#2a231f" }}>
        <div style={{ display: "flex", transition: "transform 520ms cubic-bezier(0.33,1,0.68,1)", transform: `translateX(-${index * 100}%)` }}>
          {photos.map((photo, i) => (
            <div key={photo.url + i} style={{ flex: "0 0 100%", aspectRatio: "21 / 9", position: "relative", display: "flex", alignItems: "flex-end", padding: 22 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.category ? `${nickname} — ${photo.category.replace(/_/g, " ")}` : `${nickname}, photo ${i + 1}`}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
              />
              {photo.category && (
                <span
                  style={{
                    position: "relative",
                    font: "500 12px/1.4 Archivo, sans-serif",
                    letterSpacing: "0.14em",
                    color: "#f4f1ec",
                    textShadow: "0 1px 3px rgba(0,0,0,0.6)",
                    textTransform: "uppercase",
                  }}
                >
                  {photo.category.replace(/_/g, " ")}
                </span>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(index - 1)}
          aria-label="Previous photo"
          className="om-invert-btn"
          style={{
            position: "absolute",
            top: "50%",
            left: 18,
            transform: "translateY(-50%)",
            width: 42,
            height: 42,
            border: "1px solid rgba(244,241,236,0.28)",
            background: "rgba(33,28,25,0.55)",
            color: "#f4f1ec",
            fontSize: 15,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => go(index + 1)}
          aria-label="Next photo"
          className="om-invert-btn"
          style={{
            position: "absolute",
            top: "50%",
            right: 18,
            transform: "translateY(-50%)",
            width: 42,
            height: 42,
            border: "1px solid rgba(244,241,236,0.28)",
            background: "rgba(33,28,25,0.55)",
            color: "#f4f1ec",
            fontSize: 15,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          →
        </button>
        <div
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            fontFamily: "var(--font-om-serif)",
            fontSize: 15,
            letterSpacing: "0.06em",
            color: "#f4f1ec",
            background: "rgba(33,28,25,0.6)",
            padding: "5px 12px",
          }}
        >
          {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
        </div>
      </div>

      <div data-om-noprint style={{ padding: "14px 0 34px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {photos.map((photo, i) => (
            <button
              key={photo.url + i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Go to photo ${i + 1}`}
              style={{ width: 40, height: 4, padding: 0, border: 0, cursor: "pointer", background: i === index ? "#cc4a37" : "#453b34" }}
            />
          ))}
        </div>
        <p style={{ margin: 0, fontSize: 13, letterSpacing: "0.04em", color: "#a39a8e" }}>
          Interior and common areas only · exterior photography withheld at the seller&apos;s request
        </p>
      </div>
    </div>
  );
}
