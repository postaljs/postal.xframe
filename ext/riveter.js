/*
 riveter
 © 2012 - Copyright appendTo, LLC
 Author(s): Jim Cowart, Nicholas Cloud, Doug Neiner
 License: Dual licensed MIT (http://opensource.org/licenses/MIT) & GPL (http://opensource.org/licenses/GPL-2.0)
 Version 0.1.1
 */
(function ( root, factory ) {
  if ( typeof module === "object" && module.exports ) {
    // Node, or CommonJS-Like environments
    module.exports = function(_) {
      _ = _ || require( "underscore" );
      return factory( _ );
    }
  } else if ( typeof define === "function" && define.amd ) {
    // AMD. Register as an anonymous module.
    define( ["underscore"], function ( _ ) {
      return factory( _, root );
    } );
  } else {
    // Browser globals
    root.riveter = factory( root._, root );
  }
}( this, function ( _, global, undefined ) {

  var slice = Array.prototype.slice;
  
  var riveter = function(){
    var args = slice.call(arguments, 0);
    while(args.length) {
      riveter.rivet(args.shift());
    }
  };
  
  riveter.rivet = function(fn) {
    if(!fn.hasOwnProperty('extend')) {
      fn.extend = function(props, ctorProps) {
        return riveter.extend(fn, props, ctorProps);
      };
    }
    if(!fn.hasOwnProperty('compose')) {
      fn.compose = function() {
        return riveter.compose.apply(this, [fn].concat(slice.call(arguments, 0)));
      };
    }
    if(!fn.hasOwnProperty('inherits')) {
      fn.inherits = function(parent, ctorProps) {
        return riveter.inherits(fn, parent, ctorProps);
      }
    }
    if(!fn.hasOwnProperty('mixin')) {
      fn.mixin = function() {
        return riveter.mixin.apply(this, ([fn].concat(slice.call(arguments, 0))));
      }
    }
  };
  
  riveter.inherits = function(child, parent, ctorProps) {
    var childProto;
    var TmpCtor = function() {};
    var Child = function() { parent.apply(this, arguments); };
    if(typeof child === 'object') {
      if(child.hasOwnProperty('constructor')) {
        Child = child.constructor;
      }
      childProto = child;
    } else {
      Child = child;
      childProto = child.prototype;
    }
    riveter.rivet(Child);
    _.defaults(Child, parent, ctorProps);
    TmpCtor.prototype = parent.prototype;
    Child.prototype = new TmpCtor();
    _.extend(Child.prototype, childProto, { constructor: Child });
    Child.__super = parent;
    // Next line is all about Backbone compatibility
    Child.__super__ = parent.prototype;
    return Child;
  };
  
  riveter.extend = function (ctor, props, ctorProps) {
    return riveter.inherits(props, ctor, ctorProps);
  };
  
  riveter.compose = function() {
    var args = slice.call(arguments, 0);
    var ctor = args.shift();
    riveter.rivet(ctor);
    var mixin = _.reduce(args, function(memo, val){
      if(val.hasOwnProperty("_preInit")) {
        memo.preInit.push(val._preInit);
      }
      if(val.hasOwnProperty("_postInit")) {
        memo.postInit.push(val._postInit);
      }
      val = val.mixin || val;
      memo.items.push(val);
      return memo;
    }, { items: [], preInit: [], postInit: [] });
  
    var res = ctor.extend({
      constructor: function(options) {
        var args = slice.call(arguments, 0);
        _.each(mixin.preInit, function(initializer){
          initializer.apply(this, args);
        }, this);
        ctor.prototype.constructor.apply(this, args);
        _.each(mixin.postInit, function(initializer){
          initializer.apply(this, args);
        }, this);
      }
    });
    riveter.rivet(res);
    _.defaults(res.prototype, _.extend.apply(null, [{}].concat(mixin.items)));
    return res;
  };
  
  riveter.mixin = function() {
    var args = slice.call(arguments, 0);
    var ctor = args.shift();
    riveter.rivet(ctor);
    _.defaults(ctor.prototype, _.extend.apply(null, [{}].concat(args)));
    return ctor;
  };

  return riveter;
} ));