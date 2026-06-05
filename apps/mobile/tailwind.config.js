/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Dark tokens — semantic names only (hex for RN compatibility)
        background: "#1a1a1a",
        foreground: "#eeeeee",
        card: "#262626",
        "card-foreground": "#eeeeee",
        muted: "#404040",
        "muted-foreground": "#a6a6a6",
        accent: "#4a9eff",
        "accent-foreground": "#1a1a1a",
        destructive: "#ff4a4a",
        "destructive-foreground": "#eeeeee",
        border: "#4d4d4d",
        input: "#404040",
        ring: "#4a9eff",
      },
      fontFamily: {
        sans: ["Outfit"],
        mono: ["Fira Code"],
      },
      borderRadius: {
        lg: "16px",
        md: "12px",
        sm: "8px",
      },
    },
  },
  plugins: [],
};
