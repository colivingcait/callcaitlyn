import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from "react";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary"; size?: "md" | "lg" }
>(({ className, variant = "primary", size = "md", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
      size === "md" && "px-4 py-2.5 text-sm",
      size === "lg" && "px-5 py-3.5 text-base",
      variant === "primary" && "bg-brand-600 text-white hover:bg-brand-700",
      variant === "secondary" && "bg-white text-neutral-800 border border-neutral-200 hover:bg-neutral-50",
      className,
    )}
    {...props}
  />
));
Button.displayName = "Button";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100",
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
        "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100",
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
        "w-full min-w-0 truncate rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-base text-neutral-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100",
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
  return <label className={cn("mb-1.5 block text-sm font-medium text-neutral-700", className)} {...props} />;
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-card", className)} {...props} />;
}
