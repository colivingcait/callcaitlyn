import { HouseHackCalculator } from "@/components/calculator/HouseHackCalculator";

export default function NumbersPage() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-[1400px] px-5 py-6 lg:px-8 lg:py-8">
      <h1 className="font-display text-[32px] font-semibold tracking-[-0.03em] text-neutral-900">House hack numbers</h1>
      <p className="mt-1 text-[15px] text-neutral-500">Run it cold, or open this from a contact&apos;s page to save the quote to their record.</p>
      <div className="mt-5">
        <HouseHackCalculator />
      </div>
    </div>
  );
}
