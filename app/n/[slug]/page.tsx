"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Home } from "lucide-react";
import { getPublicQuote, recordQuoteView, type PublicQuoteView } from "./actions";
import { formatCurrency, formatPercent } from "@/lib/utils";

const VISITOR_KEY_STORAGE = "qv_visitor_key";

function getVisitorKey(): string {
  try {
    const existing = sessionStorage.getItem(VISITOR_KEY_STORAGE);
    if (existing) return existing;
    const created = crypto.randomUUID();
    sessionStorage.setItem(VISITOR_KEY_STORAGE, created);
    return created;
  } catch {
    // Private browsing / storage blocked - still works, just re-counts as
    // a new view on every reload instead of deduping within the tab.
    return crypto.randomUUID();
  }
}

export default function PublicQuotePage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const isPrint = searchParams.get("print") === "1";

  const [quote, setQuote] = useState<PublicQuoteView | null | "loading">("loading");
  const [investorOpen, setInvestorOpen] = useState(isPrint);
  const printedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    getPublicQuote(params.slug).then((result) => {
      if (cancelled) return;
      setQuote(result);
      if (result) recordQuoteView(params.slug, getVisitorKey());
    });
    return () => {
      cancelled = true;
    };
  }, [params.slug]);

  useEffect(() => {
    if (isPrint && quote && quote !== "loading" && !printedRef.current) {
      printedRef.current = true;
      const timer = setTimeout(() => window.print(), 200);
      return () => clearTimeout(timer);
    }
  }, [isPrint, quote]);

  if (quote === "loading") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-neutral-50">
        <p className="text-neutral-400">Loading…</p>
      </main>
    );
  }

  if (!quote) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-neutral-50 px-4 text-center">
        <p className="text-neutral-500">This link isn&apos;t valid anymore. Ask Caitlyn to send a fresh one.</p>
      </main>
    );
  }

  const firstName = quote.clientFirstName || "you";

  return (
    <main className="min-h-dvh bg-gradient-to-b from-brand-50 via-white to-white px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center gap-2.5">
          <Home size={20} className="shrink-0 text-neutral-500" />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-neutral-900">{quote.propertyAddress || "The numbers"}</p>
            {quote.propertyDescription && <p className="truncate text-sm text-neutral-500">{quote.propertyDescription}</p>}
          </div>
        </div>

        <div className="rounded-3xl border border-neutral-200/70 bg-white p-7 shadow-xl">
          <p className="text-[15px] text-neutral-500">What {firstName} actually pays each month</p>
          <p className="mt-1.5 font-serif text-4xl font-semibold text-neutral-900">{formatCurrency(quote.monthlyOutOfPocket)}</p>
          {quote.comparisonDelta != null && (
            <p className="mt-1 text-base leading-6 text-neutral-600">
              {Math.abs(quote.comparisonDelta) < 25 ? (
                <>That&apos;s about the same as what {firstName} pays now.</>
              ) : quote.comparisonDelta > 0 ? (
                <>
                  That&apos;s <strong className="font-semibold text-neutral-900">{formatCurrency(quote.comparisonDelta)} less</strong> than what{" "}
                  {firstName} pays now.
                </>
              ) : (
                <>
                  That&apos;s <strong className="font-semibold text-neutral-900">{formatCurrency(Math.abs(quote.comparisonDelta))} more</strong> than
                  what {firstName} pays now.
                </>
              )}
            </p>
          )}

          <div className="mt-5 flex flex-col gap-2.5">
            <Row label="Principal and interest" value={formatCurrency(quote.monthlyPrincipalInterest)} />
            <Row label="Taxes and insurance" value={formatCurrency(quote.monthlyTaxesInsurance)} />
            {quote.monthlyMortgageInsurance > 0 && <Row label="Mortgage insurance" value={formatCurrency(quote.monthlyMortgageInsurance)} />}
            {quote.monthlyRentCredit > 0 && <Row label="Rent from the other side" value={`−${formatCurrency(quote.monthlyRentCredit)}`} />}
            <Row label="Maintenance set-aside" value={formatCurrency(quote.monthlyMaintenance)} />
            <div className="flex items-baseline justify-between gap-3 pt-0.5">
              <span className="text-base font-semibold text-neutral-900">Out of pocket</span>
              <span className="text-lg font-semibold text-neutral-900">{formatCurrency(quote.monthlyOutOfPocket)}</span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3.5 border-t border-neutral-100 pt-4">
            <div>
              <p className="text-sm text-neutral-500">Cash to close</p>
              <p className="mt-0.5 font-serif text-xl font-semibold text-neutral-900">{formatCurrency(quote.cashToClose)}</p>
            </div>
            {quote.bothSidesRentedOutOfPocket != null && (
              <div>
                <p className="text-sm text-neutral-500">If both sides rented</p>
                <p className="mt-0.5 font-serif text-xl font-semibold text-neutral-900">{formatCurrency(quote.bothSidesRentedOutOfPocket)}</p>
              </div>
            )}
          </div>

          {quote.investor && (
            <div className="mt-5 overflow-hidden rounded-2xl border border-neutral-200">
              <button
                type="button"
                onClick={() => setInvestorOpen((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-neutral-900"
              >
                Investor view
                <span className="text-neutral-400">{investorOpen ? "−" : "+"}</span>
              </button>
              {investorOpen && (
                <div className="grid grid-cols-3 gap-3 border-t border-neutral-100 px-4 py-3.5">
                  <Metric label="Cap rate" value={formatPercent(quote.investor.capRatePct)} />
                  <Metric label="Cash on cash" value={formatPercent(quote.investor.cashOnCashPct)} />
                  <Metric label="1% rule" value={formatPercent(quote.investor.onePercentRulePct, 2)} />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="no-print mt-6 rounded-2xl bg-white/70 p-4 text-center text-sm text-neutral-500">
          <p className="font-semibold text-neutral-700">Caitlyn Verdugo</p>
          <p className="mt-0.5">
            <a href="tel:+16788848494" className="text-brand-600">
              (678) 884-8494
            </a>{" "}
            ·{" "}
            <a href="mailto:cv.sellshomes@gmail.com" className="text-brand-600">
              cv.sellshomes@gmail.com
            </a>
          </p>
          <p className="mt-2 text-xs text-neutral-400">Use your browser&apos;s Print → Save as PDF to keep a copy of this page.</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-neutral-100 pb-2.5">
      <span className="text-[15px] text-neutral-600">{label}</span>
      <span className="text-[15px] font-semibold text-neutral-900">{value}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-0.5 font-serif text-lg font-semibold text-neutral-900">{value}</p>
    </div>
  );
}
