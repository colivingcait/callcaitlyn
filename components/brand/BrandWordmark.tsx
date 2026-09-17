import { cn } from "@/lib/utils";

export function BrandWordmark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <p
      className={cn(
        "font-serif font-semibold tracking-[-0.02em] text-brand-700",
        size === "sm" ? "text-[16px] leading-5" : "text-[18px] leading-6",
        className,
      )}
    >
      CallCaitlyn{" "}
      <span
        className={cn(
          "align-middle font-sans font-semibold uppercase tracking-[0.18em] text-brand-600/75",
          size === "sm" ? "text-[9px]" : "text-[10px]",
        )}
      >
        CRM
      </span>
    </p>
  );
}
