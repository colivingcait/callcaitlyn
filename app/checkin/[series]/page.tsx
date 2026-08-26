"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { searchContacts, submitCheckIn, type ContactMatch } from "./actions";

const SERIES_TITLES: Record<string, string> = {
  house_hacking: "House Hacking Meetup",
  womens_rei: "Women's REI Meetup",
};

// "See more events" destination per series - real Eventbrite organizer/
// event pages already in use elsewhere in her ecosystem, not guessed.
const SERIES_EVENTS_URL: Record<string, string> = {
  house_hacking: "https://www.eventbrite.com/cc/house-hacking-atl-4861227",
  womens_rei: "https://www.eventbrite.com/e/women-real-estate-investors-meetup-tickets-1990612059255",
};

const NETWORKING_TIPS = [
  "Ask one person tonight what deal they're most excited about right now.",
  "The best connections come from following up within 48 hours - send that text tomorrow.",
  "Don't just collect contacts - ask how you can actually help someone here.",
  "Your next deal, lender, or contractor might be standing three feet away.",
  "Introduce two people who don't know each other yet - it's the fastest way to become memorable.",
  "Ask someone what mistake they'd avoid if they started over today.",
  "The quietest person in the room often has the best story - go find them.",
  "Trade numbers, not just Instagram handles - a real conversation beats a follow.",
];

