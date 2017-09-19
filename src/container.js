const debug = require('debug')('@expression/core:container')

var container = {};
var byname = {};

export default class Container {
	
	static set(alias, target) {
		target.$$alias = alias
		container[target.$$alias] = target
		byname[target.name] = target
		debug(`Set ${target.name}(${alias||''}) in container.`)
	}

	static get(alias) {
		let found = container[alias] || byname[alias]
		if (!found) {
			found = new Proxy({$$ExpressionProxy:'$$'}, {
				get: function (target, key, receiver) {
					const instance = container[alias] || byname[alias]
					if (!instance && typeof key == 'string' && !target[key]) {
						throw new Error(`Tryied to access property "${key}" in component ${alias}, but the component was not declared.`)
					}
					return (instance) ? instance[key] : target[key]
				},
				set: function (target, key, value) {
					const instance = container[alias] || byname[alias]
					if (!instance) throw new Error(`Tryied to set ${key} in component ${alias}, but the component was not declared.`)
					instance[key] = value
				}
			})
		}
		return found
	}

}