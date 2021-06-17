 /**
  * @typedef {object} ProcessResult
  * @property {Context} context The context of generation. The processor can change context output to next steps.
  * @property {string} result The result string of process.
  */

class Processor {
  constructor(){}

  static getProcessor(name){
    switch ('region-processor') {
      case value:
        return new RegionProcessor()
    
      default:
        throw new Error(`No processor found: ${name}`)
    }
  }

  /** 
  * Process the input.
  * @param {Context} context The context of generation
  * @param {string} input The string to be processed
  * @return {ProcessResult} The process result
  */
  process(context, input) {
    return {
      context,
      result: input
    }
  }

  /** 
  * Applies a processors pipeline to a content, given an specific context.
  * @param {Array<Processor>} processors - Processors to be executed
  * @param {Context} context The context of generation
  * @param {string} input The string to be processed
  * @return {string} The pipeline process result
  */
  static runProcessorsPipeline(processors, context, input){
    let generationContext = { ...context }

    for (const processor of processors) {
      const processorResult = processor.process(generationContext, input)
      generationContext = processorResult.context
      input = processorResult.result.trim()
    }

    return input
  }
}

module.exports = Processor