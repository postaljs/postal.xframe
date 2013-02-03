/*
 postal.xframe
 Copyright (C) 2012 - Jim Cowart (http://freshbrewedcode.com/jimcowart)
 License: Dual licensed MIT & GPL v2.0
 Version 0.2.2
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

  // THE NEXT FEW LINES ARE BROUGHT TO YOU BY IE. SIGH.
  if(!window.location.origin) {
    window.location.origin = window.location.protocol + "//" + window.location.host;
  }
  
  // I know, I KNOW. The alternative was very expensive perf & time-wise
  // so I saved you a perf hit by checking the stinking UA
  // I sought the opinion of several other devs. We all traveled
  // to the far east to consult with the wisdom of a monk - turns
  // out he didn't know JavaScript, and our passports were stolen on the
  // return trip. We stowed away aboard a freighter headed back to the
  // US and by the time we got back, no one had heard of IE 8 or 9. True story.
  var useEagerSerialize = /MSIE [8,9]/.test(navigator.userAgent);
  
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
  		send : function ( packingSlip ) {
  			if ( this.shouldProcess() ) {
  				this.target.postMessage( postal.fedx.transports[XFRAME].wrapForTransport( packingSlip ), this.options.origin );
  			}
  		}
  	} ),
  	plugin = postal.fedx.transports[XFRAME] = {
      eagerSerialize : useEagerSerialize,
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
  		wrapForTransport : useEagerSerialize ?
                           function ( packingSlip ) {
                             return JSON.stringify( {
                               postal : true,
                               packingSlip : packingSlip
                             } );
                           } :
                           function ( packingSlip ) {
                             return {
                               postal : true,
                               packingSlip : packingSlip
                             };
                           },
  		unwrapFromTransport : useEagerSerialize ?
                              function ( msgData ) {
                                try {
                                  return JSON.parse( msgData );
                                } catch ( ex ) {
                                  return {};
                                }
                              } :
                              function ( msgData ) {
                                return msgData;
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
  		},
    		addEventListerner : function (obj, eventName, handler, bubble) {
    		    if ("addEventListener" in obj) { // W3C
    		      obj.addEventListener(eventName, handler, bubble);
    		    } else { // IE8
    		      obj.attachEvent("on" + eventName, handler);
    		    }
    		  }
  	};
  
  _.bindAll( plugin );
  plugin.addEventListerner(window, "message", plugin.routeMessage, false);

  return postal;

} ));