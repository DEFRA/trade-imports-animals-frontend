# trade-imports-animals-frontend

[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_trade-imports-animals-frontend&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=DEFRA_trade-imports-animals-frontend)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_trade-imports-animals-frontend&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DEFRA_trade-imports-animals-frontend)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_trade-imports-animals-frontend&metric=coverage)](https://sonarcloud.io/summary/new_code?id=DEFRA_trade-imports-animals-frontend)

The live-animals import notification journey: a pages-as-spine web journey over a thin declarative obligation model and a central pure engine. Documentation: [live-animals documentation](src/server/live-animals/docs/README.md).

Run its unit suite from the frontend repo root: `npm run test:live-animals`.

- [Requirements](#requirements)
  - [Node.js](#nodejs)
- [Server-side Caching](#server-side-caching)
- [Redis](#redis)
- [Local Development](#local-development)
  - [Setup](#setup)
  - [Development](#development)
  - [Production](#production)
  - [Npm scripts](#npm-scripts)
- [Auth](#authentication-trade-imports-defra-id-stub)
- [Docker](#docker)
  - [Development image](#development-image)
  - [Production image](#production-image)
  - [Local stack](#local-stack)
- [Lighthouse performance testing](#lighthouse)
- [SonarCloud](#sonarcloud)
- [Licence](#licence)

## Requirements

### Node.js

To use the correct version of Node.js for this application, via nvm:

```bash
cd trade-imports-animals-frontend
nvm use
```

## Server-side Caching

We use Catbox for server-side caching. By default the service will use CatboxRedis when deployed and CatboxMemory for
local development.
You can override the default behaviour by setting the `SESSION_CACHE_ENGINE` environment variable to either `redis` or
`memory`.

Please note: CatboxMemory (`memory`) is _not_ suitable for production use! The cache will not be shared between each
instance of the service and it will not persist between restarts.

## Redis

Redis is an in-memory key-value store. Every instance of a service has access to the same Redis key-value store similar
to how services might have a database (or MongoDB). All frontend services are given access to a namespaced prefixed that
matches the service name. e.g. `my-service` will have access to everything in Redis that is prefixed with `my-service`.

## Proxy

We are using forward-proxy which is set up by default. To make use of this: `import { fetch } from 'undici'` then
because of the `setGlobalDispatcher(new ProxyAgent(proxyUrl))` calls will use the ProxyAgent Dispatcher

If you are not using Wreck, Axios or Undici or a similar http that uses `Request`. Then you may have to provide the
proxy dispatcher:

To add the dispatcher to your own client:

```javascript
import { ProxyAgent } from 'undici'

return await fetch(url, {
  dispatcher: new ProxyAgent({
    uri: proxyUrl,
    keepAliveTimeout: 10,
    keepAliveMaxTimeout: 10
  })
})
```

## Local Development

### Setup

Install application dependencies:

```bash
npm install
```

### Development

To run the application in `development` mode run:

```bash
npm run dev
```

### Production

To mimic the application running in `production` mode locally run:

```bash
npm start
```

### Npm scripts

All available Npm scripts can be seen in [package.json](./package.json)
To view them in your command line run:

```bash
npm run
```

## AUTHENTICATION (trade-imports-defra-id-stub)

For local cross-service development the recommended path is the workspace
docker stack at https://github.com/DEFRA/trade-imports-animals-workspace —
it stands the stub up alongside the frontend with the right env wiring;
no `/etc/hosts` edits required.

If running this service standalone against the stub on `localhost:3007`,
create an env file:

```
DEFRA_ID_OIDC_CONFIGURATION_URL=http://localhost:3007/idphub/b2c/b2c_1a_cui_cpdev_signupsigninsfi/.well-known/openid-configuration
DEFRA_ID_CLIENT_ID=8c5e0bd-8223-4908-a5aa-c9c1d7cddaac
DEFRA_ID_CLIENT_SECRET=test_value
DEFRA_ID_SERVICE_ID=aeaa0a80-15f3-48b2-8bd7-0e02874b3d32
DEFRA_ID_POLICY=b2c_1a_cui_cpdev_signupsigninsfi
```

## Docker

### Development image

> [!TIP]
> For Apple Silicon users, you may need to add `--platform linux/amd64` to the `docker run` command to ensure
> compatibility fEx: `docker build --platform=linux/arm64 --no-cache --tag trade-imports-animals-frontend`

Build:

```bash
docker build --target development --no-cache --tag trade-imports-animals-frontend:development .
```

Run:

```bash
docker run -p 3000:3000 trade-imports-animals-frontend:development
```

### Production image

Build:

```bash
docker build --no-cache --tag trade-imports-animals-frontend .
```

Run:

```bash
docker run -p 3000:3000 trade-imports-animals-frontend
```

### Local stack

The full local environment (MongoDB, Floci, Redis, the stubs, and every
trade-imports-animals service including this one) is the workspace stack in
[DEFRA/trade-imports-animals-workspace](https://github.com/DEFRA/trade-imports-animals-workspace):

```bash
# from the workspace root
./scripts/stack/run-stack.sh             # full stack from published images
./scripts/stack/run-stack.sh -d          # built from local source under repos/
./scripts/stack/run-stack.sh -e frontend # everything except this service (run it via npm run dev)
```

## Lighthouse

### Local usage

Start the workspace stack so the configured URLs are available on port 3000.
Then run:

```
npm run lighthouse
```

The URL list, score floors and contribution steps are in the
[Lighthouse guide](src/server/live-animals/docs/lighthouse.md).

### SonarCloud

Instructions for setting up SonarCloud can be found in [sonar-project.properties](./sonar-project.properties).

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3
