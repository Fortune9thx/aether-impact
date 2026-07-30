export const colors = {
  background: "#0C0C0B",
  surface: "#161614",
  surfaceElevated: "#1F1E1B",
  border: "#2A2925",
  textPrimary: "#F5F2EB",
  textSecondary: "#A8A29A",
  accent: "#6EE7B7",
  accentMuted: "rgba(110, 231, 183, 0.12)",
  danger: "#F87171",
} as const;

export const motion = {
  ease: [0.16, 1, 0.3, 1] as const,
  duration: {
    fast: 0.4,
    base: 0.5,
    slow: 0.7,
  },
  fadeUp: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  },
  stagger: (delay = 0.06) => ({
    animate: { transition: { staggerChildren: delay } },
  }),
} as const;
