// Machine-enforced L1-L4 architecture for src/server/app.
//
//   L1: app root                         composition and registry
//   L2: engine/model/bridge/flow/...     generic, set-agnostic platform
//   L3: sets/<set>/obligations           set-owned data
//   L4: sets/<set>/journeys/<journey>    journey-owned UI and topology

const APP = 'src/server/app'

module.exports = {
  forbidden: [
    {
      name: 'no-l2-to-sets',
      comment:
        'Production L2 is set-agnostic. Tests may compose real set fixtures, but every ' +
        'production dependency into sets/** is forbidden.',
      severity: 'error',
      from: {
        path: `^${APP}/(engine|model|bridge|flow|services|lib|shared|analysis)/`,
        pathNot: '\\.test\\.js$'
      },
      to: { path: `^${APP}/sets/` }
    },
    {
      name: 'routes-is-the-gateway',
      comment:
        'routes.js is the sole L1 composition point allowed to import sets/** from outside a set.',
      severity: 'error',
      from: {
        path: `^${APP}/`,
        pathNot: [`^${APP}/sets/`, `^${APP}/routes\\.js$`, '\\.test\\.js$']
      },
      to: { path: `^${APP}/sets/` }
    },
    {
      name: 'obligations-never-journeys',
      comment:
        'L3 obligation data must remain independent of every L4 journey implementation.',
      severity: 'error',
      from: { path: `^${APP}/sets/[^/]+/obligations/` },
      to: { path: `^${APP}/sets/[^/]+/journeys/` }
    },
    {
      name: 'journey-isolation',
      comment:
        'A journey may use its own set, but cannot import a sibling journey implementation.',
      severity: 'error',
      from: { path: `^${APP}/sets/([^/]+)/journeys/([^/]+)/` },
      to: {
        path: `^${APP}/sets/$1/journeys/`,
        pathNot: `^${APP}/sets/$1/journeys/$2/`
      }
    },
    {
      name: 'set-isolation',
      comment:
        'A set is self-contained and cannot depend on another set; capture groups keep this future-proof.',
      severity: 'error',
      from: { path: `^${APP}/sets/([^/]+)/` },
      to: {
        path: `^${APP}/sets/`,
        pathNot: `^${APP}/sets/$1/`
      }
    },
    {
      name: 'engine-purity',
      comment:
        'The engine owns abstract ports; routes.js injects services implementations at boot.',
      severity: 'error',
      from: { path: `^${APP}/engine/` },
      to: { path: `^${APP}/services/` }
    },
    {
      name: 'sets-not-l1',
      comment:
        'Sets consume L2 APIs, never L1 composition modules or root filesystem convention tests.',
      severity: 'error',
      from: { path: `^${APP}/sets/` },
      to: {
        path: [
          `^${APP}/(routes|obligation-purity)\\.js$`,
          `^${APP}/(copy-convention|copy-parity)\\.test\\.js$`
        ]
      }
    },
    {
      name: 'model-import-boundary',
      comment:
        'The pure model resolves only within model/ or through a services/<name>/index.js barrel.',
      severity: 'error',
      from: { path: `^${APP}/model/` },
      to: {
        pathNot: [`^${APP}/model/`, `^${APP}/services/[^/]+/index\\.js$`]
      }
    },
    {
      name: 'bridge-no-up',
      comment:
        'Bridge is a synchronous projection over model and must not reach up into runtime or flow layers.',
      severity: 'error',
      from: { path: `^${APP}/bridge/` },
      to: {
        path: [`^${APP}/(engine|flow|analysis)/`, `^${APP}/shared/kit\\.js$`]
      }
    },
    {
      name: 'engine-no-up',
      comment:
        'Engine is the stateful runtime and cannot depend on flow, analysis, or the journey-facing kit.',
      severity: 'error',
      from: { path: `^${APP}/engine/` },
      to: {
        path: [`^${APP}/(flow|analysis)/`, `^${APP}/shared/kit\\.js$`]
      }
    },
    {
      name: 'flow-no-up',
      comment:
        'Generic flow algorithms cannot depend on analysis or the journey-facing shared kit.',
      severity: 'error',
      from: { path: `^${APP}/flow/` },
      to: {
        path: [`^${APP}/analysis/`, `^${APP}/shared/kit\\.js$`]
      }
    },
    {
      name: 'model-behaviour-bridge-only',
      comment:
        'Only model itself and bridge may import evaluator and state-query behaviour surfaces.',
      severity: 'error',
      from: {
        path: `^${APP}/`,
        pathNot: [`^${APP}/bridge/`, `^${APP}/model/`, '\\.test\\.js$']
      },
      to: {
        path: `^${APP}/model/obligations/(evaluator(\\.js$|/)|state-queries\\.js$)`
      }
    },
    {
      name: 'no-circular',
      comment: 'Cycles are forbidden throughout the application architecture.',
      severity: 'error',
      from: { path: `^${APP}/` },
      to: { circular: true }
    },
    {
      name: 'no-orphans',
      comment:
        'Advisory dead-code signal; excludes entry/config scripts and helpers used only by excluded tests.',
      severity: 'warn',
      from: {
        path: `^${APP}/`,
        orphan: true,
        pathNot: [
          '\\.test\\.js$',
          'test-support\\.js$',
          '__mocks__/',
          `^${APP}/routes\\.js$`,
          `^${APP}/services/_capture/`,
          `^${APP}/shared/copy-leaves\\.js$`,
          `^${APP}/services/persistence/it-mode\\.js$`
        ]
      },
      to: {}
    }
  ],

  options: {
    // Keep packages as un-followed leaves so model-import-boundary sees npm and builtins.
    doNotFollow: { path: 'node_modules' },

    // Tests may deliberately compose layers. Fixture targets remain in the graph so a
    // production import into sets/** can never be hidden by the exclusion list.
    exclude: {
      path: ['\\.test\\.js$', 'test-support\\.js$', '__mocks__/', '\\.njk$']
    },

    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default']
    },

    reporterOptions: {
      dot: {
        collapsePattern: `${APP}/(model|bridge|engine|flow|services|lib|shared|analysis|sets)`
      },
      archi: {
        collapsePattern: `${APP}/(model|bridge|engine|flow|services|lib|shared|analysis|sets)`
      }
    },

    cache: { strategy: 'metadata' }
  }
}
