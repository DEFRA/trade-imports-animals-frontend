/**
 * Locate-by-obligation-reference: structural depth-first walk to the
 * first Page whose `presents` or `presentsForEach` includes the given
 * obligation id (obligations.md:1307-1313). With multiple presenting
 * Pages the first in depth-first traversal wins — settled option (a) of
 * the amend-link question (obligations.md:1396-1399). Used for CYA
 * Change links. Defensive null on no match: in-scope obligations should
 * always have at least one presenting Page.
 */
export const firstPagePresentingObligation = (root, obligationId) => {
  if (root.kind === 'page') {
    const entries = [...(root.presents ?? []), ...(root.presentsForEach ?? [])]
    return entries.some((entry) => entry.obligation === obligationId)
      ? root
      : null
  }
  for (const child of root.sections ?? root.children ?? []) {
    const found = firstPagePresentingObligation(child, obligationId)
    if (found) return found
  }
  return null
}
