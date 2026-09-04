import path from 'path'
import nunjucks from 'nunjucks'
import hapiVision from '@hapi/vision'
import { fileURLToPath } from 'node:url'

import { config } from '../config.js'
import { context } from './context/context.js'
import * as globals from './globals/globals.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const nunjucksEnvironment = nunjucks.configure(
  [
    'node_modules/govuk-frontend/dist/',
    'node_modules/@ministryofjustice/frontend/',
    path.resolve(dirname, '../../server/common/components'),
    path.resolve(dirname, '../../server/app'),
    path.resolve(dirname, '../../server/app/sets')
  ],
  {
    autoescape: true,
    throwOnUndefined: false,
    trimBlocks: true,
    lstripBlocks: true,
    watch: config.get('nunjucks.watch'),
    noCache: config.get('nunjucks.noCache')
  }
)

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
    path: ['server/app', 'server/app/sets'],
    // Tied to the template cache rather than to isProduction: a view cache that
    // hands back a template Nunjucks is recompiling anyway buys nothing, and
    // caching views while templates recompile would serve stale markup to
    // whoever is editing them.
    isCached: !config.get('nunjucks.noCache'),
    context
  }
}

Object.entries(globals).forEach(([name, global]) => {
  nunjucksEnvironment.addGlobal(name, global)
})
