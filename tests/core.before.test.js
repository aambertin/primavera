
import {Before} from '../dist/core'
import should from 'should'

class BeforeDecoratorTestClass {

	@Before(() => [2])
	intrusiveTest(value) {
		return value
	}

	@Before((obj) => { obj.value = 2 })
	manipulativeTest(value) {
		return value
	}

	@Before(()=>[2], ()=>[3])
	chainedTest(value) {
		return value
	}

	@Before(function() { return this.intrusiveTest(...arguments) } )
	siblingTest(value) {
		// return this.intrusiveTest()
		return value
	}

	@Before(function() { return 2 } )
	singleArgTest(value) {
		// return this.intrusiveTest()
		return value
	}
}


describe('@Before decorator', function() {
	describe('when intrusive (returns array of args)', function() {
		it('should return 2 as the original value (1) is altered', async function() {
			const instance = new BeforeDecoratorTestClass()			

			const result = await  instance.intrusiveTest(1)
			result.should.equal(2)
		})
	})

	describe('when manipulative (manipulates an argument object)', function() {
		it('should return 2 as the original value (1) is altered', async function() {
			const instance = new BeforeDecoratorTestClass()			

			const result = await  instance.manipulativeTest({value:1})
			result.value.should.equal(2)
		})
	})
	describe('when chained (multiple functions)', function() {
		it('should return 3 as the original value (1) is altered twice', async function() {
			const instance = new BeforeDecoratorTestClass()			

			const result = await  instance.chainedTest(1)
			result.should.equal(3)
		})
	})
	describe('when referencing {this} from the interceptor function', function() {
		it('should effectivelly pass the {this} object and invoke a sibling', async function() {
			const instance = new BeforeDecoratorTestClass()			

			const result = await  instance.siblingTest(1)
			result.should.equal(2)
		})
	})
	describe('when interceptor returns a non-array', function() {
		it('should wrap the new argument in an array', async function() {
			const instance = new BeforeDecoratorTestClass()			
			const result = await  instance.singleArgTest(1)
			result.should.equal(2)
		})
	})
})