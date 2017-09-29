const debug = require('debug')('primavera:flow')
const _ = require('lodash')

const resolvers = []

export function register(pattern, fn) {
    debug("Registered resolver for ", pattern)
    resolvers.push({pattern, fn})
}

export async function resolve(data, context) {
    let candidates = []

    function match(value, matcher) {
        if (typeof matcher == 'function') //:
            return matcher(value)
        else if (typeof matcher == 'object' && matcher.constructor.name == 'RegExp') //:
            return matcher.test(value)
        else //:
            return value == matcher
    }

    // weight the suitable candidates
    for (let resolver of resolvers) {
        let weight = 0
        for (let attribute in resolver.pattern) {
            let value = _.get(context, attribute)
            if ((!(attribute in context)) || !match(value, resolver.pattern[attribute])) {
                // over-specialized or unmatching
                weight = 0
                break
            }
            weight++
        }
        if (weight > 0) {
            candidates.push({fn: resolver.fn, weight})
        }
    }

    // Not found
    if (candidates.length < 1) {
        debug("No @Resolve candidates match the message context ", context)
        throw new Error("No @Resolve candidates match the message context ", context)
    }

    candidates = candidates.sort((a,b) => b.weight - a.weight)

    // Weight collision
    if (candidates[1]) {
        if (candidates[0].weight == candidates[1].weight) {
            debug("There is a weight collision between resolvers for message context ", context, candidates[0], candidates[1])
            throw new Error("There is a weight collision between resolvers for message context.")
        }
        debug(`Found competition between candidates[0](${candidates[0].weight}) and candidates[1](${candidates[1].weight})`)
    }

    return await candidates[0].fn(data, context)
}


export function Resolve(pattern) {
    return function (target, name, descriptor) {
        const _target = descriptor.value || target
        register(pattern, _target)
        return _target
    }
}


export function ResolveWith(pattern) {
    return function(target, name, descriptor) {
        debug(`Registering function ${target.name}->${name} as resolve-requestor for pattern: `, pattern)
        const previous = descriptor.value;
        descriptor.value = async function(message) {
            const usePattern = _.merge({}, pattern)
            
            let processor
            debug(`@ResolveWith is being applied to ${previous.name || 'inline function'}`)
            message = await previous.apply(this, [message, usePattern])
            processor = ResolveWith.resolver(usePattern)
            return await processor(message)
        }

        return descriptor
    }
}

/**
 * Find a resolver function for a given _pattern_.
 * @param  {Object} pattern The pattern that drives the flow.
 * @return {Fuction} resolver function for _pattern_
 */
ResolveWith.resolver = function(pattern) {
    return async function(data) {
        debug("Resolving data with resolver for pattern ", pattern, data)
        if (typeof data == 'Promise') data = await data

        const context = Object.assign({}, pattern)
        for (let attribute in context) {
            let value = context[attribute]
            if (typeof value == 'string' && value.startsWith("$data")) //:
                context[attribute] = _.get(data, value.substring(6))
        }
        debug("Resolved message context to get resolver ", context, data)

        return await resolve(data, context)
    }
}