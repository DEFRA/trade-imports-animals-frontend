import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'

import {
  assertModelImportBoundary,
  assertObligationPurity
} from './obligation-purity.js'

describe('obligation model purity', () => {
  it('Should pass for the real vendored model (no display keys)', () => {
    expect(() => assertObligationPurity()).not.toThrow()
  })
})

describe('model import boundary', () => {
  // A real model-tree location, so fixture specifiers resolve exactly as
  // they would from a genuine model file.
  const modelFile = fileURLToPath(
    new URL('./model/obligations/helpers.js', import.meta.url)
  )
  const sources = (source) => ({
    files: [modelFile],
    read: () => source
  })

  it('Should pass the real model tree', () => {
    expect(() => assertModelImportBoundary()).not.toThrow()
  })

  it('Should allow intra-model and services/<name>/index.js imports', () => {
    const source = [
      "import { isBlankValue } from '../engine/is-blank-value.js'",
      "import * as countries from '../../services/countries/index.js'",
      "export { readGate } from './helper-internals.js'"
    ].join('\n')
    expect(() => assertModelImportBoundary(sources(source))).not.toThrow()
  })

  it('Should catch an app-side lib import, naming file and specifier', () => {
    const source = "import { isAnswered } from '../../lib/answered.js'"
    expect(() => assertModelImportBoundary(sources(source))).toThrow(
      /helpers\.js imports '\.\.\/\.\.\/lib\/answered\.js'/
    )
  })

  it('Should catch flow/, engine/ and feature imports', () => {
    const source = [
      "import { SYSTEM_POPULATED } from '../../flow/obligation-source.js'",
      "import { readiness } from '../../engine/readiness-config.js'"
    ].join('\n')
    expect(() => assertModelImportBoundary(sources(source))).toThrow(
      /obligation-source\.js'[\s\S]*readiness-config\.js'/
    )
  })

  it('Should catch bare-module and node builtin imports', () => {
    const source = [
      "import { readFileSync } from 'node:fs'",
      "import joi from 'joi'"
    ].join('\n')
    expect(() => assertModelImportBoundary(sources(source))).toThrow(
      /node:fs[\s\S]*'joi'/
    )
  })

  it('Should catch a service import that dodges the index (deep path)', () => {
    const source = "import { list } from '../../services/commodities/stub.js'"
    expect(() => assertModelImportBoundary(sources(source))).toThrow(
      /stub\.js'/
    )
  })
})
