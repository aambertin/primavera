const debug = require('debug')('primavera:web')
import _ from 'lodash'
// import express from 'express'
import {Before,After} from './core'


/**
 * Lazy initialization of actual express routes.
 */
const initialization_stack = []
const router = new Proxy({}, {
    get(target, what) {
        return function() {
            debug(`Adding instruction to initialization stack: ${what} (${arguments})`)
            initialization_stack.push({method: what, args: Array.from(arguments)})
        }
    }
})

// export function start(app, path) {
//     const _router = express.Router()
//     for (let instruction of initialization_stack) {
//         _router[instruction.method].apply(_router,instruction.args)
//     }
//     app.use(path || "/", _router)
// }
// 
export function start(router) {
    debug('Initializing routes...')
    for (let instruction of initialization_stack) {
        router[instruction.method].apply(router,instruction.args)
        debug('Added route ', instruction.args)
    }
}

/**
 * Just bridge functions to already existing functionality.
 */
export const Validate = Before
export const Project = After


export function Session(prop) {
    var path = ['$request.session']
    if (prop && prop.trim()) path.push(prop)
    path = path.join('.')

    return Context(path)
}

export function Request(prop) {
    var path = ['$request']
    if (prop && prop.trim()) path.push(prop)
    path = path.join('.')

    return Context(path)
}


/**
 * Set HTTP status on successful response.
 * @param {[type]} status [description]
 */
export function HttpStatus(status) {
    return function (target, name, descriptor) {
        debug(`Setting HttpStatus ${status} on ${descriptor.name} success`, descriptor)
        descriptor.value.$$httpSuccessStatus = status 
        return descriptor
    }
}
_.merge(HttpStatus, {
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NON_AUTHORITATIVE: 203,
    NO_CONTENT: 204,
    RESET_CONTENT: 205,
    PARTIAL_CONTENT: 206,
    MULTI_STATUS: 207,
    MULTIPLE_CHOICES: 300,
    MOVED_PERMANENTLY: 301,
    FOUND: 302,
    SEE_OTHER: 303,
    NOT_MODIFIED: 304,
    USE_PROXY: 305,
    TEMPORARY_REDIRECT: 307,
    PERMANENT_REDIRECT: 308,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    PAYMENT_REQUIRED: 402,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    NOT_ACCCEPTABLE: 406,
    PROXY_AUTH_REQUIRED: 407,
    REQUEST_TIMEOUT: 408,
    CONFLICT: 409,
    GONE: 401,
    PRECONDITION_FAILED: 412,
    EXPECTATION_FAILED: 417,
    SERVER_ERROR: 500,
    NOT_IMPLEMENTED: 501,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504
})

export function HttpError() {
    return function(target, name, descriptor) {
        return descriptor
    }
}

for (let statusCode in HttpStatus) {
    const camelized = _.camelCase(statusCode)
    HttpStatus[camelized] = function(message) {
        let status = HttpStatus[statusCode]
        return {message, status}
    }
    HttpError[camelized] = function(message) {
        throw HttpStatus[camelized](message)
    }
}


/**
 * Register within a given Controller/Method pair.
 * Router registration will register the route in ExpressJS and transform
 * payload, query parameters and response accordingly.
 */
export function Route(routes) {

    if (!Array.isArray(routes)) routes = [routes]

    return function(target, name, descriptor) {
    	if (!descriptor) throw new Error('@Route can only be set on a method.')

        for (let route of routes) {
        	const parts = route.match(/[a-zA-Z0-9-_./\*\+:+]+/ig)
        	if (parts.length < 2) throw new Error(`${route} is not a valid routing expression.`)

            const method = parts[0].toLowerCase()
            let path = parts[1] || ''
            if (path.indexOf('/')==0) path = path.substring(1)

            debug(`@Route ${route} will be attached to ${target.constructor.name}::${name}()`)
             
            if (!target.$$routes) target.$$routes = []

            target.$$routes.push({method, path, _fn: name || descriptor })
            target.$$routes = target.$$routes
        }

        return descriptor
    }
}


