#!/usr/bin/env node
/**
 * repl-obligations.js — interactive CLI for querying the obligations
 * model. Sibling to dump.js (which is fixture-driven and one-shot); the
 * REPL keeps a per-session fulfilments map you can mutate incrementally
 * and re-evaluate.
 *
 * Command surface (each on its own `> ` prompt line):
 *   help
 *   list [group]
 *   state
 *   set <name> <value>                    # top-level obligation
 *   set <name> <recordId> <value>         # group-scoped obligation
 *   clear
 *   clear <name>
 *   evaluate
 *   explain <name>
 *   witness <name>
 *   reach
 *   fixture <name>
 *   exit                                  # or Ctrl-D
 *
 * Design notes:
 *   - State (`session.fulfilments`) is per-REPL-session, in-memory only.
 *     No persistence, no shared state with dump.js.
 *   - Command handlers are extracted as pure functions taking
 *     `(session, args)` and returning `{ session, output }`. The REPL
 *     wrapper is a thin readline loop over `dispatch`. Tests target
 *     `dispatch` directly — no subprocess spawn required (matches the
 *     Phase 3.2 fidelity-check pattern: exercise the seam in-process).
 *   - `set` parses the value as JSON first, then falls back to the
 *     bare token (so `set commodityCode line1 0101` stores the string
 *     "0101" — JSON rejects leading zero — while `set numberOfAnimals
 *     line1 25` stores the number 25).
 *   - Errors don't crash the REPL: dispatch always returns a string,
 *     even for unknown commands or missing obligations.
 */

import { createInterface } from 'node:readline'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { obligations as v4Obligations } from './obligations/obligations.js'
import { obligationMetadata } from './obligations/helpers.js'
import { evaluateState, statusOfJourney } from './contract.js'
import {
  proveReachability,
  synthesiseWitness,
  WITNESS_KIND
} from './analysis/reachability.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const OBLIGATIONS_BY_NAME = new Map(v4Obligations.map((o) => [o.name, o]))
const OBLIGATIONS_BY_ID = new Map(v4Obligations.map((o) => [o.id, o]))

const PROMPT = '> '
const HELP_TEXT = [
  'commands:',
  '  help                              show this help',
  '  list [group]                      list obligations (optionally filtered by within-group)',
  '  state                             show current fulfilments map (JSON)',
  '  set <name> <value>                set a top-level obligation (value parsed as JSON, bare fallback)',
  '  set <name> <recordId> <value>     set a group-scoped obligation at recordId (e.g. line1)',
  '  clear                             reset fulfilments to empty',
  '  clear <name>                      clear one obligation',
  '  evaluate                          evaluate current state (statuses, journey, missing-required)',
  '  explain <name>                    show scope / status / dependsOn chain for one obligation',
  '  witness <name>                    synthesise a witness value that would open the gate',
  '  reach                             run reachability prover across the whole manifest',
  '  fixture <name>                    load fulfilments from fixtures/<name>.json',
  '  exit                              leave the REPL (Ctrl-D also works)'
].join('\n')

// ---------------------------------------------------------------------------
// Value parsing — JSON first, bare-token fallback.
// ---------------------------------------------------------------------------

export const parseValue = (raw) => {
  if (raw === undefined || raw === null) return raw
  const trimmed = String(raw).trim()
  if (trimmed === '') return ''
  try {
    return JSON.parse(trimmed)
  } catch {
    return trimmed
  }
}

// ---------------------------------------------------------------------------
// Session — the mutable REPL state. Fulfilments are keyed by obligation
// NAME (mirrors the fixture format); resolved to id at evaluate-time.
// ---------------------------------------------------------------------------

export const createSession = () => ({ fulfilments: {} })

const resolveFulfilments = (namedFulfilments) => {
  const out = {}
  for (const [name, value] of Object.entries(namedFulfilments)) {
    const obligation = OBLIGATIONS_BY_NAME.get(name)
    if (!obligation) throw new Error(`unknown obligation name: ${name}`)
    out[obligation.id] = value
  }
  return out
}

