
import {PropertySources, Property} from '../dist/core'
import should from 'should'

// TODO Anibal: @Bind should also work with the DI container ... somehow.

@PropertySources({a: 'a'}, {a:'WRONG', b:'b'}, (name)=>name+'x')
class PropertiesTestClass {

	@Property('a')
	get a() {}

	@Property('b')
	get b() {}

	@Property('c')
	get c() {}
}


describe('@Property decorator', function() {
	describe('property exists in one of the sources', function() {
		it('should return first one it finds given the order of @PropertySources', async function() {
			const instance = new PropertiesTestClass()			

			const result = await instance.a
			result.should.equal('a')
		})
	})

	describe('property does not exist in the first source, it should check the next sources', function() {
		it('should bind it to the corresponding argument', async function() {
			const instance = new PropertiesTestClass()			

			const result = await instance.b
			result.should.equal('b')
		})
	})

	describe('a source is a function', function() {
		it('the function should be invoked with the property path argument', async function() {
			const instance = new PropertiesTestClass()			

			const result = await instance.c
			result.should.equal('cx')
		})
	})

})