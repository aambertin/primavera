require('babel-register')
import {Injectable, Inject} from '../dist/core'
import should from 'should'

@Injectable('services/injectable-component')
class InjectableComponent {
	constructor(first, second) {
		this._value = second || first
	}

	value() {
		return this._value || "OK"
	}
}



class DependantComponent {
	@Inject('InjectableComponent')
	get reference_attribute() {}

	@Inject('services/injectable-component')
	get path_attribute() {}

	@Inject('InjectableComponent', [1,2])
	get multivalue_instantiation() {}

	@Inject('InjectableComponent', 1)
	get singlevalue_instantiation() {}

}


describe('@Inject decorator (and aliases: Component, Service, Module)', function() {
	describe('when referencing a class directly (without args)', function() {
		const instance = new DependantComponent()
		const dependency = instance.reference_attribute

		it('should instance the class and return it as the marked attribute', function() {
			dependency.constructor.name.should.equal('InjectableComponent')
		})
		it('should return "OK" when we invoke value() in the dependency', function() {
			const result = dependency.value()
			result.should.equal("OK")
		})
	})

	describe('when referencing a class through DI path (without args)', function() {
		const instance = new DependantComponent()
		const dependency = instance.path_attribute

		it('should retrieve an instance of the class and return it as the marked attribute', function() {
			dependency.constructor.name.should.equal('InjectableComponent')
		})
		it('should return "OK" when we invoke value() in the dependency', function() {
			const result = dependency.value()
			result.should.equal("OK")
		})
	})

	describe('when injecting a componen wiht multiple instantiation values', function() {
		const instance = new DependantComponent()
		const dependency = instance.multivalue_instantiation

		it('should retrieve instance the component with all it\'s required arguments', function() {
			const result = dependency.value()
			result.should.equal(2)
		})
	})

	describe('when injecting a componen wiht a single instantion argument', function() {
		const instance = new DependantComponent()
		const dependency = instance.singlevalue_instantiation

		it('should retrieve instance the component with all it\'s required arguments', function() {
			const result = dependency.value()
			result.should.equal(1)
		})
	})

})