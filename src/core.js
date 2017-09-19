'use strict'
const debug = require('debug')('primavera:core')
import _ from 'lodash'
import {default as jsonschema} from 'jsonschema'
import stringify from 'json-stable-stringify'
import Container from './container'


/**
 * Register a component within the in-memory container for use with @Inject.
 * It can only be used on a class-level.
 * 
 * @param {string} alias alias given to the component to identify within the in-memory container.
 * @public
 * 
 * @example
 * @Injectable('services/injectable')
 * class InjectableComponent { ... }
 * class DepentantComponent {
 *     @Inject('services/injectable')
 *     get injectable() {}
 * }
 */
export function Injectable(alias) {

    return function(target, name, descriptor) {
        if (!target) throw new Error(`@Injectable can only be set on a class.`)
        debug(`@Injectable ${target.name} stored in container as ${alias}`)

        Container.set(alias || target, target)

        return target
    }
}


/**
 * @see #static-function-Injectable
 * @public
 * @type {decorator}
 */
export const Service    = Injectable

/**
 * @see #static-function-Injectable
 * @public
 * @type {decorator}
 */
export const Component  = Injectable

/**
 * @see #static-function-Injectable
 * @public
 * @type {decorator}
 */
export const Module     = Injectable

/**
 * @see #static-function-Injectable
 * @public
 * @type {decorator}
 */
export const Adapter    = Injectable


/**
 * Apply one or more decorators BEFORE a method is executed.
 * Decorators can transform the original arguments accessing the _arguments_ of the function,
 * or by providing an array as return value which will override the entire _arguments chain_
 * to be passed to the next intercepting function or the target method.
 *
 * @type {decorator}
 * @param {...function} fns functions to be executed before the target method
 * @public
 * 
 * @example
 * @Before(() => debug('do nothing'))
 * function somefunction() { ... }
 *
 * @example
 * @Before((...args) => { return ['altered']})
 * testfunction(...args) {
 *     // args[0] == 'altered'
 * }
 *
 * @example
 * @Before((...args) => { 
 *     const altered = [...args]
 *     altered[0] = 'altered'
 * })
 * testfunction(...args) {
 *     // args[0] == 'altered'
 * }
 */
export function Before(...fns) {
    return function(target, name, descriptor) {
        const previous = descriptor.value
        descriptor.value = async function(...args) {
            let responseChain
            for (let fn of fns) {
                if (typeof fn == 'string' && fn.startsWith('$this')) {
                    debug(`@Before is fetching instance function from ${fn} with this`, this)
                    fn = _.get(this, fn.substring(fn.indexOf('.')))
                }
                debug(`@Before ${target.constructor.name}.${name}, executing ${fn.name}`)
                responseChain = await fn.apply(this, args)
                if (responseChain && !Array.isArray(responseChain)) responseChain = [responseChain]
            }
            return await (previous).apply(this, responseChain || args)
        }

        return descriptor
    }
}

/**
 * Alias for @Before used for syntactic sugar.
 * @type {decorator}
 */
export const Validate = Before

/**
 * Apply one or more functions AFTER a method is executed.
 * Decorators can transform or choose to return a different return value by just returning something
 * or by altering the attributes of a returned object.
 *
 * Each function will receive as only parameter the return value of the previous one.
 * If no value is returned, the previous non-undefined return value will be kept.
 *
 * @type {decorator}
 * @param {...function} fns functions to be executed before the target method
 * @public
 * 
 * @example
 * @After(() => debug('do nothing'))
 * function testfunction() { return 'original' }
 * testfunction() == 'original'
 *
 * @example
 * @After((value) => { return 'altered'})
 * testfunction() { return 'original' }
 * testfunction() == 'altered'
 *
 * @example
 * @After((obj) => { 
 *     obj.altered = true
 * })
 * testfunction() { return {altered:false} }
 * testfunction().altered == true
 */
