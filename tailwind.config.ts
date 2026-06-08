import type { Config } from "tailwindcss";

// Professional clinical white UI palette.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Calm, clinical palette on a white base.
        brand: {
          50: "#eef6ff",
          100: "#d9ebff",
          200: "#bcdcff",
          300: "#8ec6ff",
          400: "#59a6ff",
          500: "#2f83f7",
          600: "#1b63e0",
          700: "#174fb8",
          800: "#194391",
          900: "#1a3b75",
        },
        // Urgency tier colors (consistent across app).
        urgency: {
          emergency: "#dc2626",
          aande: "#ea580c",
          gpUrgent: "#d97706",
          gpRoutine: "#0891b2",
          selfcare: "#16a34a",
        },
        ink: "#0f172a",
        muted: "#64748b",
        hairline: "#e2e8f0",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.06)",
        float: "0 8px 30px rgba(15,23,42,0.12)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
