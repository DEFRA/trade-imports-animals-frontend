/** Dashboard list rows expect a single commodity label object or legacy shape. */
export const commodityFieldForListRow = (notification) => {
  const entries = notification.commodities
  if (Array.isArray(entries) && entries.length > 0) {
    if (entries.length === 1) {
      return { name: entries[0].name }
    }
    const names = entries.map((entry) => entry.name).filter(Boolean)
    return names.length > 0 ? { name: names.join(', ') } : null
  }
  return notification.commodity ?? null
}
