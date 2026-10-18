import { findTrackingId } from './tracking-ids.js'

const TEST_FUNCTIONS = new Set(['describe', 'it', 'test'])

const rootIdentifierName = (callee) => {
  let node = callee
  while (node.type === 'MemberExpression' || node.type === 'CallExpression') {
    node = node.type === 'MemberExpression' ? node.object : node.callee
  }
  return node.type === 'Identifier' ? node.name : null
}

const staticText = (node) => {
  if (node?.type === 'Literal' && typeof node.value === 'string') {
    return node.value
  }
  if (node?.type === 'TemplateLiteral') {
    return node.quasis.map((quasi) => quasi.value.cooked ?? '').join('${}')
  }
  return null
}

const noTrackingIds = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow ticket keys, backlog and ruling ids, release names and session vocabulary in comments and test titles'
    },
    schema: [],
    messages: {
      found:
        'Remove {{kind}} ("{{match}}") from this {{where}}. State what the code or test does now.'
    }
  },
  create(context) {
    const report = (node, where, text) => {
      const found = findTrackingId(text)
      if (found) {
        context.report({ node, messageId: 'found', data: { ...found, where } })
      }
    }
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          report(comment, 'comment', comment.value)
        }
      },
      CallExpression(node) {
        if (!TEST_FUNCTIONS.has(rootIdentifierName(node.callee))) {
          return
        }
        const title = staticText(node.arguments[0])
        if (title !== null) {
          report(node.arguments[0], 'test title', title)
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
      found:
        '"{{match}}" names an obligation set. The platform layer is set-agnostic: take set data from the configuration the set gateway supplies.'
    }
  },
  create(context) {
    const patterns = (context.options[0]?.terms ?? []).map(termPattern)
    const check = (node, text) => {
      for (const pattern of patterns) {
        const found = pattern.exec(text)
        if (found) {
          context.report({
            node,
            messageId: 'found',
            data: { match: found[0] }
          })
          return
        }
      }
    }
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          check(comment, comment.value)
        }
      },
      Literal(node) {
        if (typeof node.value === 'string') {
          check(node, node.value)
        }
      },
      TemplateElement(node) {
        check(node, node.value.cooked ?? '')
      },
      Identifier(node) {
        check(node, node.name)
      }
    }
  }
}

export const houseRules = {
  meta: { name: 'house-rules' },
  rules: {
    'no-tracking-ids': noTrackingIds,
    'no-set-vocabulary': noSetVocabulary
  }
}

const SILENT_CATCH =
  'A silent catch hides the failure it swallows. Handle the rejection, or log it with { err } and the ids support searches by.'
const MESSAGE_ONLY_LOG =
  'Log the caught error as { err } with the ids support searches by, not a message alone.'

export const restrictedSyntax = [
  {
    selector:
      "CallExpression[callee.property.name='catch'] > ArrowFunctionExpression[body.type='Identifier'][body.name='undefined']",
    message: SILENT_CATCH
  },
  {
    selector:
      "CallExpression[callee.property.name='catch'] > :function[body.type='BlockStatement'][body.body.length=0]",
    message: SILENT_CATCH
  },
  {
    selector:
      'CatchClause[param] CallExpression[callee.property.name=/^(error|warn)$/][callee.object.name=/^(logger|log)$/][arguments.length=1][arguments.0.type=/^(Literal|TemplateLiteral)$/]',
    message: MESSAGE_ONLY_LOG
  },
  {
    selector:
      "CatchClause[param] CallExpression[callee.property.name=/^(error|warn)$/][callee.object.property.name='logger'][arguments.length=1][arguments.0.type=/^(Literal|TemplateLiteral)$/]",
    message: MESSAGE_ONLY_LOG
  }
]
