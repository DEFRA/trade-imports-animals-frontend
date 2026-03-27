import convict from 'convict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import convictFormatWithValidator from 'convict-format-with-validator'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const fourHoursMs = 14400000
const oneWeekMs = 604800000

const isLocal = process.env.NODE_ENV !== 'production'
const isProduction = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'
const isDevelopment = process.env.NODE_ENV === 'development'
const isPlatform = !isLocal // Deployed to CDP platform

const authCookieSameSite = 'Lax'
const csrfEnabled = !isTest
const csrfCookieSecure = isPlatform

convict.addFormats(convictFormatWithValidator)

export const config = convict({
  serviceVersion: {
    doc: 'The service version, this variable is injected into your docker container in CDP environments',
    format: String,
    nullable: true,
    default: null,
    env: 'SERVICE_VERSION'
  },
  host: {
    doc: 'The IP address to bind',
    format: 'ipaddress',
    default: '0.0.0.0',
    env: 'HOST'
  },
  port: {
    doc: 'The port to bind.',
    format: 'port',
    default: 3000,
    env: 'PORT'
  },
  staticCacheTimeout: {
    doc: 'Static cache timeout in milliseconds',
    format: Number,
    default: oneWeekMs,
    env: 'STATIC_CACHE_TIMEOUT'
  },
  serviceName: {
    doc: 'Applications Service Name',
    format: String,
    default: 'Animals'
  },
  root: {
    doc: 'Project root',
    format: String,
    default: path.resolve(dirname, '../..')
  },
  assetPath: {
    doc: 'Asset path',
    format: String,
    default: '/public',
    env: 'ASSET_PATH'
  },
  isProduction: {
    doc: 'If this application running in the production environment',
    format: Boolean,
    default: isProduction
  },
  isDevelopment: {
    doc: 'If this application running in the development environment',
    format: Boolean,
    default: isDevelopment
  },
  isTest: {
    doc: 'If this application running in the test environment',
    format: Boolean,
    default: isTest
  },
  log: {
    enabled: {
      doc: 'Is logging enabled',
      format: Boolean,
      default: process.env.NODE_ENV !== 'test',
      env: 'LOG_ENABLED'
    },
    level: {
      doc: 'Logging level',
      format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
      default: 'info',
      env: 'LOG_LEVEL'
    },
    format: {
      doc: 'Format to output logs in.',
      format: ['ecs', 'pino-pretty'],
      default: isProduction ? 'ecs' : 'pino-pretty',
      env: 'LOG_FORMAT'
    },
    redact: {
      doc: 'Log paths to redact',
      format: Array,
      default: isProduction
        ? ['req.headers.authorization', 'req.headers.cookie', 'res.headers']
        : []
    }
  },
  httpProxy: {
    doc: 'HTTP Proxy',
    format: String,
    nullable: true,
    default: null,
    env: 'HTTP_PROXY'
  },
  isSecureContextEnabled: {
    doc: 'Enable Secure Context',
    format: Boolean,
    default: isProduction,
    env: 'ENABLE_SECURE_CONTEXT'
  },
  session: {
    cache: {
      engine: {
        doc: 'backend cache is written to',
        format: ['redis', 'memory'],
        default: isProduction ? 'redis' : 'memory',
        env: 'SESSION_CACHE_ENGINE'
      },
      name: {
        doc: 'server side session cache name',
        format: String,
        default: 'session',
        env: 'SESSION_CACHE_NAME'
      },
      ttl: {
        doc: 'server side session cache ttl',
        format: Number,
        default: fourHoursMs,
        env: 'SESSION_CACHE_TTL'
      },
      segment: {
        doc: 'The cache segment.',
        format: String,
        default: 'session'
      }
    },
    cookie: {
      ttl: {
        doc: 'Session cookie ttl',
        format: Number,
        default: fourHoursMs,
        env: 'SESSION_COOKIE_TTL'
      },
      password: {
        doc: 'The cookie password.',
        format: String,
        default: 'replace-with-at-least-32-chars-long-string-1234567890',
        env: 'SESSION_COOKIE_PASSWORD',
        sensitive: true
      },
      secure: {
        doc: 'set secure flag on cookie',
        format: Boolean,
        default: isProduction,
        env: 'SESSION_COOKIE_SECURE'
      },
      sameSite: {
        doc: 'SameSite attribute for Bell OAuth state cookie',
        format: ['Strict', 'Lax', 'None'],
        default: authCookieSameSite,
        env: 'AUTH_COOKIE_SAME_SITE'
      }
    }
  },
  defraId: {
    oidcDiscoveryUrl: {
      doc: 'Defra ID OIDC well-known configuration URL',
      format: String,
      default:
        'http://localhost:3007/idphub/b2c/b2c_1a_cui_cpdev_signupsigninsfi/.well-known/openid-configuration',
      env: 'DEFRA_ID_OIDC_CONFIGURATION_URL'
    },
    clientId: {
      doc: 'Defra ID client ID',
      format: String,
      default: 'test-client-id',
      env: 'DEFRA_ID_CLIENT_ID',
      nullable: false
    },
    clientSecret: {
      doc: 'Defra ID client secret',
      format: String,
      default: 'test-secret',
      env: 'DEFRA_ID_CLIENT_SECRET',
      sensitive: true
    },
    serviceId: {
      doc: 'Defra ID service ID',
      format: String,
      default: 'trade-imports-animals-frontend',
      env: 'DEFRA_ID_SERVICE_ID'
    },
    policy: {
      doc: 'Defra ID B2C policy name',
      format: String,
      default: 'b2c_1a_cui_cpdev_signupsigninsfi',
      env: 'DEFRA_ID_POLICY'
    },
    redirectUrl: {
      doc: 'Redirect URL after Defra ID sign-in (OIDC callback)',
      format: String,
      default: 'http://localhost:3000/auth/sign-in-oidc',
      env: 'DEFRA_ID_REDIRECT_URL'
    },
    signOutRedirectUrl: {
      doc: 'Redirect URL after Defra ID sign-out',
      format: String,
      default: 'http://localhost:3000/auth/sign-out-oidc',
      env: 'DEFRA_ID_SIGN_OUT_REDIRECT_URL'
    },
    signOutHostnameRewrite: {
      enabled: {
        doc: 'Rewrite internal OIDC hostnames in sign-out URL for local environments',
        format: Boolean,
        default: !isProduction,
        env: 'DEFRA_ID_SIGN_OUT_HOSTNAME_REWRITE_ENABLED'
      },
      from: {
        doc: 'OIDC hostnames list for sign-out URL re-write',
        format: Array,
        default: ['host.docker.internal', 'trade-imports-defra-id-stub']
      },
      to: {
        doc: 'Target hostname used for sign-out OIDC URL rewrite',
        format: String,
        default: 'localhost',
        env: 'DEFRA_ID_SIGN_OUT_HOSTNAME_REWRITE_TO'
      }
    },
    refreshTokens: {
      doc: 'True if Defra Identity refresh tokens are enabled.',
      format: Boolean,
      default: true,
      env: 'DEFRA_ID_REFRESH_TOKENS'
    }
  },
  auth: {
    enabled: {
      doc: 'Enable authentication (Bell + session cookie)',
      format: Boolean,
      default: true,
      env: 'AUTH_ENABLED'
    }
  },
  redis: {
    host: {
      doc: 'Redis cache host',
      format: String,
      default: '127.0.0.1',
      env: 'REDIS_HOST'
    },
    username: {
      doc: 'Redis cache username',
      format: String,
      default: '',
      env: 'REDIS_USERNAME'
    },
    password: {
      doc: 'Redis cache password',
      format: '*',
      default: '',
      sensitive: true,
      env: 'REDIS_PASSWORD'
    },
    keyPrefix: {
      doc: 'Redis cache key prefix name used to isolate the cached results across multiple clients',
      format: String,
      default: 'trade-imports-animals-frontend:',
      env: 'REDIS_KEY_PREFIX'
    },
    useSingleInstanceCache: {
      doc: 'Connect to a single instance of redis instead of a cluster.',
      format: Boolean,
      default: !isProduction,
      env: 'USE_SINGLE_INSTANCE_CACHE'
    },
    useTLS: {
      doc: 'Connect to redis using TLS',
      format: Boolean,
      default: isProduction,
      env: 'REDIS_TLS'
    }
  },
  nunjucks: {
    watch: {
      doc: 'Reload templates when they are changed.',
      format: Boolean,
      default: isDevelopment
    },
    noCache: {
      doc: 'Use a cache and recompile templates each time',
      format: Boolean,
      default: isDevelopment
    }
  },
  csrf: {
    enabled: {
      doc: 'Enable CSRF protection (disabled during test runs)',
      format: Boolean,
      default: csrfEnabled
    },
    cookie: {
      secure: {
        doc: 'Set secure flag on CSRF cookie',
        format: Boolean,
        default: csrfCookieSecure
      }
    }
  },
  tracing: {
    header: {
      doc: 'Which header to track',
      format: String,
      default: 'x-cdp-request-id',
      env: 'TRACING_HEADER'
    }
  },
  tradeImportsAnimalsBackendApi: {
    baseUrl: {
      doc: 'Trade Imports Animals Backend API base URL',
      format: String,
      default: 'http://localhost:8085',
      env: 'TRADE_IMPORTS_ANIMALS_BACKEND_URL'
    }
  }
})

config.validate({ allowed: 'strict' })
