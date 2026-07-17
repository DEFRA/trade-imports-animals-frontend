#!/usr/bin/env node
/**
 * generate-model.js — auto-generate MODEL.md from the manifest.
 *
 * MODEL.md is a bird's-eye view of the obligations model. Three
 * sections:
 *
 *   §1 Data dictionary — one table row per obligation
 *      (name / id / within / status / helper / dependencies / notes).
 *
 *   §2 Mermaid dependency graph — edges from each obligation's
 *      derived `dependsOn` list to the obligation itself. `requires.
 *      anyOfIds` render as dotted edges to distinguish "requires-any-of"
 *      from "gate-reads".
 *
 *   §3 Mermaid page → obligations flow graph — one node per page
 *      (stadium), one edge per presented obligation. Split by
 *      top-level section so each block stays under GitHub's Mermaid
 *      rendering budget.
 *
 * Idempotent. Baseline SHA (git HEAD short) is stamped in the header
 * instead of a timestamp so regeneration on an unchanged tree is
 * byte-identical.
 *
 * Usage:
 *   node docs/generate-model.js         # writes MODEL.md
 *   node docs/generate-model.js --stdout # emits to stdout only
 *
 * From repo root:
 *   npm run docs:model
 */

import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { obligations as v4Obligations } from '../obligations/obligations.js'
import { obligationMetadata } from '../obligations/helpers.js'
import {
  flow,
  walkPages,
  subsectionOfPage,
  sectionOfSubsection
} from '../flow/flow.js'
import { SYSTEM_POPULATED } from '../flow/boot-totality.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const prototypeDir = path.resolve(dirname, '..')
const modelPath = path.join(prototypeDir, 'MODEL.md')
const ID_SHORT_LENGTH = 8
const STRUCTURAL_GROUP_NAMES = new Set(['commodityLine', 'unitRecord'])
const EM_DASH = '—'

// -----------------------------------------------------------------------------
// Manifest helpers
// -----------------------------------------------------------------------------

const nameById = new Map(v4Obligations.map((o) => [o.id, o.name]))

const isStructuralGroup = (obligation) =>
  STRUCTURAL_GROUP_NAMES.has(obligation.name)

const isSystemPopulated = (obligation) => SYSTEM_POPULATED.has(obligation.name)

const shortId = (id) => id.slice(0, ID_SHORT_LENGTH)

const lookupName = (id) => nameById.get(id) ?? id

// -----------------------------------------------------------------------------
// Column derivations
// -----------------------------------------------------------------------------

const withinName = (obligation) => obligation.within?.name ?? EM_DASH

const helperType = (obligation) => {
  if (isStructuralGroup(obligation)) return 'structural'
  const type = obligation.applyTo?.metadata?.type
  return type ?? EM_DASH
}

/**
 * Status column: prefer the declared `status`; else derive from the
 * applyTo metadata's whenTrue/whenFalse pair. If both branches carry the
 * same status → that status; if they differ (e.g. regionCode: mandatory
 * on yes / optional otherwise) → `conditional`. Fall back to em-dash.
 */
const derivedStatus = (obligation) => {
  if (obligation.status) return obligation.status
  const meta = obligation.applyTo?.metadata
  const whenTrueStatus = meta?.whenTrue?.status
  const whenFalseStatus = meta?.whenFalse?.status
  if (whenTrueStatus && whenFalseStatus) {
    return whenTrueStatus === whenFalseStatus ? whenTrueStatus : 'conditional'
  }
  if (whenTrueStatus) return whenTrueStatus
  return EM_DASH
}

const dependencyNames = (obligation) => {
  const deps = obligationMetadata(obligation).dependsOn
  if (!Array.isArray(deps) || deps.length === 0) return EM_DASH
  return deps.map(lookupName).join(', ')
}

const notesFor = (obligation) => {
  if (isSystemPopulated(obligation)) return 'system-populated'
  if (isStructuralGroup(obligation)) return 'structural'
  if (obligation.name === 'accompanyingDocumentType') return 'self-loop'
  return ''
}

// -----------------------------------------------------------------------------
// Sort — structural groups first, then top-level obligations, then
// group-scoped obligations grouped by their parent (in group declaration
// order). Manifest declaration order is preserved within each bucket.
// -----------------------------------------------------------------------------

