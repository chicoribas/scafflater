const path = require('path')
const fsUtil = require('../fs-util')

/**
 * @typedef {object} Config
 * @description The generation configuration
 */
class ConfigProvider {

  constructor() {
    this.singleLineComment = '#'
    this.startRegionMarker = '@scf-region'
    this.endRegionMarker = '@end-scf-region'
    this.configMarker = '@scf-config'
    this.annotate = true
    this.annotationTemplate = `{{{config.singleLineComment}}} {{{config.startRegionMarker}}}
{{{config.singleLineComment}}} This code was generated by scafflater
{{{config.singleLineComment}}} @template {{{template.name}}} (v{{{template.version}}})
{{{config.singleLineComment}}} @partial {{{partial.name}}}
{{#each parameters }}
{{{../config.singleLineComment}}} @{{{@key}}} {{{this}}} 
{{/each}}

{{{content}}}

{{{config.singleLineComment}}} {{{config.endRegionMarker}}}`

    this.processors = ['./processors/handlebars-processor']
    this.appenders = ['./appenders/region-appender', './appenders/appender']

    this.scfFileName = '_scf.json'
    this.partialsFolderName = '_partials'
    this.hooksFolderName = '_hooks'
    this.helpersFolderName = '_helpers'

    this.cacheStorage = 'tempDir'
    this.cacheStorages = {
      tempDir: './storages/temp-dir-cache',
      homeDir: './storages/home-dir-cache',
    }

    this.source = 'github'
    this.sources = {
      github: './git-template-source',
    }
  }

  static mergeFolderConfig(folderPath, config) {
    let result = { ...config }
    const scfFilePath = path.join(folderPath, config.scfFileName)
    if (fsUtil.pathExistsSync(scfFilePath)) {
      const info = fsUtil.readJSONSync(scfFilePath)
      if (info.config) {
        result = { ...result, ...info.config }
      }
    }

    return result
  }

  // static extractConfigFromFileContent(filePath, context) {
  //   let fileContent = fsUtil.readFileContentSync(filePath)
  //   const configRegex = new RegExp(`${context.singleLineComment}\\s*${context.configMarker}\\s+(?<name>[^ ]+)\\s+(?<value>.*)`, 'gi')
  //   const configs = fileContent.matchAll(configRegex)
  //   let newContext = {}

  //   for (const c of configs) {
  //     switch (c.groups.name) {
  //       case 'processors':
  //       case 'appenders':
  //         try {
  //           newContext[c.groups.name] = JSON.parse(c.groups.value)
  //         } catch (error) {
  //           throw new Error(`Could not parse option '${c.groups.name}' on file '${filePath}': ${error}`)
  //         }
  //         break;
  //       case 'annotate':
  //         newContext[c.groups.name] = c.groups.value === '1' || c.groups.value === 'true'
  //         break;
  //       default:
  //         newContext[c.groups.name] = c.groups.value
  //         break;
  //     }
  //   }

  //   return {
  //     context: merge(context, newContext),
  //     fileContent: fileContent.replace(configRegex, '')
  //   }

  // }

  static extractConfigFromFileContent(filePath, config) {
    let fileContent = fsUtil.readFileContentSync(filePath)
    const configRegex = new RegExp(`${config.singleLineComment}\\s*${config.configMarker}\\s+(?<name>[^ ]+)\\s+(?<value>.*)`, 'gi')
    const configs = fileContent.matchAll(configRegex)
    let newConfig = {}

    for (const c of configs) {
      switch (c.groups.name) {
        case 'processors':
        case 'appenders':
          try {
            newConfig[c.groups.name] = JSON.parse(c.groups.value)
          } catch (error) {
            throw new Error(`Could not parse option '${c.groups.name}' on file '${filePath}': ${error}`)
          }
          break;
        case 'annotate':
          newConfig[c.groups.name] = c.groups.value === '1' || c.groups.value === 'true'
          break;
        default:
          newConfig[c.groups.name] = c.groups.value
          break;
      }
    }

    return {
      config: { ...config, ...newConfig },
      fileContent: fileContent.replace(configRegex, '')
    }

  }


}

module.exports = ConfigProvider
