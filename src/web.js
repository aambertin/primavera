/**
 * Decorators for HTTP API routing, endpoint and middleware configuration.
 * @module web
 * @requires primavera/core
 * @requires debug
 * @requires lodash
 */

const debug = require('debug')('primavera:web')
import _ from 'lodash'
import {Before,After} from './core'


/*
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

/**
 * Initialize routes specified in @Controller and @Middleware classes
 * using the provided _router_. Use together with _loader_.
 *
 * @category Web
 * @name start
 * @function
 * @static
 * @param  {router} router router of choice
 * @see loader
 * @example  
 * // Initialize components and routes.
 * const router = express.Router()
 * primavera.loader.load(/components\.js$/, __dirname)
 * primavera.loader.load(/services\.js$/, __dirname)
 * primavera.loader.load(/middleware\.js$/, __dirname)
 * primavera.loader.load(/endpoints\.js$/, __dirname)
 * primavera.web.start(router)
 * app.use(router)
 * 
 */
export function start(router) {
    debug('Initializing routes...')
    for (let instruction of initialization_stack) {
        router[instruction.method].apply(router,instruction.args)
        debug('Added route ', instruction.args)
    }
}

/**
 * @category Web
 * @name @Validate
 * @static
 * @function
 * @param {function} ...validationFunctions your validation functions
 * @see Before
 * @example  
 * import { Controller, Validate } from 'primavera/web'
 * \@Controller()
 * class MyController {
 *     \@Validate((val) => { })
 *     async someFunction(val) {
 *     }
 * }
 * 
 */
export const Validate = Before

/**
 * @category Web
 * @name @Project
 * @static
 * @function
 * @param {function} ...projectionFunctions your projection functions
 * @see Before
 * @example  
  * import { Controller, Project } from 'primavera/web'
 * \@Controller()
 * class MyController {
 *     \@Project((raw) => { return raw })
 *     async someFunction(val) {
 *     }
 * }
 * 
 */
export const Project = After


/**
 * Obtain a given session attribute through a decorated property getter.
 * 
 * @category Web
 * @name @Session
 * @static
 * @function
 * @param {string} attribute attribute name
 * @see Request, Context
 * @example  
  * import { Controller, Session } from 'primavera/web'
 * \@Controller()
 * class MyController {
 *     \@Session('user')
 *     get $user() {}
 * }
 */
export function Session(attribute) {
    var path = ['$request.session']
    if (attribute && attribute.trim()) path.push(attribute)
    path = path.join('.')

    return Context(path)
}

/**
 * Obtain a given request attribute through a decorated property getter.
 * 
 * @category Web
 * @name @Request
 * @static
 * @function
 * @param {string} [attribute] attribute name
 * @see Request, Context
 * @example  
  * import { Controller, Request } from 'primavera/web'
 * \@Controller()
 * class MyController {
 *     \@Request('user')
 *     get $user() {}
 * }
 */
export function Request(attribute) {
    var path = ['$request']
    if (attribute && attribute.trim()) path.push(attribute)
    path = path.join('.')

    return Context(path)
}


/**
 * Set HTTP status on success.
 *
 * Potential applicable values for convenience are contained as attributes of HttpStatus itself:
 * OK: 200,
 * CREATED: 201,
 * ACCEPTED: 202,
 * NON_AUTHORITATIVE: 203,
 * NO_CONTENT: 204,
 * RESET_CONTENT: 205,
 * PARTIAL_CONTENT: 206,
 * MULTI_STATUS: 207,
 * MULTIPLE_CHOICES: 300,
 * MOVED_PERMANENTLY: 301,
 * FOUND: 302,
 * SEE_OTHER: 303,
 * NOT_MODIFIED: 304,
 * USE_PROXY: 305,
 * TEMPORARY_REDIRECT: 307,
 * PERMANENT_REDIRECT: 308,
 * BAD_REQUEST: 400,
 * UNAUTHORIZED: 401,
 * PAYMENT_REQUIRED: 402,
 * FORBIDDEN: 403,
 * NOT_FOUND: 404,
 * METHOD_NOT_ALLOWED: 405,
 * NOT_ACCCEPTABLE: 406,
 * PROXY_AUTH_REQUIRED: 407,
 * REQUEST_TIMEOUT: 408,
 * CONFLICT: 409,
 * GONE: 401,
 * PRECONDITION_FAILED: 412,
 * EXPECTATION_FAILED: 417,
 * SERVER_ERROR: 500,
 * NOT_IMPLEMENTED: 501,
 * BAD_GATEWAY: 502,
 * SERVICE_UNAVAILABLE: 503,
 * GATEWAY_TIMEOUT: 504
 *
 * @category Web
 * @name @HttpStatus
 * @static
 * @function
 * @param {number} status
 * @see HttpError
 * @example  
  * import { Controller, HttpStatus, Route} from 'primavera/web'
 * \@Controller()
 * class MyController {
 *     \@HttpStatus(HttpStatus.OK)
 *     \@Route.GET('account')
 *     async account(params) {
 *     }
 * }
 *
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

/**
 * Set the error status in case of a non-web exception (no status attribute).
 *
 * @category Web
 * @name @HttpError
 * @static
 * @function
 * @param {number} status status code
 * @see HttpStatus, Route, Controller, Middleware
 * @example  
  * import { Controller, HttpError, Route } from 'primavera/web'
 * \@Controller()
 * class MyController {
 *     \@HttpError(HttpStatus.FORBIDDEN)
 *     \@Route.GET('account')
 *     async account(params) {
 *         throw Error('Response Status Code will be set to 403.')
 *     }
 * }
 */
