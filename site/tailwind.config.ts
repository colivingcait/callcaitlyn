import type { Config } from "tailwindcss";

// Ported from ColivingCait's own DESIGNSYSTEM.md - "editorial luxury
// real-estate": warm neutrals, one gold accent, square corners throughout,
// Cormorant Garamond headings paired with DM Sans body/UI.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        charcoal: { DEFAULT: "#1C1917", soft: "#2A2725" },
        gold: { DEFAULT: "#C4955A", light: "#E8D5B5", dark: "#8B6535" },
        cream: "#FAF7F2",
        blush: "#F0E8E0",
        warmgray: { DEFAULT: "#6B6560", light: "#A09A94" },
      },
      borderColor: {
        brand: "rgba(196,149,90,0.15)",
        soft: "rgba(28,25,23,0.06)",
      },
      fontFamily: {
        heading: ["var(--font-cormorant)", "Cormorant Garamond", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "DM Sans", "system-ui", "sans-serif"],
      },
      fontSize: {
        hero: ["clamp(44px, 5vw, 72px)", { lineHeight: "1.08" }],
        "h2-lg": ["clamp(30px, 3.2vw, 44px)", { lineHeight: "1.1" }],
        h2: ["clamp(30px, 3vw, 42px)", { lineHeight: "1.1" }],
        h3: ["clamp(24px, 2.4vw, 32px)", { lineHeight: "1.1" }],
      },
      letterSpacing: { eyebrow: "0.2em", button: "0.12em" },
      lineHeight: { heading: "1.08", body: "1.8" },
      borderRadius: {
        none: "0",
        DEFAULT: "0",
        sm: "0",
        md: "0",
        lg: "0",
        xl: "0",
        "2xl": "0",
        "3xl": "0",
        full: "0",
      },
      boxShadow: {
        card: "0 12px 32px rgba(28,25,23,0.04)",
        cardGold: "0 16px 40px rgba(196,149,90,0.08)",
        btnGold: "0 16px 40px rgba(196,149,90,0.2)",
        photo: "0 12px 40px rgba(28,25,23,0.08)",
      },
      maxWidth: { page: "1320px" },
      transitionTimingFunction: {
        brand: "cubic-bezier(0.16, 1, 0.3, 1)",
        wipe: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
