"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { searchContacts, submitCheckIn, type ContactMatch } from "./actions";

const SERIES_TITLES: Record<string, string> = {
  house_hacking: "House Hacking Meetup",
  womens_rei: "Women's REI Meetup",
};

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
  const validSeries = series === "house_hacking" || series === "womens_rei";

  const [step, setStep] = useState<Step>({ name: "name-entry" });
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fields collected in the matched flow (only shown/required if missing
  // from the contact on file) and the not-found flow (always required).
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [howHeard, setHowHeard] = useState("");

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
    <main className="flex min-h-dvh items-center justify-center bg-neutral-50 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="font-serif text-2xl font-semibold text-neutral-900">{title}</h1>
          <p className="mt-1 text-sm text-neutral-500">Check in below</p>
        </div>

        <div className="rounded-2xl border border-neutral-200/70 bg-white p-6 shadow-card">
          {step.name === "name-entry" && (
            <form onSubmit={handleSearch} className="space-y-3">
              <Field label="First name" value={firstName} onChange={setFirstName} autoFocus />
              <Field label="Last name" value={lastName} onChange={setLastName} />
              <SubmitButton disabled={searching || !firstName.trim() || !lastName.trim()}>
                {searching ? "Searching…" : "Find me"}
              </SubmitButton>
            </form>
          )}

          {step.name === "picking" && (
            <div className="space-y-3">
              <p className="text-sm text-neutral-600">Which one is you?</p>
              <div className="space-y-2">
                {step.candidates.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectMatch(c)}
                    className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-left text-sm font-medium text-neutral-800 hover:border-brand-500 hover:bg-brand-50"
                  >
                    {c.firstName} {c.lastName}
                  </button>
                ))}
              </div>
              <button onClick={() => setStep({ name: "not-found", firstName, lastName })} className="text-xs text-neutral-400 underline">
                None of these are me
              </button>
            </div>
          )}

          {step.name === "matched" && (
            <div className="space-y-3">
              <p className="text-sm text-neutral-600">
                Welcome back, <span className="font-semibold text-neutral-900">{step.contact.firstName}</span>!
              </p>
              {!step.contact.email && <Field label="Email" type="email" value={email} onChange={setEmail} autoFocus />}
              {!step.contact.phone && <Field label="Phone" type="tel" value={phone} onChange={setPhone} />}
              {step.contact.email && <p className="text-xs text-neutral-400">{step.contact.email}</p>}
              {step.contact.phone && <p className="text-xs text-neutral-400">{step.contact.phone}</p>}
              {error && <p className="text-xs text-red-600">{error}</p>}
              <SubmitButton
                onClick={handleCheckIn}
                disabled={submitting || (!step.contact.email && !email.trim()) || (!step.contact.phone && !phone.trim())}
              >
                {submitting ? "Checking in…" : "Check In"}
              </SubmitButton>
            </div>
          )}

          {step.name === "not-found" && (
            <div className="space-y-3">
              <p className="text-sm text-neutral-600">
                We don&apos;t have you on file yet, <span className="font-semibold text-neutral-900">{step.firstName}</span> - just a couple more
                things:
              </p>
              <Field label="Email" type="email" value={email} onChange={setEmail} autoFocus />
              <Field label="Phone" type="tel" value={phone} onChange={setPhone} />
              <Field label="How did you hear about us?" value={howHeard} onChange={setHowHeard} />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <SubmitButton onClick={handleCheckIn} disabled={submitting || !email.trim() || !phone.trim() || !howHeard.trim()}>
                {submitting ? "Checking in…" : "Check In"}
              </SubmitButton>
            </div>
          )}

          {step.name === "done" && (
            <div className="py-4 text-center">
              <p className="text-3xl">🎉</p>
              <p className="mt-3 text-base font-semibold text-neutral-900">
                {step.alreadyCheckedIn ? "You're already checked in!" : "You're checked in!"}
              </p>
              <p className="mt-1 text-sm text-neutral-500">Enjoy the meetup.</p>
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-neutral-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-500"
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
      className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
    >
      {children}
    </button>
  );
}
