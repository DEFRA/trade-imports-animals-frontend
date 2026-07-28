// .dependency-cruiser.cjs
// Machine-enforced layered architecture for src/server/live-animals.
//
//   Layers, low -> high:   model < bridge < engine < flow < (features | analysis | shared/kit)
//   All production imports must point DOWN.
//
// HARD GATE: the layer rules are severity:'error' — a new up-edge fails lint (and CI). The
// sanctioned/deferred edges are grandfathered in .dependency-cruiser-known-violations.json via
// --ignore-known, which pins both endpoints of each edge. Only no-orphans stays advisory (warn).

const LA = 'src/server/live-animals'

module.exports = {
  forbidden: [
    {
      name: 'model-import-boundary',
      comment:
        'model/ is the pure data core. It may resolve ONLY to intra-model paths or a ' +
        'services/<name>/index.js barrel. Subsumes obligation-purity.js ' +
        'assertModelImportBoundary: bans higher layers, lib/shared/config, and (because ' +
        'node_modules/node: nodes stay in the graph via doNotFollow) any npm/node-builtin import.',
      severity: 'error',
      from: { path: `^${LA}/model/` },
      to: {
        pathNot: [`^${LA}/model/`, `^${LA}/services/[^/]+/index\\.js$`]
      }
    },
    {
      name: 'bridge-no-up',
      comment:
        'bridge/ is a pure synchronous projection over the model. It must not import engine, ' +
        'flow, features, analysis or shared/kit — EXCEPT features/evaluation.js, the aggregated ' +
        'feature binding registry that bridge/fulfilment-registry.js reads (features register ' +
        'their fulfilment bindings; the registry consumes the aggregate). The pathNot sanctions ' +
        'that one target. The readiness edge (bridge/readiness-config.js -> flow/section-status.js) ' +
        'stays grandfathered in the baseline — pinned, not blanket-allowed.',
      severity: 'error',
      from: { path: `^${LA}/bridge/` },
      to: {
        path: [
          `^${LA}/(engine|flow|features|analysis)/`,
          `^${LA}/shared/kit\\.js$`
        ],
        pathNot: `^${LA}/features/evaluation\\.js$`
      }
    },
    {
      name: 'engine-no-up',
      comment:
        'engine/ is the stateful async runtime. It must not import flow, features, analysis or ' +
        'shared/kit. Engine reaches the model only through bridge and has zero up-edge (the ' +
        'readiness seam now lives in bridge). Kept strict, no exceptions.',
      severity: 'error',
      from: { path: `^${LA}/engine/` },
      to: {
        path: [`^${LA}/(flow|features|analysis)/`, `^${LA}/shared/kit\\.js$`]
      }
    },
    {
      name: 'flow-no-up',
      comment:
        'flow/ is static journey topology. It must not import features, analysis or shared/kit — ' +
        'EXCEPT the features/*/page.js identity leaves, which flow legitimately imports to build ' +
        'the section / task-row / run / entry topology. That is the intentional "pages are the ' +
        'spine" design documented in decisions.md: each feature owns its page.js and flow reads ' +
        'those leaves. The pathNot sanctions exactly that edge — a flow -> features controller or ' +
        'template still fails.',
      severity: 'error',
      from: { path: `^${LA}/flow/` },
      to: {
        path: [`^${LA}/(features|analysis)/`, `^${LA}/shared/kit\\.js$`],
        pathNot: `^${LA}/features/[^/]+/page\\.js$`
      }
    },
    {
      name: 'model-behaviour-bridge-only',
      comment:
        'Only bridge/ may import the model BEHAVIOUR surface (evaluator + state-queries). The ' +
        'obligation MANIFEST is shared read-only vocabulary many layers import, so this targets ' +
        'model/obligations/(evaluator|state-queries).js specifically. Clean today (only bridge/*).',
      severity: 'error',
      from: { pathNot: [`^${LA}/bridge/`, `^${LA}/model/`] },
      to: { path: `^${LA}/model/obligations/(evaluator|state-queries)\\.js$` }
    },
    {
      name: 'engine-persistence-port-abstract',
      comment:
        'engine/persistence/** are PORT definitions that stay abstract by never importing a ' +
        'services/ implementation — routes.js wires the impl in at boot. Keeps the port abstract.',
      severity: 'error',
      from: { path: `^${LA}/engine/persistence/` },
      to: { path: `^${LA}/services/` }
    },
    {
      name: 'no-circular',
      comment:
        'No import cycles under live-animals. The readiness staircase is a straight up-chain, not ' +
        'a cycle. from anchored to live-animals so a cycle elsewhere in the app cannot fail this.',
      severity: 'error',
      from: { path: `^${LA}/` },
      to: { circular: true }
    },
    {
      name: 'no-orphans',
      comment:
        'Advisory: modules nothing imports and that import nothing — usually dead code. Excludes ' +
        'tests, test-support/mocks, fixtures, string-referenced boot/config entries, the ' +
        'standalone node entry scripts (dump.js, _capture/), and helpers imported only by ' +
        'excluded test files (copy-leaves.js, it-mode.js) — false-positives, not dead code.',
      severity: 'warn',
      from: {
        path: `^${LA}/`,
        orphan: true,
        pathNot: [
          '\\.test\\.js$',
          'test-support\\.js$',
          '__mocks__/',
          `^${LA}/.*/fixtures/`,
          `^${LA}/config\\.js$`,
          `^${LA}/routes\\.js$`,
          `^${LA}/dump\\.js$`,
          `^${LA}/services/_capture/`,
          `^${LA}/shared/copy-leaves\\.js$`,
          `^${LA}/services/persistence/it-mode\\.js$`
        ]
      },
      to: {}
    }
  ],

  options: {
    // Keep external packages in the graph as un-followed leaf nodes so model-import-boundary can
    // flag a model -> npm / model -> node:builtin edge. (Do NOT use includeOnly — it would prune
    // those nodes and blind the boundary rule.)
    doNotFollow: { path: 'node_modules' },

    // Test files cross every layer legitimately; test-support/mocks are plumbing; fixtures are
    // data; .njk are only string paths, invisible to the graph. Exclude all from validation.
    exclude: {
      path: [
        '\\.test\\.js$',
        'test-support\\.js$',
        '__mocks__/',
        `^${LA}/.*/fixtures/`,
        '\\.njk$'
      ]
    },

    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default']
    },

    reporterOptions: {
      dot: {
        collapsePattern: `${LA}/(model|bridge|engine|flow|features|analysis|services|lib|shared)`
      },
      archi: {
        collapsePattern: `${LA}/(model|bridge|engine|flow|features|analysis|services|lib|shared)`
      }
    },

    cache: { strategy: 'metadata' }
  }
}
