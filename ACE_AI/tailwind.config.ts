import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ACE AI Design System — Primary (purple/violet)
        primary: {
          900: "#3B236B",
          700: "#5B3CC4",
          600: "#6D4BEA",
          500: "#7C5CFF",
          300: "#B9A8FF",
          100: "#EEE9FF",
          DEFAULT: "#7C5CFF",
          foreground: "#FFFFFF",
        },
        // Background & Surfaces
        background: "#F7F7FC",
        surface: "#FFFFFF",
        "surface-muted": "#F1F0F8",
        // Text
        "text-primary": "#202033",
        "text-secondary": "#66667A",
        "text-muted": "#9292A5",
        // Semantic
        success: { DEFAULT: "#20A46B", light: "#D1FAE5" },
        warning: { DEFAULT: "#E6A72E", light: "#FEF3C7" },
        danger: { DEFAULT: "#D9536F", light: "#FEE2E2" },
        info: { DEFAULT: "#4E8FF7", light: "#DBEAFE" },
        // shadcn/ui compat
        border: "#E4E2F0",
        input: "#E4E2F0",
        ring: "#7C5CFF",
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#202033",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#202033",
        },
        secondary: {
          DEFAULT: "#F1F0F8",
          foreground: "#202033",
        },
        muted: {
          DEFAULT: "#F1F0F8",
          foreground: "#66667A",
        },
        accent: {
          DEFAULT: "#EEE9FF",
          foreground: "#5B3CC4",
        },
        destructive: {
          DEFAULT: "#D9536F",
          foreground: "#FFFFFF",
        },
      },
      fontFamily: {
        sans: ["Inter", "var(--font-inter)", ...fontFamily.sans],
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(91, 60, 196, 0.08), 0 1px 2px -1px rgba(91, 60, 196, 0.06)",
        "card-hover": "0 8px 24px -4px rgba(91, 60, 196, 0.18), 0 4px 8px -2px rgba(91, 60, 196, 0.12)",
        elevated: "0 4px 16px -2px rgba(91, 60, 196, 0.12), 0 2px 8px -1px rgba(91, 60, 196, 0.08)",
        glow: "0 0 24px rgba(124, 92, 255, 0.3)",
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #6D4BEA 0%, #7C5CFF 50%, #B9A8FF 100%)",
        "gradient-hero": "linear-gradient(135deg, #3B236B 0%, #5B3CC4 40%, #7C5CFF 100%)",
        "gradient-card": "linear-gradient(145deg, rgba(238, 233, 255, 0.8) 0%, rgba(255,255,255,0) 100%)",
        "gradient-surface": "linear-gradient(180deg, #F7F7FC 0%, #FFFFFF 100%)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-right": "slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        "count-up": "countUp 0.6s ease-out",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "shimmer": "shimmer 1.5s linear infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 16px rgba(124, 92, 255, 0.2)" },
          "50%": { boxShadow: "0 0 32px rgba(124, 92, 255, 0.5)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [animate],
};

export default config;
