const mode = process.env.PERSISTENCE_IT_MODE ?? 'stubs'
export const runsIt = (kind) => mode === kind || mode === 'all'
