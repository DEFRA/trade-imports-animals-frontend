import { SYSTEM_POPULATED } from '../../bridge/obligation-source.js'
import { makeScope } from '../../engine/index.js'
import { obligations } from '../../model/obligations/obligations.js'
import { simulateJourney } from '../simulate.js'
import { enumerateAnswerStates } from './fixtures/enumerate-answer-states.js'
import { leafName } from './path-key.js'
import { dedupedProblems, problemsForAnswers } from './problems/collect.js'

/**
 * proveFlowReachability — for every seed variant × scope state, confirm each
 * in-scope obligation is presented by a page (`pageOfObligation`) AND that
 * page is reachable through the flow gates in that state (`simulateJourney`).
 * Returns the deduplicated list of problems; `[]` means every owed obligation
 * is page-reachable.
 *
 * `scopeFor` / `pagesFor` are injectable so a test can drop a page and confirm
 * the prover has teeth (the dropped page's in-scope obligations become
 * `owning-page-unreachable-in-scope`).
 *
 * @param {{ scopeFor?: (answers: object) => { inScope: Set<string> },
 *           pagesFor?: (answers: object) => string[] }} [deps]
 * @returns {Array<{ obligation: string, pageId?: string, reason: string }>}
 */
export function proveFlowReachability({
  scopeFor = makeScope,
  pagesFor = simulateJourney
} = {}) {
  const problems = enumerateAnswerStates().flatMap((answers) =>
    problemsForAnswers(answers, scopeFor, pagesFor)
  )
  return dedupedProblems(problems)
}

/**
 * proveScopeCompleteness — the enumeration's own completeness check. A
 * manifest obligation that NO variant × state pair puts in scope is one the
 * flow prover silently never checks — exactly how a newly imported obligation
 * (a model addition) would dodge `proveFlowReachability` when its
 * gate values are missing from the seeds. Returns the names of every such
 * obligation; `[]` means the enumeration reaches the whole manifest
 * (SYSTEM_POPULATED fields excepted — no page presents them).
 *
 * `scopeFor` is injectable so a test can prove the check has teeth.
 *
 * @param {{ scopeFor?: (answers: object) => { inScope: Set<string> } }} [deps]
 * @returns {string[]} manifest obligation names never seen in scope.
 */
export function proveScopeCompleteness({ scopeFor = makeScope } = {}) {
  const seen = new Set()
  for (const answers of enumerateAnswerStates()) {
    for (const key of scopeFor(answers).inScope) seen.add(leafName(key))
  }
  return obligations
    .map((obligation) => obligation.name)
    .filter((name) => !SYSTEM_POPULATED.has(name) && !seen.has(name))
}
