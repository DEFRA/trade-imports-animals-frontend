const TRACKING_REFERENCES = [
  { pattern: /\bEUDPA-\d+/i, label: 'a ticket key' },
  { pattern: /\b(?:c|d|q|inc|req)-\d{3}\b/i, label: 'a backlog or ruling id' },
  { pattern: /\bdesign release\b/i, label: 'a release name' },
  { pattern: /\bDR ?\d+(?:\.\d+)?\b/i, label: 'a release name' },
  { pattern: /\bRuled\b/, label: 'a ruling reference' },
  { pattern: /\breal service\b/i, label: 'session vocabulary' }
]

const TEST_FUNCTION_NAMES = new Set(['describe', 'it', 'test', 'suite'])

const LOGGED_LEVELS = new Set(['error', 'warn'])

const FUNCTION_TYPES = new Set([
  'ArrowFunctionExpression',
  'FunctionExpression'
])

export const findTrackingReference = (text) => {
  for (const { pattern, label } of TRACKING_REFERENCES) {
    const found = pattern.exec(text)
    if (found) {
      return { label, match: found[0] }
    }
  }
  return undefined
}

const rootCalleeName = (callee) => {
  let node = callee
  while (node) {
    if (node.type === 'Identifier') {
      return node.name
    }
    if (node.type === 'MemberExpression') {
      node = node.object
    } else if (node.type === 'CallExpression') {
      node = node.callee
    } else {
      return undefined
    }
  }
  return undefined
}

const isTestFunctionCall = (node) =>
  TEST_FUNCTION_NAMES.has(rootCalleeName(node.callee))

const literalText = (node) => {
  if (node?.type === 'Literal' && typeof node.value === 'string') {
    return node.value
  }
  if (node?.type === 'TemplateLiteral') {
    return node.quasis.map((quasi) => quasi.value.cooked ?? '').join('${}')
  }
  return undefined
}

const textNodesOf = (node) => {
  if (node?.type === 'ArrayExpression') {
    return node.elements.flatMap(textNodesOf)
  }
  const text = literalText(node)
  return text === undefined ? [] : [{ node, text }]
}

const tagTextNodesOf = (details) => {
  if (details?.type !== 'ObjectExpression') {
    return []
  }
  const tag = details.properties.find(
    (property) =>
      property.type === 'Property' &&
      property.key.type === 'Identifier' &&
      property.key.name === 'tag'
  )
  return tag ? textNodesOf(tag.value) : []
}

const noTrackingReferences = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow ticket keys, backlog or ruling ids, release names and session vocabulary in comments, test titles and test tags'
    },
    schema: [],
    messages: {
      inComment:
        'Comment contains {{label}} ("{{match}}"). Say what the code does instead.',
      inTestTitle:
        'Test title or tag contains {{label}} ("{{match}}"). State what the assertions prove instead.'
    }
  },
  create(context) {
    const reportIfTracked = (node, text, messageId) => {
      const reference = findTrackingReference(text)
      if (reference) {
        context.report({ node, messageId, data: reference })
      }
    }

    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          reportIfTracked(comment, comment.value, 'inComment')
        }
      },
      CallExpression(node) {
        if (!isTestFunctionCall(node)) {
          return
        }
        const [title, details] = node.arguments
        for (const { node: textNode, text } of [
          ...textNodesOf(title),
          ...tagTextNodesOf(details)
        ]) {
          reportIfTracked(textNode, text, 'inTestTitle')
        }
      }
    }
  }
}

const isCatchCall = ({ callee }) =>
  callee.type === 'MemberExpression' &&
  callee.property.type === 'Identifier' &&
  callee.property.name === 'catch'

const isSilentHandler = (handler) => {
  if (!FUNCTION_TYPES.has(handler?.type)) {
    return false
  }
  const { body } = handler
  if (body.type === 'BlockStatement') {
    return body.body.length === 0
  }
  return body.type === 'Identifier' && body.name === 'undefined'
}

