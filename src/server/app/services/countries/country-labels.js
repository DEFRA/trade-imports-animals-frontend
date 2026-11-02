export const subdivisionNamedWithCountry = (subdivisionName, countryName) =>
  countryName ? `${subdivisionName} (${countryName})` : subdivisionName

export const compareLabels = (left, right) => left.localeCompare(right)
