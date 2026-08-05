export function buildObligationsById(obligations) {
  return new Map(obligations.map((obligation) => [obligation.id, obligation]))
}
