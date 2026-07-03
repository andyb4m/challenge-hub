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
        primary: {
          DEFAULT: "#6366f1",
          dark: "#4f46e5",
          light: "#8b5cf6",
        },
        accent: {
          DEFAULT: "#06d6a0",
          dark: "#059669",
        },
        foreground: "#ffffff",
        muted: "#94a3b8",
        faint: "#64748b",
        line: {
          DEFAULT: "#334155",
          light: "#475569",
        },
        success: "#10b981",
        warning: "#f59e0b",
        error: "#ef4444",
        info: "#3b82f6",
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
        "gradient-primary": "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
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
