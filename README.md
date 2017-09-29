
# Primavera
An ES6 class-based and decorators-powered fast development framework for node.js and express.

## Decorated / Annotated
Primavera provides a set of decorators (powered by babel decorators) that allow you to quickly get a complex project
up and running by leveraging ES6 classes and a decorator-based configuration and interceptors approach.

## An example endpoint class
```javascript
import {Route, Controller} from 'primavera/web'
import {ValidateSchema} from 'primavera/validations'

@Controller({prefix: 'links'})
class LinksServicesEndpoints {
    @Route.GET()
    listLinks () { ... }
    
    @Session('someSessionAttribute')
    get sessionAttribute() {}
    
    @ValidateSchema({}, CreateLinkSchema)
    @Route.POST()
    createLink(params, body) { 
        this.sessionAttribute // contains session attribute
    }
}
```


## An example middleware class
```javascript
import {Route, Controller} from 'primavera/web'
import {ValidateSchema} from 'primavera/validations'
import {RequestAuth} from 'primavera/web-security'

@Middleware({prefix: 'links'})
class LinksServicesSecurityMiddleware {
    @RequestAuth
    @Route.USE('*')
    checkAuth () { ... }
}
```

## CI container
```javascript
import {Inject, Injectable} from 'primavera/core'

@Injectable('services/injectable')
class InjectableService {
    someMethod() { ... }
}

class DependantService {
    @Inject('services/injectable')
    get injectable() {}
    
    doSomething() {
        injectable.someMethod() // uses injected dependency
    }
}
```

## Plain interception: @Before & @After
```javascript
import {Before, After} from 'primavera/core'

class InterceptorsTest {
    @Before((...args) => debug(...args))
    withBefore() {
        /// this is logging before the method hits
    }
    
    @Before((...args) => { return ['altered'] }
    alteredArguments (value) {
        /// value will always be "altered"
    }
    
    @After((returnValue) => debug('returnvalue was', returnValue))
    loggingAfter() {
        return "unaltered" // logging is okay, but doesn't alter the return value
    }
    
    @After((returnValue) => { return returnValue+1 }))
    alteredValue() {
        return 1 // actual return value will be altered by @After, so it will be 2
    }
```

## Transform input and output
It works pretty much like @Before and @After...
```javascript
import {Transform, After} from 'primavera/transform'

class TransformExample {

    @Transform.OUT((raw) => { raw.altered = true; return raw; })
    alteredValue() { return { altered: false } }
    
    checkValue() {
        this.alteredValue().altered // true
    }
}
```

## Validations
It works pretty much like @Before and @After...
```javascript
import {ValidateSchema} from 'primavera/validations'

class ValidationsExample {

    @ValidateSchema(JSONSCHEMA)
    validatedValue(value) { 
        debug(':value valid according to provided JSONSCHEMA')
    }
}
```

## Decoupling through message pattern matching
Only in-memory and first-level attribute matching ATM.
Seneca and AWS Lambda support comming soon.
```javascript
class LinkServices {
    @Resolve({ domain: 'links', action: 'create' })
    function resolverService(...args) {
        ...
    }
}

class LinksCLient {
    @ResolveWith({domain:'links', action: 'create'})
    function transparentServiceResolving(serviceParams) { 
        // you can alter those params here to match the service
        // your return value will be the service's input
        // the service output will be served to the caller
        // you can transform the output using @Transform.OUT 
    }
}
```


Better documentation an example projects coming soon :)
