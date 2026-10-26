export const speciesLines = (group) =>
  group.filter(
    (line) =>
      line.speciesSelection !== undefined || line.speciesLatinName !== undefined
  )
