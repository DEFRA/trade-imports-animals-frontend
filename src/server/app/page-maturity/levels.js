export const LEVELS = Object.freeze({
  exploring: 'exploring',
  detailing: 'detailing',
  agreed: 'agreed',
  readyForLive: 'readyForLive'
})

export const TAG_CLASSES = Object.freeze({
  [LEVELS.exploring]: 'govuk-tag--orange',
  [LEVELS.detailing]: 'govuk-tag--purple',
  [LEVELS.agreed]: 'govuk-tag--teal',
  [LEVELS.readyForLive]: 'govuk-tag--green'
})

export const BANNER_CLASSES = Object.freeze({
  [LEVELS.exploring]: 'app-page-maturity--exploring',
  [LEVELS.detailing]: 'app-page-maturity--detailing',
  [LEVELS.agreed]: 'app-page-maturity--agreed',
  [LEVELS.readyForLive]: 'app-page-maturity--ready-for-live'
})
