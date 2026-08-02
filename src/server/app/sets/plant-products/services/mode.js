// Set-owned mode switch from docs/add-a-set.md step 8.
export const mode = () => process.env.PLANT_PRODUCTS_MODE ?? 'real'

export const isRealMode = () => mode() === 'real'
