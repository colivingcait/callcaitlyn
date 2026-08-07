"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Label } from "@/components/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-neutral-900">CallCaitlyn CRM</h1>
          <p className="mt-1 text-sm text-neutral-500">Sign in to manage your leads and clients.</p>
        </div>

        {status === "sent" ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center">
            <p className="text-sm text-neutral-700">
              Check <span className="font-medium">{email}</span> for a sign-in link.
            </p>
            <Button variant="ghost" className="mt-4" onClick={() => setStatus("idle")}>
              Use a different email
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-2xl border border-neutral-200 bg-white p-6">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {status === "error" && (
              <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
            )}
            <Button type="submit" className="mt-4 w-full" disabled={status === "sending"}>
              {status === "sending" ? "Sending link…" : "Send sign-in link"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
