import inert from '@hapi/inert'

import { health } from './health/index.js'
import { signout } from './signout/index.js'
import { serveStaticFiles } from './common/helpers/serve-static-files.js'
import { config } from '../config/config.js'
import { liveAnimals } from './app/routes.js'
import { SET_BASE as LIVE_ANIMALS_BASE } from './app/sets/live-animals/set.js'

export const DEFAULT_SET_BASE = LIVE_ANIMALS_BASE

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])

      // Health-check route. Used by platform to check if service is running, do not remove!
      await server.register([health])

      // Each set mounts under its own prefix, and none at the root. A set at
      // the root would make a link that doubles or drops the prefix still look
      // right for that set, and the mistake would only show up on another set.
      await server.register(liveAnimals, {
        routes: { prefix: LIVE_ANIMALS_BASE }
      })

      // Server-wide, NOT per set. /signout registers happily under a set's
      // prefix and fails only when a user tries to sign out, so it is
      // registered outside the prefixed call and pinned by router.test.js.
      const authEnabled = config.get('auth.enabled')
      if (authEnabled) {
        await server.register([signout])
      }

      // Takes the server's default auth strategy, as the dashboard did when it
      // sat here. Signing in with no stored redirect lands on `/`, so this is
      // what puts a signed-in user on the default set's dashboard.
      server.route({
        method: 'GET',
        path: '/',
        handler: (_request, h) => h.redirect(DEFAULT_SET_BASE)
      })

      // Static assets
      await server.register([serveStaticFiles])
    }
  }
}
