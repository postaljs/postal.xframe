/*global postal*/

// We need to tell postal how to get a deferred instance
postal.configuration.promise.createDeferred = function() {
	return new $.Deferred();
};
// We need to tell postal how to get a "public-facing"/safe promise instance
postal.configuration.promise.getPromise = function( dfd ) {
	return dfd.promise();
};

postal.instanceId( "parent" );

postal.fedx.addFilter( [
	{ channel: 'postal', topic: '#', direction: 'out' },
	{ channel: 'iframez', topic: '#', direction: 'out' },
	{ channel: 'webworker1', topic: '#', direction: 'out' },
	{ channel: 'webworker2', topic: '#', direction: 'out' },
	{ channel: 'webworker', topic: '#', direction: 'both' },
	{ channel: 'parentz', topic: '#', direction: 'in' },
	{ channel: 'reqres', topic: '#', direction: 'both' },
	{ channel: 'postal.request-response', topic: '#', direction: 'both' }
] );
postal.addWireTap( function( d, e ) {
	console.log( "ID: " + postal.instanceId() + " " + JSON.stringify( e, null, 4 ) );
} );

$( function() {

	if ( typeof Worker !== "undefined" ) {
		window.werker1 = new Worker( 'worker.js' );
		window.werker2 = new Worker( 'worker2.js' );
		werker1.postMessage( "" );
		werker2.postMessage( "" );
		postal.fedx.signalReady( { xframe: [ { target: werker1 } ] }, function() {} );
		postal.fedx.signalReady( { xframe: [ { target: werker2 } ] }, function() {} );
		//postal.fedx.transports.xframe.listenToWorker( werker2 );

		$( "#worker1" ).on( 'click', function() {
			postal.publish( {
				channel: "webworker1",
				topic: "hit.me.baby.one.more.time"
			} );
		} );

		$( "#worker2" ).on( 'click', function() {
			postal.publish( {
				channel: "webworker2",
				topic: "hit.me.baby.one.more.time"
			} );
		} );

		postal.subscribe( {
			channel: "webworker",
			topic: "#",
			callback: function( d, e ) {
				$( "#msgs" ).append( "<div><pre>" + JSON.stringify( e, null, 4 ) + "</pre></div>" );
			}
		} );
	} else {
		$( "#worker1" ).remove();
		$( "#worker2" ).remove();
	}

	postal.subscribe( {
		channel: "parentz",
		topic: "#",
		callback: function( d, e ) {
			$( "#msgs" ).append( "<div><pre>" + JSON.stringify( e, null, 4 ) + "</pre></div>" );
		}
	} );

	$( "#msg1" ).on( 'click', function() {
		postal.publish( {
			channel: "iframez",
			topic: "some.topic",
			data: "This message will appear in an iframe"
		} );
	} );

	// disconnecting via passing the content window as a target
	$( "#disconnect1" ).on( "click", function() {
		postal.fedx.disconnect( {
			target: document.getElementById( "iframe1" ).contentWindow
		} );
	} );

	// disconnecting via passing the instanceId
	$( "#disconnect2" ).on( "click", function() {
		postal.fedx.disconnect( {
			instanceId: "iframe2"
		} );
	} );

	// disconnecting via passing the instanceId
	$( "#clear" ).on( "click", function() {
		$( "#msgs" ).html( "" );
		postal.publish( {
			channel: "iframez",
			topic: "clear"
		} );
	} );

} );
