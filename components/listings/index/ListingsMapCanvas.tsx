"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicIndexCard } from "@/lib/listings/public-index";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function ListingsMapCanvas({ listings }: { listings: PublicIndexCard[] }) {
  const mapEl = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const apiRef = useRef<{
    select: (index: number) => void;
    highlight: (index: number, on: boolean) => void;
  } | null>(null);

  useEffect(() => {
    const el = mapEl.current;
    if (!el) return;

    let cancelled = false;
    const bag: { map?: import("leaflet").Map; fit?: () => void } = {};

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapEl.current) return;

      const pinned = listings
        .map((listing, index) => (listing.lat != null && listing.lng != null ? { listing, index } : null))
        .filter((row): row is { listing: PublicIndexCard; index: number } => row != null);

      const map = L.map(mapEl.current, { scrollWheelZoom: false, attributionControl: true });
      bag.map = map;

      L.tileLayer("https://tile.openstreetmap.de/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const markers: Array<import("leaflet").Marker | null> = listings.map(() => null);

      pinned.forEach(({ listing, index }) => {
        const icon = L.divIcon({
          className: "listings-map-pin-icon",
          html: `<div class="listings-map-pin" style="background:${listing.tagColor}">${index + 1}</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });
        const marker = L.marker([listing.lat!, listing.lng!], { icon }).addTo(map);
        const eyebrow = [listing.submarketLabel, listing.tag].filter(Boolean).join(" · ");
        marker.bindPopup(
          [
            eyebrow ? `<div class="listings-map-pop-sub">${escapeHtml(eyebrow)}</div>` : "",
            `<div class="listings-map-pop-name">${escapeHtml(listing.name)}</div>`,
            `<div class="listings-map-pop-price">${escapeHtml(listing.priceLabel)}</div>`,
            listing.cta && listing.href
              ? `<a class="listings-map-pop-cta" href="${escapeHtml(listing.href)}"${listing.external ? ' target="_blank" rel="noopener"' : ""}>${escapeHtml(listing.cta)}</a>`
              : "",
          ].join(""),
        );
        marker.on("click", () => setSelected(index));
        markers[index] = marker;
      });

      const fit = () => {
        map.invalidateSize();
        if (pinned.length) {
          map.fitBounds(L.latLngBounds(pinned.map(({ listing }) => [listing.lat!, listing.lng!] as [number, number])).pad(0.18));
        } else {
          map.setView([33.749, -84.388], 11);
        }
      };
      bag.fit = fit;
      requestAnimationFrame(fit);
      window.addEventListener("load", fit);
      window.addEventListener("resize", fit);

      apiRef.current = {
        select(index) {
          const listing = listings[index];
          const marker = markers[index];
          if (listing?.lat != null && listing.lng != null) map.panTo([listing.lat, listing.lng]);
          marker?.openPopup();
        },
        highlight(index, on) {
          const node = markers[index]?.getElement()?.firstElementChild as HTMLElement | undefined;
          node?.style.setProperty("transform", on ? "scale(1.18)" : "scale(1)");
        },
      };
    })();

    return () => {
      cancelled = true;
      if (bag.fit) {
        window.removeEventListener("load", bag.fit);
        window.removeEventListener("resize", bag.fit);
      }
      bag.map?.remove();
      apiRef.current = null;
    };
  }, [listings]);

  useEffect(() => {
    if (selected == null) return;
    apiRef.current?.select(selected);
  }, [selected]);

  return (
    <div className="listings-map-split" style={{ marginTop: 22, display: "grid", gridTemplateColumns: "minmax(0, 340px) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
      <div className="listings-map-rail" style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 620, overflowY: "auto" }}>
        {listings.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: "#a39a8e" }}>No listings available right now.</p>
        ) : (
          listings.map((listing, index) => (
            <button
              key={listing.id}
              type="button"
              className="listings-map-row"
              data-selected={selected === index ? "true" : "false"}
              onClick={() => setSelected(index)}
              onMouseEnter={() => apiRef.current?.highlight(index, true)}
              onMouseLeave={() => apiRef.current?.highlight(index, false)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background: "#fffdfa",
                border: "1px solid #e4ddd2",
                borderLeft: selected === index ? "3px solid #cc4a37" : "3px solid #e4ddd2",
                padding: "14px 16px",
                cursor: "pointer",
                color: "#211c19",
              }}
            >
              {listing.tag && (
                <span
                  style={{
                    display: "inline-block",
                    background: listing.tagColor,
                    color: "#f4f1ec",
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: "0.14em",
                    padding: "5px 8px",
                  }}
                >
                  {listing.tag}
                </span>
              )}
              {listing.submarketLabel && (
                <p style={{ margin: "10px 0 0", fontSize: 11, fontWeight: 500, letterSpacing: "0.16em", color: "#a33a29" }}>{listing.submarketLabel}</p>
              )}
              <p style={{ margin: "6px 0 0", fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 20, lineHeight: 1.2, color: "#211c19" }}>{listing.name}</p>
              <p style={{ margin: "8px 0 0", fontFamily: "var(--font-om-serif)", fontSize: 20, color: "#211c19" }}>{listing.priceLabel}</p>
            </button>
          ))
        )}
      </div>
      <div ref={mapEl} className="listings-map-canvas" style={{ height: 620, border: "1px solid #e4ddd2", background: "#ece6dd" }} />
    </div>
  );
}
