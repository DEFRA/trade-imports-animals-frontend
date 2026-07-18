export const model = () => process.env.MODEL ?? 'a'

export const isModelB = () => model() === 'b'
