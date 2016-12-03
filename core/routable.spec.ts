import {Routable, Route} from './routable';
import {SakuraApi}       from './sakura-api';
import * as express      from 'express';
import method = require("lodash/method");
import before = require("lodash/before");
import * as request from 'supertest';

describe('core/Routable', () => {

  let t;
  let sakuraApiClassRoutes;
  beforeEach(() => {
    t = new Test(777);
    sakuraApiClassRoutes = t['sakuraApiClassRoutes'];

    spyOn(console, 'log');
  });

  describe('Routable(...)', () => {

    describe('options', () => {
      it('add a baseUrl to the path of an @Route, if provided', () => {
        expect(sakuraApiClassRoutes[0].path).toBe('/test');
      });

      it('ignore @Route methods that are listed in the @Routable(blacklist)', () => {
        expect(sakuraApiClassRoutes).toBeDefined();
        expect(sakuraApiClassRoutes.length).toBe(4);
        let found = false;
        sakuraApiClassRoutes.forEach((route) => {
          found = route.method === 'someBlacklistedMethod';
        });
        expect(found).toBe(false);
      });

      it('handle the lack of a baseUrl gracefully', () => {
        let t2 = new Test2();
        expect(t2['sakuraApiClassRoutes'][0].path).toBe('/');
        expect(t2['sakuraApiClassRoutes'][1].path).toBe('/someOtherMethodTest2');
      });

      it('suppress autoRouting if options.autoRoute = false', (done) => {

        @Routable({
          autoRoute: false
        })
        class test {
          @Route({
            path: 'autoRoutingFalseTest'
          })
          handle(req, res) {
            res.status(200);
          }
        }

        SakuraApi
          .instance
          .listen()
          .then(() => {
            request(SakuraApi.instance.app)
              .get('/autoRoutingFalseTest')
              .expect(404)
              .end(function (err, res) {
                if (err) {
                  return done.fail(err);
                }
                SakuraApi
                  .instance
                  .close()
                  .then(done)
                  .catch(done.fail);
              })
          });
      });
    });

    it('drops the traling / on a path', () => {
      expect(sakuraApiClassRoutes[1].path).toBe('/test/someOtherMethod');
    });

    it('adds the leading / on a path if its missing', () => {
      expect(sakuraApiClassRoutes[1].path).toBe('/test/someOtherMethod');
    });

    it('reads metadata from @Route and properly injects sakuraApiClassRoutes[] into the @Routable class', () => {
      expect(sakuraApiClassRoutes).toBeDefined();
      expect(sakuraApiClassRoutes.length).toBe(4);
      expect(sakuraApiClassRoutes[0].path).toBe('/test');
      expect(typeof sakuraApiClassRoutes[0].f).toBe('function');
      expect(sakuraApiClassRoutes[0].httpMethod).toBe('get');
      expect(sakuraApiClassRoutes[0].method).toBe('someMethod');
      expect(sakuraApiClassRoutes[1].path).toBe('/test/someOtherMethod');
      expect(typeof sakuraApiClassRoutes[1].f).toBe('function');
      expect(sakuraApiClassRoutes[1].httpMethod).toBe('post');
      expect(sakuraApiClassRoutes[1].method).toBe('someOtherMethod');
    });

    it('properly passes the constructor parameters', () => {
      expect(t.someProperty).toBe(777);
    });

    it('maintains the prototype chain', () => {
      expect(t instanceof Test).toBe(true);
    });

    it('property binds the instantiated class as the context of this for each route method', () => {
      let c = new Test4();

      expect(c.someMethodTest4()).toBe(c.someProperty);
      expect(c['sakuraApiClassRoutes'][0].f()).toBe(c.someProperty);
    });

    it('automatically instantiates its class and adds it to SakuraApi.instance.route(...)', (done) => {
      SakuraApi
        .instance
        .listen()
        .then(() => {
          request(SakuraApi.instance.app)
            .get('/someMethodTest5')
            .expect('Content-Type', /json/)
            .expect('Content-Length', '42')
            .expect('{"someMethodTest5":"testRouterGet worked"}')
            .expect(200)
            .end(function (err, res) {
              if (err) {
                return done.fail(err);
              }
              done();
            });
        })
        .catch(done.fail);
    });

  });

  describe('route(...)', () => {

    it('gracefully handles an empty @Route(...), defaults path to method name', () => {
      // if these expectations pass, the blackList was properly defaulted to false since
      // the route wouldn't be in sakuraApiClassRoutes if blackList had been true.
      expect(sakuraApiClassRoutes.length).toBe(4);
      expect(sakuraApiClassRoutes[3].path).toBe('/test/emptyRouteDecorator');
      expect(sakuraApiClassRoutes[3].httpMethod).toBe('get');
      expect(sakuraApiClassRoutes[3].method).toBe('emptyRouteDecorator');
    });

    it('maintains the original functionality of the method', () => {
      let returnValue = sakuraApiClassRoutes[2].f();
      expect(returnValue).toBe('it works');
    });

    it('throws an exception when an invalid HTTP method is specificed', () => {
      let err;
      try {
        @Routable()
        class x {
          @Route({method: 'imnotarealhttpmethod'})
          badHttpMethod() {
          }
        }
      } catch (e) {
        err = e;
      }
      expect(err).toBeDefined();
    });

    it('excludes a method level blacklisted @Route', () => {
      let t3 = new Test3();
      expect(t3['sakuraApiClassRoutes'].length).toBe(0);
    });

    describe('handles route parameters', () => {

      afterEach((done) => {
        SakuraApi
          .instance
          .close()
          .then(() => {
            done();
          })
          .catch((err) => {
            done.fail(err);
          });
      });

      it('at the end of the path', (done) => {
        SakuraApi
          .instance
          .listen()
          .then(() => {
            request(SakuraApi.instance.app)
              .get('/route/parameter/777')
              .expect('Content-Type', /json/)
              .expect('Content-Length', '16')
              .expect('{"result":"777"}')
              .expect(200)
              .end(function (err, res) {
                if (err) {
                  return done.fail(err);
                }
                done();
              })
          });
      });

      it('at the end of the path', (done) => {
        SakuraApi
          .instance
          .listen()
          .then(() => {
            request(SakuraApi.instance.app)
              .get('/route2/888/test')
              .expect('Content-Type', /json/)
              .expect('Content-Length', '16')
              .expect('{"result":"888"}')
              .expect(200)
              .end(function (err, res) {
                if (err) {
                  return done.fail(err);
                }
                done();
              })
          });
      });
    });
  });
});

