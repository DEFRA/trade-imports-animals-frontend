export const mode = () => process.env.LIVE_ANIMALS_MODE ?? 'stub'

export const isRealMode = () => mode() === 'real'
