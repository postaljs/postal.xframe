/*
 postal.xframe
 Copyright (C) 2012 - Jim Cowart (http://freshbrewedcode.com/jimcowart)
 License: Dual licensed MIT & GPL v2.0
 Version 0.2.4
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

	var _origin = location.origin || location.protocol + "//" + location.host;
	
	// I know, I KNOW. The alternative was very expensive perf & time-wise
	// so I saved you a perf hit by checking the stinking UA. Sigh.
	// I sought the opinion of several other devs. We all traveled
	// to the far east to consult with the wisdom of a monk - turns
	// out he didn't know JavaScript, and our passports were stolen on the
	// return trip. We stowed away aboard a freighter headed back to the
	// US and by the time we got back, no one had heard of IE 8 or 9. True story.
	var useEagerSerialize = /MSIE [8,9]/.test(navigator.userAgent);
	
	var _memoRemoteByInstanceId = function(memo, instanceId) {
		var proxy = _.find(this.remotes, function(x) {
			return x.instanceId === instanceId;
		});
		if(proxy) { memo.push(proxy); }
		return memo;
	};
	
	var _memoRemoteByTarget = function(memo, tgt) {
		var proxy = _.find(this.remotes, function(x) {
			return x.target === tgt;
		});
		if(proxy) { memo.push(proxy); }
		return memo;
	};
	
	var _disconnectClient = function ( client ) {
		client.disconnect();
	};
	
	var _envIsWorker = (typeof window === "undefined") && postMessage && location;
	
	var _workers = [];
	
	var XFRAME = "xframe",
		NO_OP = function () {},
		_defaults = {
			allowedOrigins : [ _origin ],
			enabled : true,
			defaultOriginUrl : "*"
		},
		_config = _defaults,
		XFrameClient = postal.fedx.FederationClient.extend({
			transportName : "xframe",
			shouldProcess : function () {
				var hasDomainFilters = !!_config.allowedOrigins.length;
				return _config.enabled &&
						// another frame/window
						((this.options.origin === "*" || (hasDomainFilters && _.contains( _config.allowedOrigins, this.options.origin ) || !hasDomainFilters )) ||
						// worker
						(this.options.isWorker && _.contains(_workers, this.target)) ||
						// we are in a worker
						_envIsWorker);
			},
			send : function ( packingSlip ) {
				var args;
				var context;
				if ( this.shouldProcess() ) {
					context = _envIsWorker ? null : this.target;
					args = [postal.fedx.transports[XFRAME].wrapForTransport( packingSlip )];
					if(!this.options.isWorker && !_envIsWorker) {
						args.push(this.options.origin);
					}
					this.target.postMessage.apply(context, args);
				}
		    }
		}, {
			getInstance: function(source, origin, instanceId) {
				var client = new XFrameClient( source, { origin : origin, isWorker: (typeof Worker !== 'undefined' && source instanceof Worker) }, instanceId );
				if(client.options.isWorker) {
					plugin.listenToWorker(client.target);
				}
				return client;
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
			//find all iFrames and the parent window if in an iframe
			getTargets : _envIsWorker ?
						 function() {
							return [{ target : { postMessage: postMessage } }]; // TODO: look into this...
						 } :
						 function () {
							var targets = _.map( document.getElementsByTagName( 'iframe' ), function ( i ) {
								var urlHack = document.createElement( 'a' );
								urlHack.href = i.src;
								return { target : i.contentWindow, origin : (urlHack.protocol + "//" + urlHack.host) || _config.defaultOriginUrl };
							} );
							if ( window.parent && window.parent !== window ) {
								targets.push( { target : window.parent, origin : "*" } );
							}
							return targets.concat(_workers);
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
				// source = remote window or worker?
				var source = event.source || event.currentTarget;
				var parsed = this.unwrapFromTransport( event.data );
				if ( parsed.postal ) {
					if(postal.instanceId() === "worker") {
						console.log("parsed: " + JSON.stringify(parsed));
					}
					var remote = _.find( this.remotes, function ( x ) {
						return x.target === source;
					} );
					if ( !remote ) {
						remote = XFrameClient.getInstance( source, event.origin, parsed.packingSlip.instanceId );
						this.remotes.push( remote );
					}
					remote.onMessage( parsed.packingSlip );
				}
			},
			sendMessage : function ( envelope ) {
				_.each( this.remotes, function ( remote ) {
					remote.sendMessage( envelope );
				} );
			},
		    disconnect: function( options ) {
			    options = options || {};
				var clients = options.instanceId ?
								// an instanceId value or array was provided, let's get the client proxy instances for the id(s)
								_.reduce(_.isArray( options.instanceId ) ? options.instanceId : [ options.instanceId ], _memoRemoteByInstanceId, [], this) :
								// Ok so we don't have instanceId(s), let's try target(s)
								options.target ?
								// Ok, so we have a targets array, we need to iterate over it and get a list of the proxy/client instances
								_.reduce(_.isArray( options.target ) ? options.target : [ options.target ], _memoRemoteByTarget, [], this) :
								// aww, heck - we don't have instanceId(s) or target(s), so it's ALL THE REMOTES
								this.remotes;
				if(!options.doNotNotify) {
					_.each( clients, _disconnectClient, this );
				}
				this.remotes = _.without.apply(null, [ this.remotes ].concat(clients));
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
							remote = XFrameClient.getInstance( def.target, def.origin );
							this.remotes.push( remote );
						}
						remote.sendPing( callback );
					}
				}, this );
			},
	  		addEventListener : _envIsWorker ?
								function() {
									addEventListener("message", plugin.routeMessage)
								} :
								function (obj, eventName, handler, bubble) {
									// in normal browser context
									if(typeof window !== "undefined") {
										if ("addEventListener" in obj) { // W3C
											obj.addEventListener(eventName, handler, bubble);
										} else { // IE8
											obj.attachEvent("on" + eventName, handler);
										}
									}
								},
			listenToWorker : function ( worker ) {
				if(!_.include(_workers, worker)) {
					worker.addEventListener( "message", plugin.routeMessage );
					_workers.push( worker );
				}
			},
			stopListeningToWorker : function ( worker ) {
				if(worker) {
					worker.removeEventListener( "message", plugin.routeMessage );
					_workers = _.without(_workers, worker);
				} else {
					while(_workers.length) {
						_workers.pop().removeEventListener( "message", plugin.routeMessage );
					}
				}
			}
		};
	
	_.bindAll( plugin );
	plugin.addEventListener(this, "message", plugin.routeMessage, false);
	

	return postal;

} ));