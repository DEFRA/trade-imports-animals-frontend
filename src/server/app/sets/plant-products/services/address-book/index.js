// The plant address book's only entry point. There is no real implementation
// to switch to until EUDPA-58 lands, so the canned catalogue plus this
// session's created records are served in every mode. Set-owned index-over-stub
// shape: see sets/live-animals/services/commodities/index.js.
export { list, find, add } from './stub.js'
