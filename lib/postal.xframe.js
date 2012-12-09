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
    allowedOrigins  : [ window.location.origin ],
    enabled         : true,
    originUrl       : window.location.origin
  };
  var _config = _defaults;
  
  var XFrameClient = function( source, instanceId ) {
    this.source = source;
    this.instanceId = instanceId;
  };
  
  XFrameClient.prototype.send = function( env ) {
    plugin.send( this.source, env );
  };
  
  var plugin = postal.fedx.transports[XFRAME] = {
  
    XFrameClient: XFrameClient,
  
    config: function(cfg){
      if(cfg) {
        _config = _.defaults(cfg, _defaults);
      }
      return _config;
    },
  
    getClientInstance: function( data ) {
      return new XFrameClient( data.source, data.packingSlip.instanceId );
    },
  
    getTargets: function() {
      var targets = _.map(document.getElementsByTagName('iframe'), function(i) { return i.contentWindow; });
      if(window.parent && window.parent !== window) {
        targets.push(window.parent);
      }
      return targets;
    },
  
    wrap: function(packingSlip) {
      return {
        postal      : true,
        packingSlip : packingSlip
      };
    },
  
    unwrap: function(transportMsg) {
      return transportMsg.packingSlip;
    },
  
    onMessage: function( event ) {
      if(this.shouldProcess(event)) {
        var packingSlip = this.unwrap(event.data);
        postal.fedx.onFederatedMsg({
          transport: XFRAME,
          packingSlip: packingSlip,
          source: event.source
        });
      }
    },
  
    send: function(target, msg) {
      target.postMessage( this.wrap( msg ),  _config.originUrl );
    },
  
    shouldProcess: function(event) {
      var hasDomainFilters = !!_config.allowedOrigins.length;
      return _config.enabled && (hasDomainFilters && _.contains(_config.allowedOrigins, event.origin) || !hasDomainFilters ) && (event.data.postal)
    }
  };
  
  _. bindAll(plugin);
  
  window.addEventListener("message", plugin.onMessage, false);

  return postal;

} ));