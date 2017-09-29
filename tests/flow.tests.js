const debug = require('debug')('primavera:tests/flow')
import { Resolve, ResolveWith } from '../dist/flow'
import should from 'should'

class ForeignServiceResolver {
	@Resolve({domain:'Test', action:'Do'})
	async doTest(data) {
		debug
		return data
	}
}


class ClientTestClass {
	@ResolveWith({domain: 'Test', action:'Do'})
	simpleResolveWith(message) {
		return message
	}

	@ResolveWith({domain: 'Test'})
	tamperPatternBeforeResolve(message, pattern) {
		debug('tamperPatternBeforeResolve received: ', message, pattern)
		pattern.action = 'Do'
		return message
	}
}

describe('Primavera/Flow', function() {

	describe('a foreign resolver is invoked directly through ResolveWith.resolver', function() {
		it('should return the same value as sent (resolver logic)', async function() {
			const sent = { message: "OK" }
			const received = await ResolveWith.resolver({domain:'Test',action:'Do'})(sent)

			received.message.should.equal(sent.message)
		})
	})
	describe('a foreign resolver through a @ResolveWith transformer function (no transformations applied)', function() {
		it('should return the same value as sent (resolver logic)', async function() {
			const sent = { message: "OK" }
			const client = new ClientTestClass()
			const received = await client.simpleResolveWith(sent)

			received.message.should.equal(sent.message)
		})
	})
	describe('a foreign resolver through a @ResolveWith transformer function (pattern is tampered)', function() {
		it('should return the same value as sent (resolver logic)', async function() {
			const sent = { message: "OK" }
			const client = new ClientTestClass()
			const received = await client.tamperPatternBeforeResolve(sent)

			received.message.should.equal(sent.message)
		})
	})
})