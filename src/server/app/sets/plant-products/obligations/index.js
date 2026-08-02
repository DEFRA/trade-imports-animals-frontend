// Scaffolded by docs/add-a-set.md step 2.
export const obligations = []

export const groups = obligations.filter((obligation) =>
  obligations.some((other) => other.within === obligation)
)

export const policy = {
  systemPopulated: [],
  enforcedAtContinue: [],
  maxEntriesFrom: {},
  systemAnswerKeys: ['referenceNumber']
}
