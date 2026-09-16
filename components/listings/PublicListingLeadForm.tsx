"use client";

import { useState } from "react";
import { requestListingPacket } from "@/app/listing/[slug]/actions";

export function PublicListingLeadForm({ slug }: { slug: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const result = await requestListingPacket(slug, { name, phone, email });
    setSubmitting(false);
    if (!result.ok) setError(result.error);
    else setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-center">
        <p className="font-semibold text-neutral-900">Check your email and phone</p>
        <p className="mt-1 text-sm text-neutral-600">The full financial packet is on its way.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-neutral-200 bg-white p-5">
      <p className="font-semibold text-neutral-900">Get the full financial packet</p>
      <p className="mt-0.5 text-sm text-neutral-500">Earnings statement and T12 — sent straight to your email and phone.</p>
      <div className="mt-3 space-y-2.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          required
          className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-[15px]"
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-[15px]"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-[15px]"
        />
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="mt-3 w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Send me the packet"}
      </button>
    </form>
  );
}