const structuralRank = (obligation) => {
  const groupOrder = ['commodityLine', 'unitRecord']
  const idx = groupOrder.indexOf(obligation.name)
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx
}

const bucketFor = (obligation) => {
  if (isStructuralGroup(obligation)) return 'structural'
  if (!obligation.within) return 'top-level'
  return 'group-scoped'
}

const sortedObligations = () => {
  const manifestIndex = new Map(v4Obligations.map((o, i) => [o.name, i]))
  const withinOrder = (obligation) => {
    const parent = obligation.within
    if (!parent) return -1
    return manifestIndex.get(parent.name) ?? Number.MAX_SAFE_INTEGER
  }
  const bucketRank = { structural: 0, 'top-level': 1, 'group-scoped': 2 }
  return [...v4Obligations].sort((a, b) => {
    const bucketA = bucketRank[bucketFor(a)]
    const bucketB = bucketRank[bucketFor(b)]
    if (bucketA !== bucketB) return bucketA - bucketB
    if (bucketFor(a) === 'structural') {
      return structuralRank(a) - structuralRank(b)
    }
    if (bucketFor(a) === 'group-scoped') {
      const parentDiff = withinOrder(a) - withinOrder(b)
      if (parentDiff !== 0) return parentDiff
    }
    return manifestIndex.get(a.name) - manifestIndex.get(b.name)
  })
}

// -----------------------------------------------------------------------------
// §1 — Data dictionary
// -----------------------------------------------------------------------------

const DATA_DICTIONARY_HEADERS = [
  'Name',
  'ID',
  'Within',
  'Status',
  'Helper',
  'Dependencies',
  'Notes'
]

const DATA_DICTIONARY_MIN_DIVIDER_WIDTH = 3

const dataDictionaryCells = (obligation) => [
  obligation.name,
  `\`${shortId(obligation.id)}\``,
  withinName(obligation),
  derivedStatus(obligation),
  helperType(obligation),
  dependencyNames(obligation),
  notesFor(obligation)
]

const columnWidths = (rows) => {
  const widths = new Array(DATA_DICTIONARY_HEADERS.length).fill(0)
  for (const row of rows) {
    row.forEach((cell, index) => {
      widths[index] = Math.max(widths[index], cell.length)
    })
  }
  return widths.map((width) =>
    Math.max(width, DATA_DICTIONARY_MIN_DIVIDER_WIDTH)
  )
}

const padRow = (cells, widths) =>
  `| ${cells.map((cell, index) => cell.padEnd(widths[index])).join(' | ')} |`

const dividerRow = (widths) =>
  `| ${widths.map((width) => '-'.repeat(width)).join(' | ')} |`

const dataDictionarySection = () => {
  const bodyRows = sortedObligations().map(dataDictionaryCells)
  const allRows = [DATA_DICTIONARY_HEADERS, ...bodyRows]
  const widths = columnWidths(allRows)
  const table = [
    padRow(DATA_DICTIONARY_HEADERS, widths),
    dividerRow(widths),
    ...bodyRows.map((row) => padRow(row, widths))
  ]
  return ['## 1. Data dictionary', '', ...table].join('\n')
}

// -----------------------------------------------------------------------------
// §2 — Mermaid dependency graph
// -----------------------------------------------------------------------------

const nodeShape = (obligation) =>
  isStructuralGroup(obligation)
    ? `${obligation.name}[[${obligation.name}]]`
    : `${obligation.name}[${obligation.name}]`

const dependencyEdges = () =>
  sortedObligations().flatMap((obligation) => {
    const deps = obligationMetadata(obligation).dependsOn
    if (!Array.isArray(deps) || deps.length === 0) return []
    return deps.map((depId) => `  ${lookupName(depId)} --> ${obligation.name}`)
  })

const requiresAnyOfEdges = () =>
  sortedObligations().flatMap((obligation) => {
    const anyOfIds = obligation.requires?.anyOfIds
    if (!Array.isArray(anyOfIds) || anyOfIds.length === 0) return []
    return anyOfIds.map((id) => `  ${obligation.name} -.-> ${lookupName(id)}`)
  })

/**
 * A node only needs an explicit shape declaration once. Emit shape lines
 * for every obligation that appears in an edge (either endpoint), so
 * Mermaid picks up the correct visual for structural groups.
 */
