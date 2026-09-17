import { HouseHackCalculator } from "@/components/calculator/HouseHackCalculator";

export default function NumbersPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-[28px]">House hack numbers</h1>
      <p className="mt-1 text-[15px] text-neutral-500">Run it cold, or open this from a contact&apos;s page to save the quote to their record.</p>
      <div className="mt-5">
        <HouseHackCalculator />
      </div>
    </div>
  );
}
