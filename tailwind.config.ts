import type { Config } from "tailwindcss";

// Identidade Studio - SM: fundo claro, preto para texto e marcas, vermelho como acento.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#f5f2f1",
        paper: "#ffffff",
        ink: "#0d0a0a",
        muted: "#5f5453",
        line: "#dcd3d1",
        "line-soft": "#e4dcda",
        red: { DEFAULT: "#c8102e", deep: "#7a0a18", soft: "#fbe6e9", vivo: "#ff4d64" },
        // menu lateral preto
        side: { text: "#d9d0ce", label: "#8a7f7d", line: "#2e2727" },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
