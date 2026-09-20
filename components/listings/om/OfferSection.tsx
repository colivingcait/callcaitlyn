"use client";

import { useEffect, useRef, useState } from "react";
import { submitListingOffer } from "@/app/listing/[slug]/actions";

const boxedLabel: React.CSSProperties = { display: "block", fontSize: 13, color: "#574f47" };
const boxedInput: React.CSSProperties = { marginTop: 6, width: "100%", boxSizing: "border-box", border: "1px solid #d5cdc1", background: "#fffdfa", padding: "11px 13px", fontSize: 15, color: "#211c19" };

// The "Ready to make an offer?" CTA + modal. Never say "letter of intent" -
// this audience is residential/coliving operators, not institutional
// buyers - the vocabulary throughout is "submit an offer" / "your terms".
export function OfferSection({ slug, nickname, omNumber }: { slug: string; nickname: string; omNumber: string }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [unsureTerms, setUnsureTerms] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href]');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("input, button")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const unsure = form.get("unsure_terms") === "on";
    const result = await submitListingOffer(slug, {
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      email: String(form.get("email") ?? ""),
      entity: String(form.get("entity") ?? ""),
      price: unsure ? "" : String(form.get("price") ?? ""),
      emd: unsure ? "" : String(form.get("emd") ?? ""),
      financing: unsure ? "" : String(form.get("financing") ?? ""),
      dd: unsure ? "" : String(form.get("dd") ?? ""),
      closing: unsure ? "" : String(form.get("closing") ?? ""),
      notes: unsure ? "" : String(form.get("notes") ?? ""),
      unsureTerms: unsure,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSent(true);
  }

  return (
    <>
      <section id="offer" data-om-noprint style={{ background: "#211c19", padding: "46px 36px 48px", textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.2em", color: "#e9a396" }}>READY TO MOVE</p>
        <h2 style={{ margin: "16px auto 0", fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 34, lineHeight: 1.14, color: "#f4f1ec", maxWidth: "24ch" }}>
          Ready to make an offer?
        </h2>
        <p style={{ margin: "16px auto 0", fontSize: 16, lineHeight: 1.7, color: "#d6cfc5", maxWidth: "56ch" }}>
          Tell me your price and terms and I&apos;ll call you the same day to walk through them. Nothing here is a contract and nothing goes to the seller
          until we&apos;ve talked.
        </p>
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setSent(false);
            setUnsureTerms(false);
          }}
          className="om-hover-fill-border"
          style={{ marginTop: 28, border: "1px solid #cc4a37", background: "#cc4a37", padding: "18px 40px", fontSize: 14, fontWeight: 600, letterSpacing: "0.12em", color: "#fff", cursor: "pointer", whiteSpace: "nowrap" }}
        >
          SUBMIT AN OFFER
        </button>
        <p style={{ margin: "16px 0 0", fontSize: 13, color: "#a39a8e" }}>Goes straight to Caitlyn — typically a call back within a few hours.</p>
      </section>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(23,19,17,0.62)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", overflow: "auto" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div ref={panelRef} style={{ width: "100%", maxWidth: 620, background: "#f4f1ec", border: "1px solid #211c19" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 20, background: "#211c19", padding: "24px 28px" }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.18em", color: "#e9a396" }}>YOUR OFFER · {omNumber}</p>
                <p style={{ margin: "10px 0 0", fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 24, color: "#f4f1ec" }}>{nickname}</p>
                <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.6, color: "#cdc4ba" }}>Not a contract — just your terms, so we have something specific to talk about.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="om-hover-fill"
                style={{ marginLeft: "auto", flex: "0 0 auto", width: 36, height: 36, border: "1px solid #453b34", background: "transparent", color: "#f4f1ec", fontSize: 15, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {sent ? (
              <div style={{ padding: "44px 28px 48px", textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.18em", color: "#a33a29" }}>SENT</p>
                <p style={{ margin: "14px auto 0", fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 26, lineHeight: 1.3, color: "#211c19", maxWidth: "26ch" }}>
                  Caitlyn has been notified.
                </p>
                <p style={{ margin: "14px auto 0", fontSize: 15, lineHeight: 1.7, color: "#2e2823", maxWidth: "44ch" }}>
                  Your terms are in her queue with your contact info. Expect a call today — you&apos;ll talk the offer through before anything is presented
                  to the seller.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="om-hover-dark"
                  style={{ marginTop: 26, border: "1px solid #211c19", background: "transparent", padding: "13px 28px", fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", color: "#211c19", cursor: "pointer" }}
                >
                  CLOSE
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ padding: "26px 28px 30px" }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.16em", color: "#6b6259" }}>YOUR INFORMATION</p>
                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label htmlFor="loi-name" style={boxedLabel}>Name</label>
                    <input id="loi-name" name="name" required className="om-input-boxed" style={boxedInput} />
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 180px" }}>
                      <label htmlFor="loi-phone" style={boxedLabel}>Phone</label>
                      <input id="loi-phone" name="phone" required className="om-input-boxed" style={boxedInput} />
                    </div>
                    <div style={{ flex: "1 1 180px" }}>
                      <label htmlFor="loi-email" style={boxedLabel}>Email</label>
                      <input id="loi-email" name="email" className="om-input-boxed" style={boxedInput} />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="loi-entity" style={boxedLabel}>Buying entity</label>
                    <input id="loi-entity" name="entity" className="om-input-boxed" style={boxedInput} />
                  </div>
                  <label htmlFor="loi-unsure" style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 4, cursor: "pointer" }}>
                    <input
                      id="loi-unsure"
                      name="unsure_terms"
                      type="checkbox"
                      checked={unsureTerms}
                      onChange={(e) => setUnsureTerms(e.target.checked)}
                      style={{ marginTop: 3, width: 16, height: 16, accentColor: "#cc4a37" }}
                    />
                    <span style={{ fontSize: 14, lineHeight: 1.45, color: "#2e2823" }}>Unsure about offer terms</span>
                  </label>
                </div>

                {!unsureTerms && (
                <>
                <p style={{ margin: "26px 0 0", fontSize: 12, fontWeight: 500, letterSpacing: "0.16em", color: "#6b6259" }}>YOUR TERMS</p>
                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 180px" }}>
                      <label htmlFor="loi-price" style={boxedLabel}>Offer price</label>
                      <input id="loi-price" name="price" placeholder="$385,000" className="om-input-boxed" style={boxedInput} />
                    </div>
                    <div style={{ flex: "1 1 180px" }}>
                      <label htmlFor="loi-emd" style={boxedLabel}>Earnest money</label>
                      <input id="loi-emd" name="emd" placeholder="$5,000" className="om-input-boxed" style={boxedInput} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 170px" }}>
                      <label htmlFor="loi-financing" style={boxedLabel}>Financing</label>
                      <select id="loi-financing" name="financing" className="om-input-boxed" style={boxedInput}>
                        <option>Conventional</option>
                        <option>DSCR / portfolio</option>
                        <option>All cash</option>
                        <option>Seller financing</option>
                        <option>Still deciding</option>
                      </select>
                    </div>
                    <div style={{ flex: "1 1 170px" }}>
                      <label htmlFor="loi-dd" style={boxedLabel}>Due diligence</label>
                      <select id="loi-dd" name="dd" className="om-input-boxed" style={boxedInput}>
                        <option>7 days</option>
                        <option>10 days</option>
                        <option>14 days</option>
                        <option>21 days</option>
                      </select>
                    </div>
                    <div style={{ flex: "1 1 170px" }}>
                      <label htmlFor="loi-closing" style={boxedLabel}>Target closing</label>
                      <select id="loi-closing" name="closing" className="om-input-boxed" style={boxedInput}>
                        <option>21 days</option>
                        <option>30 days</option>
                        <option>45 days</option>
                        <option>60 days</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="loi-notes" style={boxedLabel}>Anything else I should know</label>
                    <textarea
                      id="loi-notes"
                      name="notes"
                      rows={3}
                      placeholder="Inspection, appraisal, proof of funds attached, questions on the numbers…"
                      className="om-input-boxed"
                      style={{ ...boxedInput, lineHeight: 1.6, resize: "vertical" }}
                    />
                  </div>
                </div>
                </>
                )}

                {error && <p style={{ margin: "16px 0 0", fontSize: 13, color: "#a33a29" }}>{error}</p>}

                <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="om-hover-dark"
                    style={{ border: "1px solid #cc4a37", background: "#cc4a37", padding: "15px 32px", fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", color: "#fff", cursor: "pointer" }}
                  >
                    {submitting ? "SENDING…" : "SEND TO CAITLYN"}
                  </button>
                  <p style={{ margin: 0, flex: "1 1 220px", fontSize: 13, lineHeight: 1.6, color: "#574f47" }}>
                    Nothing is binding. Caitlyn will call to confirm your terms before presenting anything.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
