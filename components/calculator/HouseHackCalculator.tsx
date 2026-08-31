"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { InputsCard, type CalculatorInputs } from "@/components/calculator/InputsCard";
import { ResultCard } from "@/components/calculator/ResultCard";
import { SendPanel } from "@/components/calculator/SendPanel";
import { saveQuote } from "@/app/(app)/numbers/actions";
import { computeHouseHack } from "@/lib/crm/house-hack-calc";

const DEFAULT_INPUTS: CalculatorInputs = {
  propertyAddress: "",
  propertyDescription: "",
  purchasePrice: "",
  downPaymentPct: 3.5,
  interestRatePct: 6.5,
  loanType: "fha_30",
  rentFromOtherUnit: "",
  rentingNow: "",
  taxesAnnual: "",
  insuranceAnnual: "",
};

export function HouseHackCalculator({
  contactId = null,
  firstName = "",
  phone = null,
  email = null,
}: {
  contactId?: string | null;
  firstName?: string;
  phone?: string | null;
  email?: string | null;
}) {
  const [values, setValues] = useState<CalculatorInputs>(DEFAULT_INPUTS);
  const [savedQuote, setSavedQuote] = useState<{ quoteId: string; link: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  function updateValue<K extends keyof CalculatorInputs>(key: K, value: CalculatorInputs[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    if (savedQuote) setDirty(true);
  }

  const breakdown = useMemo(
    () =>
      computeHouseHack({
        purchasePrice: values.purchasePrice === "" ? 0 : values.purchasePrice,
        downPaymentPct: values.downPaymentPct === "" ? 0 : values.downPaymentPct,
        interestRatePct: values.interestRatePct === "" ? 0 : values.interestRatePct,
        loanType: values.loanType,
        rentFromOtherUnit: values.rentFromOtherUnit === "" ? null : values.rentFromOtherUnit,
        taxesAnnual: values.taxesAnnual === "" ? 0 : values.taxesAnnual,
        insuranceAnnual: values.insuranceAnnual === "" ? 0 : values.insuranceAnnual,
        rentingNow: values.rentingNow === "" ? null : values.rentingNow,
      }),
    [values],
  );

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    const result = await saveQuote({
      contactId,
      clientFirstName: firstName,
      propertyAddress: values.propertyAddress,
      propertyDescription: values.propertyDescription,
      purchasePrice: values.purchasePrice === "" ? 0 : values.purchasePrice,
      downPaymentPct: values.downPaymentPct === "" ? 0 : values.downPaymentPct,
      interestRatePct: values.interestRatePct === "" ? 0 : values.interestRatePct,
      loanType: values.loanType,
      rentFromOtherUnit: values.rentFromOtherUnit === "" ? null : values.rentFromOtherUnit,
      rentingNow: values.rentingNow === "" ? null : values.rentingNow,
      taxesAnnual: values.taxesAnnual === "" ? 0 : values.taxesAnnual,
      insuranceAnnual: values.insuranceAnnual === "" ? 0 : values.insuranceAnnual,
    });
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    setSavedQuote({ quoteId: result.quoteId, link: result.link });
    setDirty(false);
  }

  return (
    <div className="flex flex-wrap items-start gap-4">
      <InputsCard values={values} onChange={updateValue} />

      <div className="min-w-[340px] flex-1">
        <ResultCard firstName={firstName} breakdown={breakdown} />

        <div className="mt-3.5 flex items-center gap-2.5">
          <Button onClick={handleSave} disabled={saving || !values.purchasePrice}>
            {saving ? "Saving…" : savedQuote ? "Save again" : "Save quote"}
          </Button>
          {dirty && <span className="text-sm text-amber-700">Numbers changed - save again to update the link.</span>}
        </div>
        {saveError && <p className="mt-2 text-sm text-red-600">{saveError}</p>}

        {savedQuote && !dirty && (
          <SendPanel
            contactId={contactId}
            phone={phone}
            email={email}
            firstName={firstName}
            propertyAddress={values.propertyAddress}
            monthlyOutOfPocket={breakdown.monthlyOutOfPocket}
            link={savedQuote.link}
          />
        )}
      </div>
    </div>
  );
}
