const loader = require('./loader')
const core = require('./core')
const validations = require('./validations')
const transform = require('./transform')
const flow = require('./flow')
const web = require('./web')
const webSecurity = require('./web-security')

module.exports = {loader,core,validations,transform,flow,web, 'web-security': webSecurity }