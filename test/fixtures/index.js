/**
 * The single place the test suite binds to the installed set.
 *
 * The engine, the flow algorithms and the L2 obligation model are
 * journey-agnostic by design: their tests reconfigure a seam with a stub and
 * need a set id to key it by, nothing more. Reaching into
 * `src/server/app/sets/<set>/set.js` from each of those tests spells that
 * indifference as a dependency on one journey, and every test has to be edited
 * the day another set becomes the installed one. They take the id from here
 * instead, so ONE import binds the journey-agnostic suite to the set that
 * happens to be installed.
 *
 * A test that is genuinely ABOUT live-animals — its obligations, its pages,
 * its copy — should keep importing the set directly. Naming the set is the
 * point of those, not an accident of needing a key.
 *
 * The id is re-exported from the set rather than restated, so the URLs these
 * tests see are the URLs production serves.
 *
 * Related fixtures, deliberately NOT re-exported here because they collide
 * with the installed set's own names:
 * - `./second-set.js` — a whole second set, mounted alongside live-animals by
 *   the co-residency and completeness suites. It exports its own `SET_ID` and
 *   `SET_BASE`; import it by path so which set is meant stays obvious.
 * - `../setup-obligation-set.js` — the vitest setup file that configures the
 *   installed set's seams before every suite.
 */

export { SET_BASE, SET_ID } from '../../src/server/app/sets/live-animals/set.js'
