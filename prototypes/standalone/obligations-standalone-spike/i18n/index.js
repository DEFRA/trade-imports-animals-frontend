/**
 * Barrel for the i18n folder-module. Everything downstream (validation,
 * contract, templates) resolves copy through here — never by reading
 * model/messages.en.json directly.
 */
export { createResolver, resolveMessage, resolveReason } from './resolve.js'
