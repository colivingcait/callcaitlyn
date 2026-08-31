"use client";

import { X } from "lucide-react";
import { HouseHackCalculator } from "@/components/calculator/HouseHackCalculator";

export function HouseHackCalculatorModal({
  contactId,
  firstName,
  phone,
  email,
  onClose,
}: {
  contactId: string;
  firstName: string;
  phone: string | null;
  email: string | null;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4">
          <div>
            <p className="font-serif text-xl font-semibold text-neutral-900">House hack numbers</p>
            <p className="mt-0.5 text-xs text-neutral-500">For {firstName || "this contact"} · saves to their record when you send it</p>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">
          <HouseHackCalculator contactId={contactId} firstName={firstName} phone={phone} email={email} />
        </div>
      </div>
    </div>
  );
}
