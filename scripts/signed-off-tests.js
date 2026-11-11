import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, posix } from 'node:path'

const git = (repoDir, args) => {
  const result = spawnSync('git', args, { cwd: repoDir, encoding: 'utf8' })
  return {
    ok: result.status === 0,
    output: result.stdout,
    error: result.stderr
  }
}

const gitOutput = (repoDir, args) => {
  const result = git(repoDir, args)
  if (!result.ok) {
    throw new Error(`git ${args.join(' ')} failed: ${result.error.trim()}`)
  }
  return result.output
}

const isTestFile = (path) =>
  /\.test\.js$|\.fit\.spec\.js$|\.snap$|(?:^|\/)(?:__snapshots__|[^/]+-snapshots)\//.test(
    path
  )

const changedAndDeletedFiles = (repoDir, mergeBase) => {
  const changeNames = { M: 'changed', T: 'changed', D: 'deleted' }
  const fields = gitOutput(repoDir, [
    'diff',
    '--name-status',
    '--no-renames',
    '--diff-filter=MTD',
    '-z',
    mergeBase
  ])
    .split('\0')
    .filter(Boolean)
  const files = []
  for (let index = 0; index < fields.length; index += 2) {
    files.push({ change: changeNames[fields[index]], path: fields[index + 1] })
  }
  return files
}

const pageFileAt = (repoDir, revision, folder) => {
  const result = git(repoDir, [
    'show',
    `${revision}:${posix.join(folder, 'page.js')}`
  ])
  return result.ok ? result.output : undefined
}

const workingPageFile = (repoDir, folder) => {
  const path = join(repoDir, folder, 'page.js')
  return existsSync(path) ? readFileSync(path, 'utf8') : undefined
}

const owningPage = (repoDir, revisions, filePath) => {
  let folder = posix.dirname(filePath)
  while (folder !== '.') {
    const pageFiles = [
      ...revisions.map((revision) => pageFileAt(repoDir, revision, folder)),
      workingPageFile(repoDir, folder)
    ].filter((text) => text !== undefined)
    if (pageFiles.length > 0) {
      return {
        folder,
        signedOff: pageFiles.some((text) =>
          /maturity:\s*['"](?:agreed|readyForLive)['"]/.test(text)
        )
      }
    }
    folder = posix.dirname(folder)
  }
  return undefined
}

/**
 * Lists the test files changed or deleted since HEAD left `baseRef`,
 * committed or not, that sit in the feature folder of a signed-off page:
 * one whose `page.js` sets `maturity` to `agreed` or `readyForLive` at the
 * merge base, at HEAD or in the working tree.
 *
 * @param {object} options
 * @param {string} options.repoDir - the git checkout to read
 * @param {string} options.baseRef - the ref the pull request merges into
 * @returns {{ folder: string, files: { path: string, change: 'changed' | 'deleted' }[] }[]}
 */
export const listSignedOffTestChanges = ({ repoDir, baseRef }) => {
  const mergeBase = gitOutput(repoDir, ['merge-base', baseRef, 'HEAD']).trim()
  const revisions = [mergeBase, 'HEAD']
  const pages = new Map()
  for (const file of changedAndDeletedFiles(repoDir, mergeBase)) {
    const page = isTestFile(file.path)
      ? owningPage(repoDir, revisions, file.path)
      : undefined
    if (page?.signedOff) {
      pages.set(page.folder, [...(pages.get(page.folder) ?? []), file])
    }
  }
  return [...pages].map(([folder, files]) => ({ folder, files }))
}

/**
 * Writes the pull request job summary for the pages
 * `listSignedOffTestChanges` returns.
 *
 * @param {{ folder: string, files: { path: string, change: string }[] }[]} pages
 * @returns {string} Markdown
 */
export const summariseSignedOffTestChanges = (pages) => {
  if (pages.length === 0) {
    return "## Signed-off pages\n\nNo signed-off page's tests changed.\n"
  }
  const sections = pages.map(({ folder, files }) =>
    [
      `### Page: \`${folder}\``,
      '',
      '| File | Change |',
      '| --- | --- |',
      ...files.map(({ path, change }) => `| \`${path}\` | ${change} |`)
    ].join('\n')
  )
  return [
    '## Signed-off pages',
    "A signed-off page's tests changed: this needs a person's decision, see the linked Jira ticket.",
    ...sections,
    ''
  ].join('\n\n')
}

if (import.meta.main) {
  const [baseRef] = process.argv.slice(2)
  if (!baseRef) {
    console.error('Usage: npm run check:signed-off-tests -- <base-ref>')
    process.exit(2)
  }
  const pages = listSignedOffTestChanges({ repoDir: process.cwd(), baseRef })
  process.stdout.write(summariseSignedOffTestChanges(pages))
  process.exitCode = pages.length > 0 ? 1 : 0
}
