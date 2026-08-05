export const mode = () => process.env.LIVE_ANIMALS_MODE ?? 'real'

export const isRealMode = () => mode() === 'real'