export function After(...fns) {
    return function(target, name, descriptor) {
        const previous = descriptor.value;
        descriptor.value = async function(...args) {
            let response, current
            response = current = await previous.apply(this, args)

            for (let fn of fns) {
                debug(`@After ${target.constructor.name}.${name}, executing ${fn.name || 'anonymous function'}`)
                current = await fn.apply(this, [response])
                if (current != undefined) {//:
                    debug(`@After ${target.constructor.name}.${name}, ${fn.name || 'anonymous function'} returned `, current)
                    response = current
                }
            }
            return response
        }

        return descriptor
    }
}
/**
 * Alias for Before used for syntactic sugar.
 * 
 * @see Before
 * @public
 * @type {decorator}
 */
export const Project = After




/**
 * Smart pooling describes the ability to keep a pool of "Singletons"
 * based on their instantiation parameters.
 * 
 * This helps optimize creation/destruction of objects in the container,
 * reducing memory footpring as well as saving resources by reducing
 * object creation operations.
 *
 * To be used toogether with @Injectable or one of its aliases.
 *
 * @public
 * 
 * @example
 * @SmartPooling()
 * class PooledClass {
 *     constructor() {
 *         this.random = Math.random()
 *     }
 * }
 *
 * ...
 * let base = new PooledClass({ value: 1 })
 * let same = new PooledClass({ value: 1 })
 * let different = new PooledClass({ value: 2 })
 *
 * base.random == same.random
 * base.random == different.random 
 */
export function SmartPooling() {
    const instances = {}
    return function (target, name, descriptor) {
        if (!target || descriptor) throw new Error("@SmartPooling can only be set on a class.")

        const SmartPoolingProxy = function(...args) {
            const hash = args.length > 0 ? stringify(args) : 0
            const UUID = `${target}_${hash}`
            if (!instances[UUID])  //:
                instances[UUID] = new target(...args)

            debug(`@SmartPooling instance of ${target.name} ${hash}`, instances[UUID])

            return instances[UUID]

        }

        Object.setPrototypeOf(SmartPoolingProxy, target) 
        
        return SmartPoolingProxy

    }
}
/**
 * Alias of @SmartPooling
 * 
 * @public
 * @type {decorator}
 */
export const Singleton = SmartPooling

/**
 * Inject a contained instance into a given component.
 * If the dependency can't be found, it will create a SmartProxy
 * to delay instantiation until the dependency is first accessed (lazy initialization).
 *
 * @public
 * @param {string} alias is the alias of the component within the in-memory container
 * @param {[]} args arguments to initialize the instance of the component (if required or desired)
 */
export function Inject(config, args) {
    if (args && !Array.isArray(args)) args = [args]
    const alias = (config && config.path) || config || false
    return function(target, name, descriptor) {
        if (!target || !name || !descriptor) throw new Error("@Inject can only be used on an attribute level.")

        const _fn = descriptor.get
        function wrapper() {
            const _clazz = Container.get(alias || name)
            debug(`@Inject dependency in ${target.constructor.name}.${name} (${_clazz.name})`)
            return new _clazz(...(args || []))
        }
        descriptor.get = wrapper
        return descriptor
    }
}


/**
 * Bind a given object element to the decorated method.
 *
 * @public
 * @param {...string} fixtures the fixtures to be applied. It can reference attributes or methods on the instance level.
 *
 * @example
 * @Bind('myAttribute')
 * testfunction (value) {
 *     value == this.myAttribute
 * }
 *
 * @example
 * @Bind('nested.attribute')
 * testfunction (value) {
 *     value == this.nested.attribute
 * }
 *
 * @example
 * @Bind('someFunction')
 * testfunction (value) {
 *     value == this.someFunction()
 * }
 *
 * @example
 * @Bind('someFunction().nestedAttribute')
 * testfunction (value) {
 *     value == this.someFunction().nestedAttribute
 * }
 *
 * 
 */
