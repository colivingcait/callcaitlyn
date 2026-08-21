"use client";

import { useState } from "react";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";

type Status = "idle" | "sending" | "sent" | "error";

function useLeadSubmit(formType: "buy" | "sell") {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function submit(email: string, fields: { label: string; value: string }[]) {
    setStatus("sending");
    setErrorMessage("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formType, email, fields }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Something went wrong");
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return { status, errorMessage, submit };
}

function SentCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200/70 bg-white p-8 text-center shadow-card">
      <p className="font-serif text-lg text-neutral-900">Thanks!</p>
      <p className="mt-2 text-sm text-neutral-600">{message}</p>
    </div>
  );
}

export function BuyForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [notes, setNotes] = useState("");
  const { status, errorMessage, submit } = useLeadSubmit("buy");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit(email, [
      { label: "First name", value: firstName },
      { label: "Last name", value: lastName },
      { label: "Email", value: email },
      { label: "Phone", value: phone },
      { label: "What are you looking for?", value: lookingFor },
      { label: "Price range", value: priceRange },
      { label: "Anything else?", value: notes },
    ]);
  }

  if (status === "sent") {
    return <SentCard message="I'll reach out to start the conversation." />;
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-neutral-200/70 bg-white p-6 shadow-card sm:p-8">
      <h3 className="font-serif text-xl font-semibold text-neutral-900">I&apos;m Looking to Buy</h3>
      <p className="mt-1 text-sm text-neutral-500">Share a few details and I&apos;ll reach out to start the conversation.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="buy-first">First name</Label>
          <Input id="buy-first" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="buy-last">Last name</Label>
          <Input id="buy-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
      </div>
      <div className="mt-4">
        <Label htmlFor="buy-email">Email</Label>
        <Input id="buy-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </div>
      <div className="mt-4">
        <Label htmlFor="buy-phone">Phone</Label>
        <Input id="buy-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(000) 000-0000" />
      </div>
      <div className="mt-4">
        <Label htmlFor="buy-looking-for">What are you looking for?</Label>
        <Select id="buy-looking-for" value={lookingFor} onChange={(e) => setLookingFor(e.target.value)}>
          <option value="">Select one…</option>
          <option value="A house hack">A house hack</option>
          <option value="A coliving property">A coliving property</option>
          <option value="An investment property">An investment property</option>
          <option value="A primary residence">A primary residence</option>
        </Select>
      </div>
      <div className="mt-4">
        <Label htmlFor="buy-price-range">Price range</Label>
        <Select id="buy-price-range" value={priceRange} onChange={(e) => setPriceRange(e.target.value)}>
          <option value="">Select a range…</option>
          <option value="Under $250k">Under $250k</option>
          <option value="$250k–$400k">$250k–$400k</option>
          <option value="$400k–$600k">$400k–$600k</option>
          <option value="$600k+">$600k+</option>
        </Select>
      </div>
      <div className="mt-4">
        <Label htmlFor="buy-notes">Anything else?</Label>
        <Textarea
          id="buy-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Timeline, must-haves, questions…"
        />
      </div>

      {status === "error" && <p className="mt-3 text-sm text-red-600">{errorMessage}</p>}

      <Button type="submit" variant="gold" className="mt-6 w-full" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Submit"}
      </Button>
    </form>
  );
}

export function SellForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [considering, setConsidering] = useState("");
  const [notes, setNotes] = useState("");
  const { status, errorMessage, submit } = useLeadSubmit("sell");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit(email, [
      { label: "First name", value: firstName },
      { label: "Last name", value: lastName },
      { label: "Email", value: email },
      { label: "Phone", value: phone },
      { label: "Property address", value: address },
      { label: "What are you considering?", value: considering },
      { label: "Anything else?", value: notes },
    ]);
  }

  if (status === "sent") {
    return <SentCard message="I'll reach out to discuss your options." />;
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-neutral-200/70 bg-white p-6 shadow-card sm:p-8">
      <h3 className="font-serif text-xl font-semibold text-neutral-900">I&apos;m Thinking About Selling</h3>
      <p className="mt-1 text-sm text-neutral-500">Tell me about your property and I&apos;ll reach out to discuss your options.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="sell-first">First name</Label>
          <Input id="sell-first" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="sell-last">Last name</Label>
          <Input id="sell-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
      </div>
      <div className="mt-4">
        <Label htmlFor="sell-email">Email</Label>
        <Input id="sell-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </div>
      <div className="mt-4">
        <Label htmlFor="sell-phone">Phone</Label>
        <Input id="sell-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(000) 000-0000" />
      </div>
      <div className="mt-4">
        <Label htmlFor="sell-address">Property address</Label>
        <Input id="sell-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address, city, state, zip" />
      </div>
      <div className="mt-4">
        <Label htmlFor="sell-considering">What are you considering?</Label>
        <Select id="sell-considering" value={considering} onChange={(e) => setConsidering(e.target.value)}>
          <option value="">Select one…</option>
          <option value="Listing it for sale">Listing it for sale</option>
          <option value="Leasing it for coliving">Leasing it for coliving</option>
          <option value="Not sure yet">Not sure yet</option>
        </Select>
      </div>
      <div className="mt-4">
        <Label htmlFor="sell-notes">Anything else?</Label>
        <Textarea
          id="sell-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Timeline, property details, questions…"
        />
      </div>

      {status === "error" && <p className="mt-3 text-sm text-red-600">{errorMessage}</p>}

      <Button type="submit" variant="gold" className="mt-6 w-full" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Submit"}
      </Button>
    </form>
  );
}
