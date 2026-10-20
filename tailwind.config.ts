import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

// Identidade Playroom: fundo claro, preto para texto e marcas, vermelho como acento.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#f5f2f1",
        paper: "#ffffff",
        ink: "#0d0a0a",
        muted: "#5f5453",
        // texto fraco que ainda passa no contraste mínimo (4,5:1 no branco)
        apagado: "#756a68",
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
  // toque: telas de dedo (ponteiro grosso), onde botões e campos sobem para 44px
  plugins: [plugin(({ addVariant }) => addVariant("toque", "@media (pointer: coarse)"))],
};

export default config;
