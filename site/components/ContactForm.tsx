"use client";

import { useState } from "react";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { CRM_SITE_FORM_URL, CRM_SITE_KEY } from "@/lib/crm";

type Status = "idle" | "sending" | "sent" | "error";

const INTEREST_LABELS: Record<string, string> = {
  house_hacking: "House hacking",
  coliving: "Coliving / room rental",
  buy_sell: "Buying or selling",
  other: "Something else",
};

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [interest, setInterest] = useState("house_hacking");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    try {
      const res = await fetch(CRM_SITE_FORM_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site: CRM_SITE_KEY,
          form: "contact",
          email,
          name,
          phone,
          message,
          fields: { interest: INTEREST_LABELS[interest] ?? interest },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Something went wrong");
      setStatus("sent");
    } catch {
      setStatus("error");
      setErrorMessage("Couldn't send that — please try again, or email me directly.");
    }
  }

  if (status === "sent") {
    return (
      <div className="border border-brand bg-white p-8 text-center">
        <p className="font-heading text-lg text-charcoal">Thanks for reaching out!</p>
        <p className="mt-2 text-sm text-warmgray">I&apos;ll get back to you as soon as I can.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 border border-brand bg-white p-6 sm:p-8">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(404) 555-0100"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="interest">I&apos;m interested in</Label>
        <Select id="interest" value={interest} onChange={(e) => setInterest(e.target.value)}>
          <option value="house_hacking">House hacking (buying my first property)</option>
          <option value="coliving">Coliving / room rental</option>
          <option value="buy_sell">Buying or selling</option>
          <option value="other">Something else</option>
        </Select>
      </div>

      <div>
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What are you hoping to do, and what's your timeline?"
        />
      </div>

      {status === "error" && <p className="text-sm text-red-700">{errorMessage}</p>}

      <Button type="submit" size="lg" variant="primary" className="w-full" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Send Message"}
      </Button>
    </form>
  );
}
