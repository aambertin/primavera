const debug = require('debug')('primavera:loader')

import prequire from 'parent-require'
import process from 'process'
import find from 'find'


export default load

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