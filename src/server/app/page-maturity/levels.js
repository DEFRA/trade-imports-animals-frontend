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
