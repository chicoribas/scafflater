import { join } from "path";
import fsUtil from "../fs-util/index.js";
import { RegionProvider } from "../generator/region-provider/index.js";
import { ignores } from "../util/index.js";
import { logger } from "../logger/index.js";
import winston from "winston";

/**
 * @class ScafflaterOptions
 * @classdesc The options to generate files
 */
export default class ScafflaterOptions {
  /**
   * @param {?(ScafflaterOptions|object)} options The options that must override defaults
   */
  constructor(options = {}) {
    for (const option in options) {
      this[option] = options[option];
    }

    if (this.mode === "debug") {
      this.logger.level = "debug";
    }
  }

  lineCommentTemplate = "# {{{comment}}}";
  startRegionMarker = "@scf-region";
  endRegionMarker = "@end-scf-region";
  optionMarker = "@scf-option";

  /**
   * Target name.
   *
   * @description Name or path when generated text must be appended. Possible values are:
   *  - text: simple text of the target
   *  - handlebars: handlebars expressions can be used to build targets based on context
   *  - glob<patterns>: glob patters, to indicate targets. This can be used to append content on multiples targets.
   */
  targetName = null;

  /**
   * Ignore files or folders
   *
   * @description If boolean, indicates if a file or folder must be ignored. If array of strings, indicates patterns (same patterns of gitignore) to ignore.
   * @type {(boolean|string[])} ignore
   */
  ignore;

  logRun = true;
  annotate = false;
  annotationTemplate = `{{#lineComment this}}{{{options.startRegionMarker}}}{{/lineComment}}
{{#lineComment this}}This code was generated by scafflater{{/lineComment}}
{{#lineComment this}}@template {{{template.name}}} (v{{{template.version}}}){{/lineComment}}
{{#lineComment this}}@partial {{{partial.name}}}{{/lineComment}}
{{#each parameters }}
{{#lineComment this}}@{{{@key}}} {{{this}}}{{/lineComment}}
{{/each}}

{{{content}}}

{{#lineComment this}}{{{options.endRegionMarker}}}{{/lineComment}}`;

  /**
   * Append Strategy
   *
   * @description Action to include generated code on target:
   *  - append: The content will be appended to the destination (Default)
   *  - appendIfExists: The content will be appended only if destination already exists
   *  - replace: The content will replace the target content
   *  - ignore: If the destination exists and is not empty, will ignore the generated code.
   *
   * Available for: File Content
   * @type {('append'|'replace'|'ignore'|'appendIfExists')}
   */
  appendStrategy = "append";

  /**
   * Mode to run scafflater. Util for debug files generations.
   *
   * @description Action to include generated code on target:
   *  - prod: Normal Execution (Default)
   *  - debug: Will disable async execution. Useful to debug generator.
   * @type {('prod'|'debug')}
   */
  mode = "prod";

  processors = ["./processors/handlebars-processor"];
  appenders = ["./appenders/region-appender", "./appenders/appender"];
  /**
   * Array Append Strategy. Available for yaml and json appenders.
   *
   * @description Action to include generated code on target:
   *  - combine: The array will be combine item per item (Default)
   *  - concat: The arrays will be concatenated
   *  - replace: The source array will replace the target array
   *  - ignore: If the destination exists and is not empty, will ignore the source array.
   *  - key<keyName>: the parameter 'keyName' will be used as item key to merge arrays. The object of source will replace the object with the same key value on target.
   *
   * Available for: File Content
   * @type {('combine'|'concat'|'replace'|'ignore'|'key<keyName>')}
   */
  arrayAppendStrategy = "combine";

  scfFolderName = ".scafflater";
  scfFileName = "scafflater.jsonc";
  initFolderName = "init";
  partialsFolderName = "partials";
  hooksFolderName = "hooks";
  helpersFolderName = "helpers";

  /**
   * Folder containing extensions for code generation. This folder can contain Appenders and Processors
   */
  extensionFolderName = "extension";

  cacheStorage = "tempDir";
  cacheStorages = {
    tempDir: "./temp-dir-cache/index.js",
    homeDir: "./home-dir-cache/index.js",
  };

