import _ from "lodash";

export function _memoRemoteByInstanceId( memo, instanceId ) {
	var proxy = _.find( this.remotes, function( x ) {
		return x.instanceId === instanceId;
	} );
	if ( proxy ) {
		memo.push( proxy );
	}
	return memo;
}

export function _memoRemoteByTarget( memo, tgt ) {
	var proxy = _.find( this.remotes, function( x ) {
		return x.target === tgt;
	} );
	if ( proxy ) {
		memo.push( proxy );
	}
	return memo;
}

export function _disconnectClient( client ) {
	client.disconnect();
}

export function safeSerialize( envelope ) {
	for ( let [ key, val ] of entries( envelope ) ) {
		if ( typeof val === "function" ) {
			delete envelope[ key ];
		}
		if ( _.isPlainObject( val ) ) {
			safeSerialize( val );
		}
		if ( _.isArray( val ) ) {
			_.each( val, safeSerialize );
		}
	}
	return envelope;
}

export var entries = function*( obj ) {
	if ( [ "object", "function" ].indexOf( typeof obj ) === -1 ) {
		obj = {};
	}
	for ( var k of Object.keys( obj ) ) {
		yield [ k, obj[ k ] ];
	}
};