// -------------------------------------------------------------
// Additional exports for syntax sugar
// -------------------------------------------------------------
export const GetRequest     = routeWith('GET')
export const PostRequest    = routeWith('POST')
export const PutRequest     = routeWith('PUT')
export const PatchRequest   = routeWith('PATCH')
export const ListRequest    = routeWith('LIST')
export const DeleteRequest  = routeWith('DELETE')
export const OptionsRequest  = routeWith('OPTIONS')
export const AllRequests    = routeWith('USE')
_.merge(Route, {USE: AllRequests, GET: GetRequest,POST: PostRequest, PUT: PutRequest, PATCH: PatchRequest, LIST: ListRequest, DELETE: DeleteRequest, OPTIONS: OptionsRequest})

// Build command-based @Route instructions
function routeWith(command) {
    return function(path, config) {
        return Route(`${command} ${path || '/'}`, config)
    }
}

/**
 * Register a given class as an express controller component.
 */
export function Controller(config) {
    var prefix = config && config.prefix || '';
    if (prefix && prefix.indexOf('/')!=0) prefix = `/${prefix}`

    return function (target, name, descriptor) {
        if (!target) throw new Error(`@Controller decorator can only be used in a class.`)

        const routes = target.$$routes || target.prototype.$$routes || []
        for (let route of routes) {
            const absolute = [prefix,route.path].join('/')
            debug(`@Controller is setting route ${route.method} -> ${absolute}`)

            router[route.method.toLowerCase()](absolute, async function (req,res, next) {
                try {
                    const instance = (target.constructor) ? new target() : target //Container.get(target.$$name || target.constructor.name)
                    // Inject request context if required.
                    instance.$$context = {$request:req,$response:res, $this: instance}

                    const merged = [Object.assign({}, req.query, req.params), req.body] // named url params take precedence
                    debug(`Invoking method ${target.name}::${route._fn}()`)

                    const _fn = instance[route._fn]
                    const result = await _fn.apply(instance, merged)

                    // If is a promise, treat as such.
                    debug("Checking if there's a specific http-status to be sent on success: ", _fn.$$httpSuccessStatus)
                    if (_fn.$$httpSuccessStatus)
                        res.status(_fn.$$httpSuccessStatus)

                    return res.send(result)
                    // next(req, res)
                }
                catch (e) {
                    console.error(e)
                    res.status(e.status || 500)
                    return res.send(e.errors || e.message)
                }
            })

        }

        debug(`@Controller ${target.name} was setup and routes were added.`)
        return target;
    }
}


/**
 * Set a given request context attribute as a controller class attribute.
 */
export function Context(path) {
    return function (target, name, descriptor) {
        debug(`@Context binding points to ${path} in ${target.name}::${name}`)
        
        const isFunction = !!descriptor.value
        debug("@Context use function decorator: ", isFunction)
        const overwrite = isFunction ? 'value' : 'get'
        var _fn = descriptor[overwrite]
        descriptor[overwrite] = function() {
            let ctxval;
            if (!path) ctxval = this.$$context
            if (typeof path === 'string') { //  instanceof String) {
                // debug(`In @Context(${path}) {this} object is `, this)
                ctxval = _.get(this.$$context, path)
            }
            if (typeof path === 'object') {
                ctxval = {}
            }

            if (isFunction) return _fn.apply(this, [ctxval])
            return ctxval
        }
    }
}


/**
 * Register a given class as an express middleware component.
 */
export function Middleware(config) {
    var prefix = config && config.prefix || '';
    if (prefix && prefix.indexOf('/')!=0) prefix = `/${prefix}`

    return function (target, name, descriptor) {
        if (!target) throw new Error(`@Middleware decorator can only be used in a class.`)

        const routes = target.$$routes || target.prototype.$$routes || []
        for (let route of routes) {
            const absolute = [prefix,route.path].join('/')
            debug(`@Middleware is setting route ${route.method} -> ${absolute}`)

            if (route.method=='*') route.method = 'use'

            router[route.method.toLowerCase()](absolute, async function(req,res,next) {
                const instance = (target.constructor) ? new target() : target 
                // Inject request context if required.
                instance.$$context = {$request:req,$response:res,$this: instance}

                try {
                    const result = await instance[route._fn].apply(instance, [req, res])
                    return await next()
                }
                catch (e) {
                    console.error(e)
                    res.status(e.status || 500)
                    return res.send(e.errors || e.message)
                }
            })
        }

        debug(`@Middleware ${target.name} was setup and routes were added.`)
        return target;
    }
}