import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        electric: {
          blue: "#00D4FF",
          "blue-dim": "#0099CC",
          "blue-dark": "#006688",
        },
        surface: {
          dark: "#0D1117",
          card: "rgba(22, 27, 34, 0.7)",
          border: "rgba(48, 54, 61, 0.5)",
        },
      },
      backdropBlur: {
        glass: "12px",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        "electric-glow": "0 0 20px rgba(0, 212, 255, 0.3)",
        "electric-glow-lg": "0 0 40px rgba(0, 212, 255, 0.25)",
        "drop-glow": "0 0 24px rgba(0, 212, 255, 0.4)",
      },
      dropShadow: {
        glow: "0 0 12px rgba(0, 212, 255, 0.5)",
      },
      animation: {
        "fade-in-up": "fadeInUp 0.6s ease-out forwards",
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "glow-pulse": "glowPulse 3s ease-in-out infinite",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        glowPulse: {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 20px rgba(0, 212, 255, 0.2)" },
          "50%": { opacity: "0.95", boxShadow: "0 0 32px rgba(0, 212, 255, 0.35)" },
        },
      },
      transitionDuration: {
        400: "400ms",
      },
      animationDelay: {
        100: "100ms",
        200: "200ms",
        300: "300ms",
        400: "400ms",
        500: "500ms",
        600: "600ms",
      },
    },
  },
  plugins: [],
} satisfies Config;
