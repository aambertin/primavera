// TODO: how to add these decorators to work on class-level?
// TODO: how to add these decorators to work on class-level with deny-first approach? (@Public / @AcceptPublic ?)

const debug = require('debug')('primavera:web-security')

import _ from 'lodash'
import { HttpError } from './web'

export function RequiresRole(roles, roleFetcher, userFetcher) {
    return function(target, name, descriptor) {
        if (!descriptor) throw new Error('@RequiresAuth can only be used on method-level.')
        roleFetcher = roleFetcher || 'roles'
        userFetcher = userFetcher || 'user'

        const user = fetchUserFromContext(userFetcher)
        const userRoles = (typeof roleFetcher == 'function') ? roleFetcher.apply(this, [user]) : _.get(user, roleFetcher)

        for (let allowed of roles)
            if (userRoles.find(allowed)) //:
                return;

        throw HttpError.forbidden('Authenticated user does not have any of the required roles.')

    }
}

export function RequiresAuth(from = 'user') {
    return function(target, name, descriptor) {
        if (!descriptor) throw new Error('@RequiresAuth can only be used on method-level.')

        const srcFn = descriptor.value
        descriptor.value = function(...args) {
            fetchUserFromContext.apply(this, [from])
        }
    }
}


function fetchUserFromContext(from) {
	let user

    if (typeof from == 'function') {
    	user = from.apply(this)//:
    }
    else {
	    if (!this.$$context || !this.$$context.$request) //:
	        throw new Error('Cannot access web-context from @RequiresAuth, are you using primavera/web?')

	    const $request = this.$$context.$request
	    user = $request[from || 'user'] || $request.session[from || 'user']
	}

	if (!user) {
		debug('User is not authenticated ', from)
		throw HttpError.unauthorized('User is not authenticated.')
	}

	return user
}