// ---------------------------------------------------------------------------
// Formatting helpers — everything a stakeholder can see is a string.
// ---------------------------------------------------------------------------

const pad = (text, width) => String(text).padEnd(width, ' ')

const currentStatusOf = (obligation, state) => {
  const impl = state.obligations?.[obligation.id]
  if (!impl?.inScope) return 'not-applicable'
  if (impl.status) return impl.status
  if (Array.isArray(impl.records) && impl.records.length > 0) {
    return impl.records[0].status ?? 'in-scope'
  }
  return 'in-scope'
}

const withinNameOf = (obligation) => obligation.within?.name ?? ''

// ---------------------------------------------------------------------------
// Command handlers — pure functions of (session, args). Each returns
// `{ session, output }`. `session` is the (possibly-updated) session
// map. Exported for test.
// ---------------------------------------------------------------------------

export const handleHelp = (session) => ({
  session,
  output: `${HELP_TEXT}\n(exit with Ctrl-D or the word "exit".)`
})

export const handleList = (session, [groupFilter]) => {
  const state = evaluateState(resolveFulfilments(session.fulfilments))
  const filtered = groupFilter
    ? v4Obligations.filter((o) => withinNameOf(o) === groupFilter)
    : v4Obligations
  if (filtered.length === 0) {
    return { session, output: `no obligations in group '${groupFilter}'` }
  }
  const nameWidth = Math.max(...filtered.map((o) => o.name.length))
  const withinWidth = Math.max(
    ...filtered.map((o) => withinNameOf(o).length),
    6
  )
  const header = `${pad('name', nameWidth)}  ${pad('within', withinWidth)}  status`
  const lines = filtered.map(
    (o) =>
      `${pad(o.name, nameWidth)}  ${pad(withinNameOf(o) || '-', withinWidth)}  ${currentStatusOf(o, state)}`
  )
  return { session, output: [header, ...lines].join('\n') }
}

export const handleState = (session) => ({
  session,
  output: JSON.stringify(session.fulfilments, null, 2)
})

export const handleSet = (session, args) => {
  const [name, ...rest] = args
  if (!name || rest.length === 0) {
    return { session, output: 'usage: set <name> [<recordId>] <value>' }
  }
  const obligation = OBLIGATIONS_BY_NAME.get(name)
  if (!obligation) {
    return { session, output: `unknown obligation: ${name}` }
  }
  const isGroupScoped = Boolean(obligation.within)
  if (isGroupScoped && rest.length < 2) {
    return {
      session,
      output: `'${name}' is scoped within '${obligation.within.name}' — use: set ${name} <recordId> <value>`
    }
  }
  const nextFulfilments = { ...session.fulfilments }
  if (isGroupScoped) {
    const [recordId, ...valueTokens] = rest
    const value = parseValue(valueTokens.join(' '))
    const existing = nextFulfilments[name] ?? {}
    nextFulfilments[name] = { ...existing, [recordId]: value }
  } else {
    const value = parseValue(rest.join(' '))
    nextFulfilments[name] = value
  }
  return {
    session: { ...session, fulfilments: nextFulfilments },
    output: `set ${name} = ${JSON.stringify(nextFulfilments[name])}`
  }
}

export const handleClear = (session, [name]) => {
  if (!name) {
    return { session: createSession(), output: 'cleared all fulfilments' }
  }
  if (!OBLIGATIONS_BY_NAME.has(name)) {
    return { session, output: `unknown obligation: ${name}` }
  }
  if (!(name in session.fulfilments)) {
    return { session, output: `${name} was not set` }
  }
  const nextFulfilments = { ...session.fulfilments }
  delete nextFulfilments[name]
  return {
    session: { ...session, fulfilments: nextFulfilments },
    output: `cleared ${name}`
  }
}

