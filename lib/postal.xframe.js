/*!
 *  * postal.xframe - postal.js/postal.federation plugin for federating instances of postal.js across iframe/window boundaries.
 *  * Author: Jim Cowart (http://ifandelse.com)
 *  * Version: v0.5.1
 *  * Url: http://github.com/postaljs/postal.xframe
 *  * License(s): (MIT OR GPL-2.0)
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("lodash"), require("postal"));
	else if(typeof define === 'function' && define.amd)
		define(["lodash", "postal"], factory);
	else if(typeof exports === 'object')
		exports["postalXframe"] = factory(require("lodash"), require("postal"));
	else
		root["postalXframe"] = factory(root["_"], root["postal"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE_1__, __WEBPACK_EXTERNAL_MODULE_2__) {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	// istanbul ignore next
	
	var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };
	
	var _ = _interopRequire(__webpack_require__(1));
	
	var postal = _interopRequire(__webpack_require__(2));
	
	var _utils = __webpack_require__(3);
	
	var _memoRemoteByInstanceId = _utils._memoRemoteByInstanceId;
	var _memoRemoteByTarget = _utils._memoRemoteByTarget;
	var _disconnectClient = _utils._disconnectClient;
	var safeSerialize = _utils.safeSerialize;
	
	var _state = __webpack_require__(4);
	
	var state = _state.state;
	var env = _state.env;
	
	var XFrameClient = _interopRequire(__webpack_require__(5));
	
	function listener() {
		plugin.routeMessage.apply(plugin, arguments);
	}
	
	function listenToWorker(worker) {
		if (!_.include(state.workers, worker)) {
			worker.addEventListener("message", listener);
			state.workers.push(worker);
		}
	}
	
	XFrameClient.getInstance = function getInstance(source, origin, instanceId) {
		var client = new XFrameClient(source, {
			origin: origin,
			isWorker: typeof Worker !== "undefined" && source instanceof Worker
		}, instanceId);
		if (client.options.isWorker) {
			listenToWorker(client.target);
		}
		return client;
	};
	
	var NO_OP = function NO_OP() {};
	
	var plugin = postal.fedx.transports.xframe = {
		eagerSerialize: env.useEagerSerialize,
		XFrameClient: XFrameClient,
		configure: function configure(cfg) {
			if (cfg) {
				state.config = _.defaults(_.extend(state.config, cfg), state.defaults);
			}
			return state.config;
		},
		clearConfiguration: function clearConfiguration() {
			state.config = _.extend({}, state.defaults);
		},
		//find all iFrames and the parent window if in an iframe
		getTargets: env.isWorker ? function () {
			return [{
				target: {
					postMessage: postMessage
				}
			}]; // TO-DO: look into this...
		} : function () {
			var targets = _.map(document.getElementsByTagName("iframe"), function (i) {
				var urlHack = document.createElement("a");
				urlHack.href = i.src;
				var origin = urlHack.protocol + "//" + urlHack.host;
				// The following condition fixes the IE issue of setting the origin while the iframe is 'empty':
				// if the iframe has no 'src' set to some meaningful url (at this very moment),
				// then the urlHack returns neither protocol nor host information.
				if (origin === "//") {
					origin = null;
				}
				return {
					target: i.contentWindow,
					origin: origin || state.config.defaultOriginUrl
				};
			});
			if (window.parent && window.parent !== window) {
				targets.push({
					target: window.parent,
					origin: "*"
				});
			}
			return targets.concat(state.workers);
		},
		remotes: [],
		wrapForTransport: env.useEagerSerialize ? function (packingSlip) {
			return JSON.stringify({
				postal: true,
				packingSlip: packingSlip
			});
		} : function (packingSlip) {
			return {
				postal: true,
				packingSlip: packingSlip
			};
		},
		unwrapFromTransport: function unwrapFromTransport(msgData) {
			if (typeof msgData === "string" && (env.useEagerSerialize || msgData.indexOf("\"postal\":true") !== -1)) {
				try {
					return JSON.parse(msgData);
				} catch (ex) {
					return {};
				}
			} else {
				return msgData;
			}
		},
		routeMessage: function routeMessage(event) {
			// source = remote window or worker?
			var source = event.source || event.currentTarget;
			var parsed = this.unwrapFromTransport(event.data);
			if (parsed.postal) {
				var remote = _.find(this.remotes, function (x) {
					return x.target === source;
				});
				if (!remote) {
					remote = XFrameClient.getInstance(source, event.origin, parsed.packingSlip.instanceId);
					this.remotes.push(remote);
				}
				remote.onMessage(parsed.packingSlip);
			}
		},
		sendMessage: function sendMessage(env) {
			var envelope = env;
			if (state.config.safeSerialize) {
				envelope = safeSerialize(_.cloneDeep(env));
			}
			_.forEach(this.remotes, function (remote) {
				remote.sendMessage(envelope);
			});
		},
		disconnect: function disconnect(options) {
			options = options || {};
			var clients = options.instanceId ?
			// an instanceId value or array was provided, let's get the client proxy instances for the id(s)
			_.reduce(_.isArray(options.instanceId) ? options.instanceId : [options.instanceId], _.bind(_memoRemoteByInstanceId, this), []) :
			// Ok so we don't have instanceId(s), let's try target(s)
			options.target ?
			// Ok, so we have a targets array, we need to iterate over it and get a list of the proxy/client instances
			_.reduce(_.isArray(options.target) ? options.target : [options.target], _.bind(_memoRemoteByTarget, this), []) :
			// aww, heck - we don't have instanceId(s) or target(s), so it's ALL THE REMOTES
			this.remotes;
			if (!options.doNotNotify) {
				_.forEach(clients, _.bind(_disconnectClient, this));
			}
			this.remotes = _.without.apply(null, [this.remotes].concat(clients));
		},
		signalReady: function signalReady(targets, callback) {
			targets = _.isArray(targets) ? targets : [targets];
			targets = targets.length ? targets : this.getTargets();
			callback = callback || NO_OP;
			_.forEach(targets, _.bind(function (def) {
				if (def.target) {
					def.origin = def.origin || state.config.defaultOriginUrl;
					var remote = _.find(this.remotes, function (x) {
						return x.target === def.target;
					});
					if (!remote) {
						remote = XFrameClient.getInstance(def.target, def.origin);
						this.remotes.push(remote);
					}
					remote.sendPing(callback);
				}
			}, this));
		},
		addEventListener: env.isWorker ? function () {
			addEventListener("message", listener);
		} : function (eventName, handler, bubble) {
			// in normal browser context
			if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
				window.addEventListener(eventName, handler, bubble);
			} else {
				throw new Error("postal.xframe only works with browsers that support window.addEventListener");
			}
		},
		listenToWorker: listenToWorker,
		stopListeningToWorker: function stopListeningToWorker(worker) {
			if (worker) {
				worker.removeEventListener("message", listener);
				state.workers = _.without(state.workers, worker);
			} else {
				while (state.workers.length) {
					state.workers.pop().removeEventListener("message", listener);
				}
			}
		}
	};
	
	plugin.addEventListener("message", listener, false);

/***/ },
/* 1 */
/***/ function(module, exports) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_1__;

