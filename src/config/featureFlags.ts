// FEATURE_FLYING_CART gates the add-to-cart flying animation (Phase 5).
// Off = adding to cart bumps the badge instantly with no overlay. The full
// test suite must pass with this false - if the animation misbehaves on a
// device there is no time to fix, flipping this single boolean ships a
// fully working app.
export const FEATURE_FLYING_CART = true;

// Renders the measured source/target rects as coloured borders (dev only).
export const DEBUG_ANIM_RECTS = false;