const collectMissingRequired = (state) => {
  const missing = []
  for (const [id, impl] of Object.entries(state.obligations ?? {})) {
    if (!impl.inScope) continue
    const obligation = OBLIGATIONS_BY_ID.get(id)
    if (!obligation) continue
    if (impl.status === 'mandatory') {
      const stored = state.fulfilments[id]
      if (stored === undefined || stored === null || stored === '') {
        missing.push(obligation.name)
      }
    }
    for (const rec of impl.records ?? []) {
      if (rec.status !== 'mandatory') continue
      const stored = state.fulfilments[id]?.[rec.fulfilmentId]
      if (stored === undefined || stored === null || stored === '') {
        missing.push(`${obligation.name}@${rec.fulfilmentId}`)
      }
    }
  }
  return missing
}

export const handleEvaluate = (session) => {
  const state = evaluateState(resolveFulfilments(session.fulfilments))
  const inScope = v4Obligations.filter(
    (o) => state.obligations?.[o.id]?.inScope
  )
  const nameWidth = Math.max(...inScope.map((o) => o.name.length))
  const rows = inScope.map(
    (o) => `  ${pad(o.name, nameWidth)}  ${currentStatusOf(o, state)}`
  )
  const missing = collectMissingRequired(state)
  const journey = statusOfJourney(state)
  const lines = [
    `journey state:      ${journey}`,
    `in-scope count:     ${inScope.length} of ${v4Obligations.length}`,
    `missing-required:   ${missing.length}${missing.length ? ` (${missing.join(', ')})` : ''}`,
    'in-scope obligations:',
    ...rows
  ]
  return { session, output: lines.join('\n') }
}

const formatDependsChain = (obligation, indent = '  ') => {
  const meta = obligationMetadata(obligation)
  const direct = meta.dependsOn ?? []
  if (direct.length === 0) return `${indent}(no dependencies — always in scope)`
  return direct
    .map((depId) => {
      const dep = OBLIGATIONS_BY_ID.get(depId)
      const label = dep ? dep.name : `<unknown id ${depId}>`
      const nested =
        dep && dep !== obligation
          ? formatDependsChain(dep, `${indent}  `)
          : `${indent}  (self-loop)`
      return `${indent}${label}\n${nested}`
    })
    .join('\n')
}

export const handleExplain = (session, [name]) => {
  if (!name) return { session, output: 'usage: explain <name>' }
  const obligation = OBLIGATIONS_BY_NAME.get(name)
  if (!obligation) return { session, output: `unknown obligation: ${name}` }
  const state = evaluateState(resolveFulfilments(session.fulfilments))
  const impl = state.obligations?.[obligation.id] ?? { inScope: false }
  const meta = obligationMetadata(obligation)
  const helperType = meta.type ?? '(no helper — always in scope)'
  const inScope = impl.inScope ? 'yes' : 'no'
  const status = impl.status ?? impl.records?.[0]?.status ?? '-'
  const reasons = (impl.reasons ?? []).map(
    (r) => `    - ${r.code}: ${r.explanation}`
  )
  const recordLines = (impl.records ?? []).map(
    (r) => `    - ${r.fulfilmentId}  status: ${r.status ?? '-'}`
  )
  const lines = [
    `obligation:   ${obligation.name}`,
    `id:           ${obligation.id}`,
    `within:       ${withinNameOf(obligation) || '(top-level)'}`,
    `helper type:  ${helperType}`,
    `in scope:     ${inScope}`,
    `status:       ${status}`,
    'dependsOn chain:',
    formatDependsChain(obligation)
  ]
  if (recordLines.length > 0) {
    lines.push('records:', ...recordLines)
  }
  if (reasons.length > 0) {
    lines.push('reasons:', ...reasons)
  }
  return { session, output: lines.join('\n') }
}

export const handleWitness = (session, [name]) => {
  if (!name) return { session, output: 'usage: witness <name>' }
  const obligation = OBLIGATIONS_BY_NAME.get(name)
  if (!obligation) return { session, output: `unknown obligation: ${name}` }
  const witness = synthesiseWitness(obligation)
  if (witness.kind === WITNESS_KIND.TRIVIAL) {
    return {
      session,
      output: `${name}: TRIVIAL — gate is always open (no witness needed)`
    }
  }
  if (witness.kind === WITNESS_KIND.OPAQUE) {
    return {
      session,
      output: `${name}: OPAQUE — ${witness.reason}`
    }
  }
  const gateObligation = OBLIGATIONS_BY_ID.get(witness.obligationId)
  const gateName = gateObligation?.name ?? witness.obligationId
  const exampleFulfilments = { [gateName]: witness.value }
  const lines = [
    `${name}: WITNESS`,
    `  gate obligation: ${gateName}`,
    `  synthesised value: ${JSON.stringify(witness.value)}`,
    `  example fulfilments that would open the gate:`,
    `    ${JSON.stringify(exampleFulfilments)}`
  ]
  return { session, output: lines.join('\n') }
}

