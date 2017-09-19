
import {Bind} from '../dist/core'
import should from 'should'

// TODO Anibal: @Bind should also work with the DI container ... somehow.

class BoundMethodsComponent {

	constructor() {
		this.value = Math.random()
	}

	getValue() {
		return this.value
	}

	getObject() {
		return {value: this.value}
	}

	get object() {
		return {value: this.value}
	}


	@Bind('value')
	async instanceAttribute(value) {
		return value
	}

	@Bind('getValue')
	instanceMethod(value) {
		return this.value
	}

	@Bind('getObject().value') 
	instanceMethodAttribute (value) {
		return value
	}

	@Bind('object.value')
	instanceMemberAttribute (value) {
		return value
	}
}


describe('@Bind decorator', function() {

	describe('an instance attribute is bound', function() {
		it('should bind it to the corresponding argument', async function() {
			const instance = new BoundMethodsComponent()			

			const result = await instance.instanceAttribute()
			result.should.equal(instance.value)
		})
	})

	describe('a method is bound', function() {
		it('should bind it to the corresponding argument', async function() {
			const instance = new BoundMethodsComponent()			

			const result = await instance.instanceMethod()
			result.should.equal(instance.value)
		})
	})

	describe('an attribute in a method response is bound', function() {
		it('should bind it to the corresponding argument', async function() {
			const instance = new BoundMethodsComponent()			

			const result = await instance.instanceMethodAttribute()
			result.should.equal(instance.value)
		})
	})

	describe('an attribute in a property is bound', function() {
		it('should bind it to the corresponding argument', async function() {
			const instance = new BoundMethodsComponent()			

			const result = await instance.instanceMemberAttribute()
			result.should.equal(instance.value)
		})
	})

})