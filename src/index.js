import _ from "lodash";
import postal from "postal";
import {
	_memoRemoteByInstanceId,
	_memoRemoteByTarget,
	_disconnectClient,
	safeSerialize
} from "./utils";
import { state, env } from "./state";
import XFrameClient from "./XFrameClient";

function listener() {
	plugin.routeMessage.apply( plugin, arguments );
}

function listenToWorker( worker ) {
	if ( !_.include( state.workers, worker ) ) {
		worker.addEventListener( "message", listener );
		state.workers.push( worker );
	}
}

XFrameClient.getInstance = function getInstance( source, origin, instanceId ) {
	const client = new XFrameClient( source, {
		origin: origin,
		isWorker: ( typeof Worker !== "undefined" && source instanceof Worker )
	}, instanceId );
	if ( client.options.isWorker ) {
		listenToWorker( client.target );
	}
	return client;
};

const NO_OP = function() {};

const plugin = postal.fedx.transports.xframe = {
	eagerSerialize: env.useEagerSerialize,
	XFrameClient: XFrameClient,
	configure: function( cfg ) {
		if ( cfg ) {
			state.config = _.defaults( _.extend( state.config, cfg ), state.defaults );
		}
		return state.config;
	},
	clearConfiguration: function() {
		state.config = _.extend( {}, state.defaults );
	},
	//find all iFrames and the parent window if in an iframe
	getTargets: env.isWorker ? function() {
		return [ {
			target: {
				postMessage: postMessage
			}
		} ]; // TO-DO: look into this...
	} : function() {
		const targets = _.map( document.getElementsByTagName( "iframe" ), function( i ) {
			var urlHack = document.createElement( "a" );
			urlHack.href = i.src;
			let origin = urlHack.protocol + "//" + urlHack.host;
			// The following condition fixes the IE issue of setting the origin while the iframe is 'empty':
			// if the iframe has no 'src' set to some meaningful url (at this very moment),
			// then the urlHack returns neither protocol nor host information.
			if ( origin === "//" ) {
				origin = null;
			}
			return {
				target: i.contentWindow,
				origin: origin || state.config.defaultOriginUrl
			};
		} );
		if ( window.parent && window.parent !== window ) {
			targets.push( {
				target: window.parent,
				origin: "*"
			} );
		}
		return targets.concat( state.workers );
	},
	remotes: [],
	wrapForTransport: env.useEagerSerialize ? function( packingSlip ) {
		return JSON.stringify( {
			postal: true,
			packingSlip: packingSlip
		} );
	} : function( packingSlip ) {
		return {
			postal: true,
			packingSlip: packingSlip
		};
	},
	unwrapFromTransport: function( msgData ) {
		if ( typeof msgData === "string" && ( env.useEagerSerialize || msgData.indexOf( '"postal":true' ) !== -1 ) ) {
			try {
				return JSON.parse( msgData );
			} catch ( ex ) {
				return {};
			}
		} else {
			return msgData;
		}
	},
	routeMessage: function( event ) {
		// source = remote window or worker?
		const source = event.source || event.currentTarget;
		const parsed = this.unwrapFromTransport( event.data );
		if ( parsed.postal ) {
			var remote = _.find( this.remotes, function( x ) {
				return x.target === source;
			} );
			if ( !remote ) {
				remote = XFrameClient.getInstance( source, event.origin, parsed.packingSlip.instanceId );
				this.remotes.push( remote );
			}
			remote.onMessage( parsed.packingSlip );
		}
	},
	sendMessage: function( env ) {
		let envelope = env;
		if ( state.config.safeSerialize ) {
			envelope = safeSerialize( _.cloneDeep( env ) );
		}
		_.each( this.remotes, function( remote ) {
			remote.sendMessage( envelope );
		} );
	},
	disconnect: function( options ) {
		options = options || {};
		const clients = options.instanceId ?
			// an instanceId value or array was provided, let's get the client proxy instances for the id(s)
			_.reduce( _.isArray( options.instanceId ) ? options.instanceId : [ options.instanceId ], _memoRemoteByInstanceId, [], this ) :
			// Ok so we don't have instanceId(s), let's try target(s)
			options.target ?
				// Ok, so we have a targets array, we need to iterate over it and get a list of the proxy/client instances
				_.reduce( _.isArray( options.target ) ? options.target : [ options.target ], _memoRemoteByTarget, [], this ) :
				// aww, heck - we don't have instanceId(s) or target(s), so it's ALL THE REMOTES
				this.remotes;
		if ( !options.doNotNotify ) {
			_.each( clients, _disconnectClient, this );
		}
		this.remotes = _.without.apply( null, [ this.remotes ].concat( clients ) );
	},
	signalReady: function( targets, callback ) {
		targets = _.isArray( targets ) ? targets : [ targets ];
		targets = targets.length ? targets : this.getTargets();
		callback = callback || NO_OP;
		_.each( targets, function( def ) {
			if ( def.target ) {
				def.origin = def.origin || state.config.defaultOriginUrl;
				let remote = _.find( this.remotes, function( x ) {
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
	addEventListener: env.isWorker ? function() {
		addEventListener( "message", listener );
	} : function( eventName, handler, bubble ) {
		// in normal browser context
		if ( typeof window !== "undefined" && typeof window.addEventListener === "function" ) {
			window.addEventListener( eventName, handler, bubble );
		} else {
			throw new Error( "postal.xframe only works with browsers that support window.addEventListener" );
		}
	},
	listenToWorker: listenToWorker,
	stopListeningToWorker: function( worker ) {
		if ( worker ) {
			worker.removeEventListener( "message", listener );
			state.workers = _.without( state.workers, worker );
		} else {
			while ( state.workers.length ) {
				state.workers.pop().removeEventListener( "message", listener );
			}
		}
	}
};

plugin.addEventListener( "message", listener, false );
