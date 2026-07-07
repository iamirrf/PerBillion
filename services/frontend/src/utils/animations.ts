/**
 * Premium Animation Utilities for PerBillion
 * Professional, non-cringe animations that enhance UX
 */

// Check if user prefers reduced motion
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Spring configurations for different animation types
export const springConfigs = {
  // Gentle, premium feel
  smooth: {
    type: 'spring' as const,
    stiffness: 100,
    damping: 15,
    mass: 0.5,
  },
  // Snappy, responsive feel
  snappy: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 30,
    mass: 0.8,
  },
  // Bouncy, playful (for education platform)
  bouncy: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 20,
    mass: 1,
  },
  // Stiff, professional (for data/charts)
  stiff: {
    type: 'spring' as const,
    stiffness: 500,
    damping: 40,
    mass: 1,
  },
};

// Easing functions
export const easings = {
  easeOutCubic: [0.33, 1, 0.68, 1],
  easeInOutCubic: [0.65, 0, 0.35, 1],
  easeOutQuart: [0.25, 1, 0.5, 1],
  easeOutExpo: [0.16, 1, 0.3, 1],
};

// Animation variants for common patterns
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

export const slideInLeft = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

export const slideInRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

// Page transition variants
export const pageVariants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: easings.easeOutCubic,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.2,
      ease: easings.easeOutCubic,
    },
  },
};

// Stagger children animation
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

// Card hover animation
export const cardHover = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.02,
    y: -4,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
};

// Button press animation
export const buttonTap = {
  scale: 0.97,
  transition: { duration: 0.1 },
};

// Modal variants
export const modalBackdrop = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalContent = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.2 },
  },
};

// Chart animation variants
export const chartVariants = {
  initial: { pathLength: 0, opacity: 0 },
  animate: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 1.5, ease: 'easeInOut' },
      opacity: { duration: 0.3 },
    },
  },
};

// Success/Error feedback animations
export const successPulse = {
  scale: [1, 1.05, 1],
  transition: {
    duration: 0.4,
    times: [0, 0.5, 1],
  },
};

export const errorShake = {
  x: [0, -10, 10, -10, 10, 0],
  transition: {
    duration: 0.4,
  },
};

// Loading skeleton pulse
export const skeletonPulse = {
  animate: {
    opacity: [0.5, 0.8, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Utility function to get animation duration based on reduced motion preference
export const getAnimationDuration = (normalDuration: number): number => {
  return prefersReducedMotion() ? 0 : normalDuration;
};

// Utility to conditionally apply animation props
export const conditionalAnimation = (animationProps: any) => {
  return prefersReducedMotion() ? {} : animationProps;
};
