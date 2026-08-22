import Link from "next/link";
import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from "react";

type ButtonVariant = "primary" | "gold" | "outline" | "outline-light" | "white";
type ButtonSize = "sm" | "md" | "lg";

// Every filled variant "wipes" in its hover fill color via an absolutely
// positioned panel that slides from -translate-x-full to translate-x-0
// on group-hover, rather than just cross-fading a background-color -
// ColivingCait's signature button treatment.
const WIPE_FILL: Partial<Record<ButtonVariant, string>> = {
  primary: "bg-gold",
  outline: "bg-charcoal",
};

function buttonClasses(variant: ButtonVariant, size: ButtonSize, className?: string) {
  return cn(
    "group relative inline-flex items-center justify-center gap-2 overflow-hidden font-sans font-medium uppercase tracking-button transition-all duration-500 ease-brand disabled:opacity-50 disabled:pointer-events-none",
    size === "sm" && "px-5 py-2 text-[10px]",
    size === "md" && "px-8 py-3.5 text-[11px]",
    size === "lg" && "px-10 py-[18px] text-[11px]",
    variant === "primary" && "bg-charcoal text-white hover:-translate-y-[3px] hover:shadow-btnGold",
    variant === "gold" && "bg-gold text-white hover:-translate-y-[3px] hover:bg-gold-dark",
    variant === "outline" && "border border-charcoal text-charcoal hover:-translate-y-[3px] hover:text-white",
    variant === "outline-light" && "border border-white/30 text-white hover:border-white hover:bg-white/[0.08]",
    variant === "white" && "bg-white text-charcoal hover:-translate-y-[3px] hover:shadow-card",
    className,
  );
}

function ButtonWipe({ variant }: { variant: ButtonVariant }) {
  const fill = WIPE_FILL[variant];
  if (!fill) return null;
  return (
    <span
      aria-hidden
      className={cn("absolute inset-0 z-0 -translate-x-full transition-transform duration-500 ease-wipe group-hover:translate-x-0", fill)}
    />
  );
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }
>(({ className, variant = "primary", size = "md", children, ...props }, ref) => (
  <button ref={ref} className={buttonClasses(variant, size, className)} {...props}>
    <ButtonWipe variant={variant} />
    <span className="relative z-10 flex items-center gap-2">{children}</span>
  </button>
));
Button.displayName = "Button";

// Same visuals as Button, but a real <a> (via next/link) - for CTAs that
// navigate rather than submit. Never nest an actual <button> inside a
// <Link>'s <a>; this renders one element instead of two.
export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <Link href={href} className={buttonClasses(variant, size, className)} {...props}>
      <ButtonWipe variant={variant} />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </Link>
  );
}

// Same as LinkButton, for external URLs (a plain <a>, not next/link).
export function AnchorButton({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <a className={buttonClasses(variant, size, className)} {...props}>
      <ButtonWipe variant={variant} />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </a>
  );
}

// Uses next/link so internal hrefs get client-side routing - Link renders
// a plain external-looking <a> fine for absolute URLs too, so this covers
// both "Learn more" internal links and "Visit CoLivingCait" external ones.
// The arrow is a separate span (not appended to the label text) so the
// container's gap - and its hover-widening - actually has two children to
// act on; only the label is underlined, not the arrow.
export function TextLink({ className, children, ...props }: React.ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "group inline-flex items-center gap-1.5 font-sans text-sm font-medium text-gold transition-all duration-300 hover:gap-2.5",
        className,
      )}
      {...props}
    >
      <span className="underline decoration-gold/30 underline-offset-4 group-hover:decoration-gold">{children}</span>
      <span aria-hidden>→</span>
    </Link>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full border border-soft bg-white px-4 py-3 font-sans text-base text-charcoal placeholder:text-warmgray-light focus:border-gold focus:outline-none",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full border border-soft bg-white px-4 py-3 font-sans text-base text-charcoal placeholder:text-warmgray-light focus:border-gold focus:outline-none",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "w-full min-w-0 truncate border border-soft bg-white px-4 py-3 font-sans text-base text-charcoal focus:border-gold focus:outline-none",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block font-sans text-[11px] font-medium uppercase tracking-wide text-warmgray", className)}
      {...props}
    />
  );
}

type CardTone = "cream" | "charcoal" | "blush" | "white" | "transparent";

const CARD_TONES: Record<CardTone, string> = {
  cream: "bg-cream",
  blush: "bg-blush",
  white: "bg-white",
  charcoal: "bg-charcoal text-white",
  transparent: "bg-transparent",
};

// No padding baked in on purpose - callers specify it (p-8 md:p-10 per
// the design system's default, or smaller for denser grids) since a
// plain className string can't reliably override a conflicting Tailwind
// utility already in the component's own class list.
export function Card({ className, tone = "white", ...props }: React.HTMLAttributes<HTMLDivElement> & { tone?: CardTone }) {
  return <div className={cn("border border-brand", CARD_TONES[tone], className)} {...props} />;
}