export function Bind(...fixtures) {
    return function (target, name, descriptor) {
        debug(`@Bind ${fixtures} on ${target.constructor.name}::${name}`)
        
        const _fn = descriptor.value

        descriptor.value = async function(...args) {
            const bundle = []
            for (let fixture of fixtures) {
                let bound = (fixture instanceof Function) ? fixture : false
                
                if (!bound) {
                    const self = this
                    if (/\(\)/.test(fixture))
                        bound = _.result(self, fixture.replace('()',''))
                    else {
                        bound = _.get(self, fixture)
                    }
                }

                if (bound instanceof Function) {
                    const self = this
                    const _bound = bound
                    // Force "this" binding in fixture (.bind doesn't really bind for some reason)
                    bound = async function(...args) {
                        return await _bound.apply(self, args)
                    }
                }

                bundle.push(bound)
            }

            const params = [...bundle, ...args]
            debug(`@Bind is invoking the source function ${_fn.name} with params`, params)
            return await _fn.apply(this, params)
        }

        return descriptor
    }
}


/**
 * Indicates the potential sources of properties/values in priority order.
 * To be used together with @Property
 *
 * @PropertySources can take any object (and will inspect it) or _resolver function_.
 * It will iterate through such sources until the requested @Property is resolved.
 * 
 * @public
 * @param {...} sources the sources in prioritized order
 */
export function PropertySources (...sources) {
    return function (target, name, descriptor) {
        debug("@PropertySources - target is descriptor? ", !!descriptor)
        target = descriptor || target

        if (!target.$$propertySources) //:
            target.$$propertySources = []
        
        for (let source of sources) { // push all sources into property sources list.
            target.$$propertySources.push(source)
        }

        return descriptor || target
    }
}


/**
 * Fetch a value from one of the @PropertySources declared on the class or method level.
 *
 * @public
 * @param {string} path Path of the property within the source objects (or used)
 * @param {object|string|function} default value if property is not found within the sources
 * 
 */
export function Property(path, dflt) {
    return function (target, name, descriptor) {

        /*
         * Internal implementation to get property from different source types.
         */
        function fetchPropertyBySourceType(path, source) {
            let value
            debug(`Trying to get property ${path} from ${typeof source} source: `, source)
            if (typeof source === "object") {//:
                value = _.get(source, path)
            }
            else if (typeof source === "function") //:
                value = source(path)

            return value
        }


        const isFunction = !!descriptor.value
        const overwrite = isFunction ? 'value' : 'get'
        const _fn = descriptor[overwrite]
        descriptor[overwrite] = function() {
            let value, source, container

            // checked all preferred sources already, check additional
            // method/property configured s ources or otherwise class-level
            let instance = target && target.constructor || target
            debug(`@Property sources for ${path}: `, descriptor, instance)
            for (container of [descriptor,instance]) {
                if (container && container.$$propertySources) {
                    for (source of container.$$propertySources) {
                        if (source === false) return dflt

                        value = fetchPropertyBySourceType(path, source)
                        if (value !== undefined) return value
                    }
                }
            }

            debug(`@Property couldn't find ${path} in sources, using default value: `, dflt)

            return dflt
        }

        return descriptor
    }
}


/**
 * @Self allows to declare the context in which a function should be executed.
 * It basically invokes fn.apply() with an instance of the indicated class.
 *
 * @public
 * @param {class} clazz the class to be used
 */
export function Self(clazz) {
    return function(target, name, descriptor) {
        if (!descriptor) throw new Error(`@Self can only be used in class method definitions.`)

        if (typeof clazz == 'string') {
            let clazzname = clazz
            clazz = function () {
                const clazzfn = eval(clazz)
                return new clazzfn
            }
            clazz.$$name = clazzname
        }

        const fn = descriptor.value || descriptor.get

        descriptor.value = function(...args) {
            let self = this
            if (!this || !(this instanceof clazz)) {
                try {
                    debug(`@Self is trying to initialize ${clazz.$$name || clazz.constructor.name} to execute ${fn.name}`)
                    self = clazz
                }
                catch (err) {
                    throw new Error(`Error trying to initialize ${clazz.constructor.name}`, err)
                }
            }

            return fn.apply(self, args)
        }

        return descriptor
    }
}