const { colors } = require("./theme/colors");

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
        background: colors.background,
        foreground: colors.foreground,
        card: colors.surface,
        "card-foreground": colors.foreground,
        "card-elevated": colors.surfaceElevated,
        muted: colors.overlay,
        "muted-foreground": colors.mutedForeground,
        subtle: colors.subtleForeground,
        accent: colors.accent,
        "accent-emphasis": colors.accentEmphasis,
        "accent-foreground": colors.accentForeground,
        "accent-subtle": colors.accentSubtle,
        border: colors.border,
        input: colors.surfaceElevated,
        ring: colors.accent,
        success: colors.success,
        "success-subtle": colors.successSubtle,
        warning: colors.warning,
        "warning-subtle": colors.warningSubtle,
        destructive: colors.danger,
        "destructive-subtle": colors.dangerSubtle,
      },
      fontFamily: {
        sans: ["Outfit"],
        mono: ["Fira Code"],
      },
      borderRadius: {
        lg: "20px", // updated to match card radius 20
        md: "14px", // updated to match input/btn 14
        sm: "8px",
      },
    },
  },
  plugins: [],
};
