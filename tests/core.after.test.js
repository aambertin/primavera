const debug = require('debug')('primavera:tests/core')
import {After} from '../dist/core'
import should from 'should'

class AfterDecoratorTestClass {

	@After((res) => { return ++res })
	intrusiveTest(value) {
		return value
	}

	@After((res) => { res.value++ })
	manipulativeTest(value) {
		return value
	}

	@After((res) => { })
	undefinedTest(value) {
		return value
	}

	@After((res) => ++res, (res) => ++res)
	chainedTest(value) {
		return value
	}

	@After(function(res) { return this.intrusiveTest(res) } )
	siblingTest(value) {
		// return this.intrusiveTest()
		return value
	}

}


describe('@After decorator', function() {

	describe('when intrusive returns value', function() {
		it('should return 2 as the original response (1) is altered', async function() {
			const instance = new AfterDecoratorTestClass()

			const result = await instance.intrusiveTest(1)
			debug(`Result came back after intrusive @After: ${result}`)
			result.should.equal(2)
		})
	})

	describe('when no explicit return value but response object is altered', function() {
		it('should return original response object with altered attribute', async function() {
			const instance = new AfterDecoratorTestClass()			

			const result = await instance.manipulativeTest({value:1})
			result.value.should.equal(2)
		})
	})

	describe('when no explicit return value or undefined is returned', function() {
		it('should return original response object', async function() {
			const instance = new AfterDecoratorTestClass()			

			const result = await instance.undefinedTest({value:1})
			result.value.should.equal(1)
		})
	})

	describe('when chained (multiple afters)', function() {
		it('should return 3 as the original value (1) is altered twice', async function() {
			const instance = new AfterDecoratorTestClass()			

			const result = await instance.chainedTest(1)
			result.should.equal(3)
		})
	})

	describe('when referencing {this} from the interceptor function', function() {
		it('should effectivelly pass the {this} object and invoke a sibling', async function() {
			const instance = new AfterDecoratorTestClass()			

			const result = await instance.siblingTest(1)
			result.should.equal(2)
		})
	})
})