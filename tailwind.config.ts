import type { Config } from "tailwindcss";

/**
 * Palette ported from the legacy running-challenge design system
 * (docs/legacy-summerfit-handoff.md §4.1). Values live here rather than in
 * CSS variables so Tailwind opacity modifiers (bg-primary/10 etc.) work;
 * per-challenge accent theming can layer scoped CSS vars on top later.
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "#0f0f23",
          secondary: "#1a1a2e",
        },
        card: {
          DEFAULT: "#16213e",
          hover: "#1e2749",
        },
        // Text-on-dark tokens (faint, primary.light, error, info) are tuned
        // to ≥4.5:1 on `card` and `card.hover` (WCAG AA). The legacy values
        // (#64748b, #8b5cf6, #ef4444, #3b82f6) measured 3.3–4.2:1 there.
        // Their tints (bg-error/10, border-info/30) are unaffected in practice.
        primary: {
          DEFAULT: "#6366f1",
          dark: "#4f46e5",
          light: "#a78bfa",
        },
        accent: {
          DEFAULT: "#06d6a0",
          dark: "#059669",
        },
        foreground: "#ffffff",
        muted: "#94a3b8",
        faint: "#8492a6",
        line: {
          DEFAULT: "#334155",
          light: "#475569",
          // Form-control outlines: ≥3:1 against card and input fill
          // (WCAG 1.4.11). DEFAULT stays for dividers, which don't need it.
          strong: "#64748b",
        },
        strava: {
          DEFAULT: "#FC4C02",
          // Brand orange as small text on its own 10% tint: 5.1:1
          light: "#fd6a2c",
        },
        success: "#10b981",
        warning: "#f59e0b",
        error: {
          DEFAULT: "#f87171",
          // Solid fill behind white text (destructive button): 4.8:1
          dark: "#dc2626",
        },
        info: "#60a5fa",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
      },
      backgroundImage: {
        // One step darker than the legacy #6366f1 → #8b5cf6 (white text
        // measured 4.2–4.5:1 there; this is 5.7–6.3:1). Gradient *text*
        // on the dark page keeps the lighter --gradient-primary in globals.css.
        "gradient-primary": "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
        "gradient-hero":
          "linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)",
      },
      boxShadow: {
        card: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
        glow: "0 0 20px rgba(99, 102, 241, 0.4)",
      },
    },
  },
  plugins: [],
};

export default config;
