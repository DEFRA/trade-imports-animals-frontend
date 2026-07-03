/**
 * Email — the obligation defs this feature owns.
 *
 * PURITY: a feature's obligations.js imports NOTHING outward (no view,
 * request, controller, engine, validator or config). The only import it may
 * make is sideways — another feature's obligations.js — when a relationship
 * references a def that lives elsewhere. The boot guard in `obligation-purity.js`
 * enforces this per-file. A def carries only identity, relationships and
 * structural state facts; never a `type`, copy or validation (see DESIGN §9).
 */
export const email = { id: 'email', required: true }

export const defs = [email]
