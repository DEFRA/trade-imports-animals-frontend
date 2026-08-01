import { systemPopulated } from '../../bridge/obligation-source.js'
import { makeScope } from '../../engine/index.js'
import { obligations } from '../../model/obligations/manifest.js'
import { simulateJourney } from '../simulate.js'
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
 * @param {{ answerStates: object[],
 *           scopeFor?: (answers: object) => { inScope: Set<string> },
 *           pagesFor?: (answers: object) => string[] }} [deps]
 * @returns {Array<{ obligation: string, pageId?: string, reason: string }>}
 */
export function proveFlowReachability({
  answerStates,
  scopeFor = makeScope,
  pagesFor = simulateJourney
}) {
  const problems = answerStates.flatMap((answers) =>
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
 * (`systemPopulated()` fields excepted — no page presents them).
 *
 * `scopeFor` is injectable so a test can prove the check has teeth.
 *
 * @param {{ answerStates: object[],
 *           scopeFor?: (answers: object) => { inScope: Set<string> } }} [deps]
 * @returns {string[]} manifest obligation names never seen in scope.
 */
export function proveScopeCompleteness({ answerStates, scopeFor = makeScope }) {
  const seen = new Set()
  for (const answers of answerStates) {
    for (const key of scopeFor(answers).inScope) seen.add(leafName(key))
  }
  return obligations()
    .map((obligation) => obligation.name)
    .filter((name) => !systemPopulated().has(name) && !seen.has(name))
}
