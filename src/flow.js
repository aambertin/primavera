/**
 * Decorators for FLOW: pattern-matching service discovery.
 * @module flow
 * @requires lodash
 */

const debug = require('debug')('primavera:flow')
import _  from 'lodash'


const resolvers = []
function register(pattern, fn, target) {
    debug("Registered resolver for ", pattern)
    resolvers.push({pattern, fn, target})
}

async function resolve(context, data) {
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
            candidates.push({fn: resolver.fn, target: resolver.target, weight})
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

    const champion = candidates[0]
    const instance = champion.target && champion.target.constructor ? new champion.target.constructor : this

    return await champion.fn.apply(instance, [data, context])
}


/**
 * \@Resolve annotated methods act as part of the pattern-matching service resolution framework provided by Primavera.
 * Requests to _resolve_ a given pattern will be caught on a best-match basis, allowing you to specialize _resolvers_ without
 * going into an "if this... if that" code hell. Also, it's nice to just shout for stuff.
 * 
 * @name @Resolve
 * @function
 * @static
 * @param {object} pattern Pattern of the required resolution
 * @example
 * import { Resolve } from 'primavera/flow'
 * class ServiceGroup {
 *     @Resolve({domain: 'management/users', action: 'SaveUser'})
 *     async saveUser(payload, context) {
 *         // ...
 *     }
 * }
 */
export function Resolve(pattern) {
    return function (target, name, descriptor) {
        debug('@resolve registered ', target, descriptor)
        const _target = descriptor.value || target
        register(pattern, _target, target)
        return _target
    }
}

/**
 * Des
 * @function
 * @static
 * @name @ResolveWith
 * @param {object} pattern the pattern to be used to discover the best possible _resolver_.
 * @example
 * import { ResolveWith } from 'primavera/flow'
 * import { Controller, Route } from 'primavera/web'
 *
 * \@Controller({prefix: 'users'})
 * class UsersController {
 *
 *     \@Route.GET(':id')
 *     async fetchUser(params) {
 *         this.$doFetchUser(params.id)
 *     }
 *
 *     \@ResolveWith({domain: 'management/users', action: 'FetchUser'})
 *     async $doFetchUser(_id) {
 *          return { id: _id }
 *     }
 *  
 * }
 */
export function ResolveWith(pattern) {
    return function(target, name, descriptor) {
        debug(`Registering function ${target.name}->${name} as resolve-requestor for pattern: `, pattern)
        const previous = descriptor.value;
        descriptor.value = async function(message) {
            message = JSON.parse(JSON.stringify(message))
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

        data = JSON.parse(JSON.stringify(data))

        const context = JSON.parse(JSON.stringify(pattern))
        for (let attribute in context) {
            let value = context[attribute]
            if (typeof value == 'string' && value.startsWith("$data")) //:
                context[attribute] = _.get(data, value.substring(6))
        }
        debug("Resolved message context to get resolver ", context, data)

        try {
            return await resolve(context, data)
        }
        catch (err) {
            console.error(err)
            throw err
        }
    }
}