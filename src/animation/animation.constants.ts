// EVERY tunable number in the flying-cart animation lives here. If the motion
// looks wrong on a device, tune these — the logic should never need reading.
// (Non-animation tunables live in src/config/tuning.ts.)

/** Total flight time of a ghost, ms. */
export const FLIGHT_DURATION_MS = 600;

/** Ghost scale on arrival (1 → this). */
export const GHOST_END_SCALE = 0.2;

/**
 * Fraction of the flight after which the ghost starts fading (0..1).
 * Opacity holds at 1 until here, then drops to 0 at landing — a ghost that
 * fades from the start reads as a bug.
 */
export const GHOST_FADE_START = 0.8;

/** Badge pop on landing: peak scale and per-leg duration. */
export const BADGE_POP_SCALE = 1.3;
export const BADGE_POP_LEG_MS = 100;

/**
 * Easing exponents, applied INSIDE the ghost worklet:
 * x progresses with ease-OUT (fast start), y with ease-IN (late dive) —
 * decoupled axes produce a natural arc without Bézier math.
 * Exponent 2 == quadratic.
 */
export const GHOST_X_EASE_EXPONENT = 2;
export const GHOST_Y_EASE_EXPONENT = 2;
