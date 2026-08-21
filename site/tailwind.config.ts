import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

// Matches colivingcait.com's palette (warm cream/black/gold), not the CRM's
// red - this site is meant to look like that one, not the internal tool.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        neutral: colors.stone,
        cream: "#F3EEE3",
        ink: "#1C1815",
        brand: {
          50: "#FAF5EA",
          100: "#F3E7CE",
          200: "#E6CD9E",
          300: "#D6B073",
          400: "#C89C5C",
          500: "#B8894A",
          600: "#A67A3F",
          700: "#8A6434",
          800: "#6E4F2A",
          900: "#5A4122",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(28 24 21 / 0.04), 0 1px 3px 0 rgb(28 24 21 / 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
