import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0C0C0B",
        surface: "#161614",
        "surface-elevated": "#1F1E1B",
        border: {
          DEFAULT: "#2A2925",
        },
        text: {
          primary: "#F5F2EB",
          secondary: "#A8A29A",
        },
        accent: {
          DEFAULT: "#6EE7B7",
          muted: "rgba(110, 231, 183, 0.12)",
        },
        danger: "#F87171",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      transitionTimingFunction: {
        "quiet-out": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        450: "450ms",
        550: "550ms",
      },
    },
  },
  plugins: [],
};

export default config;