const noSilentCatch = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow .catch(() => undefined) and .catch(() => {}), which drop the error without a trace'
    },
    schema: [],
    messages: {
      silent:
        'This .catch drops the error. Log it with { err } and the ids support searches by, or let it reject.'
    }
  },
  create(context) {
    return {
      CallExpression(node) {
        if (isCatchCall(node) && isSilentHandler(node.arguments[0])) {
          context.report({ node, messageId: 'silent' })
        }
      }
    }
  }
}

const memberPath = (node) => {
  if (node.type === 'Identifier') {
    return node.name
  }
  if (node.type === 'ThisExpression') {
    return 'this'
  }
  if (node.type === 'MemberExpression') {
    const property =
      node.property.type === 'Identifier' ? node.property.name : ''
    return `${memberPath(node.object)}.${property}`
  }
  return ''
}

const isLoggerCall = ({ callee }) =>
  callee.type === 'MemberExpression' &&
  callee.property.type === 'Identifier' &&
  LOGGED_LEVELS.has(callee.property.name) &&
  /log/i.test(memberPath(callee.object))

const isStringOnly = (args) =>
  args.length > 0 && args.every((arg) => literalText(arg) !== undefined)

const isCatchHandler = (node) =>
  FUNCTION_TYPES.has(node.type) &&
  node.parent?.type === 'CallExpression' &&
  node.parent.arguments[0] === node &&
  isCatchCall(node.parent)

const caughtErrorParam = (ancestor) => {
  if (ancestor.type === 'CatchClause') {
    return ancestor.param
  }
  if (isCatchHandler(ancestor)) {
    return ancestor.params[0]
  }
  return undefined
}

const innermostCaughtErrorName = (ancestors) => {
  const param = ancestors.map(caughtErrorParam).findLast(Boolean)
  if (!param) {
    return undefined
  }
  return param.type === 'Identifier' ? param.name : 'err'
}

const noMessageOnlyErrorLog = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow logger.error or logger.warn with only a string when a caught error is in scope'
    },
    schema: [],
    messages: {
      stringOnly:
        'Log the caught error as { err: {{name}} } with the ids support searches by, not only a message.'
    }
  },
  create(context) {
    return {
      CallExpression(node) {
        if (!isLoggerCall(node) || !isStringOnly(node.arguments)) {
          return
        }
        const name = innermostCaughtErrorName(
          context.sourceCode.getAncestors(node)
        )
        if (name) {
          context.report({ node, messageId: 'stringOnly', data: { name } })
        }
      }
    }
  }
}

const termPattern = (term) =>
  new RegExp(
    term
      .split(/[-_ ]/)
      .map((part) => part.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`))
      .join('[-_ ]?'),
    'i'
  )

const noSetVocabulary = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow obligation-set names and codes in the set-agnostic platform layer'
    },
    schema: [
      {
        type: 'object',
        properties: {
          terms: { type: 'array', items: { type: 'string' } }
        },
        additionalProperties: false
      }
    ],
    messages: {
      setName:
        '"{{match}}" names an obligation set. The platform layer is set-agnostic: take set data from the configuration the set gateway supplies.'
    }
  },
  create(context) {
    const patterns = (context.options[0]?.terms ?? []).map(termPattern)
    const reportIfSetName = (node, text) => {
      for (const pattern of patterns) {
        const found = pattern.exec(text)
        if (found) {
          context.report({
            node,
            messageId: 'setName',
            data: { match: found[0] }
          })
          return
        }
      }
    }
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          reportIfSetName(comment, comment.value)
        }
      },
      Literal(node) {
        if (typeof node.value === 'string') {
          reportIfSetName(node, node.value)
        }
      },
      TemplateElement(node) {
        reportIfSetName(node, node.value.cooked ?? '')
      },
      Identifier(node) {
        reportIfSetName(node, node.name)
      }
    }
  }
}

export const codeQuality = {
  meta: { name: 'code-quality' },
  rules: {
    'no-tracking-references': noTrackingReferences,
    'no-silent-catch': noSilentCatch,
    'no-message-only-error-log': noMessageOnlyErrorLog,
    'no-set-vocabulary': noSetVocabulary
  }
}
