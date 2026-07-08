import path from 'path'
import nunjucks from 'nunjucks'
import hapiVision from '@hapi/vision'
import { fileURLToPath } from 'node:url'

import { config } from '../config.js'
import { context } from './context/context.js'
import * as filters from './filters/filters.js'
import * as globals from './globals/globals.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const nunjucksPaths = [
  'node_modules/govuk-frontend/dist/',
  path.resolve(dirname, '../../server/common/templates'),
  path.resolve(dirname, '../../server/common/components'),
  path.resolve(dirname, '../../server')
]

// EUDPA-249 flow-layer browsable prototype. Templates live at
// `shared/*.njk` and `features/*/template.njk` under the spike root;
// adding the spike root here (gated) lets `h.view('shared/page')` and
// `h.view('features/hub/template')` resolve without a per-plugin views
// instance.
if (config.get('prototype.eudpa249.enabled')) {
  nunjucksPaths.push(
    path.resolve(
      dirname,
      '../../../prototypes/journey-config-spikes/EUDPA-249-flow-layer'
    )
  )
}

const nunjucksEnvironment = nunjucks.configure(nunjucksPaths, {
  autoescape: true,
  throwOnUndefined: false,
  trimBlocks: true,
  lstripBlocks: true,
  watch: config.get('nunjucks.watch'),
  noCache: config.get('nunjucks.noCache')
})

// Hapi Vision has its own path list, separate from the Nunjucks
// environment above. Vision resolves the initial template a
// `h.view('page')` call names; only after that does Nunjucks handle
// `extends` / `include`. Both need the spike templates directory to
// find `page.njk`, `hub.njk`, etc.
const visionPaths = ['server']
if (config.get('prototype.eudpa249.enabled')) {
  visionPaths.push(
    path.resolve(
      dirname,
      '../../../prototypes/journey-config-spikes/EUDPA-249-flow-layer'
    )
  )
}

export const nunjucksConfig = {
  plugin: hapiVision,
  options: {
    engines: {
      njk: {
        compile(src, options) {
          const template = nunjucks.compile(src, options.environment)
          return (ctx) => template.render(ctx)
        }
      }
    },
    compileOptions: {
      environment: nunjucksEnvironment
    },
    relativeTo: path.resolve(dirname, '../..'),
    path: visionPaths,
    isCached: config.get('isProduction'),
    context
  }
}

Object.entries(globals).forEach(([name, global]) => {
  nunjucksEnvironment.addGlobal(name, global)
})

Object.entries(filters).forEach(([name, filter]) => {
  nunjucksEnvironment.addFilter(name, filter)
})
