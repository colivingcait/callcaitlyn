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
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(120 53 15 / 0.04), 0 1px 3px 0 rgb(120 53 15 / 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
