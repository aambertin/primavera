/**
 * Decorators for general payload / response transformation between services/methods.
 * @module transform
 * @requires lodash
 * @requires jsonschema
 * @requires debug
 */


const debug = require('debug')('primavera:transform')

import jsonschema from 'jsonschema'
import _ from 'lodash'



/**
 * Apply transformations on method arguments.
 * This one is just a default holder for import convenience, you can use
 * \@Transform.IN and \@Transform.OUT  instead of \@TransformInput and \@TransformOutput .
 * 
 * @name @Transform
 * @function
 * @static
 * @see TransformInput, TransformOutput, Aggregate
 */
export const Transform = { IN: TransformInput, OUT: TransformOutput }
export default Transform


/**
 * Map/transform function arguments before actual function call.
 * 
 * @name @TransformInput
 * @function
 * @static
 * @see TransformOutput, Transform, Aggregate
 */
export function TransformInput(...transformers) {
    return function(target, name, descriptor) {
        if (!descriptor) throw new Error(`@Transform operations can only be performed on method arguments.`)
        
        const fn = descriptor.value
        descriptor.value = async function(...args) {
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
 *
 * @name @TransformOutput
 * @function
 * @static
 * @see TransformInput, Transform, Aggregate
 */
export function TransformOutput(...transformers) {
    let attribute
    if (transformers[0] && typeof transformers[0] === 'string') //:
        attribute = trasformers.shift()

    return function(target, name, descriptor) {
        if (!descriptor) throw new Error(`@Transform operations can only be performed on method response.`)
        
        const fn = descriptor.value
        descriptor.value = async function() {
            const args = Array.from(arguments)
            const data = await fn.apply(this, args)
            return await transform(transformers, data, this)
        }

        return descriptor
    }
}


/**
 * Map/transform a function return value.
 * If the return value of the function is an array, the transform functions
 * will be applied to each element of the array.
 *
 * @name @Aggregate
 * @function
 * @static
 * @see Transform, TransformInput, TransformOutput
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


/*
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


/*
 * General transformation support function (N-1)
 */
async function transform(transformers = [], data, target) {
    if (!transformers) return data // return raw data if there are no transformers to be applied.
    debug("Received data to transform", data, target)

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
        if (!transformer) {
            console.error('Watch out, one of your Transform.OUT ${(target && target.name)} is undefined.')
        }
        debug(`Applying transformer ${transformer.name} to data`, data)
        res = await transformer(data, target)
    }
    debug("Transformed data: ", res)
    return res
}