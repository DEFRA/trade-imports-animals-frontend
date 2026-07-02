import { FULFILLED } from '../../flow-eval/index.js'
import { changePath, pagePath } from '../../journey/paths.js'
import { isBlank } from '../../validation/index.js'
import { formatValue, optionLabel } from './format-value.js'

/**
 * Per-page row building — spike-a's summary list mirrored row-for-row:
 * one row per presents entry carrying a `cyaKey`, plus three graft-9
 * bespoke builders (Vehicle composition, Claim N, add-on status).
 */

/** Rows for a plain presents Page: one per entry carrying a cyaKey. */
export const presentsRows = (page, ctx) =>
  (page.presents ?? [])
    .filter((entry) => entry.cyaKey)
    .map((entry) => {
      const record = ctx.identifiers.recordOfId(entry.obligation)
      const value = ctx.evaluation.fulfilments[entry.obligation]?.value
      const text = formatValue(entry, record, value, ctx)
      return ctx.row(entry.cyaKey, text, changePath(page.slug))
    })

// Bespoke (graft 9): make/model/year carry no cyaKey — they compose the
// one pinned 'Vehicle' row between Registration and Estimated value.
const vehicleRows = (page, ctx) => {
  const rows = presentsRows(page, ctx)
  const composed = ['make', 'model', 'year']
    .map((name) => ctx.valueOf(name))
    .filter((value) => !isBlank(value))
    .join(' ')
  const key = ctx.cya.cyaCopy.vehicleRowKey
  const text = composed || ctx.cya.notProvidedText
  rows.splice(1, 0, ctx.row(key, text, changePath(page.slug)))
  return rows
}

// Bespoke (graft 9): the claims collection renders per-fulfilment
// 'Claim N' rows (or the pinned none-row), returning via its own flow.
const claimsRows = (page, ctx) => {
  const { cyaCopy } = ctx.cya
  const [typeEntry] = page.presentsForEach
  const claims = ctx.evaluation.obligations[typeEntry.obligation].fulfilments
  const href = pagePath(page.slug)
  if (claims.length === 0) {
    const none = cyaCopy.claimsNoneRow
    return [ctx.row(none.key, none.value, href)]
  }
  const amountId = ctx.identifiers.idOf('claimAmount')
  return claims.map(({ fulfilmentId }, index) => {
    const stored = ctx.evaluation.fulfilments
    const type = stored[typeEntry.obligation]?.[fulfilmentId]?.value
    const amount = stored[amountId]?.[fulfilmentId]?.value
    const label = optionLabel(typeEntry, type) ?? ctx.cya.notProvidedText
    const key = cyaCopy.claimRowKey.replace('{index}', String(index + 1))
    return ctx.row(key, isBlank(amount) ? label : `${label} — £${amount}`, href)
  })
}

// Bespoke (graft 9): the add-on picker renders one Added/Incomplete row
// per selected add-on (its Group title as the key), spike-a parity.
const addonRows = (page, ctx) => {
  const { cyaCopy } = ctx.cya
  const href = pagePath(page.slug)
  const selected = [].concat(ctx.valueOf('addons') ?? [])
  if (selected.length === 0) {
    return [
      ctx.row(cyaCopy.addonsNoneRow.key, cyaCopy.addonsNoneRow.value, href)
    ]
  }
  return selected.map((value) => {
    const group = ctx.flow.sections
      .flatMap((section) => section.children ?? [])
      .find((child) => child.appliesWhen === `addonSelected:${value}`)
    if (!group) {
      throw new Error(`No add-on group for "${value}"`)
    }
    const added =
      ctx.evaluation.containerStatuses.groups[group.id] === FULFILLED
    const text = added ? cyaCopy.addonAddedText : cyaCopy.addonIncompleteText
    return ctx.row(group.title, text, href)
  })
}

export const BESPOKE_ROWS = {
  'your-vehicle': vehicleRows,
  claims: claimsRows,
  addons: addonRows
}
