export const refusalCodeOf = async (response) =>
  (await response.clone().json())?.code
