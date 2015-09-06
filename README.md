# postal.xframe

## Version 0.5.0 (Dual Licensed [MIT](http://www.opensource.org/licenses/mit-license) & [GPL](http://www.opensource.org/licenses/gpl-license))

*(special thanks to @rbtbar for the IE 10/11 fixes where iframes aren't reporting a host or protocol)*

## What is it?
postal.xframe is a [postal.federation](https://github.com/postaljs/postal.federation) plugin - enabling you to 'federate' instances of [postal](https://github.com/postaljs/postal.js) across iframe/window boundaries - as well as **web workers** - in the browser.

### Updates
We've recently converted postal.xframe and [postal.federation](https://github.com/postaljs/postal.federation) to ES2015 (or ES6 for those of us too steeped in the habit of calling it that). The ES2015 source can be found in the `src/` folder, and the built output (transpiled to ES5) is in the `lib/` folder. This project uses [webpack](http://webpack.github.io/) for building a [Universal Module Definition](http://webpack.github.io/docs/configuration.html#output-library), and [babel](http://babeljs.io/) to transpile to ES5.

### Run-time Dependencies

This is a postal add-on, so it's assumed that you have postal and lodash loaded already.

* [lodash](https://lodash.com/)
* [postal](https://github.com/postaljs/postal.js)
* [postal.federation](https://github.com/postaljs/postal.federation)
* [babel browser polyfill](https://babeljs.io/docs/usage/polyfill/)

## Why would I use it?
If you've ever had to send messages between a parent window and an iframe (or between sibling iframes), you know how frustratingly complex things can become. While most newer browsers support `window.postMessage` - it hardly makes a dent in the kind of infrastructure necessary to transparently publish and subscribe across/between windows. postal.xframe bridges two or more instances of postal so that they can share messages. For example, if you have postal in the parent window, as well as in an iframe (and have included postal.federation and postal.xframe), you can tell the two instances of postal to federate, enabling messages that get published in the parent window to be pushed down to the iframe and published *as if they were locally published* and vice versa. This enables you to write your components to worry only about handling messages - and the infrastructure concerns of where they originate, how they get there, etc., are already taken care of by postal.xframe. As of v0.2.4, support for federating with postal instances inside a web worker is possible - so if you're using browsers that support workers, and have logic not dependent on being in an iframe specifically, you could move it into a worker and simply continue to publish/subscribe normally.

## How do I use it?
Include postal.xframe (and the above dependencies) in each window that will be involved. You can initiate federation from either window. Here's an example from a parent window's perspective (it's long because it's heavy with COMMENTS!):

```javascript

// this instance of postal *MUST* have a unique identifier, otherwise
// there is no way to differentiate between this instance of postal
// and a remote instance. You can provide your own server-generated
// GUID, or - if you know a unique value ahead of time - you can set
// it via postal.instanceId(id). Calling postal.instanceId() without any
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
// else continue in or out. Filters look like the object literals in the array argument
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
// the subscription callback will be invoked. This is the beauty of writing your code
// to simply respond to the event - it doesn't matter where it originated.
var subscription = postal.subscribe({
	channel  : "channelB",
	topic    : "some.topic",
	callback : function(data, envelope) {
		// do stuff with data or envelope
	}
});

// When you're ready to disconnect you can do it one of several ways
// providing no arguments disconnects you from ALL remotes and signals to
// them to also remove their client proxies back to you:
postal.fedx.disconnect();

// You can provide the raw "target" (i.e. - a content window)
postal.fedx.disconnect({ target: document.getElementById("iframe1").contentWindow });

// You can provide the remote instanceId
postal.fedx.disconnect({ instanceId: "iframe2" });

// You can pass doNotNotify: true to prevent the signalling of the remote
// instance to remove their client proxy to you. This could be helpful if
// you are disconnecting from an iframe that's already gone, for example
postal.fedx.disconnect({ instanceId: "iframe2", doNotNotify: true });

// What about web workers?!
// first, get a worker
var worker = new Worker("worker.js");

// you have two options, call signalReady and pass the worker
postal.fedx.signalReady({ xframe: { target: worker }});

// OR - if you're going to wait for the worker to signalReady,
// you need to at least be listening to the worker's messages:
// (this happens automatically if you use the signalReady approach)
postal.fedx.transports.xframe.listenToWorker( worker );

```

## Building, Running Tests

* `gulp test` to build and run tests
* `gulp coverage` to build, run tests and show an istanbul coverage report
* `gulp` to build
* `gulp watch` to start a file watch which builds as you save changes to the `src/` files
* `npm start` will start a local web server that lets you run browser-based tests or see a _very_simple example of a parent window and two iframes communicating.

## Contributing

If you'd like to contribute to this (or other) postal projects, we'd welcome it! It will work best if you're using an editor that honors the `.editorconfig`, `.jscsrc` and `.eslintrc` files, as that will provide linting and formatting feedback that would otherwise result in additional work on your pull request(s). Test coverage is currently at 81%, and we plan to bring that up to 100% in the near future. With that in mind, please include tests with your PRs.

