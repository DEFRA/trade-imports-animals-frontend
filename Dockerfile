ARG PARENT_VERSION=2.10.1-node24.11.1
ARG PORT=3000
ARG PORT_DEBUG=9229

FROM defradigital/node-development:${PARENT_VERSION} AS development
ARG PARENT_VERSION
LABEL uk.gov.defra.ffc.parent-image=defradigital/node-development:${PARENT_VERSION}

ENV TZ="Europe/London"

ARG PORT
ARG PORT_DEBUG
ENV PORT=${PORT}
EXPOSE ${PORT} ${PORT_DEBUG}

COPY --chown=node:node --chmod=755 package*.json ./
COPY --chown=node:node --chmod=755 scripts/npm-version.js ./scripts/

# Same pin as the GitHub Actions workflows: the npm that installs must be the
# npm that generated package-lock.json, otherwise the resolved tree differs and
# `npm ci` rejects the lockfile. Take it from `packageManager` rather than
# inheriting whatever npm PARENT_VERSION's Node happens to bundle, so a base
# image bump cannot silently reintroduce the mismatch. The helper validates the
# field and strips any Corepack integrity suffix, so a malformed pin fails the
# build instead of installing the wrong npm.
#
# Root is needed to write the global prefix; the cache is redirected so this
# root-run install cannot leave root-owned files in the node user's npm cache.
USER root
RUN npm_config_cache=/tmp/npm-root-cache \
    npm install --global "$(node scripts/npm-version.js)"
USER node

RUN npm install
COPY --chown=node:node --chmod=755 . .
RUN npm run build:frontend

CMD [ "npm", "run", "docker:dev" ]

FROM development AS production_build

ENV NODE_ENV=production

RUN npm run build:frontend

FROM defradigital/node:${PARENT_VERSION} AS production
ARG PARENT_VERSION
LABEL uk.gov.defra.ffc.parent-image=defradigital/node:${PARENT_VERSION}

ENV TZ="Europe/London"

# Add curl to template.
# CDP PLATFORM HEALTHCHECK REQUIREMENT
USER root
RUN apk add --no-cache curl
USER node

COPY --from=production_build /home/node/package*.json ./
COPY --from=production_build /home/node/scripts/npm-version.js ./scripts/
COPY --from=production_build /home/node/src ./src/
COPY --from=production_build /home/node/.public/ ./.public/

# See the development stage: `npm ci` must run on the npm named in
# `packageManager`, not the one the base image ships with.
USER root
RUN npm_config_cache=/tmp/npm-root-cache \
    npm install --global "$(node scripts/npm-version.js)"
USER node

RUN npm ci --omit=dev

ARG PORT
ENV PORT=${PORT}
EXPOSE ${PORT}

CMD [ "node", "src" ]
