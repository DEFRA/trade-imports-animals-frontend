import { nunjucksConfig } from '../../../config/nunjucks/nunjucks.js'

const environment = nunjucksConfig.options.compileOptions.environment

/**
 * Renders one macro of a template to HTML, for a table cell that needs a
 * GOV.UK component.
 *
 * @param {string} template - the template path the macro is imported from.
 * @param {string} macro - the macro's name.
 * @param {...unknown} macroArguments - passed to the macro in order.
 * @returns {string}
 */
export const renderMacro = (template, macro, ...macroArguments) => {
  const argumentList = macroArguments
    .map((_, position) => `macroArguments[${position}]`)
    .join(', ')
  return environment.renderString(
    `{% from "${template}" import ${macro} %}{{ ${macro}(${argumentList}) }}`,
    { macroArguments }
  )
}
