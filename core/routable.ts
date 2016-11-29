import 'reflect-metadata';
import * as path from 'path';

export class RoutableClassOptions {
  blackList?: string[];
  baseUrl?: string;
}

export class RoutableMethod {
  path?: string;
  method?: string;
  blackList?: boolean;
}

export class SakuraApiClassRoutes {
  path: string;       // the class's baseUrl (if any) + the route's path
  f: (any) => any;    // the function that handles the route in Express.use
  httpMethod: string; // the http verb (e.g., GET, PUT, POST, DELETE)
  method: string;     // the classes's method name that handles the route (the name of f)
}

export function Routable(options?: RoutableClassOptions): any {
  options = options || {};
  options.blackList = options.blackList || [];
  options.baseUrl = options.baseUrl || '';

  return function (target: any) {
    // save a reference to the original constructor
    let original = target;

    // the new constructor behaviour
    let newConstructor: any = function (...args) {
      let metaData: SakuraApiClassRoutes[] = [];

      Object.getOwnPropertyNames(Object.getPrototypeOf(this))
        .forEach((methodKey) => {
          if (!Reflect.getMetadata(`hasRoute.${methodKey}`, this)) {
            return;
          }

          if (options.blackList.indexOf(methodKey) > -1) {
            return;
          }

          let endPoint = path.join(options.baseUrl, Reflect.getMetadata(`path.${methodKey}`, this)).replace(/\/$/, "");
          if (!endPoint.startsWith('/')) {
            endPoint = '/' + endPoint;
          }

          let data: SakuraApiClassRoutes = {
            path: endPoint,
            f: Reflect.getMetadata(`function.${methodKey}`, this),
            httpMethod: Reflect.getMetadata(`httpMethod.${methodKey}`, this),
            method: methodKey
          };

          metaData.push(data);
        });

      let c = construct(original, args);
      c.sakuraApiClassRoutes = metaData;
      return c;
    };

    // copy prototype so intanceof operator still works
    newConstructor.prototype = original.prototype;

    // return new constructor (will override original)
    return newConstructor;

    //////////
    // a utility function to generate instances of a class
    function construct(constructor, args) {
      let c: any = function () {
        return new constructor(...args);
      };
      c.prototype = constructor.prototype;
      return new c();
    }
  }
}

export function Route(options?: RoutableMethod) {
  options = options || {};
  options.path = options.path || '';
  options.method = options.method || 'get';
  options.blackList = options.blackList || false;

  const methods = ['get', 'post', 'put', 'delete', 'head'];

  return function (target: any, key: string | symbol, value: TypedPropertyDescriptor<any>) {
    if (methods.indexOf(options.method) < 0) {
      throw new Error(`@route(...)${(target.constructor || {}).name}.${key} had its 'method' `
        + `property set to '${options.method}', which is invalid. Valid options are: ${methods.join(', ')}`);
    }

    let f = function (...args: any[]) {
      return value.value.apply(this, args);
    };

    if (!options.blackList) {
      Reflect.defineMetadata(`hasRoute.${key}`, true, target);
      Reflect.defineMetadata(`path.${key}`, options.path, target);
      Reflect.defineMetadata(`function.${key}`, f, target);
      Reflect.defineMetadata(`httpMethod.${key}`, options.method.toLowerCase(), target);
    }

    return {
      value: f
    }
  }
}
