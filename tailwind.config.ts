import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Warm (stone-based) neutral scale instead of Tailwind's default
        // cool gray, so every existing bg-neutral-*/text-neutral-*/
        // border-neutral-* class picks up a softer, warmer tone app-wide.
        neutral: colors.stone,
        brand: {
          50: "#fdf3f2",
          100: "#fbe4e1",
          200: "#f6c7c1",
          300: "#eea095",
          400: "#e26e5d",
          500: "#cc4a37",
          600: "#ac3826",
          700: "#8a2c1e",
          800: "#6f261c",
          900: "#5c231c",
        },
        // ColivingCait Nav/Footer tokens (tailwind.config.ts on that site).
        charcoal: {
          DEFAULT: "#1C1917",
          soft: "#2A2725",
        },
        gold: {
          DEFAULT: "#C4955A",
          light: "#E8D5B5",
          dark: "#8B6535",
        },
        cream: "#FAF7F2",
        blush: "#F0E8E0",
        warmgray: {
          DEFAULT: "#6B6560",
          light: "#A09A94",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"],
        // ColivingCait public chrome only (components/public). Not the CRM sans stack.
        heading: ["var(--font-cormorant)", "Cormorant Garamond", "Georgia", "serif"],
        dm: ["var(--font-dm-sans)", "DM Sans", "system-ui", "sans-serif"],
      },
      borderColor: {
        soft: "rgba(28,25,23,0.06)",
      },
      transitionTimingFunction: {
        brand: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      boxShadow: {
        card: "0 1px 2px rgb(120 53 15 / 0.05), 0 10px 24px -14px rgb(120 53 15 / 0.22)",
      },
    },
  },
  plugins: [],
};

export default config;
