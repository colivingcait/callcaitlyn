"use client";

import { useEffect, useRef, useState } from "react";
import type { PadsplitPhoto } from "@/types/database";

const SCRIM =
  "linear-gradient(to top, #211c19 0%, rgba(33,28,25,0.97) 26%, rgba(33,28,25,0.75) 45%, rgba(33,28,25,0.1) 72%, rgba(33,28,25,0) 100%)";

const arrowStyle: React.CSSProperties = {
  position: "absolute",
  top: "50%",
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
};

function photoAlt(photo: PadsplitPhoto, nickname: string, index: number): string {
  // Never use scrape alt/title — those can carry a street address.
  return photo.category ? `${nickname} — ${photo.category.replace(/_/g, " ")}` : `${nickname}, photo ${index + 1}`;
}

// Photo-first hero + photo mode. Default: cover, hard scrim, name, VIEW
// PHOTOS. Photo mode: full-bleed browser, thumbnail rail, Esc / arrows.
export function PhotoCarousel({
  photos,
  nickname,
  eyebrow,
  summary,
}: {
  photos: PadsplitPhoto[];
  nickname: string;
  eyebrow: string;
  summary: string | null;
}) {
  const [photoMode, setPhotoMode] = useState(false);
  const [index, setIndex] = useState(0);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const count = photos.length;
  const cover = photos[0];
  const current = photos[index] ?? cover;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (!photoMode) return;
      if (e.key === "Escape") setPhotoMode(false);
      if (count === 0) return;
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + count) % count);
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % count);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, photoMode]);

  useEffect(() => {
    if (!photoMode) return;
    const active = thumbsRef.current?.querySelector<HTMLElement>(`[data-thumb="${index}"]`);
    active?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [index, photoMode]);

  const go = (i: number) => {
    if (count === 0) return;
    setIndex(((i % count) + count) % count);
  };

  const coverUrl = cover?.url;
  const counter = `${String(index + 1).padStart(2, "0")} / ${String(Math.max(count, 1)).padStart(2, "0")}`;

  return (
    <section
      className="om-hero"
      style={{
        position: "relative",
        height: photoMode ? 760 : 520,
        minHeight: 520,
        transition: "height 260ms cubic-bezier(0.33,1,0.68,1)",
        backgroundColor: "#211c19",
        backgroundImage: !photoMode && coverUrl ? `url(${JSON.stringify(coverUrl)})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center 62%",
      }}
    >
      {!photoMode && (
        <>
          <div className="om-hero-scrim" style={{ position: "absolute", inset: 0, background: SCRIM }} />
          <div className="om-hero-chrome om-gutter" style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "0 28px 30px" }}>
            <div style={{ margin: "0 auto", maxWidth: 1180 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.22em", color: "#e9a396" }}>{eyebrow}</p>
              <h1
                className="om-h1"
                style={{
                  margin: "12px 0 0",
                  fontFamily: "var(--font-om-serif)",
                  fontWeight: 600,
                  fontSize: 62,
                  lineHeight: 1.02,
                  letterSpacing: "-0.02em",
                  color: "#f4f1ec",
                }}
              >
                {nickname}
              </h1>
              <div style={{ marginTop: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
                {summary ? <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "#ded6cc" }}>{summary}</p> : <span />}
                {count > 0 && (
                  <button
                    type="button"
                    onClick={() => setPhotoMode(true)}
                    className="om-hover-fill-border"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      border: "1px solid #cc4a37",
                      background: "#cc4a37",
                      padding: "12px 18px",
                      font: "600 12px/1 var(--font-om-sans), Archivo, sans-serif",
                      letterSpacing: "0.12em",
                      color: "#fff",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    VIEW PHOTOS <span style={{ fontSize: 14, lineHeight: 1 }}>→</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {photoMode && current && (
        <div data-om-noprint style={{ position: "absolute", inset: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.url}
            alt={photoAlt(current, nickname, index)}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          {count > 1 && (
            <>
              <button type="button" onClick={() => go(index - 1)} aria-label="Previous photo" className="om-invert-btn" style={{ ...arrowStyle, left: 18 }}>
                ←
              </button>
              <button type="button" onClick={() => go(index + 1)} aria-label="Next photo" className="om-invert-btn" style={{ ...arrowStyle, right: 18 }}>
                →
              </button>
            </>
          )}
          <div style={{ position: "absolute", top: 18, right: 18, display: "flex", alignItems: "center", gap: 10 }}>
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-om-serif)",
                fontSize: 15,
                letterSpacing: "0.06em",
                color: "#f4f1ec",
                background: "rgba(33,28,25,0.6)",
                padding: "8px 12px",
                whiteSpace: "nowrap",
              }}
            >
              {counter}
            </p>
            <button
              type="button"
              onClick={() => setPhotoMode(false)}
              className="om-invert-btn"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                border: "1px solid rgba(244,241,236,0.45)",
                background: "rgba(33,28,25,0.6)",
                padding: "9px 16px",
                font: "600 12px/1 var(--font-om-sans), Archivo, sans-serif",
                letterSpacing: "0.12em",
                color: "#f4f1ec",
                cursor: "pointer",
              }}
            >
              CLOSE <span style={{ fontSize: 14, lineHeight: 1 }}>✕</span>
            </button>
          </div>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              padding: "44px 22px 18px",
              background: "linear-gradient(to top, rgba(33,28,25,0.85), rgba(33,28,25,0))",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 18,
            }}
          >
            <div ref={thumbsRef} className="om-thumbs">
              {photos.map((photo, i) => (
                <button
                  key={photo.url + i}
                  type="button"
                  data-thumb={i}
                  onClick={() => go(i)}
                  aria-label={`Go to photo ${i + 1}`}
                  aria-current={i === index ? "true" : undefined}
                  style={{
                    flex: "0 0 84px",
                    width: 84,
                    height: 56,
                    padding: 0,
                    cursor: "pointer",
                    border: i === index ? "2px solid #cc4a37" : "1px solid rgba(244,241,236,0.3)",
                    backgroundImage: `url(${JSON.stringify(photo.url)})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    opacity: i === index ? 1 : 0.62,
                  }}
                />
              ))}
            </div>
            <p style={{ margin: 0, flex: "0 0 auto", fontSize: 12, letterSpacing: "0.1em", color: "#c9c0b6", whiteSpace: "nowrap" }}>
              ESC TO CLOSE · ← → TO BROWSE
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
