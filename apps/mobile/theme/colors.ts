// Native-safe hex/rgba ONLY. Imported by tailwind.config.js AND every JS color prop.
// No oklch() ever reaches React Native.
export const colors = {
  // — Neutral ramp (cool near-black, layered) —
  background:        "#0B0D10", // app canvas — near-black, slight cool cast
  surface:           "#14171C", // card / sheet base
  surfaceElevated:   "#1B1F26", // cards that float above surface, inputs
  overlay:           "#232830", // pressed / muted fills, inactive chips
  hairline:          "rgba(255,255,255,0.07)", // THE premium border — luminous, not grey
  border:            "#262B33", // solid fallback border where hairline won't read
  shadow:            "#000000", // shadow color for cards/elevated layers

  // — Text —
  foreground:        "#F4F6F8",
  mutedForeground:   "#9AA3AD",
  subtleForeground:  "#5E6670", // placeholders, disabled, timestamps

  // — Accent (restraint!) —
  accent:            "#5B9DFF", // primary action + active state. ONE blue.
  accentEmphasis:    "#7DB4FF", // hover/pressed/glow
  accentForeground:  "#0B0D10", // text/icon on an accent fill
  accentSubtle:      "#16243B", // accent at ~14% over surface — tinted pill bg

  // — Semantic status —
  success:           "#34D399", successSubtle: "#102A22",
  warning:           "#FBBF24", warningSubtle: "#2A2410",
  danger:            "#F87171", dangerSubtle:  "#2A1518",
} as const;

export type ColorToken = keyof typeof colors;
