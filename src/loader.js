/**
 * Decorators for API Endpoint and Middleware Auth functions
 * @module loader
 * @requires parent-require
 * @requires find
 */


const debug = require('debug')('primavera:loader')

import prequire from 'parent-require'
import process from 'process'
import find from 'find'


export default load

/**
 * asfdsafd
 * 
 * @category loader
 * @name load
 * @function
 * @static
 * @param  {string[]|RegExp[]} patterns list of path patterns to load components from.
 * @param {string} [__basedir] defaults to process.cwd()
 * @param {function} [filterFn] additional filtering function
 * @example
 * import loader from 'primavera/loader'
 * 
 * loader.load(/components\.js$/, __dirname)
 * loader.load(/services\.js$/, __dirname)
 * loader.load(/middleware\.js$/, __dirname)
 * loader.load(/endpoints\.js$/, __dirname)
 */
export function load(patterns, __basedir = process.cwd(), filterfn) {
    if (!patterns) return

    if (Array.isArray(patterns)) {
        if (patterns.length < 1)  return

        for (let pattern of patterns) //:
            load(pattern, __basedir, filterfn)

        return
    }

    const files = find.fileSync(patterns, __basedir)
    for (let file of files) {
        file = file.substring(0, file.lastIndexOf('.'))
        if (!filterfn || filterfn(file)) //:
            require.main.require(`${file}`)
    }
}