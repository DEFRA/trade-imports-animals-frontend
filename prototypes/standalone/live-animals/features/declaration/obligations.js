/**
 * Skeleton-sourced (c-022): V4 has no declaration row, but submission
 * requires the confirmation, so the obligation stays. `enforcedAt: submit`
 * in the spec — the declaration page's own POST IS the submit action, so
 * the mandate is enforced there as a save-blocking validator.
 */
export const declaration = { id: 'declaration', required: true }

export const obligations = [declaration]
