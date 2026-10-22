export const BREAK_ANYWHERE_CELL = 'app-table__cell--break-anywhere'

export const wrappingCell = (content) => ({
  ...content,
  classes: BREAK_ANYWHERE_CELL
})