/***/ },
/* 2 */
/***/ function(module, exports) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_2__;

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	// istanbul ignore next
	
	var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };
	
	// istanbul ignore next
	
	var _slicedToArray = function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { var _arr = []; for (var _iterator = arr[Symbol.iterator](), _step; !(_step = _iterator.next()).done;) { _arr.push(_step.value); if (i && _arr.length === i) break; } return _arr; } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } };
	
	exports._memoRemoteByInstanceId = _memoRemoteByInstanceId;
	exports._memoRemoteByTarget = _memoRemoteByTarget;
	exports._disconnectClient = _disconnectClient;
	exports.safeSerialize = safeSerialize;
	Object.defineProperty(exports, "__esModule", {
		value: true
	});
	
	var _ = _interopRequire(__webpack_require__(1));
	
	function _memoRemoteByInstanceId(memo, instanceId) {
		var proxy = _.find(this.remotes, function (x) {
			return x.instanceId === instanceId;
		});
		if (proxy) {
			memo.push(proxy);
		}
		return memo;
	}
	
	function _memoRemoteByTarget(memo, tgt) {
		var proxy = _.find(this.remotes, function (x) {
			return x.target === tgt;
		});
		if (proxy) {
			memo.push(proxy);
		}
		return memo;
	}
	
	function _disconnectClient(client) {
		client.disconnect();
	}
	
	function safeSerialize(envelope) {
		var _iteratorNormalCompletion = true;
		var _didIteratorError = false;
		var _iteratorError = undefined;
	
		try {
			for (var _iterator = entries(envelope)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
				var _step$value = _slicedToArray(_step.value, 2);
	
				var key = _step$value[0];
				var val = _step$value[1];
	
				if (typeof val === "function") {
					delete envelope[key];
				}
				if (_.isPlainObject(val)) {
					safeSerialize(val);
				}
				if (_.isArray(val)) {
					_.forEach(val, safeSerialize);
				}
			}
		} catch (err) {
			_didIteratorError = true;
			_iteratorError = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion && _iterator["return"]) {
					_iterator["return"]();
				}
			} finally {
				if (_didIteratorError) {
					throw _iteratorError;
				}
			}
		}
	
		return envelope;
	}
	
	var entries = regeneratorRuntime.mark(function entries(obj) {
		var _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, k;
	
		return regeneratorRuntime.wrap(function entries$(context$1$0) {
			while (1) switch (context$1$0.prev = context$1$0.next) {
				case 0:
					if (["object", "function"].indexOf(typeof obj) === -1) {
						obj = {};
					}
					_iteratorNormalCompletion = true;
					_didIteratorError = false;
					_iteratorError = undefined;
					context$1$0.prev = 4;
					_iterator = Object.keys(obj)[Symbol.iterator]();
	
				case 6:
					if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
						context$1$0.next = 13;
						break;
					}
	
					k = _step.value;
					context$1$0.next = 10;
					return [k, obj[k]];
	
				case 10:
					_iteratorNormalCompletion = true;
					context$1$0.next = 6;
					break;
	
				case 13:
					context$1$0.next = 19;
					break;
	
				case 15:
					context$1$0.prev = 15;
					context$1$0.t0 = context$1$0["catch"](4);
					_didIteratorError = true;
					_iteratorError = context$1$0.t0;
	
				case 19:
					context$1$0.prev = 19;
					context$1$0.prev = 20;
	
					if (!_iteratorNormalCompletion && _iterator["return"]) {
						_iterator["return"]();
					}
	
				case 22:
					context$1$0.prev = 22;
	
					if (!_didIteratorError) {
						context$1$0.next = 25;
						break;
					}
	
					throw _iteratorError;
	
				case 25:
					return context$1$0.finish(22);
	
				case 26:
					return context$1$0.finish(19);
	
				case 27:
				case "end":
					return context$1$0.stop();
			}
		}, entries, this, [[4, 15, 19, 27], [20,, 22, 26]]);
	});
	exports.entries = entries;

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	// istanbul ignore next
	
	var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };
	
	Object.defineProperty(exports, "__esModule", {
		value: true
	});
	
	var _ = _interopRequire(__webpack_require__(1));
	
	var env = {
		origin: location.origin || location.protocol + "//" + location.host,
		isWorker: typeof window === "undefined" && postMessage && location,
		// I know, I KNOW. The alternative was very expensive perf & time-wise
		// so I saved you a perf hit by checking the stinking UA. Sigh.
		// I sought the opinion of several other devs. We all traveled
		// to the far east to consult with the wisdom of a monk - turns
		// out he didn"t know JavaScript, and our passports were stolen on the
		// return trip. We stowed away aboard a freighter headed back to the
		// US and by the time we got back, no one had heard of IE 8 or 9. True story.
		useEagerSerialize: /MSIE [8,9]/.test(navigator.userAgent)
	};
	
	exports.env = env;
	var defaults = {
		allowedOrigins: [env.origin],
		enabled: true,
		defaultOriginUrl: "*",
		safeSerialize: false
	};
	
	var state = {
		workers: [],
		config: _.extend({}, defaults),
		defaults: defaults
	};
	exports.state = state;

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	// istanbul ignore next
	
	var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };
	
	// istanbul ignore next
	
	var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();
	
	// istanbul ignore next
	
	var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };
	
	// istanbul ignore next
	
	var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };
	
	// istanbul ignore next
	
	var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };
	
	var postal = _interopRequire(__webpack_require__(2));
	
	var _ = _interopRequire(__webpack_require__(1));
	
	var _state = __webpack_require__(4);
	
	var state = _state.state;
	var env = _state.env;
	
	var XFrameClient = (function (_postal$fedx$FederationClient) {
		function XFrameClient() {
			for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
				args[_key] = arguments[_key];
			}
	
			_classCallCheck(this, XFrameClient);
	
			this.transportName = "xframe";
			_get(Object.getPrototypeOf(XFrameClient.prototype), "constructor", this).apply(this, args);
		}
	
		_inherits(XFrameClient, _postal$fedx$FederationClient);
	
		_createClass(XFrameClient, {
			shouldProcess: {
				value: function shouldProcess() {
					var hasDomainFilters = !!state.config.allowedOrigins.length;
					return state.config.enabled && (this.options.origin === "*" || (hasDomainFilters && _.includes(state.config.allowedOrigins, this.options.origin) || !hasDomainFilters) || this.options.isWorker && _.includes(state.workers, this.target) ||
					// we are in a worker
					env.isWorker);
				}
			},
			send: {
				value: function send(packingSlip) {
					if (this.shouldProcess()) {
						var context = env.isWorker ? null : this.target;
						var args = [postal.fedx.transports.xframe.wrapForTransport(packingSlip)];
						if (!this.options.isWorker && !env.isWorker) {
							args.push(this.options.origin);
						}
						if (!env.isWorker) {
							if (args.length === 1) {
								this.target.postMessage(args[0]);
							} else {
								this.target.postMessage(args[0], args[1]);
							}
						} else {
							this.target.postMessage.apply(context, args);
						}
					}
				}
			}
		});
	
		return XFrameClient;
	})(postal.fedx.FederationClient);
	
	module.exports = XFrameClient;
	
	// another frame/window

	// worker

/***/ }
/******/ ])
});
;