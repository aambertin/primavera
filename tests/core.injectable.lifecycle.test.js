require('babel-register')
import {Singleton, SmartPooling, Injectable, Inject} from '../dist/core'
import should from 'should'
@Injectable('services/singleton-component')
@Singleton()
class SingletonComponent {
	constructor() {
		this.value = Math.random()
	}
}

@Injectable('services/pooled-component') 
@SmartPooling()
class PooledComponent {
	constructor() {
		this.value = Math.random()
	}
}



class DependantComponent {
	@Inject('services/singleton-component')
	get singleton_reference() {}

	@Inject('services/singleton-component')
	get singleton_path() {} 

	@Inject('services/pooled-component', [1])
	get pooled_reference() {} 

	@Inject('services/pooled-component', [2])
	get pooled_path() {} 	

}


describe('Object lifecycle decorators (@Singleton, @SmartPool) ', function() {
	describe('singleton instances', function() {
		const instance = new DependantComponent()
		const referenced = instance.singleton_reference
		const by_path = instance.singleton_path
		const programmatic = new SingletonComponent()

		it('singleton random values should be the same in di-path and di-reference', function() {
			referenced.value.should.equal(by_path.value)
		})

		it('singleton random values should be the same in di-path and programmatic', function() {
			by_path.value.should.equal(programmatic.value)
		})

		it('singleton object should be the same for di-path and di-reference', function() {
			referenced.should.equal(by_path)
		})

		it('singleton object should be the same for di-path and programmatic', function() {
			referenced.should.equal(by_path)
		})
	})

	describe('smart-pooling instances', function() {
		const instance = new DependantComponent()
		const referenced = instance.pooled_reference
		const by_path = instance.pooled_path
		const programmatic = new PooledComponent(3)
 
 		it('pooled random values should be different in di-path and di-reference', function() {
			referenced.value.should.not.equal(by_path.value)
		})

		it('pooled random values should be different in di-path and programmatic', function() {
			by_path.value.should.not.equal(programmatic.value)
		})

		it('pooled object should be different for di-path and di-reference', function() {
			referenced.should.not.equal(by_path)
		})

		it('pooled object should be different for di-path and programmatic', function() {
			referenced.should.not.equal(by_path)
		})
	})

	

})