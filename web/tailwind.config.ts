import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f4f1eb",
        surface: {
          DEFAULT: "#ffffff",
          subtle: "#faf8f4",
          muted: "#f1ece4",
        },
        ink: {
          DEFAULT: "#211d19",
          soft: "#4c453d",
          muted: "#766e64",
          faint: "#a1988c",
        },
        line: {
          DEFAULT: "#e7e1d6",
          strong: "#d6cdc0",
        },
        accent: {
          DEFAULT: "#b45a3c",
          deep: "#94432a",
          soft: "#f5e7e1",
        },
        sage: {
          DEFAULT: "#557a60",
          deep: "#3f6149",
          soft: "#e8f0e9",
        },
        ochre: {
          DEFAULT: "#a8742a",
          deep: "#855a1d",
          soft: "#f7eedd",
        },
        danger: {
          DEFAULT: "#b24a3e",
          deep: "#8e352b",
          soft: "#f8e7e3",
        },
        info: {
          DEFAULT: "#4d6b85",
          deep: "#3a5268",
          soft: "#e9eff4",
        },
        muted: "#766e64",
        near: {
          bg: "#f4f1eb",
          panel: "#ffffff",
          border: "#e7e1d6",
          text: "#211d19",
          muted: "#766e64",
          green: "#557a60",
          red: "#b24a3e",
          amber: "#a8742a",
          blue: "#4d6b85",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(33,29,25,0.025), 0 18px 42px -36px rgba(33,29,25,0.2)",
        lift: "0 2px 4px rgba(33,29,25,0.04), 0 24px 60px -36px rgba(33,29,25,0.3)",
        pop: "0 24px 70px -24px rgba(33,29,25,0.35)",
      },
      borderRadius: {
        "2xl": "1rem",
      },
      maxWidth: {
        content: "1600px",
      },
    },
  },
  plugins: [],
};
export default config;