@Routable({
  baseUrl: 'test',
  blackList: ['someBlacklistedMethod']
})
class Test {

  constructor(public someProperty?: number) {
  }

  @Route({
    path: '/',
    method: 'get'
  })
  someMethod(req: express.Request, res: express.Response) {
    res.status(200).send({someMethodCalled: true});
  }

  @Route({
    path: 'someOtherMethod/',
    method: 'post'
  })
  someOtherMethod(req: express.Request, res: express.Response) {
    res.status(200).send({someOtherMethodCalled: true});
  }

  @Route({
    path: 'someBlacklistedMethod/',
    method: 'post'
  })
  someBlacklistedMethod(req: express.Request, res: express.Response) {
    res.status(200).send({someOtherMethodCalled: true});
  }

  @Route({
    path: 'methodStillWorks/',
    method: 'post'
  })
  methodStillWorks() {
    return 'it works';
  }

  @Route()
  emptyRouteDecorator() {

  }
}

@Routable()
class Test2 {
  @Route({
    path: '/',
    method: 'get'
  })
  someMethodTest2(req: express.Request, res: express.Response) {
    res.status(200).send({someMethodCalled: true});
  }

  @Route({
    path: 'someOtherMethodTest2',
    method: 'get'
  })
  someOtherMethodTest2(req: express.Request, res: express.Response) {
    res.status(200).send({someMethodCalled: true});
  }
}

@Routable()
class Test3 {
  @Route({blackList: true})
  blackListedMethod() {

  }
}

@Routable()
class Test4 {
  someProperty = 'instance';

  @Route()
  someMethodTest4() {
    return this.someProperty;
  }
}

@Routable()
class Test5 {

  @Route()
  someMethodTest5(req, res) {
    res.status(200).json({someMethodTest5: "testRouterGet worked"})
  }

  @Route({
    path: 'route/parameter/:test'
  })
  routeParameterTest(req: express.Request, res: express.Response) {
    let test = req.params.test;

    res.status(200).json({result: test});
  }

  @Route({
    path: 'route2/:parameter/test'
  })
  routeParameterTest2(req: express.Request, res: express.Response) {
    let test = req.params.parameter;

    res.status(200).json({result: test});
  }

}
