/**
 * Decorators for general validations.
 * @module validations
 * @requires lodash
 * @requires jsonschema
 * @requires debug
 */

const debug = require('debug')('primavera:validations')
import jsonschema from 'jsonschema'
import _ from 'lodash'

class ValidationErrors extends Error {
    constructor(errors) {
        super()
        this.errors = errors
        this.status = 400
    }
}

class ValidationError extends Error {
    constructor(message, data) {
        super()
        _.merge(this, data)
        this.status = 400 // bad format
    }
}


/**
 * Adds static and dynamic $validate methods to a given class/object.
 * The $validate methods will take care of validating the object against the provided JSON schema.
 *
 * @name @Schema
 * @function
 * @static
 * @param {object} jsonschema the json schema that should apply to instances of this object.
 */
export function Schema(jsonSchema, dflt = {throwError: true}) {
    return function(target, name, descriptor) {
        if (!target || descriptor) throw new Error("@Schema decorator can only be used in a class.")

        function validate(src, options) {
            options = _.merge({},dflt,options)
            debug(`Validating JSON Schema on ${target.name}: `,jsonSchema, src)

            // TODO: Fix this validation mechanism, it's too expensive.
            const obj = {}
            for (let prop of Object.keys(src)) {//; 
                debug(`Copying property ${prop} in ${target.name} to clear object`)
                obj[prop] = src[prop]
            }

            const validation = jsonschema.validate(obj, jsonSchema)
            if (validation.errors && validation.errors.length > 0) {
                debug(`Validation errors found in ${target.name}: `, validation.errors)
                if (options.throwError) {
                    const error = new ValidationError
                    error.errors = validation.errors
                    throw error
                }
                else {
                    return validation.errors
                }
            }

            return []
        }
        target.prototype.$validate = function(obj, options = dflt) {
            return validate(obj || this, options)
        }
        target.$validate = validate


        target.prototype.$validateAll = function(arr, options) {
            if (!arr) return true
            options = _.merge({},dflt,options)

            let errors = []
            for (let i=0; i < arr.length; i++) {
                const instanceErrors = target.$validate(arr[i], {throwError: false})
                if (instanceErrors && instanceErrors.length) {
                    errors[i] = instanceErrors
                }
            }
            if (errors.length > 1) {
                if (options.throwError) {
                    const error = new ValidationErrors
                    error.errors = errors
                    throw error
                }
                else {
                    return errors
                }
            }

            return []
        }


        return target
    }
}

/**
 * Validate arguments of a method against json-schemas before allowing its execution.
 * @name @ValidateSchema
 * @function
 * @static
 * @example
 *
 * class MyClass {
 *
 *     // validate arguments with a json schema...
 *     \@ValidateSchema(SomeSchemaForArg1, SomeSchemaForArg2)
 *     async myMethod(arg1, arg2) {
 *         // ...
 *     }
 *
 *     // or apply multiple schemas to one argument...
 *     \@ValidateSchema([Arg1Schema1, Arg1Schema2], SomeSchemaForArg2)
 *     async myOtherMethod(arg1, arg2) {
 *         // ...
 *     }
 *     
 * }
 */
export function ValidateSchema(...schemas) {
    return function(target, name, descriptor) {
        if (!descriptor) return Schema(target, name, descriptor)

        const fn = descriptor.value || descriptor.set
        const attr = (descriptor.value) ? 'value' : 'set'

        descriptor[attr] = function(...args) {
            let errors = []
            for (let i=0; i < args.length; i++) {
                const arg = args[i]
                let schema = schemas[i]

                if (!schema) continue

                // check if it's a dynamic schema resolver.
                if (typeof schema == 'function') {
                    schema = schema(arg, this)
                }

                debug('Validating with schema', arg, schema)
                const validation = jsonschema.validate(arg, schema) 
                if (validation.errors) errors = errors.concat(validation.errors)
                
            }

            if (errors.length > 0) {
                const error = new ValidationError
                error.errors = errors
                throw error
            }

            return fn.apply(this, args)
        }

        return descriptor
    }
}