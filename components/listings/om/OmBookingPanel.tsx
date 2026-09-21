"use client";

import { formatInTimeZone } from "date-fns-tz";
import { ListView } from "@/components/booking/ListView";
import { CalendarGridView } from "@/components/booking/CalendarGridView";
import { BOOKING_CONTACT_TYPE_OPTIONS } from "@/lib/crm/booking-form-options";
import { TIMELINE_LABELS } from "@/lib/utils";
import { APP_TIMEZONE } from "@/lib/format-time";
import type { BookingFlowData } from "@/app/book/booking-actions";
import type { BookingContactType, Timeline } from "@/types/database";
import { StepRule, boxedField, boxedLabel } from "./OmSheet";

type Step = "info" | "time" | "details" | "done";

const backBtn: React.CSSProperties = {
  flex: "0 0 auto",
  border: "1px solid #211c19",
  background: "transparent",
  padding: "15px 18px",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.1em",
  color: "#211c19",
  cursor: "pointer",
};
const nextBtn: React.CSSProperties = {
  flex: "1 1 auto",
  border: "1px solid #cc4a37",
  background: "#cc4a37",
  padding: "15px 18px",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.12em",
  color: "#fff",
  cursor: "pointer",
};

export function OmBookingPanel({
  data,
  step,
  view,
  setView,
  name,
  setName,
  phone,
  setPhone,
  email,
  setEmail,
  selectedSlot,
  setSelectedSlot,
  contactType,
  setContactType,
  timeline,
  setTimeline,
  questions,
  setQuestions,
  submitting,
  error,
  onSubmitInfo,
  onSubmitTime,
  onSubmitDetails,
  onBackInfo,
  onBackTime,
  onClose,
}: {
  data: BookingFlowData | null | "loading";
  step: Step;
  view: "calendar" | "list";
  setView: (view: "calendar" | "list") => void;
  name: string;
  setName: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  selectedSlot: string | null;
  setSelectedSlot: (value: string) => void;
  contactType: BookingContactType | "";
  setContactType: (value: BookingContactType | "") => void;
  timeline: Timeline | "";
  setTimeline: (value: Timeline | "") => void;
  questions: string;
  setQuestions: (value: string) => void;
  submitting: boolean;
  error: string;
  onSubmitInfo: () => void;
  onSubmitTime: () => void;
  onSubmitDetails: () => void;
  onBackInfo: () => void;
  onBackTime: () => void;
  onClose?: () => void;
}) {
  const duration = data && data !== "loading" ? data.durationMinutes : 20;
  const eyebrow = `${duration} MINUTES`;
  const slotLabel = selectedSlot ? formatInTimeZone(selectedSlot, APP_TIMEZONE, "EEEE, MMM d 'at' h:mm a") : "";

  return (
    <div style={{ width: "100%", background: "#f4f1ec", borderTop: "1px solid #211c19" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, background: "#211c19", padding: 18 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 500, letterSpacing: "0.18em", color: "#e9a396" }}>{eyebrow}</p>
          <p style={{ margin: "8px 0 0", fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 21, lineHeight: 1.2, color: "#f4f1ec" }}>Book time with Caitlyn</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="om-hover-fill"
          style={{ marginLeft: "auto", flex: "0 0 auto", width: 34, height: 34, border: "1px solid #453b34", background: "transparent", color: "#f4f1ec", fontSize: 15, cursor: "pointer" }}
        >
          ✕
        </button>
      </div>

      {data === "loading" ? (
        <p style={{ margin: 0, padding: "28px 18px", fontSize: 15, color: "#574f47" }}>Loading…</p>
      ) : !data ? (
        <p style={{ margin: 0, padding: "28px 18px", fontSize: 15, lineHeight: 1.6, color: "#574f47" }}>This link isn&apos;t valid anymore. Ask Caitlyn to send a fresh one.</p>
      ) : step === "done" ? (
        <div style={{ padding: "34px 18px 38px", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 500, letterSpacing: "0.18em", color: "#a33a29" }}>REQUEST SENT</p>
          <p style={{ margin: "14px 0 0", fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 24, lineHeight: 1.3, color: "#211c19" }}>{slotLabel}</p>
          <p style={{ margin: "14px 0 0", fontSize: 15, lineHeight: 1.7, color: "#2e2823" }}>Caitlyn will confirm shortly and text you.</p>
          <button
            type="button"
            onClick={onClose}
            className="om-hover-dark"
            style={{ marginTop: 24, border: "1px solid #211c19", background: "transparent", padding: "13px 26px", fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", color: "#211c19", cursor: "pointer" }}
          >
            BACK TO THE OFFERING
          </button>
        </div>
      ) : step === "info" ? (
        <div style={{ padding: "20px 18px 24px" }}>
          <StepRule label="STEP 1 OF 3" fraction={1 / 3} />
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label htmlFor="om-book-name" style={boxedLabel}>Your name</label>
              <input id="om-book-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" autoComplete="name" className="om-input-boxed" style={boxedField} />
            </div>
            <div>
              <label htmlFor="om-book-phone" style={boxedLabel}>Phone</label>
              <input id="om-book-phone" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="(555) 555-1234" autoComplete="tel" className="om-input-boxed" style={boxedField} />
            </div>
            <div>
              <label htmlFor="om-book-email" style={boxedLabel}>
                Email <span style={{ color: "#8c8378" }}>(optional)</span>
              </label>
              <input id="om-book-email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@…" autoComplete="email" className="om-input-boxed" style={boxedField} />
            </div>
            {error && <p style={{ margin: 0, fontSize: 13, color: "#a33a29" }}>{error}</p>}
            <button type="button" onClick={onSubmitInfo} disabled={submitting || !name.trim() || !phone.trim()} className="om-hover-fill-border" style={{ ...nextBtn, marginTop: 4, opacity: !name.trim() || !phone.trim() ? 0.55 : 1 }}>
              {submitting ? "…" : "PICK A TIME"}
            </button>
          </div>
        </div>
      ) : step === "time" ? (
        <div style={{ padding: "20px 18px 24px" }}>
          <StepRule label="STEP 2 OF 3" fraction={2 / 3} />
          <div style={{ marginTop: 16, display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => setView("calendar")}
              style={{
                border: view === "calendar" ? "1px solid #211c19" : "1px solid #d5cdc1",
                background: view === "calendar" ? "#211c19" : "#fffdfa",
                color: view === "calendar" ? "#f4f1ec" : "#574f47",
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.06em",
                cursor: "pointer",
              }}
            >
              CALENDAR
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              style={{
                border: view === "list" ? "1px solid #211c19" : "1px solid #d5cdc1",
                background: view === "list" ? "#211c19" : "#fffdfa",
                color: view === "list" ? "#f4f1ec" : "#574f47",
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.06em",
                cursor: "pointer",
              }}
            >
              LIST
            </button>
          </div>
          <div style={{ marginTop: 16 }}>
            {view === "calendar" ? (
              <CalendarGridView slots={data.slots} selected={selectedSlot} onSelect={setSelectedSlot} />
            ) : (
              <ListView variant="om" slots={data.slots} selected={selectedSlot} onSelect={setSelectedSlot} />
            )}
          </div>
          {error && <p style={{ margin: "12px 0 0", fontSize: 13, color: "#a33a29" }}>{error}</p>}
          <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid #ddd6cc", display: "flex", gap: 10 }}>
            <button type="button" onClick={onBackInfo} className="om-hover-dark" style={backBtn}>
              BACK
            </button>
            <button type="button" onClick={onSubmitTime} disabled={submitting || !selectedSlot} className="om-hover-fill-border" style={{ ...nextBtn, opacity: selectedSlot ? 1 : 0.55 }}>
              {submitting ? "…" : "NEXT"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ padding: "20px 18px 24px" }}>
          <StepRule label="STEP 3 OF 3" fraction={1} />
          <p style={{ margin: "16px 0 0", fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 20, lineHeight: 1.3, color: "#211c19" }}>Help me prepare for this meeting</p>
          {slotLabel && <p style={{ margin: "8px 0 0", fontSize: 15, fontWeight: 600, color: "#211c19" }}>{slotLabel}</p>}
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <span style={boxedLabel}>
                What best describes you? <span style={{ color: "#8c8378" }}>(optional)</span>
              </span>
              <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {BOOKING_CONTACT_TYPE_OPTIONS.map((option) => {
                  const active = contactType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setContactType(active ? "" : option.value)}
                      style={{
                        border: active ? "1px solid #211c19" : "1px solid #d5cdc1",
                        background: active ? "#211c19" : "#fffdfa",
                        color: active ? "#f4f1ec" : "#574f47",
                        padding: "9px 12px",
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label htmlFor="om-book-timeline" style={boxedLabel}>
                Timeline <span style={{ color: "#8c8378" }}>(optional)</span>
              </label>
              <select id="om-book-timeline" value={timeline} onChange={(e) => setTimeline(e.target.value as Timeline | "")} className="om-input-boxed" style={boxedField}>
                <option value="">Not sure yet</option>
                {Object.entries(TIMELINE_LABELS)
                  .filter(([value]) => value !== "unknown")
                  .map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label htmlFor="om-book-questions" style={boxedLabel}>
                Anything you&apos;d like to cover? <span style={{ color: "#8c8378" }}>(optional)</span>
              </label>
              <textarea id="om-book-questions" value={questions} onChange={(e) => setQuestions(e.target.value)} rows={3} className="om-input-boxed" style={{ ...boxedField, minHeight: 64, lineHeight: 1.6, resize: "vertical" }} />
            </div>
            {error && <p style={{ margin: 0, fontSize: 13, color: "#a33a29" }}>{error}</p>}
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={onBackTime} className="om-hover-dark" style={backBtn}>
                BACK
              </button>
              <button type="button" onClick={onSubmitDetails} disabled={submitting} className="om-hover-fill-border" style={nextBtn}>
                {submitting ? "SENDING…" : "REQUEST THIS TIME"}
              </button>
            </div>
            <p style={{ margin: 0, textAlign: "center", fontSize: 12, color: "#6b6259" }}>Caitlyn confirms every request before it&apos;s final.</p>
          </div>
        </div>
      )}
    </div>
  );
}
