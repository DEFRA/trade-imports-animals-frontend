import { revalidators } from './features/index.js'

export const validateAllStored = async (answers) => {
  const perPage = await Promise.all(
    revalidators.map(async ({ id, run }) => ({
      id,
      errors: await run(answers)
    }))
  )
  return perPage.filter(({ errors }) => Object.keys(errors ?? {}).length > 0)
}