const dependencyNodeShapes = () => {
  const withEdges = new Set()
  for (const obligation of sortedObligations()) {
    const deps = obligationMetadata(obligation).dependsOn ?? []
    const anyOf = obligation.requires?.anyOfIds ?? []
    if (deps.length > 0 || anyOf.length > 0) {
      withEdges.add(obligation.name)
      for (const depId of deps) withEdges.add(lookupName(depId))
      for (const id of anyOf) withEdges.add(lookupName(id))
    }
  }
  return sortedObligations()
    .filter((o) => withEdges.has(o.name))
    .filter((o) => isStructuralGroup(o))
    .map((o) => `  ${nodeShape(o)}`)
}

const dependencyGraphSection = () => {
  const lines = [
    '## 2. Dependency graph',
    '',
    'Solid edges (`-->`) are gate reads (an obligation whose `applyTo`',
    "closure reads the source obligation's stored value). Dotted edges",
    '(`-.->`) are `requires.anyOfIds` — "requires-any-of" invariants',
    'checked by the engine on group instances, distinct from gate reads.',
    'Group containers use `[[name]]` shape.',
    '',
    '```mermaid',
    'graph LR',
    ...dependencyNodeShapes(),
    ...dependencyEdges(),
    ...requiresAnyOfEdges(),
    '```'
  ]
  return lines.join('\n')
}

// -----------------------------------------------------------------------------
// §3 — Page → obligations flow graph, split by top-level section
// -----------------------------------------------------------------------------

const pagesInSection = (sectionId) =>
  walkPages().filter((page) => {
    const subsection = subsectionOfPage(page.page)
    if (!subsection) return false
    const section = sectionOfSubsection(subsection.id)
    return section?.id === sectionId
  })

const presentedObligations = (page) => {
  const scalar = (page.presents ?? []).map((entry) => entry.obligation)
  const forEach = page.presentsForEach?.obligation
  return forEach ? [...scalar, forEach] : scalar
}

const flowGraphForSection = (section) => {
  const pages = pagesInSection(section.id)
  const nodeLines = pages.map((page) => `  ${page.page}([${page.page}])`)
  const edgeLines = pages.flatMap((page) =>
    presentedObligations(page).map(
      (obligation) => `  ${page.page} --> ${obligation.name}`
    )
  )
  return [
    `### ${section.id}`,
    '',
    '```mermaid',
    'graph TD',
    ...nodeLines,
    ...edgeLines,
    '```'
  ].join('\n')
}

const flowGraphSection = () => {
  const header = [
    '## 3. Page → obligations flow',
    '',
    'One Mermaid block per top-level section. Page nodes use stadium',
    'shape `([name])`; edges point from page to each presented',
    'obligation (both `presents` and `presentsForEach`).'
  ].join('\n')
  const perSection = flow.sections.map(flowGraphForSection).join('\n\n')
  return `${header}\n\n${perSection}`
}

// -----------------------------------------------------------------------------
// Header
// -----------------------------------------------------------------------------

const baselineSha = () => {
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: prototypeDir,
      encoding: 'utf-8'
    }).trim()
  } catch {
    return 'unknown'
  }
}

const header = () =>
  [
    '# MODEL.md — obligations model at a glance',
    '',
    'Auto-generated from the manifest by `docs/generate-model.js`.',
    'DO NOT EDIT — run `npm run docs:model` to regenerate.',
    '',
    `Baseline SHA: \`${baselineSha()}\``
  ].join('\n')

// -----------------------------------------------------------------------------
// Compose
// -----------------------------------------------------------------------------

export const renderModelMd = () =>
  [
    header(),
    dataDictionarySection(),
    dependencyGraphSection(),
    flowGraphSection()
  ].join('\n\n') + '\n'

const writeModelMd = () => {
  const content = renderModelMd()
  writeFileSync(modelPath, content, 'utf-8')
  return content
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const stdoutOnly = process.argv.includes('--stdout')
  if (stdoutOnly) {
    process.stdout.write(renderModelMd())
  } else {
    writeModelMd()
    console.log(`wrote ${path.relative(process.cwd(), modelPath)}`)
  }
}

export { modelPath }
