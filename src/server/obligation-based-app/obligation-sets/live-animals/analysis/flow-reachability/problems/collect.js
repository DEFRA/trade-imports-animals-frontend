import { obligationProblem } from './obligation-problem.js'

// Every problem raised by one answers state's in-scope obligations.
export const problemsForAnswers = (answers, scopeFor, pagesFor) => {
  const { inScope } = scopeFor(answers)
  const reachablePages = new Set(pagesFor(answers))
  return [...inScope]
    .map((key) => obligationProblem(key, reachablePages))
    .filter(Boolean)
}

export const dedupeKeyFor = (problem) =>
  `${problem.reason}:${problem.obligation}:${problem.pageId ?? ''}`

// First-occurrence-wins dedupe over every state's problems, in state order.
export const dedupedProblems = (problems) => {
  const seen = new Map()
  for (const problem of problems) {
    const key = dedupeKeyFor(problem)
    if (!seen.has(key)) seen.set(key, problem)
  }
  return [...seen.values()]
}
