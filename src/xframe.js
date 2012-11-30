var xframe = (function(window, _, postal) {

  var XFRAME = "xframe";
  var _active = true;
  var _defaults = {
    autoReciprocate: true,
    allowedOrigins: [ window.location.origin ],
    originUrl: window.location.origin
  };
  var _config = _defaults;

  var plugin = {

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
        send     : function(payload) {
          event.source.postMessage(payload, _config.originUrl || "*");
        }
      };
      if(_config.autoReciprocate){
        clientOptions.postSetup = function() {
          postal.fedx.clients[payload.instanceId].send(postal.fedx.getFedxWrapper("ready"), XFRAME);
        }
      }
      return clientOptions;
    },

    disable: function() {
      _active = false;
    },

    enable: function() {
      _active = true;
    },

    getTargets: function() {
      return _.map(document.getElementsByTagName('iframe'), function(i) { return i.contentWindow; })
    },

    onPostMessage: function( event ) {
      console.log(event.data);
      if(this.shouldProcess(event)) {
        var payload = event.data;
        if(payload.type === 'ready') {
          postal.fedx.addClient(this.clientOptionsFromEvent(event));
        } else {
          postal.fedx.onFederatedMsg( payload, payload.instanceId );
        }
      }
    },

    shouldProcess: function(event) {
      var hasDomainFilters = !!_config.allowedOrigins.length;
      return _active && (hasDomainFilters && _.contains(_config.allowedOrigins, event.origin) || !hasDomainFilters ) && (event.data.postal)
    },

    signalReady: function(manifest) {
      var self = this;
      var targets = self.getTargets();
      if(window.parent && window.parent !== window) {
        targets.push(window.parent);
      }
      _.each(targets, function(target) {
        target.postMessage(postal.fedx.getFedxWrapper("ready"),  _config.originUrl || "*");
      });
    }
  };

  _. bindAll(plugin);

  postal.fedx.transports.xframe = plugin;

  window.addEventListener("message", plugin.onPostMessage, false);

}(window, _, postal));