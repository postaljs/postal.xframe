postal.instanceId( "test123" );
var inBrowser = !( typeof KARMA !== "undefined" && KARMA === true );
if ( inBrowser ) {
	if ( typeof document !== "undefined" ) {
		var iframe = document.createElement( "iframe" );
		iframe.onload = function() {
			executeTests();
			if ( typeof mocha !== "undefined" && mocha.run ) {
				mocha.run();
			}
		};
		iframe.style.display = "none";
		iframe.setAttribute( "id", "testIframe" );
		iframe.src = "iframe.html";
		document.body.appendChild( iframe );
	}
} else {
	executeTests();
}

function executeTests() {
	describe( "postal.xframe - unit tests", function() {
		var XFrameClient = postal.fedx.transports.xframe.XFrameClient;
		var fakeTarget = {
			postMessage: function( msg, targetUrl ) {
				this.msg = msg;
				this.targetUrl = targetUrl;
			}
		};
		var testFederationMessage = '{"postal":true,"packingSlip":{"type":"federation.message","timeStamp":"2013-01-12T16:15:23.853Z","envelope":{"channel":"federate","topic":"all.the.things","data":"Booyah!"}}}';
		var fakeEvent = {
			origin: "http://fake.origin",
			source: fakeTarget,
			data: postal.fedx.transports.xframe.eagerSerialize ? testFederationMessage : JSON.parse( testFederationMessage )
		};
		var testFederationDeleteMessage = '{"postal":true,"packingSlip":{"type":"federation.disconnect","timeStamp":"2013-01-12T16:15:23.853Z","envelope":{"channel":"federate","topic":"all.the.things","data":"Booyah!"}}}';
		var fakeDeleteEvent = {
			origin: "http://fake.origin",
			source: fakeTarget,
			data: postal.fedx.transports.xframe.eagerSerialize ? testFederationDeleteMessage : JSON.parse( testFederationDeleteMessage )
		};
		describe( "When checking configuration", function() {
			describe( "When using defaults", function() {
				it( "should return expected default values", function() {
					expect( postal.fedx.transports.xframe.configure() ).to.eql( {
						allowedOrigins: [ window.location.origin ],
						enabled: true,
						defaultOriginUrl: "*",
						safeSerialize: false
					} );
				} );
			} );
			describe( "When setting specific configuration values", function() {
				beforeEach( function() {
					postal.fedx.transports.xframe.configure( {
						enabled: false
					} );
				} );
				afterEach( function() {
					postal.fedx.transports.xframe.clearConfiguration();
				} );
				it( "should return expected values", function() {
					expect( postal.fedx.transports.xframe.configure() ).to.eql( {
						allowedOrigins: [ window.location.origin ],
						enabled: false,
						defaultOriginUrl: "*",
						safeSerialize: false
					} );
				} );
			} );
			describe( "When setting entire configuration", function() {
				beforeEach( function() {
					postal.fedx.transports.xframe.configure( {
						allowedOrigins: [ "who.com" ],
						enabled: false,
						defaultOriginUrl: "donna.noble.uk"
					} );
				} );
				afterEach( function() {
					postal.fedx.transports.xframe.clearConfiguration();
				} );
				it( "should return expected values", function() {
					expect( postal.fedx.transports.xframe.configure() ).to.eql( {
						allowedOrigins: [ "who.com" ],
						enabled: false,
						defaultOriginUrl: "donna.noble.uk",
						safeSerialize: false
					} );
				} );
			} );
		} );

		describe( "When calling shouldProcess on an XFrameClient instance", function() {
			var client;
			beforeEach( function() {
				client = new XFrameClient( fakeTarget, {
					origin: "http://fake.origin"
				}, "123456" );
			} );
			afterEach( function() {
				postal.fedx.transports.xframe.clearConfiguration();
			} );
			it( "should return true if target is in allowed origins", function() {
				postal.fedx.transports.xframe.configure( {
					allowedOrigins: [ "http://fake.origin" ]
				} );
				expect( client.shouldProcess() ).to.be( true );
			} );
			it( "should return false if target is *not* in allowed origins", function() {
				expect( client.shouldProcess() ).to.be( false );
			} );
			it( "should return false if xframe has been disabled", function() {
				postal.fedx.transports.xframe.configure( {
					allowedOrigins: [ "http://fake.origin" ],
					enabled: false
				} );
				expect( client.shouldProcess() ).to.be( false );
			} );
			it( "should return true if the client's origin is '*'", function() {
				client.options.origin = "*";
				expect( client.shouldProcess() ).to.be( true );
			} );
			it( "should return true if the allowed origins array is empty", function() {
				postal.fedx.transports.xframe.configure( {
					allowedOrigins: []
				} );
				expect( client.shouldProcess() ).to.be( true );
			} );
			it( "should return false if the client origin is undefined", function() {
				delete client.options.origin;
				expect( client.shouldProcess() ).to.be( false );
			} );
		} );

		describe( "When calling send on an XFrameClient instance", function() {
			var client;
			beforeEach( function() {
				client = new XFrameClient( fakeTarget, {
					origin: "http://fake.origin"
				}, "123456" );
				postal.fedx.transports.xframe.configure( {
					allowedOrigins: [ "http://fake.origin" ]
				} );
			} );
			afterEach( function() {
				postal.fedx.transports.xframe.clearConfiguration();
				delete fakeTarget.targetUrl;
				delete fakeTarget.msg;
			} );
			it( "should pass correct arguments to target instance", function() {
				client.send( {
					foo: "bar"
				} );
				if ( postal.fedx.transports.xframe.eagerSerialize ) {
					expect( fakeTarget.msg ).to.be( '{"postal":true,"packingSlip":{"foo":"bar"}}' );
				} else {
					expect( fakeTarget.msg ).to.eql( {
						postal: true,
						packingSlip: {
							foo: "bar"
						}
					} );
				}
				expect( fakeTarget.targetUrl ).to.be( "http://fake.origin" );
			} );
			it( "should not send if shouldProcess returns false", function() {
				postal.fedx.transports.xframe.clearConfiguration();
				client.send( {
					foo: "bar"
				} );
				expect( fakeTarget.msg ).to.be( undefined );
				expect( fakeTarget.targetUrl ).to.be( undefined );
			} );
		} );

		describe( "When calling sendPing on an XFrameClient instance", function() {
			var client;
			beforeEach( function() {
				client = new XFrameClient( fakeTarget, {
					origin: "http://fake.origin"
				}, "123456" );
				postal.fedx.transports.xframe.configure( {
					allowedOrigins: [ "http://fake.origin" ]
				} );
			} );
			afterEach( function() {
				postal.fedx.transports.xframe.clearConfiguration();
				delete fakeTarget.targetUrl;
				delete fakeTarget.msg;
			} );
			it( "should pass correct arguments to target instance", function() {
				var msg;
				client.sendPing();
				if ( postal.fedx.transports.xframe.eagerSerialize ) {
					msg = JSON.parse( fakeTarget.msg );
					expect( Object.prototype.toString.call( fakeTarget.msg ) ).to.be( "[object String]" );
				} else {
					msg = fakeTarget.msg;
					expect( Object.prototype.toString.call( fakeTarget.msg ) ).to.be( "[object Object]" );
				}
				expect( msg.postal ).to.be( true );
				expect( msg.packingSlip.type ).to.be( "federation.ping" );
				expect( msg.packingSlip ).to.have.property( "timeStamp" );
				expect( msg.packingSlip ).to.have.property( "ticket" );
				expect( fakeTarget.targetUrl ).to.be( "http://fake.origin" );
			} );
			it( "should not send if shouldProcess returns false", function() {
				postal.fedx.transports.xframe.clearConfiguration();
				client.sendPing();
				expect( fakeTarget.msg ).to.be( undefined );
				expect( fakeTarget.targetUrl ).to.be( undefined );
			} );
		} );

		describe( "When calling sendPong on an XFrameClient instance", function() {
			var client;
			var pingMsg = {
				postal: true,
				packingSlip: {
					type: "federation.ping",
					timeStamp: "2013-01-11T19:32:31.893Z",
					ticket: "f2aa9b2b-1c12-455c-ac1e-af991648607b"
				}
			};
			beforeEach( function() {
				client = new XFrameClient( fakeTarget, {
					origin: "http://fake.origin"
				}, "123456" );
				postal.fedx.transports.xframe.configure( {
					allowedOrigins: [ "http://fake.origin" ]
				} );
			} );
			afterEach( function() {
				postal.fedx.transports.xframe.clearConfiguration();
				delete fakeTarget.targetUrl;
				delete fakeTarget.msg;
			} );
			it( "should pass correct arguments to target instance", function() {
				var msg;
				client.sendPong( pingMsg.packingSlip );
				if ( postal.fedx.transports.xframe.eagerSerialize ) {
					msg = JSON.parse( fakeTarget.msg );
					expect( Object.prototype.toString.call( fakeTarget.msg ) ).to.be( "[object String]" );
				} else {
					msg = fakeTarget.msg;
					expect( Object.prototype.toString.call( fakeTarget.msg ) ).to.be( "[object Object]" );
				}
				expect( msg.postal ).to.be( true );
				expect( msg.packingSlip.type ).to.be( "federation.pong" );
				expect( msg.packingSlip ).to.have.property( "pingData" );
				expect( msg.packingSlip.pingData.ticket ).to.be( "f2aa9b2b-1c12-455c-ac1e-af991648607b" );
				expect( fakeTarget.targetUrl ).to.be( "http://fake.origin" );
			} );
			it( "should not send if shouldProcess returns false", function() {
				postal.fedx.transports.xframe.clearConfiguration();
				client.sendPing();
				expect( fakeTarget.msg ).to.be( undefined );
				expect( fakeTarget.targetUrl ).to.be( undefined );
			} );
		} );

		describe( "When calling sendMessage on an XFrameClient instance", function() {
			var client;
			var env = {
				channel: "federate",
				topic: "all.the.things",
				data: "Booyah!"
			};
			beforeEach( function() {
				client = new XFrameClient( fakeTarget, {
					origin: "http://fake.origin"
				}, "123456" );
				postal.fedx.transports.xframe.configure( {
					allowedOrigins: [ "http://fake.origin" ]
				} );
			} );
			afterEach( function() {
				postal.fedx.transports.xframe.clearConfiguration();
				delete fakeTarget.targetUrl;
				delete fakeTarget.msg;
			} );
			it( "should not send the message if handshakeComplete is false", function() {
				client.sendMessage( env );
				expect( typeof fakeTarget.msg === "undefined" ).to.be( true );
				expect( typeof fakeTarget.targetUrl === "undefined" ).to.be( true );
			} );
			it( "should pass correct arguments to target instance if handshakeComplete is true", function() {
				var msg;
				client.handshakeComplete = true;
				client.sendMessage( env );
				if ( postal.fedx.transports.xframe.eagerSerialize ) {
					msg = JSON.parse( fakeTarget.msg );
					expect( Object.prototype.toString.call( fakeTarget.msg ) ).to.be( "[object String]" );
				} else {
					msg = fakeTarget.msg;
					expect( Object.prototype.toString.call( fakeTarget.msg ) ).to.be( "[object Object]" );
				}
				expect( msg.postal ).to.be( true );
				expect( msg.packingSlip.type ).to.be( "federation.message" );
				expect( msg.packingSlip.envelope ).to.eql( {
					channel: "federate",
					topic: "all.the.things",
					data: "Booyah!",
					knownIds: [],
					originId: "test123"
				} );
				expect( fakeTarget.targetUrl ).to.be( "http://fake.origin" );
			} );
			it( "should not send if shouldProcess returns false", function() {
				postal.fedx.transports.xframe.clearConfiguration();
				client.sendMessage( env );
				expect( fakeTarget.msg ).to.be( undefined );
				expect( fakeTarget.targetUrl ).to.be( undefined );
			} );
		} );

		describe( "When calling sendBundle on an XFrameClient instance", function() {
			var client;
			var slip1 = postal.fedx.getPackingSlip( "message", {
				channel: "federate",
				topic: "all.the.things",
				data: "Booyah!"
			} );
			var slip2 = postal.fedx.getPackingSlip( "message", {
				channel: "federate",
				topic: "all.the.messages",
				data: "BAM!"
			} );
			beforeEach( function() {
				client = new XFrameClient( fakeTarget, {
					origin: "http://fake.origin"
				}, "123456" );
				postal.fedx.transports.xframe.configure( {
					allowedOrigins: [ "http://fake.origin" ]
				} );
			} );
			afterEach( function() {
				postal.fedx.transports.xframe.clearConfiguration();
				delete fakeTarget.targetUrl;
				delete fakeTarget.msg;
			} );
			it( "should pass correct arguments to target instance", function() {
				var msg;
				client.sendBundle( [ slip1, slip2 ] );
				if ( postal.fedx.transports.xframe.eagerSerialize ) {
					msg = JSON.parse( fakeTarget.msg );
					expect( Object.prototype.toString.call( fakeTarget.msg ) ).to.be( "[object String]" );
				} else {
					msg = fakeTarget.msg;
					expect( Object.prototype.toString.call( fakeTarget.msg ) ).to.be( "[object Object]" );
				}
				expect( msg.postal ).to.be( true );
				expect( msg.packingSlip.type ).to.be( "federation.bundle" );
				expect( msg.packingSlip ).to.have.property( "timeStamp" );
				expect( msg.packingSlip.packingSlips.length ).to.be( 2 );
				expect( msg.packingSlip.packingSlips[0].type ).to.be( "federation.message" );
				expect( msg.packingSlip.packingSlips[0] ).to.have.property( "timeStamp" );
				expect( msg.packingSlip.packingSlips[0].envelope ).to.eql( {
					channel: "federate",
					topic: "all.the.things",
					data: "Booyah!"
				} );
				expect( msg.packingSlip.packingSlips[1].type ).to.be( "federation.message" );
				expect( msg.packingSlip.packingSlips[1] ).to.have.property( "timeStamp" );
				expect( msg.packingSlip.packingSlips[1].envelope ).to.eql( {
					channel: "federate",
					topic: "all.the.messages",
					data: "BAM!"
				} );
				expect( fakeTarget.targetUrl ).to.be( "http://fake.origin" );
			} );
		} );

		describe( "When calling getTargets", function() {
			var targets;
			beforeEach( function() {
				targets = postal.fedx.transports.xframe.getTargets();
			} );
			it( "default getTargets should return available iframes", function() {
				// when run in node via karma, the length will differ because the
				// "context.html" is the parent to the window running this code, so
				// we ignore that check if this is node + karma.
				if ( inBrowser ) {
					expect( targets.length ).to.be( 1 );
					// not going to fight with origin in karma
					expect( targets[0].origin ).to.be( window.location.origin );
				}
				expect( targets[0] ).to.have.property( "target" );
				expect( targets[0] ).to.have.property( "origin" );
				expect( targets[0].target ).to.have.property( "postMessage" );
				expect( typeof targets[0].target.postMessage ).to.be( "function" );
			} );
		} );

		describe( "When calling wrapForTransport", function() {
			var slip1 = postal.fedx.getPackingSlip( "message", {
				channel: "federate",
				topic: "all.the.things",
				data: "Booyah!"
			} );
			var wrapped;
			beforeEach( function() {
				wrapped = postal.fedx.transports.xframe.wrapForTransport( slip1 );
			} );
			it( "should serialize the payload to JSON for cross-frame transport", function() {
				if ( postal.fedx.transports.xframe.eagerSerialize ) {
					msg = JSON.parse( wrapped );
					expect( Object.prototype.toString.call( wrapped ) ).to.be( "[object String]" );
				} else {
					msg = wrapped;
					expect( Object.prototype.toString.call( wrapped ) ).to.be( "[object Object]" );
				}
			} );
		} );

		describe( "When calling unwrapFromTransport", function() {
			var unwrapped;
			beforeEach( function() {
				if ( postal.fedx.transports.xframe.eagerSerialize ) {
					unwrapped = postal.fedx.transports.xframe.unwrapFromTransport( testFederationMessage );
				} else {
					unwrapped = postal.fedx.transports.xframe.unwrapFromTransport( JSON.parse( testFederationMessage ) );
				}
			} );
			it( "should return expected payload", function() {
				expect( unwrapped ).to.eql( {
					postal: true,
					packingSlip: {
						type: "federation.message",
						timeStamp: "2013-01-12T16:15:23.853Z",
						envelope: {
							channel: "federate",
							topic: "all.the.things",
							data: "Booyah!"
						}
					}
				} );
			} );
		} );

		describe( "When calling routeMessage", function() {
			var client, result, oldOnMessage;
			beforeEach( function() {
				result = undefined;
				postal.fedx.transports.xframe.configure( {
					allowedOrigins: [ "http://fake.origin" ]
				} );
				client = new XFrameClient( fakeTarget, {
					origin: "http://fake.origin"
				}, "123456" );
				postal.fedx.transports.xframe.remotes = [ client ];
			} );
			afterEach( function() {
				postal.fedx.transports.xframe.clearConfiguration();
				postal.fedx.transports.xframe.remotes = [];
			} );

			describe( "sending a normal message", function() {
				beforeEach( function() {
					oldOnMessage = client.onMessage;
					client.onMessage = function( packingSlip ) {
						result = packingSlip;
					};
				} );
				afterEach( function() {
					client.OnMessage = oldOnMessage;
				} );
				it( "route the message to the correct client if it's a postal federation msg", function() {
					postal.fedx.transports.xframe.routeMessage( fakeEvent );
					expect( result ).to.eql( {
						type: "federation.message",
						timeStamp: "2013-01-12T16:15:23.853Z",
						envelope: {
							channel: "federate",
							topic: "all.the.things",
							data: "Booyah!"
						}
					} );
				} );
				it( "should not route a non-postal federation message", function() {
					postal.fedx.transports.xframe.routeMessage( {
						origin: "http://fake.origin",
						source: fakeTarget,
						data: '{"foo":"bar", "baz":"bacon"}'
					} );
					expect( typeof result === "undefined" ).to.be( true );
				} );
			} );
			describe( "sending a disconnect message", function() {
				it( "should remove the remote from the remotes array", function() {
					postal.fedx.transports.xframe.routeMessage( fakeDeleteEvent );
					expect( postal.fedx.transports.xframe.remotes.length ).to.be( 0 );
				} );
			} );
		} );

		describe( "When calling sendMessage", function() {
			var client;
			beforeEach( function() {
				result = undefined;
				client = new XFrameClient( fakeTarget, {
					origin: "http://fake.origin"
				}, "123456" );
				postal.fedx.transports.xframe.configure( {
					allowedOrigins: [ "http://fake.origin" ]
				} );
				postal.fedx.transports.xframe.remotes = [ client ];
			} );
			afterEach( function() {
				postal.fedx.transports.xframe.clearConfiguration();
				postal.fedx.transports.xframe.remotes = [];
				delete fakeTarget.targetUrl;
				delete fakeTarget.msg;
			} );
			it( "should not send the message if handshakeComplete is false", function() {
				postal.fedx.sendMessage( {
					channel: "federate",
					topic: "all.the.things",
					data: "Booyah!"
				} );
				expect( typeof fakeTarget.msg === "undefined" ).to.be( true );
				expect( typeof fakeTarget.targetUrl === "undefined" ).to.be( true );
			} );
			it( "should pass correct arguments to target instance if handshakeComplete is true", function() {
				var msg;
				client.handshakeComplete = true;
				postal.fedx.sendMessage( {
					channel: "federate",
					topic: "all.the.things",
					data: "Booyah!"
				} );
				if ( postal.fedx.transports.xframe.eagerSerialize ) {
					msg = JSON.parse( fakeTarget.msg );
					expect( Object.prototype.toString.call( fakeTarget.msg ) ).to.be( "[object String]" );
				} else {
					msg = fakeTarget.msg;
					expect( Object.prototype.toString.call( fakeTarget.msg ) ).to.be( "[object Object]" );
				}
				expect( msg.postal ).to.be( true );
				expect( msg.packingSlip.type ).to.be( "federation.message" );
				expect( msg.packingSlip.envelope ).to.eql( {
					channel: "federate",
					topic: "all.the.things",
					data: "Booyah!",
					knownIds: [],
					originId: "test123"
				} );
				expect( fakeTarget.targetUrl ).to.be( "http://fake.origin" );
			} );
			it( "should not attempt to send methods if safeSerialize is true", function() {
				postal.fedx.transports.xframe.configure( { safeSerialize: true } );
				client.handshakeComplete = true;
				postal.fedx.sendMessage( {
					channel: "federate",
					topic: "all.the.things",
					data: "Booyah!",
					muhMethod: function() {
						console.log( "do stuff" );
					}
				} );
				expect( fakeTarget.msg.packingSlip.envelope ).to.eql( {
					channel: "federate",
					topic: "all.the.things",
					data: "Booyah!",
					knownIds: [],
					originId: "test123"
				} );
			} );
			it( "should not send if shouldProcess returns false", function() {
				postal.fedx.transports.xframe.clearConfiguration();
				postal.fedx.sendMessage( {
					channel: "federate",
					topic: "all.the.things",
					data: "Booyah!"
				} );
				expect( fakeTarget.msg ).to.be( undefined );
				expect( fakeTarget.targetUrl ).to.be( undefined );
			} );
		} );

		describe( "When calling the client disconnect", function() {
			var client, sendCalled;
			beforeEach( function() {
				client = new XFrameClient( fakeTarget, {
					origin: "http://fake.origin"
				}, "123456" );
				client.send = function() {
					sendCalled = true;
				};
				postal.fedx.transports.xframe.configure( {
					allowedOrigins: [ "http://fake.origin" ]
				} );
				postal.fedx.transports.xframe.remotes = [ client ];
			} );
			afterEach( function() {
				postal.fedx.transports.xframe.clearConfiguration();
				postal.fedx.transports.xframe.remotes = [];
				delete fakeTarget.targetUrl;
				delete fakeTarget.msg;
			} );

			it( "should delegate to send on the client", function() {
				client.disconnect();
				expect( sendCalled === true ).to.be( true );
			} );
		} );

		describe( "When calling the transport disconnect", function() {
			var client, disconnectCalled;
			beforeEach( function() {
				client = new XFrameClient( fakeTarget, {
					origin: "http://fake.origin"
				}, "123456" );
				client.disconnect = function() {
					disconnectCalled = true;
				};
				postal.fedx.transports.xframe.configure( {
					allowedOrigins: [ "http://fake.origin" ]
				} );
				postal.fedx.transports.xframe.remotes = [ client ];
			} );
			afterEach( function() {
				postal.fedx.transports.xframe.clearConfiguration();
				postal.fedx.transports.xframe.remotes = [];
				delete fakeTarget.targetUrl;
				delete fakeTarget.msg;
			} );

			it( "should call disconnect on each remote", function() {
				postal.fedx.transports.xframe.disconnect();
				expect( disconnectCalled === true ).to.be( true );
			} );

			it( "should clear the remotes array", function() {
				postal.fedx.transports.xframe.disconnect();
				expect( postal.fedx.transports.xframe.remotes.length ).to.be( 0 );
			} );
		} );

		describe( "When calling signalReady", function() {
			var client;
			beforeEach( function() {
				client = new XFrameClient( fakeTarget, {
					origin: "http://fake.origin"
				}, "123456" );
				postal.fedx.transports.xframe.configure( {
					allowedOrigins: [ "http://fake.origin" ]
				} );
				postal.fedx.transports.xframe.remotes = [ client ];
			} );
			afterEach( function() {
				postal.fedx.transports.xframe.clearConfiguration();
				postal.fedx.transports.xframe.remotes = [];
				delete fakeTarget.targetUrl;
				delete fakeTarget.msg;
			} );
			it( "should pass correct arguments to target instance", function() {
				var msg;
				postal.fedx.transports.xframe.signalReady( {
					target: fakeTarget,
					origin: "http://fake.origin"
				} );
				if ( postal.fedx.transports.xframe.eagerSerialize ) {
					msg = JSON.parse( fakeTarget.msg );
					expect( Object.prototype.toString.call( fakeTarget.msg ) ).to.be( "[object String]" );
				} else {
					msg = fakeTarget.msg;
					expect( Object.prototype.toString.call( fakeTarget.msg ) ).to.be( "[object Object]" );
				}
				expect( msg.postal ).to.be( true );
				expect( msg.packingSlip.type ).to.be( "federation.ping" );
				expect( msg.packingSlip ).to.have.property( "timeStamp" );
				expect( msg.packingSlip ).to.have.property( "ticket" );
				expect( fakeTarget.targetUrl ).to.be( "http://fake.origin" );
			} );
			it( "should not send if shouldProcess returns false", function() {
				postal.fedx.transports.xframe.clearConfiguration();
				postal.fedx.transports.xframe.signalReady( {
					target: fakeTarget,
					origin: "http://fake.origin"
				} );
				expect( fakeTarget.msg ).to.be( undefined );
				expect( fakeTarget.targetUrl ).to.be( undefined );
			} );
		} );
	} );

	if ( inBrowser ) {
		describe( "postal.xframe - integration tests", function() {
			before( function( done ) {
				postal.instanceId( "Parent" );
				postal.fedx.addFilter( [ {
					channel: "test-inbound",
					topic: "#",
					direction: "out"
				}, {
					channel: "test-outbound",
					topic: "#",
					direction: "in"
				} ] );
				postal.fedx.signalReady( {
					xframe: {
						target: document.getElementById( "testIframe" ).contentWindow
					}
				}, function() {
					done();
				} );
			} );
			describe( "when sending a message to the remote iframe", function() {
				it( "should successfully send and get a response", function( done ) {
					var topic = postal.createUUID();
					var data = postal.createUUID();
					postal.subscribe( {
						channel: "test-outbound",
						topic: topic,
						callback: function( d, e ) {
							expect( d ).to.be( data );
							done();
						}
					} );
					postal.publish( {
						channel: "test-inbound",
						topic: topic,
						data: data,
						replyTo: {
							channel: "test-outbound",
							topic: topic
						}
					} );
				} );
			} );
		} );
	}
}