export function HttpError(status) {
    return function (target, name, descriptor) {
        debug(`Setting HttpError ${status} on ${descriptor.name} success`, descriptor)
        descriptor.value.$$httpErrorStatus = status 
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
 * Router registration will register the path in the router provided to _start_ and transform
 * the payload, query parameters and response accordingly.
 *
 * Note that you can use whatever route formats are supported by your actual framework router.
 * E.g. (express): GET accounts/:id([0-9]+)
 *
 * For syntactical sugar you can use any of the following forms:
 *  * @Route('GET account/:id')
 *  * @Route.GET('account/:id')
 *  * @GetRequest('account/:id')
 *
 * @category Web
 * @name @Route
 * @function
 * @static
 * @param {string|array} routes=[] path or array of paths that will trigger this method.
 * @see Controller, Middleware, HttpStatus, HttpError
 * @example  
 * import {GetRequest, Route, Controller, HttpStatus} from 'primavera/web'
 * \@Controller()
 * class MyController {
 * 
 *     \@Route('POST accounts')
 *     async createAccount(params, payload) {
 *     }
 *     
 *     \@GetRequest('accounts/:id')
 *     async fetchAccount(params, payload) {
 *     }
 *     
 *     \@Route.PATCH('accounts/:id')
 *     async updateAccount(params, payload) {
 *     }
 * }
 */
export function Route(routes = []) {

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
export const GetRequest     = (path) => { return Route(`GET ${path || '/'}`) }
export const PostRequest    = (path) => { return Route(`POST ${path || '/'}`) }
export const PutRequest     = (path) => { return Route(`PUT ${path || '/'}`) }
export const PatchRequest   = (path) => { return Route(`PATCH ${path || '/'}`) }
export const ListRequest    = (path) => { return Route(`LIST ${path || '/'}`) }
export const DeleteRequest  = (path) => { return Route(`DELETE ${path || '/'}`) }
export const OptionsRequest = (path) => { return Route(`OPTIONS ${path || '/'}`) }
export const AllRequests    = (path) => { return Route(`USE ${path || '/'}`) }
// just a bit more sugar...
Object.assign(Route, {USE: AllRequests, GET: GetRequest,POST: PostRequest, PUT: PutRequest, PATCH: PatchRequest, LIST: ListRequest, DELETE: DeleteRequest, OPTIONS: OptionsRequest})


/**
 * Mark a given class as a controller.
 * A controller is a class containing routes, providing encapsulation and a logical way of grouping endpoints.
 *
 * @category Web
 * @name @Controller
 * @function
 * @static
 * @param {object} [config={prefix:''}] controller configuration
 * @see Route, Middleware, HttpStatus, HttpError
 * @example  
 * import {Controller, Route} from 'primavera/web'
 * \@Controller()
 * class MyController {
 *     \@Route('POST accounts')
 *     async createAccount(params, payload) {
 *     }
 * }
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
 * Set a given context attribute as a controller/middleware class attribute.
 * It provides internal access to any of the 3 main request components:
 *  * $request
 *  * $response
 *  * $session
 *
 * @category Web
 * @name @Context
 * @static
 * @function
 * @param {string} [path] path of the requested attribute
 * @see Request, Session, Route, Controller, Middleware
 * @example  
 * import { Controller, Context } from 'primavera/web'
 * \@Controller()
 * class MyController {
 *     \@Context('$request.user')
 *     get $user() {}
 * }
 * 
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
 * Mark a given class as a middleware group.
 * A middleware class contains routes, providing encapsulation and a logical way of grouping middlware functions.
 * If the flow is to be interrupted, simply throw an error.
 *
 * @category Web
 * @name @Middlware
 * @function
 * @static
 * @param {object} [config={prefix:''}]
 * @see Route, Controller, HttpStatus, HttpError
 * @example  
 * import {Middleware, Route} from 'primavera/web'
 * @Middleware({prefix: ''})
 * class AuthMiddlware {
 *     /* ... *\/
 *     \@Route.GET('*')
 *     async isAuthenticated(params) {
 *         /* ... *\/
 *     }
 * }
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