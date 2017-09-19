// const debug = require('debug')('@expression/core:decorators/models')
import { default as debuglib } from 'debug'
import _ from 'lodash'
import { default as jsonschema } from 'jsonschema'

const debug = debuglib('@expression/core:decorators/transform')

/**
 * Apply transformations on method arguments.
 */
export const Transform = { IN, OUT }
export default Transform


/**
 * Map/transform function arguments before actual function call.
 */
export function IN() {
    const transformers = Array.from(arguments)
    return function(target, name, descriptor) {
        if (!descriptor) throw new Error(`@Transform operations can only be performed on method arguments.`)
        
        const fn = descriptor.value
        descriptor.value = async function() {
            const args = Array.from(arguments)
            debug(`Called @Transform.IN with ${transformers.length} transformers for ${args.length} arguments`)
            const values = await transform_in(transformers, args)
            debug(`@Transform.IN on ${name} returned: `, values)
            return await fn.apply(this, values)
        }

        return descriptor
    }
}

/**
 * Map/transform a function return value.
 * If the return value of the function is an array, the transform functions
 * will be applied to each element of the array.
 */
export function OUT() {
    const transformers = Array.from(arguments)
    let attribute
    if (transformers[0] && typeof transformers[0] === 'string') //:
        attribute = trasformers.shift()

    return function(target, name, descriptor) {
        if (!descriptor) throw new Error(`@Transform operations can only be performed on method response.`)
        debug(`Configuring @Transform on ${target.name||''}::${descriptor.name}`)

        const fn = descriptor.value
        descriptor.value = async function() {
            const args = Array.from(arguments)
            const data = await fn.apply(this, args)
            debug("Received data to transform", data)
            return await transform(transformers, data)
        }

        return descriptor
    }
}


/**
 * Map/transform a function return value.
 * If the return value of the function is an array, the transform functions
 * will be applied to each element of the array.
 */
export function Aggregate() {
    const aggregators = Array.from(arguments)
    let attribute
    if (aggregators[0] && typeof aggregators[0] === 'string') //:
        attribute = aggregators.shift()

    return function(target, name, descriptor) {
        if (!descriptor) throw new Error(`@Aggregate operations can only be performed on method resposne.`)
        debug(`Configuring @Aggregate on ${target.name||''}::${descriptor.name}`)

        const fn = descriptor.value
        descriptor.value = async function aggregate() {
            const ops = []
            const args = Array.from(arguments)
            const data = await fn.apply(this, args)

            for (let aggregator of aggregators) {
                debug(`@Aggregate is running aggregator: ${aggregator.name}`)
                ops.push(aggregator((attribute && _.get(data, attribute) || data)))
            }

            for (let op of ops) {
                if (attribute) _.merge(_.get(data, attribute), await op)
                else _.merge(data, await op)
            }
            
            return data
        }

        return descriptor
    }
}


/**
 * Support function for actual IN parameters transformations (N-N)
 */
async function transform_in(transformers = [], args = []) {
    // array explosion
    if (!Array.isArray(args)) throw new Error(`Argument list in @Transform.IN must be an array. Got: ${typeof args}`)

    const res = []
    for (let arg of args) {
        const transformer = transformers.shift()
        let val
        if (transformer) val = transform(transformer, arg)
        else val = arg

        res.push(val)
    }
    return await res
}


/**
 * General trasnformation support function (N-1)
 */
async function transform(transformers = [], data) {
    if (!transformers) return data // return raw data if there are no transformers to be applied.

    // data explosion for array processing scenarios
    if (Array.isArray(data)) {
        const res_arr = []
        for (let record of data) {
            res_arr.push(transform(transformers, record))
        }

        return await res_arr // await for all data record to be transformed
    }

    // transform logic
    if (!Array.isArray(transformers)) transformers = [transformers]

    let res = data
    for (let transformer of transformers) {
        debug(`Applying transformer ${transformer.name} to data`, data)
        res = await transformer(data)
    }
    debug("Transformed data: ", res)
    return res
}