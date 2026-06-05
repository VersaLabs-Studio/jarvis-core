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
        // OKLCH Dark Tokens — semantic names only
        background: "oklch(0.145 0 0)",       // #1a1a1a
        foreground: "oklch(0.93 0 0)",        // #eeeeee
        card: "oklch(0.18 0 0)",              // #262626
        "card-foreground": "oklch(0.93 0 0)", // #eeeeee
        muted: "oklch(0.25 0 0)",             // #404040
        "muted-foreground": "oklch(0.65 0 0)", // #a6a6a6
        accent: "oklch(0.65 0.15 250)",       // #4a9eff
        "accent-foreground": "oklch(0.15 0 0)", // #1a1a1a
        destructive: "oklch(0.6 0.2 25)",     // #ff4a4a
        "destructive-foreground": "oklch(0.93 0 0)", // #eeeeee
        border: "oklch(0.3 0 0)",             // #4d4d4d
        input: "oklch(0.25 0 0)",             // #404040
        ring: "oklch(0.65 0.15 250)",         // #4a9eff
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
