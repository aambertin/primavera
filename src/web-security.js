/**
 * Decorators for API Endpoint and Middleware Auth functions
 * @module web-security
 * @requires primavera/web
 * @requires debug
 * @requires lodash

 */

const debug = require('debug')('primavera:web-security')

import _ from 'lodash'
import { HttpError } from './web'

/**
 * Check if a given user possesses one of N authorized roles to execute this function.
 * 
 *
 * @category web-security
 * @name @RequiresRole
 * @function
 * @static
 * @param  {...string} roles list of authorized roles.
 * @param {function} [roleFetcher] function used to fetch roles from the authentication context.
 * @param {function} [userFetcher] function used to fetch a user from the authentication context.
 * @see RequiresAuth
 * @example <caption>Must be ONE OF the following</caption>
 * import { RequiresRole } from 'primavera/web-security'
 * import { Controller, Route } from 'primavera/web'
 * \@Controller()
 * class MySecureController {
 * 
 *     \@RequiresRole('admin', 'manager')
 *     \@Route.GET('users/list')
 *     async listUsers() {
 *         // ...
 *     }
 * 
 * }
 * 
 * @example <caption>Must be ALL OF the following</caption>
 * import { RequiresRole } from 'primavera/web-security'
 * import { Controller, Route } from 'primavera/web'
 * \@Controller()
 * class MySecureController {
 * 
 *     \@RequiresRole('admin')
 *     \@RequiesRole('manager')
 *     \@Route.GET('users/list')
 *     async listUsers() {
 *         // ...
 *     }
 * 
 * }
 * 
 */
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


/**
 * Check if the requestor is authenticated (user exists in request context).
 * The _from_ argument can be a string or a function. If it's a string, the given attribute will be fetch
 * from the request or session contexts.
 * 
 * In case as function is provided, the function is provided the controller as _this_ object,
 * granting this way access to the controller or middleware class instance itself.
 * 
 * Additionally, the request and response objects will be provided to this function.
 *
 * @category web-security
 * @name @RequiresAuth
 * @function
 * @static
 * @param  {string|function} from where to fetch the user from
 * @see RequiresAuth
 * @example <caption>Fetch from [request|session] _user_ attribute.</caption>
 * import { RequiresAuth } from 'primavera/web-security'
 * import { Controller, Route } from 'primavera/web'
 * \@Controller()
 * class MySecureController {
 * 
 *     \@RequiresAuth('user')
 *     \@Route.GET('me')
 *     async me() {
 *         // ...
 *     }
 * 
 * }
 * 
 * @example <caption>Must be ALL OF the following</caption>
 * import { RequiresAuth } from 'primavera/web-security'
 * import { Controller, Route } from 'primavera/web'
 * \@Controller()
 * class MySecureController {
 * 
 *     \@RequiresAuth(myCustomAuthorizer)
 *     \@Route.GET('users/list')
 *     async listUsers() {
 *         // ...
 *     }
 * 
 * }
 * 
 * function myCustomAuthorizer(req, res) {
 *     return req.user || req.session.user
 * }
 * 
 */
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