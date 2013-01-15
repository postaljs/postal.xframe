# postal.xframe

## Version 0.2.1	 (Dual Licensed [MIT](http://www.opensource.org/licenses/mit-license) & [GPL](http://www.opensource.org/licenses/gpl-license))

## What is it?
postal.xframe is a [postal.federation](https://github.com/postaljs/postal.federation) plugin - enabling you to 'federate' instances of [postal](https://github.com/postaljs/postal.js) across iframe/window boundaries in the browser.

## Why would I use it?
If you've ever had to send messages between a parent window and an iframe (or between sibling iframes), you know how frustratingly complex things can become. While most newer browsers support `window.postMessage` - it hardly makes a dent in the kind of infrastructure necessary to transparently publish and subscribe across/between windows.  postal.xframe bridges two or more instances of postal so that they can share messages. For example, if you have postal in the parent window, as well as in an iframe (and have included postal.federation and postal.xframe), you can tell the two instances of postal to federate, enabling messages that get published in the parent window to be pushed down to the iframe and published *as if they were locally published* and vice versa. This enables you to write your components to worry only about handling messages - and the infrastructure concerns of where they originate, how they get there, etc., are already taken care of by postal.xframe.

## How do I use it?
First, include [postal](), [postal.federation]() and postal.xframe in each window that will be involved. You can initiate federation from either window. Here's an example from a parent window's perspective (it's long because it's heavy with COMMENTS!):

```javascript

// this instance of post *MUST* have a unique identifier, otherwise
// there is no way to differentiate between this instance of postal
// and a remote instance.  You can provide your own server-generated
// GUID, or - if you know a unique value ahead of time - you can set
// it via postal.instanceId(id).  Calling postal.instanceId() without any
// arguments acts as a getter - it returns the current instance Id.
postal.instanceId("parent");

// You can optionally configure postal.xframe with the configure call.
// `allowedOrigins` is an array of origins that you can use to determine
// if you want to federate with postal instances loaded in another window
// from those origins.  If another host attempts to federate with you from
// an origin not listed in that array, the local instance of postal will
// not allow it. The local instance of postal will not send any messages to
// (nor process any from) an origin not listed in this array.
// `defaultOriginUrl` is the default value that will be provided as the "targetUrl"
// when postal.xframe calls `window.postMessage(msg, targetUrl)` if it hasn't
// been specified for that remote window already.
postal.fedx.transports.xframe.configure({
	allowedOrigins : [ "http://some.host.com", "http://another.com" ],
	defaultOriginUrl : "http://some.host.com",
	enabled: true // this is redundant - just showing that it's here
});

// postal.federation allows for filtering of inbound and/or outbound messages
// via either a whitelist or blacklist mode.  If you are in whitelist mode (the default),
// any filters are used to determine the messages that will be processed, whereas blacklist
// mode causes filters to block messages matching the filter, while letting anything
// else continue in or out.  Filters look like the object literals in the array argument
// below, specifying a channel name, a topic binding (it can be a wildcard), and a
// direction. The direction can be "in", "out" or "both".
// The call below will allow ANY message on the "channelA" channel to be sent out to any
// remote postal that has federated with this instance, and it will process any messages
// on the "channelB" channel that come from remote instances.
postal.fedx.addFilter([
  { channel: 'channelA', topic: '#', direction: 'out' },
  { channel: 'channelB', topic: '#', direction: 'in'  }
]);

// The signalReady() call will cause xframe to scan the DOM for any iframe (and also
// check for a parent window, in case the current window is an iframe), and it will
// send a "federation.ping" message using `postMessage`. Assuming both browser security
// and the postal.xframe configuration will allow these two domains to communicate, if
// postal exists in the remote iframe/window, and is capable of federating, it will respond
// with a "federation.pong", letting this instance know that it got the message, and the
// two instances will complete the 'handshake' and start sharing whatever they are allowed
// to share
postal.fedx.signalReady();

// This message will be published locally as well as sent across to the remote postal
// instances of any federated iframes
postal.publish({
	channel : "channelA",
	topic   : "message.topic",
	data    : {
	   bacon : 'sizzle'
	}
});

// If any local OR remote instances of publish a message on this channel and topic,
// the subscription callback will be invoked.  This is the beauty of writing your code
// to simply respond to the event - it doesn't matter where it originated.
var subscription = postal.subscribe({
	channel  : "channelB",
	topic    : "some.topic",
	callback : function(data, envelope) {
		// do stuff with data or envelope
	}
});

```

## Caveats
This plugin is still largely in flux. (It's been rewritten several times up to now.) While we don't anticipate any major API changes, just know it's possible. That being said, we've used this plugin in real-world scenarios with great success, so there's that.
