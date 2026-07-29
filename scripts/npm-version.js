/*
 * Prints the npm spec pinned in package.json's `packageManager` field, e.g.
 * `npm@11.6.2`, for use as:
 *
 *   npm install --global "$(node scripts/npm-version.js)"
 *
 * `packageManager` is a Corepack field: it may carry a `+sha512...` integrity
 * suffix, and nothing guarantees it is present or names npm. Passed unchecked
 * to `npm install --global`, a suffixed value is not a valid spec, and a
 * missing one becomes the literal string `undefined` — a real package on the
 * registry, so the install would succeed and CI would carry on with whatever
 * npm it already had.
 *
 * Consumed by .github/workflows/{check-pull-request,publish,publish-hotfix,
 * lighthouse}.yml and by both install stages of the Dockerfile.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const PACKAGE_JSON_PATH = join(import.meta.dirname, '..', 'package.json')
const NPM_SPEC = /^npm@\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/

const fail = (reason) => {
  console.error(`${PACKAGE_JSON_PATH}: ${reason}`)
  process.exit(1)
}

const { packageManager } = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf8'))

if (typeof packageManager !== 'string' || packageManager === '') {
  fail('`packageManager` missing — it pins the npm CI and Docker install')
}

// Corepack permits `npm@1.2.3+sha512.abc...`; `npm install` rejects it.
const [spec] = packageManager.split('+')

if (!NPM_SPEC.test(spec)) {
  fail(`\`packageManager\` must be npm@<version>, got: ${packageManager}`)
}

process.stdout.write(spec)
