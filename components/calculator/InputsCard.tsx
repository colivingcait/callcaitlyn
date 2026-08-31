"use client";

import { useState } from "react";
import { Home } from "lucide-react";
import { Input, Select } from "@/components/ui";
import type { LoanType } from "@/types/database";

export type CalculatorInputs = {
  propertyAddress: string;
  propertyDescription: string;
  purchasePrice: number | "";
  downPaymentPct: number | "";
  interestRatePct: number | "";
  loanType: LoanType;
  rentFromOtherUnit: number | "";
  rentingNow: number | "";
  taxesAnnual: number | "";
  insuranceAnnual: number | "";
};

const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  fha_30: "FHA · 30 year",
  conventional_30: "Conventional · 30 year",
  conventional_15: "Conventional · 15 year",
};

export function InputsCard({ values, onChange }: { values: CalculatorInputs; onChange: <K extends keyof CalculatorInputs>(key: K, value: CalculatorInputs[K]) => void }) {
  const [rentingNowOpen, setRentingNowOpen] = useState(values.rentingNow !== "");

  return (
    <div className="w-full max-w-[400px] shrink-0 rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center gap-2.5">
        <Home size={17} className="shrink-0 text-neutral-500" />
        <input
          value={values.propertyAddress}
          onChange={(e) => onChange("propertyAddress", e.target.value)}
          placeholder="Property address"
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-base font-semibold text-neutral-900 outline-none placeholder:text-neutral-400"
        />
      </div>
      <input
        value={values.propertyDescription}
        onChange={(e) => onChange("propertyDescription", e.target.value)}
        placeholder="Duplex · 2 bed each side · built 1948"
        className="mt-1 w-full border-0 bg-transparent p-0 text-[15px] text-neutral-500 outline-none placeholder:text-neutral-400"
      />

      <div className="mt-4 flex flex-col gap-3.5">
        <Field label="Purchase price">
          <Input
            type="number"
            value={values.purchasePrice}
            onChange={(e) => onChange("purchasePrice", e.target.value === "" ? "" : Number(e.target.value))}
            className="font-semibold"
          />
        </Field>
        <div className="flex gap-3">
          <Field label="Down payment %">
            <Input type="number" step="0.5" value={values.downPaymentPct} onChange={(e) => onChange("downPaymentPct", e.target.value === "" ? "" : Number(e.target.value))} />
          </Field>
          <Field label="Rate %">
            <Input type="number" step="0.125" value={values.interestRatePct} onChange={(e) => onChange("interestRatePct", e.target.value === "" ? "" : Number(e.target.value))} />
          </Field>
        </div>
        <Field label="Loan type">
          <Select value={values.loanType} onChange={(e) => onChange("loanType", e.target.value as LoanType)}>
            {Object.entries(LOAN_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <div>
          <Field label="Rent from the other unit">
            <Input
              type="number"
              value={values.rentFromOtherUnit}
              onChange={(e) => onChange("rentFromOtherUnit", e.target.value === "" ? "" : Number(e.target.value))}
              className="font-semibold"
            />
          </Field>
          {!rentingNowOpen ? (
            <button type="button" onClick={() => setRentingNowOpen(true)} className="mt-1.5 text-sm text-brand-600">
              Renting now? add what they pay →
            </button>
          ) : (
            <div className="mt-2">
              <Field label="What they pay renting now">
                <Input type="number" value={values.rentingNow} onChange={(e) => onChange("rentingNow", e.target.value === "" ? "" : Number(e.target.value))} />
              </Field>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <Field label="Taxes / year">
            <Input type="number" value={values.taxesAnnual} onChange={(e) => onChange("taxesAnnual", e.target.value === "" ? "" : Number(e.target.value))} />
          </Field>
          <Field label="Insurance / year">
            <Input type="number" value={values.insuranceAnnual} onChange={(e) => onChange("insuranceAnnual", e.target.value === "" ? "" : Number(e.target.value))} />
          </Field>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-neutral-200 bg-[#fcfbfa] p-3.5">
        <p className="text-sm leading-5 text-neutral-600">Taxes come from the county record. Rent is an estimate — always yours to overwrite before you send it.</p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0 flex-1">
      <span className="mb-1.5 block text-sm text-neutral-500">{label}</span>
      {children}
    </label>
  );
}
