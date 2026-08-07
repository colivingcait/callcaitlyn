import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
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
      },
    },
  },
  plugins: [],
};

export default config;