  source = "isomorphicGit";
  sources = {
    octokit: "./octokit-template-source/index.js",
    git: "./git-template-source/index.js",
    githubClient: "./github-client-template-source/index.js",
    isomorphicGit: "./isomorphic-git-template-source/index.js",
    localFolder: "./local-folder-template-source/index.js",
    package: "./package-template-source/index.js",
  };

  githubBaseUrlApi = "https://api.github.com";
  githubBaseUrl = "https://github.com";
  githubUsername = null;
  githubPassword = null;

  /**
   * @description Winston Logger instance
   * @type {winston.logger}
   */
  logger = logger;

  ignores(basePath, folderOrFile) {
    if (Array.isArray(this.ignore)) {
      return ignores(basePath, folderOrFile, this.ignore);
    } else {
      return Boolean(this.ignore);
    }
  }

  /**
   * Loads Folder Options
   *
   * @description Looks for .scafflater file in folder, loads it if exists and returns an ScaffolderOptions object with the actual parameters with the loaded from file.
   * @param {string} folderPath Folder to load the Options
   * @param {import("../generator").Context} context Context
   * @returns {Promise<ScafflaterOptions>} The merged Options
   */
  async getFolderOptions(folderPath, context) {
    let result = { ...this };
    const scfFilePath = join(folderPath, this.scfFileName);
    if (await fsUtil.pathExists(scfFilePath)) {
      const info = await fsUtil.readJSON(scfFilePath);
      if (info.options) {
        if (Object.keys(info.options).length > 0) {
          context.options.logger
            .debug(`Folder Config Loaded for '${folderPath.replace(
            context.templatePath,
            ""
          )}' \n${JSON.stringify(info.options, null, 2)}
        `);
        }
        result = { ...result, ...info.options };
      }
    }
    return Promise.resolve(new ScafflaterOptions(result));
  }

  /**
   * Loads File Options
   *
   * @description Looks for @scf-option in file content, loads it if exists and returns an ScaffolderOptions object with the actual parameters with the loaded options from file.
   * @param {string} filePath File to load the Options
   * @param {import("../generator").Context} context Context
   * @returns {Promise<ScafflaterOptions>} The merged Options
   */
  async getFileOptions(filePath, context) {
    const fileContent = await fsUtil.readFileContent(filePath);
    const result = await this.getConfigFromString(fileContent);
    if (result && Object.keys(result).length > 0) {
      context.options.logger.debug(`File Config Loaded for '${filePath.replace(
        context.templatePath,
        ""
      )}'\n${JSON.stringify({ ...result, logger: null }, null, 2)}
      `);
    }
    return Promise.resolve(result);
  }

  /**
   * Loads @scf-option from strong
   *
   * @description Looks for @scf-option in string, loads it if exists and returns an ScaffolderOptions object with the actual parameters with the loaded options.
   * @param {string} str String with @scf-option
   * @returns {Promise<ScafflaterOptions>} The merged Options
   */
  getConfigFromString(str) {
    const configRegex = new RegExp(
      `.*${this.optionMarker}\\s*(?<json>{.*:({.*}|".*"|[^}])*?}).*`,
      "gi"
    );
    const configs = str.matchAll(configRegex);

    let newConfig = this;

    const regionProvider = new RegionProvider(this);
    const regions = regionProvider.getRegions(str);

    for (const c of configs) {
      try {
        // Ignore configuration in regions
        if (
          regions.findIndex(
            (r) => r.contentStart <= c.index && r.contentEnd >= c.index
          ) >= 0
        ) {
          continue;
        }

        newConfig = { ...newConfig, ...JSON.parse(c.groups.json) };
      } catch (error) {
        throw new Error(`Could not parse option '${c.groups.name}'`);
      }
    }

    return new ScafflaterOptions(newConfig);
  }

  /**
   * Strips all @scf-option from strong
   *
   * @description Looks for @scf-option in string, and removes the line with the config
   * @param {string} str String with @scf-option
   * @returns {Promise<string>} The striped string
   */
  stripConfig(str) {
    const configRegex = new RegExp(
      `.*${this.optionMarker}\\s*(?<json>{.*}).*\\n?`,
      "gi"
    );
    return str.replace(configRegex, "");
  }
}
