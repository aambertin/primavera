const debug = require('debug')('primavera:tests/validations')
import { ValidateSchema } from '../dist/validations'
import should from 'should'

function schemaresolver(arg, target) {
	if (!arg || !target) 
		throw new Error('arg and target were not successfully received')

	return {type: 'string'}
}

class ValidationTestHelper {
	@ValidateSchema({ type: 'string' })
	withSchema(data) {
		debug
		return data
	}

	@ValidateSchema(schemaresolver)
	withResolver(data) {
		return data
	}

	

}


describe('primavera/validations', function() {

	const helper = new ValidationTestHelper()

	describe('when @ValidateSchema specifies a schema object ', function() {
		it('should be okay when you send a proper type', function() {
			const result = helper.withSchema('okay')
			result.should.equal('okay')
		})
		it('should fail with a validation error when the wrong type is sent', function() {
			try {
				helper.withSchema({complex:'object'})
				throw new Error(`It didn't reject the argument properly.`)
			}
			catch(e) {
				if (!['ValidationError','ValidationErrors'].includes(e.constructor.name)) {
					console.error(e)
					throw new Error('The thrown error type is incorrect', e)
				}
			}
		})
	})


	describe('when @ValidateSchema specifies a schema resolver function', function() {
		it('should be okay when you send a proper type', function() {
			const result = helper.withResolver('okay')
			result.should.equal('okay')
		})
		it('should fail with a validation error when the wrong type is sent', function() {
			try {
				helper.withResolver({complex:'object'})
				throw new Error(`It didn't reject the argument properly.`)
			}
			catch(e) {
				if (!['ValidationError','ValidationErrors'].includes(e.constructor.name)) {
					console.error(e)
					throw new Error(`The thrown error type is incorrect: ${typeof e}`, e)
				}
			}
		})
	})	
	
})