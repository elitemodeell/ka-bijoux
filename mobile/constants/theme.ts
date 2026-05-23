// ─── Tema visual KA Bijoux ───────────────────────────────────────────────────
// Identidade: Rosa, branco, feminino, moderno, premium, comercial

export const Colors = {
  // Rosa — cor principal
  primary:      "#FF4D6D",
  primaryLight: "#FF6B8A",
  primarySoft:  "#FFF0F5",
  primaryDark:  "#C8274A",

  // Rosa claro
  pinkLight:  "#FFB6C1",
  pinkSoft:   "#FFE0EC",
  pinkPale:   "#FFF5F7",

  // Brancos e cinzas
  white:         "#FFFFFF",
  background:    "#FFF9FA",   // fundo principal do app
  surface:       "#FFFFFF",   // cards
  surfaceAlt:    "#F8F8F8",   // fundo secundário

  // Borders & dividers
  border:       "#F0E4E8",
  borderLight:  "#FAF0F3",

  // Texto
  textPrimary:  "#1A0A0F",
  textSecondary:"#6B5B60",
  textMuted:    "#A89BA0",
  textLight:    "#C9B8BD",

  // Status
  success:      "#22C55E",
  successLight: "#DCFCE7",
  warning:      "#F59E0B",
  warningLight: "#FEF3C7",
  error:        "#EF4444",
  errorLight:   "#FEE2E2",
  info:         "#3B82F6",
  infoLight:    "#DBEAFE",

  // Tab bar
  tabActive:    "#FF4D6D",
  tabInactive:  "#C9B8BD",
  tabBackground:"#FFFFFF",
};

export const Fonts = {
  regular:    "System",
  medium:     "System",
  semiBold:   "System",
  bold:       "System",
};

export const FontSizes = {
  xs:   11,
  sm:   13,
  base: 15,
  md:   17,
  lg:   19,
  xl:   22,
  "2xl": 26,
  "3xl": 32,
};

export const Spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
  "2xl": 32,
  "3xl": 40,
};

export const BorderRadius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  "2xl": 24,
  full: 999,
};

export const Shadows = {
  sm: {
    shadowColor: "#FF4D6D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: "#FF4D6D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: "#FF4D6D",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.13,
    shadowRadius: 20,
    elevation: 8,
  },
};
