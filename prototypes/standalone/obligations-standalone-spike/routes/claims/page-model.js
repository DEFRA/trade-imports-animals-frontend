import { modelJson } from '../../contract/index.js'

/**
 * The claims page model, resolved once from the Flow: the manage-list
 * Page, its two presentsForEach entries (claimType + claimAmount share
 * one minted fulfilment id per claim) and the small copy helpers the
 * view-models and handlers share.
 */

export const flow = JSON.parse(modelJson().flow)

export const page = flow.sections
  .flatMap((section) => section.children ?? [])
  .find((child) => child.id === 'claims')

export const [typeEntry, amountEntry] = page.presentsForEach

export const CLAIM_NAMES = ['claimType', 'claimAmount']

export const isBlank = (value) =>
  value === undefined || String(value).trim() === ''

export const typeLabel = (value) =>
  (typeEntry.options ?? []).find((option) => option.value === value)?.label
