/**
 * accompanying-documents controllers — bespoke handlers for the
 * summary / add / delete UX. Same shape as `features/commodity-lines/`;
 * one summary block per document with a per-row Change link (to the
 * specific per-doc page) and a per-doc Delete button. Add mints a new
 * doc and redirects straight into its first per-doc page.
 *
 * Cap: `accompanyingDocument.requires.maxEntries` (10) is authoritative
 * — the summary greys out the Add button at the cap and the add-POST
 * refuses to mint when the state is already at capacity. The engine
 * invariant catches any state that somehow exceeds the cap (e.g. a
 * redeploy lowering the cap after the user saved records over the new
 * limit).
 *
 * Routes:
 *   GET  /accompanying-documents            → list existing docs + Add
 *   POST /accompanying-documents/add        → mint a new doc, redirect
 *                                             to its first per-doc page
 *   POST /accompanying-documents/{id}/delete → drop the doc's leaves
 */

import {
  accompanyingDocument,
  accompanyingDocumentType
} from '../../obligations/obligations.js'
import { flow } from '../../flow/flow.js'
import { domain } from '../../domain/index.js'
import {
  readState,
  addAccompanyingDocument,
  deleteAccompanyingDocument
} from '../../lib/state.js'
import { t, tOrNull } from '../../lib/i18n.js'
import { chrome } from '../../lib/chrome.js'
import { forObligation } from '../../lib/presentation.js'

const BASE = '/prototype/eudpa-249'

/** The per-doc pages a doc walks through, in declared order. Derived
 *  at import time from the flow's `accompanying-documents` subsection
 *  so a new presentsForEach page inserted in the flow automatically
 *  appears in the summary — same design as commodity-lines'
 *  `deriveLinePages`. */
export const DOC_PAGES = deriveDocPages(flow)

/** Every leaf obligation whose stored value is keyed by accompanying-
 *  document fulfilmentId — derived from DOC_PAGES so the two lists
 *  cannot drift apart. */
export const DOC_LEAF_OBLIGATIONS = DOC_PAGES.map((p) => p.obligation)

function deriveDocPages(flowNode) {
  const details = findSubsection(flowNode, 'accompanying-documents')
  if (!details) return []
  return (details.children ?? [])
    .filter((page) => page.presentsForEach)
    .map((page) => ({
      pageName: page.page,
      obligation: page.presentsForEach.obligation
    }))
}

function findSubsection(node, id) {
  if (node.kind === 'subsection' && node.id === id) return node
  for (const child of node.children ?? node.sections ?? []) {
    const hit = findSubsection(child, id)
    if (hit) return hit
  }
  return null
}

function labelFor(obligation, value) {
  if (value === undefined || value === null || value === '') return null
  if (Array.isArray(value) && value.length === 0) return null
  const labels = domain.get(obligation.id)?.labels
  const resolve = (v) => tOrNull(labels?.[v]) ?? v
  if (Array.isArray(value)) return value.map(resolve).join(', ')
  return String(resolve(value))
}

function summariseDoc(state, docId, displayIndex) {
  const rows = []
  for (const { pageName, obligation } of DOC_PAGES) {
    const stored = state.fulfilments?.[obligation.id]?.[docId]
    const label = labelFor(obligation, stored)
    rows.push({
      key: { text: forObligation(obligation).pageTitle },
      value: { text: label ?? t('accompanyingDocuments.notFilled') },
      actions: {
        items: [
          {
            href: `${BASE}/accompanying-documents/${docId}/${pageName}`,
            text: t('accompanyingDocuments.changeLinkText'),
            visuallyHiddenText: t('accompanyingDocuments.changeLinkHidden', {
              label: forObligation(obligation).pageTitle,
              n: displayIndex
            })
          }
        ]
      }
    })
  }
  return {
    docId,
    title: t('accompanyingDocuments.docHeading', { n: displayIndex }),
    rows,
    deleteHref: `${BASE}/accompanying-documents/${docId}/delete`,
    deleteButtonText: t('accompanyingDocuments.deleteButton'),
    deleteVisuallyHiddenText: t('accompanyingDocuments.deleteHidden', {
      n: displayIndex
    })
  }
}

export const accompanyingDocumentsIndexController = {
  get: {
    handler(request, h) {
      const state = readState(request)
      const impl = state.obligations[accompanyingDocument.id]
      const docRecords = impl?.records ?? []
      const docs = docRecords.map((r, i) =>
        summariseDoc(state, r.fulfilmentId, i + 1)
      )
      const maxEntries = accompanyingDocument.requires?.maxEntries
      const atCap = typeof maxEntries === 'number' && docs.length >= maxEntries
      return h.view('features/accompanying-documents/list', {
        chrome: chrome(),
        layout: 'layout.njk',
        pageTitle: t('accompanyingDocuments.pageTitle'),
        heading: t('accompanyingDocuments.heading'),
        lead: t('accompanyingDocuments.lead'),
        emptyText: t('accompanyingDocuments.empty'),
        addButtonText: t('accompanyingDocuments.addButton'),
        backLinkText: t('accompanyingDocuments.backToTaskList'),
        capText: atCap
          ? t('accompanyingDocuments.atCap', { max: maxEntries })
          : null,
        atCap,
        docs,
        addHref: `${BASE}/accompanying-documents/add`,
        backLink: `${BASE}/task-list`,
        crumb: request.plugins?.crumb ?? null,
        breadcrumbs: [
          { text: t('chrome.taskList'), href: `${BASE}/task-list` },
          { text: t('accompanyingDocuments.breadcrumbSelf') }
        ]
      })
    }
  }
}

export const accompanyingDocumentsAddController = {
  post: {
    handler(request, h) {
      // Cap defence — if the user somehow reaches the endpoint with
      // state already at the cap (e.g. hand-crafted POST), refuse.
      // The summary UI greys the Add button at the cap so this
      // shouldn't fire in normal use.
      const state = readState(request)
      const current =
        state.obligations[accompanyingDocument.id]?.records?.length ?? 0
      const maxEntries = accompanyingDocument.requires?.maxEntries
      if (typeof maxEntries === 'number' && current >= maxEntries) {
        return h.redirect(`${BASE}/accompanying-documents`)
      }
      const id = addAccompanyingDocument(
        request,
        accompanyingDocument,
        accompanyingDocumentType
      )
      return h.redirect(
        `${BASE}/accompanying-documents/${id}/accompanying-document-type`
      )
    }
  }
}

export const accompanyingDocumentsDeleteController = {
  post: {
    handler(request, h) {
      const { id } = request.params
      deleteAccompanyingDocument(request, id, DOC_LEAF_OBLIGATIONS)
      return h.redirect(`${BASE}/accompanying-documents`)
    }
  }
}