// Some registrations come in ALL CAPS or all lowercase - never guessed at
// their real preferred casing, but "WELCOME BACK, JOHN!" reads like
// shouting, so this is purely a display normalization, not a data change.
function titleCase(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

type Step =
  | { name: "name-entry" }
  | { name: "picking"; candidates: ContactMatch[] }
  | { name: "matched"; contact: ContactMatch }
  | { name: "not-found"; firstName: string; lastName: string }
  | { name: "done"; alreadyCheckedIn: boolean };

export default function CheckInPage() {
  const params = useParams<{ series: string }>();
  const series = params.series;
  const title = SERIES_TITLES[series] ?? "Meetup";
  const eventsUrl = SERIES_EVENTS_URL[series];
  const validSeries = series === "house_hacking" || series === "womens_rei";
  const tip = useMemo(() => NETWORKING_TIPS[Math.floor(Math.random() * NETWORKING_TIPS.length)], []);

  const [step, setStep] = useState<Step>({ name: "name-entry" });
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingInfo, setEditingInfo] = useState(false);

  // Fields collected in the matched flow (only shown/required if missing
  // from the contact on file, unless "Edit my info" is toggled on) and the
  // not-found flow (always required).
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [howHeard, setHowHeard] = useState("");

  function resetToNameEntry() {
    setEditingInfo(false);
    setError(null);
    setStep({ name: "name-entry" });
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;
    setSearching(true);
    setError(null);
    const results = await searchContacts(firstName, lastName);
    setSearching(false);

    if (results.length === 0) {
      setStep({ name: "not-found", firstName: firstName.trim(), lastName: lastName.trim() });
    } else if (results.length === 1) {
      selectMatch(results[0]);
    } else {
      setStep({ name: "picking", candidates: results });
    }
  }

  function selectMatch(contact: ContactMatch) {
    setEmail(contact.email ?? "");
    setPhone(contact.phone ?? "");
    setEditingInfo(false);
    setStep({ name: "matched", contact });
  }

  async function handleCheckIn() {
    setSubmitting(true);
    setError(null);

    const isNotFound = step.name === "not-found";
    const outcome = await submitCheckIn(series, {
      contactId: step.name === "matched" ? step.contact.id : undefined,
      firstName: isNotFound ? step.firstName : "",
      lastName: isNotFound ? step.lastName : "",
      email: email.trim(),
      phone: phone.trim(),
      howHeard: isNotFound ? howHeard.trim() : undefined,
    });

    setSubmitting(false);
    if (outcome.ok) {
      setStep({ name: "done", alreadyCheckedIn: outcome.alreadyCheckedIn });
    } else {
      setError(outcome.error);
    }
  }

  if (!validSeries) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-neutral-50 px-4 text-center">
        <p className="text-neutral-500">This check-in link isn&apos;t valid. Ask an organizer for the right one.</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-brand-50 via-white to-white px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <h1 className="font-serif text-3xl font-bold text-neutral-900 sm:text-4xl">{title}</h1>
          <p className="mt-2 text-lg text-neutral-500">Welcome! Check in below 👇</p>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-neutral-200/70 bg-white p-7 shadow-xl">
          {step.name === "done" && <Confetti />}

          {step.name === "name-entry" && (
            <form onSubmit={handleSearch} className="space-y-4">
              <Field label="First name" value={firstName} onChange={setFirstName} autoFocus autoComplete="given-name" />
              <Field label="Last name" value={lastName} onChange={setLastName} autoComplete="family-name" />
              <SubmitButton disabled={searching || !firstName.trim() || !lastName.trim()}>
                {searching ? "Searching…" : "Find me"}
              </SubmitButton>
            </form>
          )}

          {step.name === "picking" && (
            <div className="space-y-4">
              <p className="text-lg text-neutral-700">Which one is you?</p>
              <div className="space-y-2.5">
                {step.candidates.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectMatch(c)}
                    className="w-full rounded-2xl border-2 border-neutral-200 px-5 py-4 text-left text-lg font-medium text-neutral-800 hover:border-brand-500 hover:bg-brand-50"
                  >
                    {titleCase(c.firstName)} {titleCase(c.lastName)}
                  </button>
                ))}
              </div>
              <button onClick={resetToNameEntry} className="text-base text-neutral-400 underline underline-offset-2">
                That&apos;s not me - search again
              </button>
            </div>
          )}

          {step.name === "matched" && (
            <div className="space-y-4">
              <p className="text-lg text-neutral-700">
                Welcome back, <span className="font-bold text-neutral-900">{titleCase(step.contact.firstName)}</span>! 👋
              </p>

              {(!step.contact.email || editingInfo) && (
                <Field label="Email" type="email" value={email} onChange={setEmail} autoFocus autoComplete="email" />
              )}
              {(!step.contact.phone || editingInfo) && (
                <Field label="Phone" type="tel" value={phone} onChange={setPhone} autoComplete="tel" />
              )}

              {step.contact.email && !editingInfo && <p className="text-base text-neutral-400">{step.contact.email}</p>}
              {step.contact.phone && !editingInfo && <p className="text-base text-neutral-400">{step.contact.phone}</p>}

              {error && <p className="text-base text-red-600">{error}</p>}

              <SubmitButton onClick={handleCheckIn} disabled={submitting || !email.trim() || !phone.trim()}>
                {submitting ? "Checking in…" : "Check In"}
              </SubmitButton>

              <div className="flex justify-center gap-4 pt-1">
                {!editingInfo && (step.contact.email || step.contact.phone) && (
                  <button onClick={() => setEditingInfo(true)} className="text-base text-neutral-400 underline underline-offset-2">
                    Edit my info
                  </button>
                )}
                <button onClick={resetToNameEntry} className="text-base text-neutral-400 underline underline-offset-2">
                  That&apos;s not me
                </button>
              </div>
            </div>
          )}

          {step.name === "not-found" && (
            <div className="space-y-4">
              <p className="text-lg text-neutral-700">
                We don&apos;t have you on file yet, <span className="font-bold text-neutral-900">{step.firstName}</span> - just a couple more
                things:
              </p>
              <Field label="Email" type="email" value={email} onChange={setEmail} autoFocus autoComplete="email" />
              <Field label="Phone" type="tel" value={phone} onChange={setPhone} autoComplete="tel" />
              <Field label="How did you hear about us?" value={howHeard} onChange={setHowHeard} />
              {error && <p className="text-base text-red-600">{error}</p>}
              <SubmitButton onClick={handleCheckIn} disabled={submitting || !email.trim() || !phone.trim() || !howHeard.trim()}>
                {submitting ? "Checking in…" : "Check In"}
              </SubmitButton>
              <button onClick={resetToNameEntry} className="block text-base text-neutral-400 underline underline-offset-2">
                Wrong name? Search again
              </button>
            </div>
          )}

          {step.name === "done" && (
            <div className="py-3 text-center">
              <p className="text-6xl">🎉</p>
              <p className="mt-4 font-serif text-2xl font-bold text-neutral-900">
                {step.alreadyCheckedIn ? "You're checked in!" : "Welcome to the meetup!"}
              </p>
              <p className="mt-1 text-lg text-neutral-500">So glad you&apos;re here.</p>

              <div className="mt-6 rounded-2xl bg-brand-50 p-4 text-left">
                <p className="text-xs font-bold uppercase tracking-wide text-brand-600">Tonight&apos;s networking tip</p>
                <p className="mt-1.5 text-base text-neutral-700">{tip}</p>
              </div>

              {eventsUrl && (
                <a
                  href={eventsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-block text-base font-semibold text-brand-600 underline underline-offset-2"
                >
                  See more upcoming events →
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoFocus,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoFocus?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-neutral-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        inputMode={type === "tel" ? "tel" : type === "email" ? "email" : undefined}
        className="w-full rounded-2xl border-2 border-neutral-200 px-4 py-3.5 text-lg outline-none focus:border-brand-500"
      />
    </label>
  );
}

function SubmitButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type={onClick ? "button" : "submit"}
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-2xl bg-neutral-900 px-4 py-4 text-lg font-bold text-white disabled:opacity-40"
    >
      {children}
    </button>
  );
}

const CONFETTI_COLORS = ["#f472b6", "#facc15", "#4ade80", "#60a5fa", "#a78bfa", "#fb923c"];

// A small self-contained confetti burst - no external library, just a
// handful of divs falling via CSS keyframes. Purely decorative, so it's
// fine that it doesn't respect any particular seed/determinism.
function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        duration: 2.2 + Math.random() * 1.4,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotate: Math.random() * 360,
      })),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10%) rotate(0deg); opacity: 1; }
          100% { transform: translateY(700%) rotate(360deg); opacity: 0; }
        }
      `}</style>
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            top: 0,
            left: `${p.left}%`,
            width: 8,
            height: 14,
            backgroundColor: p.color,
            transform: `rotate(${p.rotate}deg)`,
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}
