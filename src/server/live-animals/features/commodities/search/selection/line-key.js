/** One commodity line = one commodity plus ONE species. The pair is
 * the line's identity for batch reconcile. */
export const lineKey = (line) =>
  `${line.commoditySelection}|${line.speciesSelection}`
