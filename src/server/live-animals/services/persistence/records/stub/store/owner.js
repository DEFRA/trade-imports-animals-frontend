export const ownerKey = (owner) =>
  `${owner?.sub ?? ''}\u0000${owner?.organisation ?? ''}`

export const sameOwner = (journey, owner) =>
  ownerKey(journey.owner) === ownerKey(owner)
