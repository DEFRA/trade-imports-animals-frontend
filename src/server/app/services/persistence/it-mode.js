const mode = process.env.LIVE_ANIMALS_IT ?? 'stubs'
export const runsIt = (kind) => mode === kind || mode === 'all'
