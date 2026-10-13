import { LEVELS } from './levels.js'

// A page's level changes through a reviewed pull request. The owners and the
// evidence for each move are in workareas/shared/delivery-maturity/ideation.md
// (section 4) in the workspace repo.

export const PAGE_LEVELS = Object.freeze({
  '/live-animals': LEVELS.exploring
})

export const SECTION_LEVELS = Object.freeze([
  { section: '/live-animals/notifications', level: LEVELS.detailing }
])
