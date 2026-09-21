"use client";

import { useState } from "react";
import { requestSellerAnalysis } from "@/app/listing/[slug]/actions";
import { OmSheet, StepRule, boxedField, boxedLabel } from "./OmSheet";

const label: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 500, letterSpacing: "0.14em", color: "#a39a8e" };
const input: React.CSSProperties = { marginTop: 8, width: "100%", boxSizing: "border-box", border: 0, borderBottom: "1px solid #453b34", background: "transparent", padding: "9px 0", fontSize: 15, color: "#f4f1ec" };

const SELLER_TIMELINES = [
  { value: "0–3 MO", label: "0–3 MO" },
  { value: "3–6 MO", label: "3–6 MO" },
  { value: "6–12 MO", label: "6–12 MO" },
  { value: "JUST CURIOUS", label: "JUST CURIOUS" },
] as const;

// "What would your PadSplit sell for?" - the other half of the page's
// purpose, independent of any one listing (a seller doesn't own this one).
export function SellerAnalysisForm() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const result = await requestSellerAnalysis({
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      email: String(form.get("email") ?? ""),
      city: String(form.get("city") ?? ""),
      notes: String(form.get("notes") ?? ""),
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSent(true);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <label htmlFor="s-name" style={label}>NAME</label>
        <input id="s-name" name="name" required className="om-input" style={input} />
      </div>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 130px" }}>
          <label htmlFor="s-phone" style={label}>PHONE</label>
          <input id="s-phone" name="phone" type="tel" className="om-input" style={input} />
        </div>
        <div style={{ flex: "1 1 130px" }}>
          <label htmlFor="s-email" style={label}>EMAIL</label>
          <input id="s-email" name="email" type="email" className="om-input" style={input} />
        </div>
      </div>
      <div>
        <label htmlFor="s-city" style={label}>CITY / SUBMARKET</label>
        <input id="s-city" name="city" className="om-input" style={input} />
      </div>
      <div>
        <label htmlFor="s-notes" style={label}>ANYTHING ELSE</label>
        <textarea id="s-notes" name="notes" rows={2} placeholder="Room count, occupancy, timeline" className="om-input" style={{ ...input, resize: "vertical" }} />
      </div>
      {error && <p style={{ margin: 0, fontSize: 13, color: "#e26e5d" }}>{error}</p>}
      <button
        type="submit"
        disabled={submitting || sent}
        className="om-hover-fill-border"
        style={{ alignSelf: "flex-start", border: "1px solid #cc4a37", background: "#cc4a37", padding: "13px 26px", fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", color: "#fff", cursor: "pointer" }}
      >
        {sent ? "SENT — I'LL BE IN TOUCH" : submitting ? "SENDING…" : "GET MY ANALYSIS"}
      </button>
    </form>
  );
}

// Two-step sheet. CONTINUE persists contact + address and notifies
// immediately. SEND FOR ANALYSIS updates that same record and notifies again.
export function SellerAnalysisSheet({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<1 | 2 | "sent">(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState("");
  const [timeline, setTimeline] = useState("");
  const [contact, setContact] = useState({ name: "", phone: "", email: "", address: "" });

  async function continueStep(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const next = {
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      email: String(form.get("email") ?? ""),
      address: String(form.get("address") ?? ""),
    };
    const id = requestId || crypto.randomUUID();
    const result = await requestSellerAnalysis({
      ...next,
      city: "",
      notes: "",
      stage: "contact",
      requestId: id,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setContact(next);
    setRequestId(id);
    setStep(2);
  }

  async function sendDetails(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const result = await requestSellerAnalysis({
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      address: contact.address,
      city: "",
      notes: "",
      beds: String(form.get("beds") ?? ""),
      baths: String(form.get("baths") ?? ""),
      timeline,
      roomsOccupied: String(form.get("rooms") ?? ""),
      grossRents: String(form.get("rents") ?? ""),
      stage: "details",
      requestId,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStep("sent");
  }

  return (
    <OmSheet zIndex={60} eyebrow="SELLER ANALYSIS" title="What would your PadSplit sell for?" onClose={onClose}>
      {step === "sent" ? (
        <div style={{ padding: "34px 18px 38px", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 500, letterSpacing: "0.18em", color: "#a33a29" }}>SENT</p>
          <p style={{ margin: "14px 0 0", fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 24, lineHeight: 1.3, color: "#211c19" }}>Caitlyn has your property.</p>
          <p style={{ margin: "14px 0 0", fontSize: 15, lineHeight: 1.7, color: "#2e2823" }}>Comps and room revenue both, no pressure either way.</p>
          <button
            type="button"
            onClick={onClose}
            className="om-hover-dark"
            style={{ marginTop: 24, border: "1px solid #211c19", background: "transparent", padding: "13px 26px", fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", color: "#211c19", cursor: "pointer" }}
          >
            CLOSE
          </button>
        </div>
      ) : step === 1 ? (
        <form onSubmit={continueStep} style={{ padding: "20px 18px 24px" }}>
          <StepRule label="STEP 1 OF 2" fraction={0.5} />
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label htmlFor="ss-name" style={boxedLabel}>Name</label>
              <input id="ss-name" name="name" required defaultValue={contact.name} placeholder="Your name" className="om-input-boxed" style={boxedField} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: "1 1 0", minWidth: 0 }}>
                <label htmlFor="ss-phone" style={boxedLabel}>Phone</label>
                <input id="ss-phone" name="phone" type="tel" defaultValue={contact.phone} placeholder="(678)…" className="om-input-boxed" style={boxedField} />
              </div>
              <div style={{ flex: "1 1 0", minWidth: 0 }}>
                <label htmlFor="ss-email" style={boxedLabel}>Email</label>
                <input id="ss-email" name="email" type="email" defaultValue={contact.email} placeholder="you@…" className="om-input-boxed" style={boxedField} />
              </div>
            </div>
            <div>
              <label htmlFor="ss-address" style={boxedLabel}>Property address</label>
              <input id="ss-address" name="address" defaultValue={contact.address} placeholder="Street, city" className="om-input-boxed" style={boxedField} />
            </div>
            {error && <p style={{ margin: 0, fontSize: 13, color: "#a33a29" }}>{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="om-hover-fill-border"
              style={{ marginTop: 4, border: "1px solid #cc4a37", background: "#cc4a37", padding: "16px 20px", fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", color: "#fff", cursor: "pointer" }}
            >
              {submitting ? "SENDING…" : "CONTINUE"}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={sendDetails} style={{ padding: "20px 18px 24px" }}>
          <StepRule label="STEP 2 · OPTIONAL" fraction={1} />
          <p style={{ margin: "14px 0 0", fontSize: 14, lineHeight: 1.65, color: "#574f47" }}>The more you share, the closer the number. Skip anything you don&apos;t have on your phone.</p>
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: "1 1 0", minWidth: 0 }}>
                <label htmlFor="ss-beds" style={boxedLabel}>Beds</label>
                <input id="ss-beds" name="beds" inputMode="numeric" placeholder="6" className="om-input-boxed" style={boxedField} />
              </div>
              <div style={{ flex: "1 1 0", minWidth: 0 }}>
                <label htmlFor="ss-baths" style={boxedLabel}>Baths</label>
                <input id="ss-baths" name="baths" inputMode="decimal" placeholder="3" className="om-input-boxed" style={boxedField} />
              </div>
            </div>
            <div>
              <span style={boxedLabel}>Timeline</span>
              <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {SELLER_TIMELINES.map((chip) => {
                  const active = timeline === chip.value;
                  return (
                    <button
                      key={chip.value}
                      type="button"
                      onClick={() => setTimeline(active ? "" : chip.value)}
                      style={{
                        border: active ? "1px solid #211c19" : "1px solid #d5cdc1",
                        background: active ? "#211c19" : "#fffdfa",
                        color: active ? "#f4f1ec" : "#211c19",
                        padding: "10px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        cursor: "pointer",
                      }}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: "1 1 0", minWidth: 0 }}>
                <label htmlFor="ss-rooms" style={boxedLabel}>Rooms occupied</label>
                <input id="ss-rooms" name="rooms" placeholder="5 of 6" className="om-input-boxed" style={boxedField} />
              </div>
              <div style={{ flex: "1 1 0", minWidth: 0 }}>
                <label htmlFor="ss-rents" style={boxedLabel}>Gross rents / mo</label>
                <input id="ss-rents" name="rents" placeholder="$5,500" className="om-input-boxed" style={boxedField} />
              </div>
            </div>
            {error && <p style={{ margin: 0, fontSize: 13, color: "#a33a29" }}>{error}</p>}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setStep(1);
                }}
                className="om-hover-dark"
                style={{ flex: "0 0 auto", border: "1px solid #211c19", background: "transparent", padding: "15px 18px", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", color: "#211c19", cursor: "pointer" }}
              >
                BACK
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="om-hover-fill-border"
                style={{ flex: "1 1 auto", border: "1px solid #cc4a37", background: "#cc4a37", padding: "15px 18px", fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", color: "#fff", cursor: "pointer" }}
              >
                {submitting ? "SENDING…" : "SEND FOR ANALYSIS"}
              </button>
            </div>
          </div>
        </form>
      )}
    </OmSheet>
  );
}
