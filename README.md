# trade-imports-animals-frontend

[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_trade-imports-animals-frontend&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=DEFRA_trade-imports-animals-frontend)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_trade-imports-animals-frontend&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DEFRA_trade-imports-animals-frontend)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_trade-imports-animals-frontend&metric=coverage)](https://sonarcloud.io/summary/new_code?id=DEFRA_trade-imports-animals-frontend)

Core delivery platform Node.js Frontend Template.

- [Requirements](#requirements)
  - [Node.js](#nodejs)
- [Server-side Caching](#server-side-caching)
- [Redis](#redis)
- [Local Development](#local-development)
  - [Setup](#setup)
  - [Development](#development)
  - [Production](#production)
  - [Npm scripts](#npm-scripts)
  - [Update dependencies](#update-dependencies)
  - [Formatting](#formatting)
    - [Windows prettier issue](#windows-prettier-issue)
- [Docker](#docker)
  - [Development image](#development-image)
  - [Production image](#production-image)
  - [Docker Compose](#docker-compose)
  - [Dependabot](#dependabot)
  - [SonarCloud](#sonarcloud)
- [Lighthouse performance testing](#lighthouse)
- [Licence](#licence)
  - [About the licence](#about-the-licence)

## Requirements

### Node.js

Please install [Node.js](http://nodejs.org/) `>= v22` and [npm](https://nodejs.org/) `>= v9`. You will find it
easier to use the Node Version Manager [nvm](https://github.com/creationix/nvm)

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

If your service does not require a session cache to be shared between instances or if you don't require Redis, you can
disable setting `SESSION_CACHE_ENGINE=false` or changing the default value in `src/config/index.js`.

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

### Update dependencies

To update dependencies use [npm-check-updates](https://github.com/raineorshine/npm-check-updates):

> The following script is a good start. Check out all the options on
> the [npm-check-updates](https://github.com/raineorshine/npm-check-updates)

```bash
ncu --interactive --format group
```

### Formatting

#### Windows prettier issue

If you are having issues with formatting of line breaks on Windows update your global git config by running:

```bash
git config --global core.autocrlf false
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

### Docker Compose

A local environment with:

- Localstack for AWS services (S3, SQS)
- Redis
- MongoDB
- This service.
- A commented out backend example.

```bash
docker compose up --build -d
```

## Lighthouse

### Lighthouse performance testing

This project uses [Lighthouse](https://github.com/GoogleChrome/lighthouse) to run performance and best‑practices checks against the /origin page.

### Local usage

Start the app locally (on port 3000):

```
npm run dev
```

### Run Lighthouse against a chosen URL:

Run locally (app must already be running):

```
LH_BASE_URL=http://localhost:3000 npm run lighthouse
```

In CI against perf:

```
LH_BASE_URL=https://your-perf-env npm run lighthouse
```

### How to add new Lighthouse tests

For a new page, say /example:

1. Create tests/lighthouse/example.config.js:

   ```
   export const exampleLighthouseConfig = {
     path: '/example',
     variants: [
      {
        preset: 'mobile',
        thresholds: { performance: 0.6, accessibility: 0.7, bestPractices: 0.7 }
      },
      {
        preset: 'desktop',
        thresholds: { performance: 0.7, accessibility: 0.7, bestPractices: 0.8 }
      }
     ]
   }
   ```

   2. Import and register it in tests/lighthouse/index.mjs:
      ```
      import { exampleLighthouseConfig } from './example.config.js'
      // ...
      const pageConfigs = [
       ...
       exampleLighthouseConfig
      ]
      ```

   ```

   ```

- Each new “test” is just a small config file plus a line in the main runner.

### Dependabot

The dependabot configuration lives at `.github/dependabot.yml`
**This has been enabled for this repo.**

### SonarCloud

Instructions for setting up SonarCloud can be found in [sonar-project.properties](./sonar-project.properties).

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
