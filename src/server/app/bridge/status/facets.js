import { structuralOf } from './structure/index.js'

export const isFacet = (part) => typeof part !== 'string'
export const facetParent = (part) => structuralOf(part.collection)
export const facetMemberFilter = (part) =>
  part.only
    ? (member) => part.only.includes(member.id)
    : (member) => !part.except.includes(member.id)
export const facetMembers = (part) =>
  (facetParent(part).item ?? []).filter(facetMemberFilter(part))
