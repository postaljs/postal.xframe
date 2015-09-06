/*!
 *  * postal.xframe - postal.js/postal.federation plugin for federating instances of postal.js across iframe/window boundaries.
 *  * Author: Jim Cowart (http://ifandelse.com)
 *  * Version: v0.5.0
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
			_.each(this.remotes, function (remote) {
				remote.sendMessage(envelope);
			});
		},
		disconnect: function disconnect(options) {
			options = options || {};
			var clients = options.instanceId ?
			// an instanceId value or array was provided, let's get the client proxy instances for the id(s)
			_.reduce(_.isArray(options.instanceId) ? options.instanceId : [options.instanceId], _memoRemoteByInstanceId, [], this) :
			// Ok so we don't have instanceId(s), let's try target(s)
			options.target ?
			// Ok, so we have a targets array, we need to iterate over it and get a list of the proxy/client instances
			_.reduce(_.isArray(options.target) ? options.target : [options.target], _memoRemoteByTarget, [], this) :
			// aww, heck - we don't have instanceId(s) or target(s), so it's ALL THE REMOTES
			this.remotes;
			if (!options.doNotNotify) {
				_.each(clients, _disconnectClient, this);
			}
			this.remotes = _.without.apply(null, [this.remotes].concat(clients));
		},
		signalReady: function signalReady(targets, callback) {
			targets = _.isArray(targets) ? targets : [targets];
			targets = targets.length ? targets : this.getTargets();
			callback = callback || NO_OP;
			_.each(targets, function (def) {
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
			}, this);
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
					_.each(val, safeSerialize);
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
					return state.config.enabled && (this.options.origin === "*" || (hasDomainFilters && _.contains(state.config.allowedOrigins, this.options.origin) || !hasDomainFilters) || this.options.isWorker && _.contains(state.workers, this.target) ||
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay91bml2ZXJzYWxNb2R1bGVEZWZpbml0aW9uIiwid2VicGFjazovLy93ZWJwYWNrL2Jvb3RzdHJhcCA2NTFhNGJlZTE0ODdkY2FjNjA1YSIsIndlYnBhY2s6Ly8vLi9zcmMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vL2V4dGVybmFsIHtcInJvb3RcIjpcIl9cIixcImNvbW1vbmpzXCI6XCJsb2Rhc2hcIixcImNvbW1vbmpzMlwiOlwibG9kYXNoXCIsXCJhbWRcIjpcImxvZGFzaFwifSIsIndlYnBhY2s6Ly8vZXh0ZXJuYWwgXCJwb3N0YWxcIiIsIndlYnBhY2s6Ly8vLi9zcmMvdXRpbHMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3N0YXRlLmpzIiwid2VicGFjazovLy8uL3NyYy9YRnJhbWVDbGllbnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLENBQUM7QUFDRCxPO0FDVkE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsdUJBQWU7QUFDZjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7Ozs7Ozs7Ozs7S0N0Q08sQ0FBQyx1Q0FBTSxDQUFROztLQUNmLE1BQU0sdUNBQU0sQ0FBUTs7a0NBTXBCLENBQVM7O0tBSmYsdUJBQXVCLFVBQXZCLHVCQUF1QjtLQUN2QixtQkFBbUIsVUFBbkIsbUJBQW1CO0tBQ25CLGlCQUFpQixVQUFqQixpQkFBaUI7S0FDakIsYUFBYSxVQUFiLGFBQWE7O2tDQUVhLENBQVM7O0tBQTNCLEtBQUssVUFBTCxLQUFLO0tBQUUsR0FBRyxVQUFILEdBQUc7O0tBQ1osWUFBWSx1Q0FBTSxDQUFnQjs7QUFFekMsVUFBUyxRQUFRLEdBQUc7QUFD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QUMsV0FBVyxDQUFDLEtBQUssQ0FBRSxPQUFPLEVBQUUsSUFBSSxDQUFFLENBQUM7T0FDL0M7TUFDRDtLQUNEOzs7O1NBbkNtQixZQUFZO0lBQVMsTUFBTSxDQUFDLElBQUksQ0FBQyxnQkFBZ0I7O2tCQUFqRCxZQUFZIiwiZmlsZSI6InBvc3RhbC54ZnJhbWUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gd2VicGFja1VuaXZlcnNhbE1vZHVsZURlZmluaXRpb24ocm9vdCwgZmFjdG9yeSkge1xuXHRpZih0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcpXG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoXCJsb2Rhc2hcIiksIHJlcXVpcmUoXCJwb3N0YWxcIikpO1xuXHRlbHNlIGlmKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZClcblx0XHRkZWZpbmUoW1wibG9kYXNoXCIsIFwicG9zdGFsXCJdLCBmYWN0b3J5KTtcblx0ZWxzZSBpZih0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpXG5cdFx0ZXhwb3J0c1tcInBvc3RhbFhmcmFtZVwiXSA9IGZhY3RvcnkocmVxdWlyZShcImxvZGFzaFwiKSwgcmVxdWlyZShcInBvc3RhbFwiKSk7XG5cdGVsc2Vcblx0XHRyb290W1wicG9zdGFsWGZyYW1lXCJdID0gZmFjdG9yeShyb290W1wiX1wiXSwgcm9vdFtcInBvc3RhbFwiXSk7XG59KSh0aGlzLCBmdW5jdGlvbihfX1dFQlBBQ0tfRVhURVJOQUxfTU9EVUxFXzFfXywgX19XRUJQQUNLX0VYVEVSTkFMX01PRFVMRV8yX18pIHtcbnJldHVybiBcblxuXG4vKiogV0VCUEFDSyBGT09URVIgKipcbiAqKiB3ZWJwYWNrL3VuaXZlcnNhbE1vZHVsZURlZmluaXRpb25cbiAqKi8iLCIgXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSlcbiBcdFx0XHRyZXR1cm4gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0uZXhwb3J0cztcblxuIFx0XHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuIFx0XHR2YXIgbW9kdWxlID0gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0gPSB7XG4gXHRcdFx0ZXhwb3J0czoge30sXG4gXHRcdFx0aWQ6IG1vZHVsZUlkLFxuIFx0XHRcdGxvYWRlZDogZmFsc2VcbiBcdFx0fTtcblxuIFx0XHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cbiBcdFx0bW9kdWxlc1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cbiBcdFx0Ly8gRmxhZyB0aGUgbW9kdWxlIGFzIGxvYWRlZFxuIFx0XHRtb2R1bGUubG9hZGVkID0gdHJ1ZTtcblxuIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4gXHR9XG5cblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlIGNhY2hlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuXG4gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCJcIjtcblxuIFx0Ly8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXygwKTtcblxuXG5cbi8qKiBXRUJQQUNLIEZPT1RFUiAqKlxuICoqIHdlYnBhY2svYm9vdHN0cmFwIDY1MWE0YmVlMTQ4N2RjYWM2MDVhXG4gKiovIiwiaW1wb3J0IF8gZnJvbSBcImxvZGFzaFwiO1xuaW1wb3J0IHBvc3RhbCBmcm9tIFwicG9zdGFsXCI7XG5pbXBvcnQge1xuXHRfbWVtb1JlbW90ZUJ5SW5zdGFuY2VJZCxcblx0X21lbW9SZW1vdGVCeVRhcmdldCxcblx0X2Rpc2Nvbm5lY3RDbGllbnQsXG5cdHNhZmVTZXJpYWxpemVcbn0gZnJvbSBcIi4vdXRpbHNcIjtcbmltcG9ydCB7IHN0YXRlLCBlbnYgfSBmcm9tIFwiLi9zdGF0ZVwiO1xuaW1wb3J0IFhGcmFtZUNsaWVudCBmcm9tIFwiLi9YRnJhbWVDbGllbnRcIjtcblxuZnVuY3Rpb24gbGlzdGVuZXIoKSB7XG5cdHBsdWdpbi5yb3V0ZU1lc3NhZ2UuYXBwbHkoIHBsdWdpbiwgYXJndW1lbnRzICk7XG59XG5cbmZ1bmN0aW9uIGxpc3RlblRvV29ya2VyKCB3b3JrZXIgKSB7XG5cdGlmICggIV8uaW5jbHVkZSggc3RhdGUud29ya2Vycywgd29ya2VyICkgKSB7XG5cdFx0d29ya2VyLmFkZEV2ZW50TGlzdGVuZXIoIFwibWVzc2FnZVwiLCBsaXN0ZW5lciApO1xuXHRcdHN0YXRlLndvcmtlcnMucHVzaCggd29ya2VyICk7XG5cdH1cbn1cblxuWEZyYW1lQ2xpZW50LmdldEluc3RhbmNlID0gZnVuY3Rpb24gZ2V0SW5zdGFuY2UoIHNvdXJjZSwgb3JpZ2luLCBpbnN0YW5jZUlkICkge1xuXHRjb25zdCBjbGllbnQgPSBuZXcgWEZyYW1lQ2xpZW50KCBzb3VyY2UsIHtcblx0XHRvcmlnaW46IG9yaWdpbixcblx0XHRpc1dvcmtlcjogKCB0eXBlb2YgV29ya2VyICE9PSBcInVuZGVmaW5lZFwiICYmIHNvdXJjZSBpbnN0YW5jZW9mIFdvcmtlciApXG5cdH0sIGluc3RhbmNlSWQgKTtcblx0aWYgKCBjbGllbnQub3B0aW9ucy5pc1dvcmtlciApIHtcblx0XHRsaXN0ZW5Ub1dvcmtlciggY2xpZW50LnRhcmdldCApO1xuXHR9XG5cdHJldHVybiBjbGllbnQ7XG59O1xuXG5jb25zdCBOT19PUCA9IGZ1bmN0aW9uKCkge307XG5cbmNvbnN0IHBsdWdpbiA9IHBvc3RhbC5mZWR4LnRyYW5zcG9ydHMueGZyYW1lID0ge1xuXHRlYWdlclNlcmlhbGl6ZTogZW52LnVzZUVhZ2VyU2VyaWFsaXplLFxuXHRYRnJhbWVDbGllbnQ6IFhGcmFtZUNsaWVudCxcblx0Y29uZmlndXJlOiBmdW5jdGlvbiggY2ZnICkge1xuXHRcdGlmICggY2ZnICkge1xuXHRcdFx0c3RhdGUuY29uZmlnID0gXy5kZWZhdWx0cyggXy5leHRlbmQoIHN0YXRlLmNvbmZpZywgY2ZnICksIHN0YXRlLmRlZmF1bHRzICk7XG5cdFx0fVxuXHRcdHJldHVybiBzdGF0ZS5jb25maWc7XG5cdH0sXG5cdGNsZWFyQ29uZmlndXJhdGlvbjogZnVuY3Rpb24oKSB7XG5cdFx0c3RhdGUuY29uZmlnID0gXy5leHRlbmQoIHt9LCBzdGF0ZS5kZWZhdWx0cyApO1xuXHR9LFxuXHQvL2ZpbmQgYWxsIGlGcmFtZXMgYW5kIHRoZSBwYXJlbnQgd2luZG93IGlmIGluIGFuIGlmcmFtZVxuXHRnZXRUYXJnZXRzOiBlbnYuaXNXb3JrZXIgPyBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gWyB7XG5cdFx0XHR0YXJnZXQ6IHtcblx0XHRcdFx0cG9zdE1lc3NhZ2U6IHBvc3RNZXNzYWdlXG5cdFx0XHR9XG5cdFx0fSBdOyAvLyBUTy1ETzogbG9vayBpbnRvIHRoaXMuLi5cblx0fSA6IGZ1bmN0aW9uKCkge1xuXHRcdGNvbnN0IHRhcmdldHMgPSBfLm1hcCggZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoIFwiaWZyYW1lXCIgKSwgZnVuY3Rpb24oIGkgKSB7XG5cdFx0XHR2YXIgdXJsSGFjayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwiYVwiICk7XG5cdFx0XHR1cmxIYWNrLmhyZWYgPSBpLnNyYztcblx0XHRcdGxldCBvcmlnaW4gPSB1cmxIYWNrLnByb3RvY29sICsgXCIvL1wiICsgdXJsSGFjay5ob3N0O1xuXHRcdFx0Ly8gVGhlIGZvbGxvd2luZyBjb25kaXRpb24gZml4ZXMgdGhlIElFIGlzc3VlIG9mIHNldHRpbmcgdGhlIG9yaWdpbiB3aGlsZSB0aGUgaWZyYW1lIGlzICdlbXB0eSc6XG5cdFx0XHQvLyBpZiB0aGUgaWZyYW1lIGhhcyBubyAnc3JjJyBzZXQgdG8gc29tZSBtZWFuaW5nZnVsIHVybCAoYXQgdGhpcyB2ZXJ5IG1vbWVudCksXG5cdFx0XHQvLyB0aGVuIHRoZSB1cmxIYWNrIHJldHVybnMgbmVpdGhlciBwcm90b2NvbCBub3IgaG9zdCBpbmZvcm1hdGlvbi5cblx0XHRcdGlmICggb3JpZ2luID09PSBcIi8vXCIgKSB7XG5cdFx0XHRcdG9yaWdpbiA9IG51bGw7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHR0YXJnZXQ6IGkuY29udGVudFdpbmRvdyxcblx0XHRcdFx0b3JpZ2luOiBvcmlnaW4gfHwgc3RhdGUuY29uZmlnLmRlZmF1bHRPcmlnaW5Vcmxcblx0XHRcdH07XG5cdFx0fSApO1xuXHRcdGlmICggd2luZG93LnBhcmVudCAmJiB3aW5kb3cucGFyZW50ICE9PSB3aW5kb3cgKSB7XG5cdFx0XHR0YXJnZXRzLnB1c2goIHtcblx0XHRcdFx0dGFyZ2V0OiB3aW5kb3cucGFyZW50LFxuXHRcdFx0XHRvcmlnaW46IFwiKlwiXG5cdFx0XHR9ICk7XG5cdFx0fVxuXHRcdHJldHVybiB0YXJnZXRzLmNvbmNhdCggc3RhdGUud29ya2VycyApO1xuXHR9LFxuXHRyZW1vdGVzOiBbXSxcblx0d3JhcEZvclRyYW5zcG9ydDogZW52LnVzZUVhZ2VyU2VyaWFsaXplID8gZnVuY3Rpb24oIHBhY2tpbmdTbGlwICkge1xuXHRcdHJldHVybiBKU09OLnN0cmluZ2lmeSgge1xuXHRcdFx0cG9zdGFsOiB0cnVlLFxuXHRcdFx0cGFja2luZ1NsaXA6IHBhY2tpbmdTbGlwXG5cdFx0fSApO1xuXHR9IDogZnVuY3Rpb24oIHBhY2tpbmdTbGlwICkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRwb3N0YWw6IHRydWUsXG5cdFx0XHRwYWNraW5nU2xpcDogcGFja2luZ1NsaXBcblx0XHR9O1xuXHR9LFxuXHR1bndyYXBGcm9tVHJhbnNwb3J0OiBmdW5jdGlvbiggbXNnRGF0YSApIHtcblx0XHRpZiAoIHR5cGVvZiBtc2dEYXRhID09PSBcInN0cmluZ1wiICYmICggZW52LnVzZUVhZ2VyU2VyaWFsaXplIHx8IG1zZ0RhdGEuaW5kZXhPZiggJ1wicG9zdGFsXCI6dHJ1ZScgKSAhPT0gLTEgKSApIHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdHJldHVybiBKU09OLnBhcnNlKCBtc2dEYXRhICk7XG5cdFx0XHR9IGNhdGNoICggZXggKSB7XG5cdFx0XHRcdHJldHVybiB7fTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIG1zZ0RhdGE7XG5cdFx0fVxuXHR9LFxuXHRyb3V0ZU1lc3NhZ2U6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHQvLyBzb3VyY2UgPSByZW1vdGUgd2luZG93IG9yIHdvcmtlcj9cblx0XHRjb25zdCBzb3VyY2UgPSBldmVudC5zb3VyY2UgfHwgZXZlbnQuY3VycmVudFRhcmdldDtcblx0XHRjb25zdCBwYXJzZWQgPSB0aGlzLnVud3JhcEZyb21UcmFuc3BvcnQoIGV2ZW50LmRhdGEgKTtcblx0XHRpZiAoIHBhcnNlZC5wb3N0YWwgKSB7XG5cdFx0XHR2YXIgcmVtb3RlID0gXy5maW5kKCB0aGlzLnJlbW90ZXMsIGZ1bmN0aW9uKCB4ICkge1xuXHRcdFx0XHRyZXR1cm4geC50YXJnZXQgPT09IHNvdXJjZTtcblx0XHRcdH0gKTtcblx0XHRcdGlmICggIXJlbW90ZSApIHtcblx0XHRcdFx0cmVtb3RlID0gWEZyYW1lQ2xpZW50LmdldEluc3RhbmNlKCBzb3VyY2UsIGV2ZW50Lm9yaWdpbiwgcGFyc2VkLnBhY2tpbmdTbGlwLmluc3RhbmNlSWQgKTtcblx0XHRcdFx0dGhpcy5yZW1vdGVzLnB1c2goIHJlbW90ZSApO1xuXHRcdFx0fVxuXHRcdFx0cmVtb3RlLm9uTWVzc2FnZSggcGFyc2VkLnBhY2tpbmdTbGlwICk7XG5cdFx0fVxuXHR9LFxuXHRzZW5kTWVzc2FnZTogZnVuY3Rpb24oIGVudiApIHtcblx0XHRsZXQgZW52ZWxvcGUgPSBlbnY7XG5cdFx0aWYgKCBzdGF0ZS5jb25maWcuc2FmZVNlcmlhbGl6ZSApIHtcblx0XHRcdGVudmVsb3BlID0gc2FmZVNlcmlhbGl6ZSggXy5jbG9uZURlZXAoIGVudiApICk7XG5cdFx0fVxuXHRcdF8uZWFjaCggdGhpcy5yZW1vdGVzLCBmdW5jdGlvbiggcmVtb3RlICkge1xuXHRcdFx0cmVtb3RlLnNlbmRNZXNzYWdlKCBlbnZlbG9wZSApO1xuXHRcdH0gKTtcblx0fSxcblx0ZGlzY29ubmVjdDogZnVuY3Rpb24oIG9wdGlvbnMgKSB7XG5cdFx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cdFx0Y29uc3QgY2xpZW50cyA9IG9wdGlvbnMuaW5zdGFuY2VJZCA/XG5cdFx0XHQvLyBhbiBpbnN0YW5jZUlkIHZhbHVlIG9yIGFycmF5IHdhcyBwcm92aWRlZCwgbGV0J3MgZ2V0IHRoZSBjbGllbnQgcHJveHkgaW5zdGFuY2VzIGZvciB0aGUgaWQocylcblx0XHRcdF8ucmVkdWNlKCBfLmlzQXJyYXkoIG9wdGlvbnMuaW5zdGFuY2VJZCApID8gb3B0aW9ucy5pbnN0YW5jZUlkIDogWyBvcHRpb25zLmluc3RhbmNlSWQgXSwgX21lbW9SZW1vdGVCeUluc3RhbmNlSWQsIFtdLCB0aGlzICkgOlxuXHRcdFx0Ly8gT2sgc28gd2UgZG9uJ3QgaGF2ZSBpbnN0YW5jZUlkKHMpLCBsZXQncyB0cnkgdGFyZ2V0KHMpXG5cdFx0XHRvcHRpb25zLnRhcmdldCA/XG5cdFx0XHRcdC8vIE9rLCBzbyB3ZSBoYXZlIGEgdGFyZ2V0cyBhcnJheSwgd2UgbmVlZCB0byBpdGVyYXRlIG92ZXIgaXQgYW5kIGdldCBhIGxpc3Qgb2YgdGhlIHByb3h5L2NsaWVudCBpbnN0YW5jZXNcblx0XHRcdFx0Xy5yZWR1Y2UoIF8uaXNBcnJheSggb3B0aW9ucy50YXJnZXQgKSA/IG9wdGlvbnMudGFyZ2V0IDogWyBvcHRpb25zLnRhcmdldCBdLCBfbWVtb1JlbW90ZUJ5VGFyZ2V0LCBbXSwgdGhpcyApIDpcblx0XHRcdFx0Ly8gYXd3LCBoZWNrIC0gd2UgZG9uJ3QgaGF2ZSBpbnN0YW5jZUlkKHMpIG9yIHRhcmdldChzKSwgc28gaXQncyBBTEwgVEhFIFJFTU9URVNcblx0XHRcdFx0dGhpcy5yZW1vdGVzO1xuXHRcdGlmICggIW9wdGlvbnMuZG9Ob3ROb3RpZnkgKSB7XG5cdFx0XHRfLmVhY2goIGNsaWVudHMsIF9kaXNjb25uZWN0Q2xpZW50LCB0aGlzICk7XG5cdFx0fVxuXHRcdHRoaXMucmVtb3RlcyA9IF8ud2l0aG91dC5hcHBseSggbnVsbCwgWyB0aGlzLnJlbW90ZXMgXS5jb25jYXQoIGNsaWVudHMgKSApO1xuXHR9LFxuXHRzaWduYWxSZWFkeTogZnVuY3Rpb24oIHRhcmdldHMsIGNhbGxiYWNrICkge1xuXHRcdHRhcmdldHMgPSBfLmlzQXJyYXkoIHRhcmdldHMgKSA/IHRhcmdldHMgOiBbIHRhcmdldHMgXTtcblx0XHR0YXJnZXRzID0gdGFyZ2V0cy5sZW5ndGggPyB0YXJnZXRzIDogdGhpcy5nZXRUYXJnZXRzKCk7XG5cdFx0Y2FsbGJhY2sgPSBjYWxsYmFjayB8fCBOT19PUDtcblx0XHRfLmVhY2goIHRhcmdldHMsIGZ1bmN0aW9uKCBkZWYgKSB7XG5cdFx0XHRpZiAoIGRlZi50YXJnZXQgKSB7XG5cdFx0XHRcdGRlZi5vcmlnaW4gPSBkZWYub3JpZ2luIHx8IHN0YXRlLmNvbmZpZy5kZWZhdWx0T3JpZ2luVXJsO1xuXHRcdFx0XHRsZXQgcmVtb3RlID0gXy5maW5kKCB0aGlzLnJlbW90ZXMsIGZ1bmN0aW9uKCB4ICkge1xuXHRcdFx0XHRcdHJldHVybiB4LnRhcmdldCA9PT0gZGVmLnRhcmdldDtcblx0XHRcdFx0fSApO1xuXHRcdFx0XHRpZiAoICFyZW1vdGUgKSB7XG5cdFx0XHRcdFx0cmVtb3RlID0gWEZyYW1lQ2xpZW50LmdldEluc3RhbmNlKCBkZWYudGFyZ2V0LCBkZWYub3JpZ2luICk7XG5cdFx0XHRcdFx0dGhpcy5yZW1vdGVzLnB1c2goIHJlbW90ZSApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJlbW90ZS5zZW5kUGluZyggY2FsbGJhY2sgKTtcblx0XHRcdH1cblx0XHR9LCB0aGlzICk7XG5cdH0sXG5cdGFkZEV2ZW50TGlzdGVuZXI6IGVudi5pc1dvcmtlciA/IGZ1bmN0aW9uKCkge1xuXHRcdGFkZEV2ZW50TGlzdGVuZXIoIFwibWVzc2FnZVwiLCBsaXN0ZW5lciApO1xuXHR9IDogZnVuY3Rpb24oIGV2ZW50TmFtZSwgaGFuZGxlciwgYnViYmxlICkge1xuXHRcdC8vIGluIG5vcm1hbCBicm93c2VyIGNvbnRleHRcblx0XHRpZiAoIHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgJiYgdHlwZW9mIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyID09PSBcImZ1bmN0aW9uXCIgKSB7XG5cdFx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciggZXZlbnROYW1lLCBoYW5kbGVyLCBidWJibGUgKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCBcInBvc3RhbC54ZnJhbWUgb25seSB3b3JrcyB3aXRoIGJyb3dzZXJzIHRoYXQgc3VwcG9ydCB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclwiICk7XG5cdFx0fVxuXHR9LFxuXHRsaXN0ZW5Ub1dvcmtlcjogbGlzdGVuVG9Xb3JrZXIsXG5cdHN0b3BMaXN0ZW5pbmdUb1dvcmtlcjogZnVuY3Rpb24oIHdvcmtlciApIHtcblx0XHRpZiAoIHdvcmtlciApIHtcblx0XHRcdHdvcmtlci5yZW1vdmVFdmVudExpc3RlbmVyKCBcIm1lc3NhZ2VcIiwgbGlzdGVuZXIgKTtcblx0XHRcdHN0YXRlLndvcmtlcnMgPSBfLndpdGhvdXQoIHN0YXRlLndvcmtlcnMsIHdvcmtlciApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR3aGlsZSAoIHN0YXRlLndvcmtlcnMubGVuZ3RoICkge1xuXHRcdFx0XHRzdGF0ZS53b3JrZXJzLnBvcCgpLnJlbW92ZUV2ZW50TGlzdGVuZXIoIFwibWVzc2FnZVwiLCBsaXN0ZW5lciApO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufTtcblxucGx1Z2luLmFkZEV2ZW50TGlzdGVuZXIoIFwibWVzc2FnZVwiLCBsaXN0ZW5lciwgZmFsc2UgKTtcblxuXG5cbi8qKiBXRUJQQUNLIEZPT1RFUiAqKlxuICoqIC4vc3JjL2luZGV4LmpzXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBfX1dFQlBBQ0tfRVhURVJOQUxfTU9EVUxFXzFfXztcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIGV4dGVybmFsIHtcInJvb3RcIjpcIl9cIixcImNvbW1vbmpzXCI6XCJsb2Rhc2hcIixcImNvbW1vbmpzMlwiOlwibG9kYXNoXCIsXCJhbWRcIjpcImxvZGFzaFwifVxuICoqIG1vZHVsZSBpZCA9IDFcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gX19XRUJQQUNLX0VYVEVSTkFMX01PRFVMRV8yX187XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiBleHRlcm5hbCBcInBvc3RhbFwiXG4gKiogbW9kdWxlIGlkID0gMlxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwiaW1wb3J0IF8gZnJvbSBcImxvZGFzaFwiO1xuXG5leHBvcnQgZnVuY3Rpb24gX21lbW9SZW1vdGVCeUluc3RhbmNlSWQoIG1lbW8sIGluc3RhbmNlSWQgKSB7XG5cdHZhciBwcm94eSA9IF8uZmluZCggdGhpcy5yZW1vdGVzLCBmdW5jdGlvbiggeCApIHtcblx0XHRyZXR1cm4geC5pbnN0YW5jZUlkID09PSBpbnN0YW5jZUlkO1xuXHR9ICk7XG5cdGlmICggcHJveHkgKSB7XG5cdFx0bWVtby5wdXNoKCBwcm94eSApO1xuXHR9XG5cdHJldHVybiBtZW1vO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gX21lbW9SZW1vdGVCeVRhcmdldCggbWVtbywgdGd0ICkge1xuXHR2YXIgcHJveHkgPSBfLmZpbmQoIHRoaXMucmVtb3RlcywgZnVuY3Rpb24oIHggKSB7XG5cdFx0cmV0dXJuIHgudGFyZ2V0ID09PSB0Z3Q7XG5cdH0gKTtcblx0aWYgKCBwcm94eSApIHtcblx0XHRtZW1vLnB1c2goIHByb3h5ICk7XG5cdH1cblx0cmV0dXJuIG1lbW87XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfZGlzY29ubmVjdENsaWVudCggY2xpZW50ICkge1xuXHRjbGllbnQuZGlzY29ubmVjdCgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2FmZVNlcmlhbGl6ZSggZW52ZWxvcGUgKSB7XG5cdGZvciAoIGxldCBbIGtleSwgdmFsIF0gb2YgZW50cmllcyggZW52ZWxvcGUgKSApIHtcblx0XHRpZiAoIHR5cGVvZiB2YWwgPT09IFwiZnVuY3Rpb25cIiApIHtcblx0XHRcdGRlbGV0ZSBlbnZlbG9wZVsga2V5IF07XG5cdFx0fVxuXHRcdGlmICggXy5pc1BsYWluT2JqZWN0KCB2YWwgKSApIHtcblx0XHRcdHNhZmVTZXJpYWxpemUoIHZhbCApO1xuXHRcdH1cblx0XHRpZiAoIF8uaXNBcnJheSggdmFsICkgKSB7XG5cdFx0XHRfLmVhY2goIHZhbCwgc2FmZVNlcmlhbGl6ZSApO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gZW52ZWxvcGU7XG59XG5cbmV4cG9ydCB2YXIgZW50cmllcyA9IGZ1bmN0aW9uKiAoIG9iaiApIHtcblx0aWYgKCBbIFwib2JqZWN0XCIsIFwiZnVuY3Rpb25cIiBdLmluZGV4T2YoIHR5cGVvZiBvYmogKSA9PT0gLTEgKSB7XG5cdFx0b2JqID0ge307XG5cdH1cblx0Zm9yICggdmFyIGsgb2YgT2JqZWN0LmtleXMoIG9iaiApICkge1xuXHRcdHlpZWxkIFsgaywgb2JqWyBrIF0gXTtcblx0fVxufTtcblxuXG5cbi8qKiBXRUJQQUNLIEZPT1RFUiAqKlxuICoqIC4vc3JjL3V0aWxzLmpzXG4gKiovIiwiaW1wb3J0IF8gZnJvbSBcImxvZGFzaFwiO1xuXG5leHBvcnQgbGV0IGVudiA9IHtcblx0b3JpZ2luOiBsb2NhdGlvbi5vcmlnaW4gfHwgbG9jYXRpb24ucHJvdG9jb2wgKyBcIi8vXCIgKyBsb2NhdGlvbi5ob3N0LFxuXHRpc1dvcmtlcjogKCB0eXBlb2Ygd2luZG93ID09PSBcInVuZGVmaW5lZFwiICkgJiYgcG9zdE1lc3NhZ2UgJiYgbG9jYXRpb24sXG5cdC8vIEkga25vdywgSSBLTk9XLiBUaGUgYWx0ZXJuYXRpdmUgd2FzIHZlcnkgZXhwZW5zaXZlIHBlcmYgJiB0aW1lLXdpc2Vcblx0Ly8gc28gSSBzYXZlZCB5b3UgYSBwZXJmIGhpdCBieSBjaGVja2luZyB0aGUgc3RpbmtpbmcgVUEuIFNpZ2guXG5cdC8vIEkgc291Z2h0IHRoZSBvcGluaW9uIG9mIHNldmVyYWwgb3RoZXIgZGV2cy4gV2UgYWxsIHRyYXZlbGVkXG5cdC8vIHRvIHRoZSBmYXIgZWFzdCB0byBjb25zdWx0IHdpdGggdGhlIHdpc2RvbSBvZiBhIG1vbmsgLSB0dXJuc1xuXHQvLyBvdXQgaGUgZGlkblwidCBrbm93IEphdmFTY3JpcHQsIGFuZCBvdXIgcGFzc3BvcnRzIHdlcmUgc3RvbGVuIG9uIHRoZVxuXHQvLyByZXR1cm4gdHJpcC4gV2Ugc3Rvd2VkIGF3YXkgYWJvYXJkIGEgZnJlaWdodGVyIGhlYWRlZCBiYWNrIHRvIHRoZVxuXHQvLyBVUyBhbmQgYnkgdGhlIHRpbWUgd2UgZ290IGJhY2ssIG5vIG9uZSBoYWQgaGVhcmQgb2YgSUUgOCBvciA5LiBUcnVlIHN0b3J5LlxuXHR1c2VFYWdlclNlcmlhbGl6ZTogL01TSUUgWzgsOV0vLnRlc3QoIG5hdmlnYXRvci51c2VyQWdlbnQgKVxufTtcblxuY29uc3QgZGVmYXVsdHMgPSB7XG5cdGFsbG93ZWRPcmlnaW5zOiBbIGVudi5vcmlnaW4gXSxcblx0ZW5hYmxlZDogdHJ1ZSxcblx0ZGVmYXVsdE9yaWdpblVybDogXCIqXCIsXG5cdHNhZmVTZXJpYWxpemU6IGZhbHNlXG59O1xuXG5leHBvcnQgbGV0IHN0YXRlID0ge1xuXHR3b3JrZXJzOiBbXSxcblx0Y29uZmlnOiBfLmV4dGVuZCgge30sIGRlZmF1bHRzICksXG5cdGRlZmF1bHRzXG59O1xuXG5cblxuLyoqIFdFQlBBQ0sgRk9PVEVSICoqXG4gKiogLi9zcmMvc3RhdGUuanNcbiAqKi8iLCJpbXBvcnQgcG9zdGFsIGZyb20gXCJwb3N0YWxcIjtcbmltcG9ydCBfIGZyb20gXCJsb2Rhc2hcIjtcbmltcG9ydCB7IHN0YXRlLCBlbnYgfSBmcm9tIFwiLi9zdGF0ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBYRnJhbWVDbGllbnQgZXh0ZW5kcyBwb3N0YWwuZmVkeC5GZWRlcmF0aW9uQ2xpZW50IHtcblxuXHRjb25zdHJ1Y3RvciggLi4uYXJncyApIHtcblx0XHR0aGlzLnRyYW5zcG9ydE5hbWUgPSBcInhmcmFtZVwiO1xuXHRcdHN1cGVyKCAuLi5hcmdzICk7XG5cdH1cblxuXHRzaG91bGRQcm9jZXNzKCkge1xuXHRcdGNvbnN0IGhhc0RvbWFpbkZpbHRlcnMgPSAhIXN0YXRlLmNvbmZpZy5hbGxvd2VkT3JpZ2lucy5sZW5ndGg7XG5cdFx0cmV0dXJuIHN0YXRlLmNvbmZpZy5lbmFibGVkICYmXG5cdFx0XHQvLyBhbm90aGVyIGZyYW1lL3dpbmRvd1xuXHRcdFx0KCAoIHRoaXMub3B0aW9ucy5vcmlnaW4gPT09IFwiKlwiIHx8ICggaGFzRG9tYWluRmlsdGVycyAmJiBfLmNvbnRhaW5zKCBzdGF0ZS5jb25maWcuYWxsb3dlZE9yaWdpbnMsIHRoaXMub3B0aW9ucy5vcmlnaW4gKSB8fCAhaGFzRG9tYWluRmlsdGVycyApICkgfHxcblx0XHRcdC8vIHdvcmtlclxuXHRcdFx0KCB0aGlzLm9wdGlvbnMuaXNXb3JrZXIgJiYgXy5jb250YWlucyggc3RhdGUud29ya2VycywgdGhpcy50YXJnZXQgKSApIHx8XG5cdFx0XHQvLyB3ZSBhcmUgaW4gYSB3b3JrZXJcblx0XHRcdGVudi5pc1dvcmtlciApO1xuXHR9XG5cblx0c2VuZCggcGFja2luZ1NsaXAgKSB7XG5cdFx0aWYgKCB0aGlzLnNob3VsZFByb2Nlc3MoKSApIHtcblx0XHRcdGNvbnN0IGNvbnRleHQgPSBlbnYuaXNXb3JrZXIgPyBudWxsIDogdGhpcy50YXJnZXQ7XG5cdFx0XHRjb25zdCBhcmdzID0gWyBwb3N0YWwuZmVkeC50cmFuc3BvcnRzLnhmcmFtZS53cmFwRm9yVHJhbnNwb3J0KCBwYWNraW5nU2xpcCApIF07XG5cdFx0XHRpZiAoICF0aGlzLm9wdGlvbnMuaXNXb3JrZXIgJiYgIWVudi5pc1dvcmtlciApIHtcblx0XHRcdFx0YXJncy5wdXNoKCB0aGlzLm9wdGlvbnMub3JpZ2luICk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoICFlbnYuaXNXb3JrZXIgKSB7XG5cdFx0XHRcdGlmICggYXJncy5sZW5ndGggPT09IDEgKSB7XG5cdFx0XHRcdFx0dGhpcy50YXJnZXQucG9zdE1lc3NhZ2UoIGFyZ3NbMF0gKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0aGlzLnRhcmdldC5wb3N0TWVzc2FnZSggYXJnc1swXSwgYXJnc1sxXSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLnRhcmdldC5wb3N0TWVzc2FnZS5hcHBseSggY29udGV4dCwgYXJncyApO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufVxuXG5cblxuLyoqIFdFQlBBQ0sgRk9PVEVSICoqXG4gKiogLi9zcmMvWEZyYW1lQ2xpZW50LmpzXG4gKiovIl0sInNvdXJjZVJvb3QiOiIifQ==