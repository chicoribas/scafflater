const TemplateManager = require('./template-manager')
const Generator = require('./generator')
const fsUtil = require('./fs-util')
const path = require('path')
const ConfigProvider = require('./config-provider')

/**
* Scafflater class
*/
class Scafflater {
  /**
  * Scafflater constructor.
  * @param {?object} config - Scafflater configuration. If null, will get the default configuration.
  * @param {string} sourceKey - The source key
  */
  constructor(config = {}, sourceKey = null) {
    this.config = { ...new ConfigProvider(), ...config }
    this.templateManager = new TemplateManager(this.config)
  }

  /**
  * Initializes the basic structure for this scafflater template.
  * @param {string} sourceKey - Source Template key
  * @param {object} parameters - Parameters used to generate partials
  * @param {string} targetPath - Path where the results must be placed
  * @return {ReturnValueDataTypeHere} Brief description of the returning value here.
  */
  async init(sourceKey, parameters, targetPath = './') {
    const templateConfig = await this.templateManager.templateSource.getTemplate(sourceKey)

    const scfConfig = {
      template: {...templateConfig.config},
      partials: [],
    }

    fsUtil.writeJSONSync(path.join(targetPath, this.config.scfFileName), scfConfig)

    await this.runPartial('_init', parameters, targetPath, templateConfig,)
  }

  async runPartial(partialPath, parameters, targetPath = './') {
    const scfConfig = await fsUtil.readJsonSync(path.join(targetPath, this.config.scfFileName))

    const partialInfo = await this.templateManager.getPartial(partialPath, scfConfig.template.name, scfConfig.template.version)

    const templatePath = await this.templateManager.getTemplatePath(scfConfig.template.name, scfConfig.template.version)
    const templateScf = fsUtil.readJsonSync(path.join(templatePath, this.config.scfFileName))

    const ctx = {
      partial: partialInfo.config,
      partialPath: partialInfo.path,
      parameters,
      targetPath,
      template: templateScf,
      templatePath: templatePath,
      config: new ConfigProvider()
    }

    await  new Generator(ctx).generate(ctx)

    if(!scfConfig.partials)
      scfConfig.partials = []
    scfConfig.partials.push({
      path: `${scfConfig.template.name}/${partialPath}`,
      parameters: parameters,
    })

    fsUtil.writeJSONSync(path.join(targetPath, this.config.scfFileName), scfConfig)
  }
}

module.exports = Scafflater
