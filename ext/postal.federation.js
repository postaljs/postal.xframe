/*
 postal.federation
 Copyright (C) 2012 - Jim Cowart (http://freshbrewedcode.com/jimcowart)
 License: Dual licensed MIT & GPL v2.0
 Version 0.2.3
 */
(function ( root, factory ) {
  if ( typeof module === "object" && module.exports ) {
    // Node, or CommonJS-Like environments
    module.exports = function(_, postal, riveter) {
      return factory( _, postal, riveter );
    };
  } else if ( typeof define === "function" && define.amd ) {
    // AMD. Register as an anonymous module.
    define( ["underscore", "postal", "riveter"], function ( _, postal, riveter ) {
      return factory( _, postal, riveter, root );
    } );
  } else {
    // Browser globals
    root.postal = factory( root._, root.postal, root.riveter, root );
  }
}( this, function ( _, postal, riveter, global, undefined ) {

  if ( !postal.utils.createUUID ) {
  	postal.utils.createUUID = function () {
  		var s = [];
  		var hexDigits = "0123456789abcdef";
  		for ( var i = 0; i < 36; i++ ) {
  			s[i] = hexDigits.substr( Math.floor( Math.random() * 0x10 ), 1 );
  		}
  		s[14] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
  		s[19] = hexDigits.substr( (s[19] & 0x3) | 0x8, 1 );  // bits 6-7 of the clock_seq_hi_and_reserved to 01
  		s[8] = s[13] = s[18] = s[23] = "-";
  		return s.join( "" );
  	}
  }
  if ( !postal.instanceId ) {
  	postal.instanceId = (function () {
  		// THIS IS TEMPORARY UNTIL FSM IS BAKED-IN
  		var _id, _oldId;
  		return function ( id ) {
  			if ( id ) {
  				_oldId = _id;
  				_id = id;
  				postal.publish( {
  					channel : postal.configuration.SYSTEM_CHANNEL,
  					topic : "instanceId.changed",
  					data : {
  						oldId : _oldId,
  						newId : _id
  					}
  				} );
  			}
  			return _id;
  		}
  	}());
  }
  var NO_OP = function() {},
  	_ready = false,
  	_inboundQueue = [],
  	_outboundQueue = [],
  	_signalQueue = [],
  	_defaults = {
  		enabled : true,
  		filterMode : 'whitelist',
  		filterDirection : 'both'
  	},
  	_config = _defaults,
  	_packingSlips = {
  		ping : function () {
  			return {
  				type : 'federation.ping',
  				instanceId : postal.instanceId(),
  				timeStamp : new Date(),
  				ticket : postal.utils.createUUID()
  			}
  		},
  		pong : function ( ping ) {
  			return {
  				type : 'federation.pong',
  				instanceId : postal.instanceId(),
  				timeStamp : new Date(),
  				pingData : {
  					instanceId : ping.instanceId,
  					timeStamp : ping.timeStamp,
  					ticket : ping.ticket
  				}
  			}
  		},
  		message : function ( env ) {
  			return {
  				type : 'federation.message',
  				instanceId : postal.instanceId(),
  				timeStamp : new Date(),
  				envelope : env
  			}
  		},
  	    disconnect: function () {
  	      return {
  	        type : 'federation.disconnect',
  	        instanceId : postal.instanceId(),
  	        timeStamp : new Date()
  	      }
  	    },
  		bundle : function ( packingSlips ) {
  			return {
  				type : 'federation.bundle',
  				instanceId : postal.instanceId(),
  				timeStamp : new Date(),
  				packingSlips : packingSlips
  			}
  		}
  	},
  	_handle = {
  		"federation.ping" : function ( data, callback ) {
  			data.source.setInstanceId(data.packingSlip.instanceId);
  			if(data.source.handshakeComplete) {
  				data.source.sendPong( data.packingSlip );
  			} else {
  				data.source.sendBundle( [
  					postal.fedx.getPackingSlip( 'pong', data.packingSlip ),
  					postal.fedx.getPackingSlip( 'ping' )
  				] );
  			}
  		},
  		"federation.pong" : function ( data ) {
  			data.source.handshakeComplete = true;
  			data.source.setInstanceId(data.packingSlip.instanceId);
  			if ( data.source.pings[data.packingSlip.pingData.ticket] ) {
  				data.source.pings[data.packingSlip.pingData.ticket].callback( {
  					ticket : data.packingSlip.pingData.ticket,
  					instanceId : data.packingSlip.instanceId,
  					source : data.source
  				} );
  				data.source.pings[data.packingSlip.pingData.ticket] = undefined;
  			}
  			if(!_.contains(postal.fedx.clients, data.packingSlip.instanceId)) {
  				postal.fedx.clients.push(data.packingSlip.instanceId);
  			}
  			postal.publish( {
  				channel : "postal.federation",
  				topic : "client.federated",
  				data : {
  					remoteId : data.source.instanceId,
  					localId : postal.instanceId(),
  					transport : data.transport
  				}
  			} );
  		},
  	    "federation.disconnect" : function ( data ) {
  			postal.fedx.clients = _.without(postal.fedx.clients, data.source.instanceId);
  		    postal.fedx.disconnect({ transport: data.source.transportName, instanceId: data.source.instanceId, doNotNotify: true });
  	    },
  		"federation.message" : function ( data ) {
  			var env = data.packingSlip.envelope;
  			if ( _matchesFilter( env.channel, env.topic, 'in' ) ) {
  				env.lastSender = data.packingSlip.instanceId;
  				postal.publish( env );
  			}
  		},
  		"federation.bundle" : function ( data ) {
  			_.each( data.packingSlip.packingSlips, function ( slip ) {
  				postal.fedx.onFederatedMsg( _.extend( {}, data, { packingSlip : slip } ) );
  			} );
  		}
  	},
  	_matchesFilter = function ( channel, topic, direction ) {
  	    var channelPresent = Object.prototype.hasOwnProperty.call(postal.fedx.filters[direction], channel);
  		var topicMatch = (channelPresent && _.any( postal.fedx.filters[direction][channel], function ( binding ) {
  			return postal.configuration.resolver.compare( binding, topic );
  		} ));
  		var blacklisting = _config.filterMode === 'blacklist';
  
  		return _config.enabled &&
  		       (
  			       (blacklisting && (!channelPresent || (channelPresent && !topicMatch))) ||
  			       (!blacklisting && channelPresent && topicMatch)
  			       );
  	},
  	FederationClient = function ( target, options, instanceId ) {
  		//this.transportName = undefined;
  		this.target = target;
  		this.options = options || {};
  		this.pings = {};
  		this.instanceId = instanceId;
  		this.handshakeComplete = false;
  	};
  
  FederationClient.prototype.sendPing = function ( callback ) {
  	var packingSlip = postal.fedx.getPackingSlip( 'ping' );
  	this.pings[packingSlip.ticket] = { ticket : packingSlip.ticket, callback : callback || NO_OP };
  	this.send( packingSlip );
  };
  
  FederationClient.prototype.sendPong = function ( origPackingSlip ) {
  	this.send( postal.fedx.getPackingSlip( 'pong', origPackingSlip ) );
  };
  
  FederationClient.prototype.sendBundle = function ( slips ) {
  	this.send( postal.fedx.getPackingSlip( 'bundle', slips ) );
  };
  
  FederationClient.prototype.sendMessage = function ( envelope ) {
  	if ( !this.handshakeComplete ) {
  		return;
  	}
  	envelope.originId = envelope.originId || postal.instanceId();
  	var env = _.clone( envelope );
  	if ( this.instanceId && this.instanceId !== env.lastSender &&
  	     ( !env.knownIds || !env.knownIds.length ||
  	       (env.knownIds && !_.include( env.knownIds, this.instanceId )))
  		) {
  		env.knownIds = (env.knownIds || []).concat( _.without( postal.fedx.clients, this.instanceId ) );
  		this.send( postal.fedx.getPackingSlip( 'message', env ) );
  	}
  };
  
  FederationClient.prototype.disconnect = function () {
  	this.send( postal.fedx.getPackingSlip( 'disconnect' ) );
  };
  
  FederationClient.prototype.onMessage = function ( packingSlip ) {
  	if ( this.shouldProcess() ) {
  		postal.fedx.onFederatedMsg( {
  			transport : this.transportName,
  			packingSlip : packingSlip,
  			source : this
  		} );
  	}
  };
  
  FederationClient.prototype.shouldProcess = function () {
  	return true;
  };
  
  FederationClient.prototype.send = function ( msg ) {
  	throw new Error( "An object deriving from FederationClient must provide an implementation for 'send'." );
  };
  
  FederationClient.prototype.setInstanceId = function( id ) {
  	this.instanceId = id;
  };
  
  riveter( FederationClient );
  
  postal.fedx = _.extend( {
  
  	FederationClient : FederationClient,
  
  	clients: [],
  
  	transports : {},
  	
  	// in is a reserved word (IE 8)
  	filters : { "in" : {}, "out" : {} },
  
  	addFilter : function ( filters ) {
  		filters = _.isArray( filters ) ? filters : [ filters ];
  		_.each( filters, function ( filter ) {
  			filter.direction = filter.direction || _config.filterDirection;
  			_.each( (filter.direction === 'both') ? [ 'in', 'out' ] : [ filter.direction ], function ( dir ) {
  				if ( !this.filters[dir][filter.channel] ) {
  					this.filters[dir][filter.channel] = [ filter.topic ];
  				} else if ( !(_.include( this.filters[dir][filter.channel], filter.topic )) ) {
  					this.filters[dir][filter.channel].push( filter.topic );
  				}
  			}, this );
  		}, this );
  	},
  
  	removeFilter : function ( filters ) {
  		filters = _.isArray( filters ) ? filters : [ filters ];
  		_.each( filters, function ( filter ) {
  			filter.direction = filter.direction || _config.filterDirection;
  			_.each( (filter.direction === 'both') ? [ 'in', 'out' ] : [ filter.direction ], function ( dir ) {
  				if ( this.filters[dir][filter.channel] && _.include( this.filters[dir][filter.channel], filter.topic ) ) {
  					this.filters[dir][filter.channel] = _.without( this.filters[dir][filter.channel], filter.topic );
  				}
  			}, this );
  		}, this );
  	},
  
  	canSendRemote : function ( channel, topic ) {
  		return _matchesFilter( channel, topic, 'out' );
  	},
  
  	configure : function ( cfg ) {
  		if ( cfg && cfg.filterMode && cfg.filterMode !== 'blacklist' && cfg.filterMode !== 'whitelist' ) {
  			throw new Error( "postal.fedx filterMode must be 'blacklist' or 'whitelist'." );
  		}
  		if ( cfg ) {
  			_config = _.defaults( cfg, _defaults );
  		}
  		return _config;
  	},
  
  	getPackingSlip : function ( type, env ) {
  		if (Object.prototype.hasOwnProperty.call(_packingSlips, type)) {
  			return _packingSlips[type].apply( this, Array.prototype.slice.call( arguments, 1 ) );
  		}
  	},
  
  	onFederatedMsg : function ( data ) {
  		if ( !_ready ) {
  			_inboundQueue.push( data );
  			return;
  		}
  		if (Object.prototype.hasOwnProperty.call(_handle, data.packingSlip.type)) {
  			_handle[data.packingSlip.type]( data );
  		} else {
  			throw new Error( "postal.federation does not have a message handler for '" + data.packingSlip.type + "'." );
  		}
  	},
  
  	sendMessage : function ( envelope ) {
  		if ( !_ready ) {
  			_outboundQueue.push( arguments );
  			return;
  		}
  		_.each( this.transports, function ( transport ) {
  			transport.sendMessage( envelope );
  		} );
  	},
  
  	disconnect : function ( options ) {
  		options = options || {};
  		var transports = this.transports;
  		if(options.transport) {
  			transports = {};
  			transports[options.transport] = this.transports[options.transport];
  		}
  		_.each(transports, function(transport) {
  			transport.disconnect({
  				target      : options.target,
  				instanceId  : options.instanceId,
  				doNotNotify : !!options.doNotNotify
  			});
  		}, this);
  	},
  
  	_getTransports : function ( ) {
  		return _.reduce( this.transports, function ( memo, transport, name ) {
  		  memo[name] = true;
  		  return memo;
  		}, {} );
  	},
  
  	/*
  	signalReady( callback );
  	signalReady( "transportName" );
  	signalReady( "transportName", callback );
  	signalReady( "transportName", targetInstance, callback ); <-- this is NEW
  	signalReady( { transportNameA: targetsForA, transportNameB: targetsForB, transportC: true }, callback);
  	*/
  	signalReady : function ( transport, target, callback ) {
  		if ( !_ready ) {
  			_signalQueue.push( arguments );
  			return;
  		}
  		var transports = this._getTransports();
  		switch ( arguments.length ) {
  			case 1:
  				if ( typeof transport === 'function' ) {
  					callback = transport;
  				} else if ( typeof transport === 'string' ) {
  					transports = {};
  					transports[transport] = this.transports[transport];
  					callback = NO_OP;
  				}
  			break;
  			case 2:
  				if ( typeof transport === 'string' ) {
  					transports = {};
  					transports[transport] = this.transports[transport];
  				} else {
  					transports = transport;
  				}
  				callback = target || NO_OP;
  			break;
  			case 3:
  				transports = {};
  				transports[transport] = [ target ];
  			break;
  		}
  		_.each( transports, function ( targets, name ) {
  			targets = typeof targets === "boolean" ? [] : targets;
  			this.transports[name].signalReady( targets, callback );
  		}, this );
  	}
  
  }, postal.fedx );
  
  postal.addWireTap( function ( data, envelope ) {
  	if ( postal.fedx.canSendRemote( envelope.channel, envelope.topic ) ) {
  		postal.fedx.sendMessage( envelope );
  	}
  } );
  
  postal.subscribe( {
  	channel : postal.configuration.SYSTEM_CHANNEL,
  	topic : "instanceId.changed",
  	callback : function () {
  		_ready = true;
  		while ( _signalQueue.length ) {
  			(function ( args ) {
  				postal.fedx.signalReady.apply( this, args );
  			}( _signalQueue.shift() ));
  		}
  		while ( _outboundQueue.length ) {
  			(function ( args ) {
  				postal.fedx.send.apply( this, args );
  			}( _outboundQueue.shift() ));
  		}
  		while ( _inboundQueue.length ) {
  			(function ( msg ) {
  				postal.fedx.onFederatedMsg.call( this, msg );
  			}( _inboundQueue.shift() ));
  		}
  	}
  } );
  
  if ( postal.instanceId() !== undefined ) {
  	_ready = true;
  }

  return postal;

} ));