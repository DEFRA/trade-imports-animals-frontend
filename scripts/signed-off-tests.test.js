import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import {
  listSignedOffTestChanges,
  summariseSignedOffTestChanges
} from './signed-off-tests.js'

const FEATURES = 'src/server/app/features'

const pageFile = (maturity) =>
  `export const originPage = { id: 'origin', maturity: '${maturity}' }\n`

const createRepo = () => {
  const repoDir = mkdtempSync(join(tmpdir(), 'signed-off-tests-'))
  const run = (...args) =>
    execFileSync(
      'git',
      [
        '-c',
        'user.name=Test',
        '-c',
        'user.email=test@example.com',
        '-c',
        'commit.gpgsign=false',
        ...args
      ],
      { cwd: repoDir, stdio: 'pipe' }
    )
  const write = (path, text) => {
    mkdirSync(dirname(join(repoDir, path)), { recursive: true })
    writeFileSync(join(repoDir, path), text)
  }
  const remove = (path) => rmSync(join(repoDir, path))
  const commit = (message) => {
    run('add', '--all')
    run('commit', '--quiet', '--message', message)
  }
  run('init', '--quiet', '--initial-branch=main')
  return { repoDir, run, write, remove, commit }
}

const createFeatureRepo = (maturity) => {
  const repo = createRepo()
  repo.write(`${FEATURES}/origin/page.js`, pageFile(maturity))
  repo.write(`${FEATURES}/origin/controller.js`, 'export const a = 1\n')
  repo.write(`${FEATURES}/origin/controller.test.js`, "test('a', () => {})\n")
  repo.write(`${FEATURES}/origin/origin.fit.spec.js`, "test('b', () => {})\n")
  repo.write(
    `${FEATURES}/origin/__snapshots__/controller.test.js.snap`,
    'exports[`a`] = `1`\n'
  )
  repo.write(`${FEATURES}/origin/parts/parts.test.js`, "test('c', () => {})\n")
  repo.commit('base')
  repo.run('checkout', '--quiet', '-b', 'feature')
  return repo
}

const listChanges = ({ repoDir }) =>
  listSignedOffTestChanges({ repoDir, baseRef: 'main' })

describe('listSignedOffTestChanges', () => {
  let repo

  afterEach(() => {
    rmSync(repo.repoDir, { recursive: true, force: true })
  })

  test('lists changed tests, snapshots and deleted tests in a folder whose page is agreed', () => {
    repo = createFeatureRepo('agreed')
    repo.write(
      `${FEATURES}/origin/controller.test.js`,
      "test('a2', () => {})\n"
    )
    repo.write(
      `${FEATURES}/origin/__snapshots__/controller.test.js.snap`,
      'exports[`a`] = `2`\n'
    )
    repo.remove(`${FEATURES}/origin/origin.fit.spec.js`)
    repo.commit('change tests')

    expect(listChanges(repo)).toEqual([
      {
        folder: `${FEATURES}/origin`,
        files: [
          {
            path: `${FEATURES}/origin/__snapshots__/controller.test.js.snap`,
            change: 'changed'
          },
          { path: `${FEATURES}/origin/controller.test.js`, change: 'changed' },
          { path: `${FEATURES}/origin/origin.fit.spec.js`, change: 'deleted' }
        ]
      }
    ])
  })

  test('lists a changed test in a subfolder of a readyForLive page with no page.js of its own', () => {
    repo = createFeatureRepo('readyForLive')
    repo.write(
      `${FEATURES}/origin/parts/parts.test.js`,
      "test('c2', () => {})\n"
    )
    repo.commit('change tests')

    expect(listChanges(repo)).toEqual([
      {
        folder: `${FEATURES}/origin`,
        files: [
          { path: `${FEATURES}/origin/parts/parts.test.js`, change: 'changed' }
        ]
      }
    ])
  })

  test('lists a changed test when the same branch moves its page down from agreed', () => {
    repo = createFeatureRepo('agreed')
    repo.write(`${FEATURES}/origin/page.js`, pageFile('detailing'))
    repo.write(
      `${FEATURES}/origin/controller.test.js`,
      "test('a2', () => {})\n"
    )
    repo.commit('demote and change tests')

    expect(listChanges(repo)).toEqual([
      {
        folder: `${FEATURES}/origin`,
        files: [
          { path: `${FEATURES}/origin/controller.test.js`, change: 'changed' }
        ]
      }
    ])
  })

  test('lists a test changed or deleted but not yet committed in a folder whose page is agreed', () => {
    repo = createFeatureRepo('agreed')
    repo.write(
      `${FEATURES}/origin/controller.test.js`,
      "test('a2', () => {})\n"
    )
    repo.remove(`${FEATURES}/origin/origin.fit.spec.js`)

    expect(listChanges(repo)).toEqual([
      {
        folder: `${FEATURES}/origin`,
        files: [
          { path: `${FEATURES}/origin/controller.test.js`, change: 'changed' },
          { path: `${FEATURES}/origin/origin.fit.spec.js`, change: 'deleted' }
        ]
      }
    ])
  })

  test('lists a changed test in a folder whose page is agreed only in the working tree', () => {
    repo = createFeatureRepo('detailing')
    repo.write(`${FEATURES}/origin/page.js`, pageFile('agreed'))
    repo.write(
      `${FEATURES}/origin/controller.test.js`,
      "test('a2', () => {})\n"
    )

    expect(listChanges(repo)).toEqual([
      {
        folder: `${FEATURES}/origin`,
        files: [
          { path: `${FEATURES}/origin/controller.test.js`, change: 'changed' }
        ]
      }
    ])
  })

  test('lists nothing for a changed test in a folder whose page is detailing', () => {
    repo = createFeatureRepo('detailing')
    repo.write(
      `${FEATURES}/origin/controller.test.js`,
      "test('a2', () => {})\n"
    )
    repo.remove(`${FEATURES}/origin/origin.fit.spec.js`)
    repo.commit('change tests')

    expect(listChanges(repo)).toEqual([])
  })

  test('lists nothing for changed source or an added test in a folder whose page is agreed', () => {
    repo = createFeatureRepo('agreed')
    repo.write(`${FEATURES}/origin/controller.js`, 'export const a = 2\n')
    repo.write(`${FEATURES}/origin/extra.test.js`, "test('d', () => {})\n")
    repo.commit('change source and add a test')

    expect(listChanges(repo)).toEqual([])
  })
})

describe('summariseSignedOffTestChanges', () => {
  test('says no signed-off page changed when nothing is listed', () => {
    expect(summariseSignedOffTestChanges([])).toBe(
      "## Signed-off pages\n\nNo signed-off page's tests changed.\n"
    )
  })

  test('names each page and file, and says a person must decide', () => {
    const summary = summariseSignedOffTestChanges([
      {
        folder: `${FEATURES}/origin`,
        files: [
          { path: `${FEATURES}/origin/controller.test.js`, change: 'changed' },
          { path: `${FEATURES}/origin/origin.fit.spec.js`, change: 'deleted' }
        ]
      }
    ])

    expect(summary).toBe(
      [
        '## Signed-off pages',
        '',
        "A signed-off page's tests changed: this needs a person's decision, see the linked Jira ticket.",
        '',
        `### Page: \`${FEATURES}/origin\``,
        '',
        '| File | Change |',
        '| --- | --- |',
        `| \`${FEATURES}/origin/controller.test.js\` | changed |`,
        `| \`${FEATURES}/origin/origin.fit.spec.js\` | deleted |`,
        '',
        ''
      ].join('\n')
    )
  })
})