export const handleReach = (session) => {
  const records = v4Obligations.map((o) =>
    typeof o.applyTo === 'function'
      ? { id: o.id, dependsOn: obligationMetadata(o).dependsOn ?? [] }
      : { id: o.id, dependsOn: [] }
  )
  const result = proveReachability(records)
  const unreachableNames = result.unreachable.map(
    (id) => OBLIGATIONS_BY_ID.get(id)?.name ?? id
  )
  const errorLines = result.errors.map(
    (e) =>
      `  - ${OBLIGATIONS_BY_ID.get(e.obligationId)?.name ?? e.obligationId}: ${e.reason}`
  )
  const lines = [
    `reachable:   ${result.reachable.length}`,
    `unreachable: ${result.unreachable.length}${unreachableNames.length ? ` (${unreachableNames.join(', ')})` : ''}`,
    `errors:      ${result.errors.length}`,
    ...errorLines
  ]
  return { session, output: lines.join('\n') }
}

export const handleFixture = (session, [name]) => {
  if (!name) return { session, output: 'usage: fixture <name>' }
  const filePath = path.join(dirname, 'fixtures', `${name}.json`)
  let payload
  try {
    payload = JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch (err) {
    return {
      session,
      output: `could not load fixture '${name}': ${err.message}`
    }
  }
  const named = payload?.fulfilments ?? {}
  for (const oblName of Object.keys(named)) {
    if (!OBLIGATIONS_BY_NAME.has(oblName)) {
      return {
        session,
        output: `fixture '${name}' references unknown obligation: ${oblName}`
      }
    }
  }
  return {
    session: { ...session, fulfilments: named },
    output: `loaded fixture '${name}' (${Object.keys(named).length} fulfilments)`
  }
}

// ---------------------------------------------------------------------------
// Dispatch — the switch that binds a command name to its handler. Pure.
// ---------------------------------------------------------------------------

export const dispatch = (session, line) => {
  const trimmed = (line ?? '').trim()
  if (trimmed === '') return { session, output: null }
  const [command, ...args] = trimmed.split(/\s+/)
  switch (command) {
    case 'help':
      return handleHelp(session, args)
    case 'list':
      return handleList(session, args)
    case 'state':
      return handleState(session, args)
    case 'set':
      return handleSet(session, args)
    case 'clear':
      return handleClear(session, args)
    case 'evaluate':
      return handleEvaluate(session, args)
    case 'explain':
      return handleExplain(session, args)
    case 'witness':
      return handleWitness(session, args)
    case 'reach':
      return handleReach(session, args)
    case 'fixture':
      return handleFixture(session, args)
    case 'exit':
      return { session, output: null, done: true }
    default:
      return {
        session,
        output: `unknown command: ${command} (try "help")`
      }
  }
}

// ---------------------------------------------------------------------------
// Readline loop — thin wrapper. Never invoked from tests.
// ---------------------------------------------------------------------------

const runRepl = () => {
  let session = createSession()
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: PROMPT
  })
  process.stdout.write(
    'obligations-model REPL. type "help" for commands. Ctrl-D to exit.\n'
  )
  rl.prompt()
  rl.on('line', (line) => {
    let result
    try {
      result = dispatch(session, line)
    } catch (err) {
      process.stdout.write(`error: ${err.message}\n`)
      rl.prompt()
      return
    }
    session = result.session
    if (result.output) process.stdout.write(`${result.output}\n`)
    if (result.done) {
      rl.close()
      return
    }
    rl.prompt()
  })
  rl.on('close', () => {
    process.stdout.write('bye.\n')
  })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runRepl()
}
