#!/usr/bin/env node
/**
 * dump.js — headless proof of the logical model.
 *
 * Usage:
 *   node dump.js <fixture>
 *   node dump.js internal-market-partial
 *
 * Reads `fixtures/<fixture>.json`, feeds its `fulfilments` (as a name-
 * keyed map — obligations resolved via obligation name → id) through
 * the same contract functions the browser layer uses, and prints:
 *
 *   { applicable, statusPerSubsection, next, prev, missingRequired }
 *
 * This proves the logical model is fully usable without a browser —
 * every question a stakeholder can ask ("what does my session look
 * like now?") comes out as JSON.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { obligations as v4Obligations } from '../../../model-spikes/obligations-v4-model/obligations.js'
import { certifiedForOptionsLookup } from '../domain.js'
import {
  evaluateState,
  subsections,
  statusOfContainer,
  statusOfPage,
  statusOfJourney,
  startPage,
  nextAfter,
  changeLinkFor,
  pages as walkAllPages
} from './contract.js'
import { STATUSES } from '../runtime.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const ALL_OBLIGATIONS_BY_NAME = new Map(
  [...v4Obligations, certifiedForOptionsLookup].map((o) => [o.name, o])
)

function resolveFulfilments(named) {
  const out = {}
  for (const [name, value] of Object.entries(named ?? {})) {
    const obligation = ALL_OBLIGATIONS_BY_NAME.get(name)
    if (!obligation) {
      throw new Error(`dump: unknown obligation name in fixture: ${name}`)
    }
    out[obligation.id] = value
  }
  return out
}

function report(fixtureName) {
  const filePath = path.join(dirname, 'fixtures', `${fixtureName}.json`)
  const fixture = JSON.parse(readFileSync(filePath, 'utf-8'))
  const fulfilments = resolveFulfilments(fixture.fulfilments)
  const state = evaluateState(fulfilments)

  const statusPerSubsection = {}
  for (const subsection of subsections()) {
    statusPerSubsection[subsection.id] = statusOfContainer(subsection, state)
  }

  const statusPerPage = {}
  for (const page of walkAllPages()) {
    statusPerPage[page.page] = statusOfPage(page, state)
  }

  const missingRequired = []
  for (const page of walkAllPages()) {
    const status = statusOfPage(page, state)
    if (status === STATUSES.NOT_STARTED || status === STATUSES.IN_PROGRESS) {
      for (const entry of page.presents ?? []) {
        const impl = state.obligations[entry.obligation.id]
        if (!impl?.inScope) continue
        const isMandatory = (impl.status ?? 'mandatory') === 'mandatory'
        if (!isMandatory) continue
        const stored = state.fulfilments[entry.obligation.id]
        if (
          stored === undefined ||
          stored === null ||
          (typeof stored === 'string' && stored === '')
        ) {
          missingRequired.push({
            page: page.page,
            obligation: entry.obligation.name
          })
        }
      }
    }
  }

  const journey = statusOfJourney(state)
  const first = startPage(state)
  const nextFromFirst = first ? nextAfter(first, state) : null

  const output = {
    fixture: fixtureName,
    description: fixture.description ?? '',
    journeyState: journey,
    statusPerSubsection,
    statusPerPage,
    startPage: first?.page ?? null,
    nextAfterStart:
      nextFromFirst?.kind === 'page'
        ? nextFromFirst.page.page
        : (nextFromFirst?.kind ?? null),
    missingRequired,
    changeLinks: {
      countryOfOrigin: changeLinkFor(
        ALL_OBLIGATIONS_BY_NAME.get('countryOfOrigin').id
      )?.page,
      reasonForImport: changeLinkFor(
        ALL_OBLIGATIONS_BY_NAME.get('reasonForImport').id
      )?.page
    }
  }
  return output
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const fixtureName = process.argv[2]
  if (!fixtureName) {
    console.error('Usage: node dump.js <fixture>')
    process.exit(1)
  }
  try {
    const output = report(fixtureName)
    console.log(JSON.stringify(output, null, 2))
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}

export { report }
