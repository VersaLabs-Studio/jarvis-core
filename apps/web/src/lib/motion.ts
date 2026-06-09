export const MOTION = {
  fast: { duration: 0.15, ease: [0.4, 0, 0.2, 1] },
  normal: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
  slow: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  spring: { type: "spring", stiffness: 300, damping: 30 },
} as const;

export const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
  },
};
