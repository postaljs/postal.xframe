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

  var xframe = (function(window, _, postal) {
    var XFRAME = "xframe";
    var _defaults = {
      autoReciprocate : true,
      allowedOrigins  : [ window.location.origin ],
      enabled         : true,
      originUrl       : window.location.origin
    };
    var _config = _defaults;
  
    var plugin = {
  
      config: function(cfg){
        if(cfg) {
          _config = _.defaults(cfg, _defaults);
        }
        return _config;
      },
  
      clientOptionsFromEvent : function(event) {
        var self = this;
        var payload = event.data;
        var clientOptions = {
          id       : payload.instanceId,
          type     : XFRAME,
          send     : function(payload) {
            event.source.postMessage(payload, _config.originUrl || "*");
          }
        };
        if(_config.autoReciprocate){
          clientOptions.postSetup = function() {
            postal.fedx.clients[payload.instanceId].send(postal.fedx.getFedxWrapper("ready"), XFRAME);
          }
        }
        return clientOptions;
      },
  
      getTargets: function() {
        return _.map(document.getElementsByTagName('iframe'), function(i) { return i.contentWindow; })
      },
  
      onPostMessage: function( event ) {
        console.log(event.data);
        if(this.shouldProcess(event)) {
          var payload = event.data;
          if(payload.type === 'ready') {
            postal.fedx.addClient(this.clientOptionsFromEvent(event));
          } else {
            postal.fedx.onFederatedMsg( payload, payload.instanceId );
          }
        }
      },
  
      shouldProcess: function(event) {
        var hasDomainFilters = !!_config.allowedOrigins.length;
        return _config.enabled && (hasDomainFilters && _.contains(_config.allowedOrigins, event.origin) || !hasDomainFilters ) && (event.data.postal)
      },
  
      signalReady: function(manifest) {
        var self = this;
        var targets = self.getTargets();
        if(window.parent && window.parent !== window) {
          targets.push(window.parent);
        }
        _.each(targets, function(target) {
          target.postMessage(postal.fedx.getFedxWrapper("ready"),  _config.originUrl || "*");
        });
      }
    };
  
    _. bindAll(plugin);
  
    postal.fedx.transports.xframe = plugin;
  
    window.addEventListener("message", plugin.onPostMessage, false);
  
  }(window, _, postal));

  return postal;

} ));