module.exports = (config) => {
  const path = require('path')
  const fs = require('fs-extra')
  const promisedHandlebars = require('promised-handlebars')
  const handlebars = promisedHandlebars(require('handlebars'))
  const minifier = require('./minifier')
  const viewCache = config.debug ? null : []

  const includeRegexStr = '{{( )?include "(.*)"( )?}}'
  const includeRegex = new RegExp(includeRegexStr, 'g')

  const optsToKeySuffix = (opts) => {
    if (opts.doNotMinify) {
      return '--origin'
    }

    return ''
  }

  const load = async (view, sub, opts) => {
    var key = view + optsToKeySuffix(opts)

    // Cache : Hit
    if (viewCache && viewCache[key]) {
      return viewCache[key]
    }

    // Cache : Missing
    var html = await fs.readFile(view, 'utf-8')
    var matches = html.match(includeRegex) || []

    for (let i = 0; i < matches.length; i++) {
      var name = new RegExp(includeRegexStr).exec(matches[i])[2]
      name = path.join(path.dirname(view), name)

      if (!name.endsWith('.html')) {
        name = name + '.html'
      }

      var subTemplate = await load(name, true, opts)
      html = html.replace(matches[i], subTemplate)
    }

    if (!sub && !opts.doNotMinify) {
      html = await minifier.html(html, config)
    }

    // Cache : Touch
    if (viewCache) {
      viewCache[key] = html
    }

    return html
  }

  const render = async (view, params, opts) => {
    var html = await load(view, undefined, opts)
    var template = await handlebars.compile(html)(params || {})

    return template
  }

  // Handlbars-Helpers
  require('handlebars-helpers')({ handlebars: handlebars })

  // Handlebars-Helper, Repeat
  handlebars.registerHelper('repeat', require('handlebars-helper-repeat'))

  // Handlebars-Helper, nl2br
  handlebars.registerHelper('nl2br', require('./helpers/nl2br')(handlebars))

  // Handlebars-Helper, pagingIdx
  handlebars.registerHelper('pagingIdx', require('./helpers/pagingIdx'))

  // Handlebars-Helper, pagingItems
  handlebars.registerHelper('pagingItems', require('./helpers/pagingItems'))

  Object.keys(config.cfg.viewHelpers).forEach((helper) => {
    handlebars.registerHelper(helper, config.cfg.viewHelpers[helper])
  })

  return {
    render: render
  }
}
