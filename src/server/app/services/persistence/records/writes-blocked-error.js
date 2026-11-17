export const writesBlockedError = (journeyId, status) =>
  new Error(`Journey "${journeyId}" is ${status} — writes blocked`)
