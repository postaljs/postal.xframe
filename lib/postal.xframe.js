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

  var XFRAME = "xframe",
  	NO_OP = function () {},
  	_defaults = {
  		allowedOrigins : [ window.location.origin ],
  		enabled : true,
  		defaultOriginUrl : "*"
  	},
  	_config = _defaults,
  	XFrameClient = postal.fedx.FederationClient.extend( {
  		transportName : XFRAME,
  		shouldProcess : function () {
  			var hasDomainFilters = !!_config.allowedOrigins.length;
  			return _config.enabled && (this.options.origin === "*" || (hasDomainFilters && _.contains( _config.allowedOrigins, this.options.origin ) || !hasDomainFilters ));
  		},
  		send : function ( msg ) {
  			if ( this.shouldProcess() ) {
  				this.target.postMessage( postal.fedx.transports[XFRAME].wrapForTransport( msg ), this.options.origin );
  			}
  		}
  	} ),
  	plugin = postal.fedx.transports[XFRAME] = {
  		XFrameClient : XFrameClient,
  		configure : function ( cfg ) {
  			if ( cfg ) {
  				_config = _.defaults( cfg, _defaults );
  			}
  			return _config;
  		},
  		getTargets : function () {
  			var targets = _.map( document.getElementsByTagName( 'iframe' ), function ( i ) {
  				var urlHack = document.createElement( 'a' );
  				urlHack.href = i.src;
  				return { target : i.contentWindow, origin : (urlHack.protocol + "//" + urlHack.host) || _config.defaultOriginUrl };
  			} );
  			if ( window.parent && window.parent !== window ) {
  				targets.push( { target : window.parent, origin : "*" } );
  			}
  			return targets;
  		},
  		remotes : [],
  		wrapForTransport : function ( packingSlip ) {
  			return JSON.stringify( {
  				postal : true,
  				packingSlip : packingSlip
  			} );
  		},
  		unwrapFromTransport : function ( msgData ) {
  			try {
  				return JSON.parse( msgData );
  			} catch ( ex ) {
  				return {};
  			}
  		},
  		routeMessage : function ( event ) {
  			var parsed = this.unwrapFromTransport( event.data );
  			if ( parsed.postal ) {
  				var target = _.find( this.remotes, function ( x ) {
  					return x.target === event.source;
  				} );
  				if ( !target ) {
  					target = new XFrameClient( event.source, { origin : event.origin }, parsed.packingSlip.instanceId );
  					this.remotes.push( target );
  				}
  				target.onMessage( parsed.packingSlip );
  			}
  		},
  		sendMessage : function ( envelope ) {
  			_.each( this.remotes, function ( target ) {
  				target.sendMessage( envelope );
  			} )
  		},
  		signalReady : function ( targets, callback ) {
  			targets = _.isArray( targets ) ? targets : [ targets ];
  			targets = targets.length ? targets : this.getTargets();
  			callback = callback || NO_OP;
  			_.each( targets, function ( def ) {
  				if ( def.target ) {
  					def.origin = def.origin || _config.defaultOriginUrl;
  					var remote = _.find( this.remotes, function ( x ) {
  						return x.target === def.target;
  					} );
  					if ( !remote ) {
  						remote = new XFrameClient( def.target, { origin : def.origin } );
  						this.remotes.push( remote );
  					}
  					remote.sendPing( callback );
  				}
  			}, this );
  		}
  	};
  
  _.bindAll( plugin );
  window.addEventListener( "message", plugin.routeMessage, false );

  return postal;

} ));