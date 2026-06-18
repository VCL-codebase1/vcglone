import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        muted: "#667085",
        line: "#d9e0ea",
        surface: "#f7f9fc",
        brand: "#102B74",
        brandSoft: "#eaf0ff",
        success: "#047857",
        warning: "#b45309",
        danger: "#b42318"
      },
      boxShadow: {
        soft: "0 12px 40px rgba(23, 32, 51, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
