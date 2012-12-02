var XFRAME = "xframe";
var _defaults = {
  autoReciprocate : true,
  allowedOrigins  : [ window.location.origin ],
  enabled         : true,
  originUrl       : window.location.origin
};
var _config = _defaults;

var plugin = postal.fedx.transports.xframe = {

  config: function(cfg){
    if(cfg) {
      _config = _.defaults(cfg, _defaults);
    }
    return _config;
  },

  clientOptionsFromEvent : function(event) {
    var self = this;
    var payload = event.data;
    var clientOptions = {
      id       : payload.instanceId,
      type     : XFRAME,
      send     : function(env) {
        event.source.postMessage(_.defaults({ envelope: env }, self.getXframeWrapper('message')), _config.originUrl || "*");
      }
    };
    if(_config.autoReciprocate){
      clientOptions.postSetup = function() {
        event.source.postMessage(self.getXframeWrapper("ready"), _config.originUrl || "*");
      }
    }
    return clientOptions;
  },

  getTargets: function() {
    var targets = _.map(document.getElementsByTagName('iframe'), function(i) { return i.contentWindow; });
    if(window.parent && window.parent !== window) {
      targets.push(window.parent);
    }
    return targets;
  },

  getXframeWrapper: function(type) {
    return {
      postal     : true,
      type       : type,
      instanceId : postal.instanceId
    }
  },

  onPostMessage: function( event ) {
    console.log(event.data);
    if(this.shouldProcess(event)) {
      var payload = event.data;
      if(payload.type === 'ready') {
        postal.fedx.addClient(this.clientOptionsFromEvent(event));
      } else {
        postal.fedx.onFederatedMsg( payload.envelope, payload.instanceId );
      }
    }
  },

  shouldProcess: function(event) {
    var hasDomainFilters = !!_config.allowedOrigins.length;
    return _config.enabled && (hasDomainFilters && _.contains(_config.allowedOrigins, event.origin) || !hasDomainFilters ) && (event.data.postal)
  },

  signalReady: function(trgt) {
    var _targets;
    if(!trgt) {
      _targets = this.getTargets();
    } else {
      _targets = _.isArray(trgt) ? trgt : [trgt];
    }
    _.each(_targets, function(target) {
      target.postMessage(this.getXframeWrapper("ready"),  _config.originUrl || "*");
    }, this);
  }
};

_. bindAll(plugin);

window.addEventListener("message", plugin.onPostMessage, false);