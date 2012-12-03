/*
 postal.xframe
 Copyright (C) 2012 - Jim Cowart (http://freshbrewedcode.com/jimcowart)
 License: Dual licensed MIT & GPL v2.0
 Version 0.1.0
 */
(function ( root, factory ) {
  if ( typeof module === "object" && module.exports ) {
    // Node, or CommonJS-Like environments
    module.exports = factory( require( "underscore" ), require( "postal.federation" ) );
  } else if ( typeof define === "function" && define.amd ) {
    // AMD. Register as an anonymous module.
    define( ["underscore", "postal.federation"], function ( _, postal ) {
      return factory( _, postal, root );
    } );
  } else {
    // Browser globals
    root.postal = factory( root._, root.postal, root );
  }
}( this, function ( _, postal, global, undefined ) {

  var XFRAME = "xframe";
  var _defaults = {
    autoReciprocate : true,
    allowedOrigins  : [ window.location.origin ],
    enabled         : true,
    originUrl       : window.location.origin
  };
  var _config = _defaults;
  
  var XFrameClient = function(source, instanceId, autoReciprocate) {
    this.source = source;
    this.instanceId = instanceId;
    this.autoReciprocate = autoReciprocate;
  };
  
  XFrameClient.prototype.send = function(env) {
    this.source.postMessage(postal.fedx.transports.xframe.getWrapper('message', env), _config.originUrl || "*");
  };
  
  XFrameClient.prototype.reciprocate = function() {
    this.source.postMessage(postal.fedx.transports.xframe.getWrapper('ready'), _config.originUrl || "*");
  };
  
  XFrameClient.prototype.attachToClient = function(client) {
    if(!client[XFRAME]) {
      client[XFRAME] = this;
      if(this.autoReciprocate) {
        this.reciprocate();
      }
    }
  };
  
  var plugin = postal.fedx.transports.xframe = {
  
    XFrameClient: XFrameClient,
  
    config: function(cfg){
      if(cfg) {
        _config = _.defaults(cfg, _defaults);
      }
      return _config;
    },
  
    getTargets: function() {
      var targets = _.map(document.getElementsByTagName('iframe'), function(i) { return i.contentWindow; });
      if(window.parent && window.parent !== window) {
        targets.push(window.parent);
      }
      return targets;
    },
  
    getWrapper: function(type, envelope) {
      switch(type) {
        case 'ready' :
          return {
            postal     : true,
            type       : type,
            instanceId : postal.instanceId
          };
          break;
        default:
          return {
            postal     : true,
            type       : type,
            instanceId : postal.instanceId,
            envelope   : envelope
          };
          break;
      }
    },
  
    onPostMessage: function( event ) {
      console.log(event.data);
      if(this.shouldProcess(event)) {
        var payload = event.data;
        if(payload.type === 'ready') {
          postal.fedx.addClient(new XFrameClient(event.source, event.data.instanceId, _config.autoReciprocate), XFRAME);
        } else {
          postal.fedx.onFederatedMsg( payload.envelope, payload.instanceId );
        }
      }
    },
  
    shouldProcess: function(event) {
      var hasDomainFilters = !!_config.allowedOrigins.length;
      return _config.enabled && (hasDomainFilters && _.contains(_config.allowedOrigins, event.origin) || !hasDomainFilters ) && (event.data.postal)
    },
  
    signalReady: function(trgt) {
      var _targets;
      if(!trgt) {
        _targets = this.getTargets();
      } else {
        _targets = _.isArray(trgt) ? trgt : [trgt];
      }
      _.each(_targets, function(target) {
        target.postMessage(this.getWrapper("ready"),  _config.originUrl || "*");
      }, this);
    }
  };
  
  _. bindAll(plugin);
  
  window.addEventListener("message", plugin.onPostMessage, false);

  return postal;

} ));