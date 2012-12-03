/*
 postal.federation
 Copyright (C) 2012 - Jim Cowart (http://freshbrewedcode.com/jimcowart)
 License: Dual licensed MIT & GPL v2.0
 Version 0.1.0
 */
(function ( root, factory ) {
  if ( typeof module === "object" && module.exports ) {
    // Node, or CommonJS-Like environments
    module.exports = factory( require( "underscore" ), require( "postal" ) );
  } else if ( typeof define === "function" && define.amd ) {
    // AMD. Register as an anonymous module.
    define( ["underscore", "postal"], function ( _, postal ) {
      return factory( _, postal, root );
    } );
  } else {
    // Browser globals
    root.postal = factory( root._, root.postal, root );
  }
}( this, function ( _, postal, global, undefined ) {

  var _defaults = {
    enabled          : true,
    constraintMode   : 'blacklist',
    bridgeSysChannel : true
  };
  var _config = _defaults;
  
  var FederationClient = function(id) {
    this.id = id;
    this.activeTransport = undefined;
  };
  
  FederationClient.prototype.send = function(envelope, transport) {
    transport = transport || this.activeTransport;
    if(transport) {
      this[transport].send(envelope);
    }
  };
  
  postal.fedx = _.extend({
  
    clients: {},
  
    transports: {},
  
    constraints: {},
  
    FederationClient: FederationClient,
  
    addClient: function(transportClient, type) {
      var _client = this.clients[transportClient.instanceId] || (this.clients[transportClient.instanceId] = new FederationClient(transportClient.instanceId));
      transportClient.attachToClient(_client);
      _client.activeTransport = _client.activeTransport || type;
    },
  
    addConstraint: function(channel, topic) {
      if(!this.constraints[channel]) {
        this.constraints[channel] = [ topic ];
      } else if(!(_.include(this.constraints[channel], topic))) {
        this.constraints[channel].push(topic);
      }
    },
  
    removeConstraint: function(channel, topic) {
      if(this.constraints[channel] && _.include(this.constraints[channel], topic)) {
        this.constraints[channel] = _.without(this.constraints[channel], topic);
      }
    },
  
    canSendRemote: function(channel, topic) {
      var channelPresent = this.constraints.hasOwnProperty(channel);
      var topicMatch = (channelPresent && _.any(this.constraints[channel], function(binding){
        return postal.configuration.resolver.compare(binding, topic);
      }));
      var blacklisting = _config.constraintMode === 'blacklist';
      var sysChannelOK = ((!_config.bridgeSysChannel && channel !== postal.configuration.SYSTEM_CHANNEL) || _config.bridgeSysChannel);
  
      return _config.enabled && sysChannelOK &&
        (
          (blacklisting && (!channelPresent || (channelPresent && !topicMatch))) ||
            (!blacklisting && channelPresent && topicMatch)
          );
    },
  
    configure: function(cfg) {
      if(cfg.constraintMode && cfg.constraintMode !== 'blacklist' && cfg.mode !== 'whitelist') {
        throw new Error("postal.fedx constraintMode must be 'blacklist' or 'whitelist'.");
      }
      if(cfg){
        _config = _.defaults(cfg, _defaults);
      }
      return _config;
    },
  
    onFederatedMsg: function(envelope, senderId) {
      envelope.lastSender = senderId;
      postal.publish(envelope);
    },
  
    send : function(envelope) {
      envelope.originId = envelope.originId || postal.instanceId;
      _.each(this.clients, function(client, id) {
        var env = _.clone(envelope);
        if(id !== env.lastSender &&
            ( !env.knownIds ||
              !env.knownIds.length ||
              (env.knownIds && !_.include(env.knownIds, id)))
          ) {
          env.knownIds = (env.knownIds || []).concat(_.without(_.keys(this.clients), id));
          client.send(env);
        }
      }, this);
    },
  
    signalReady: function(transportName) {
      if(transportName) {
        this.transports[transportName].signalReady();
      } else {
        _.each(this.transports, function(transport) {
          transport.signalReady();
        }, this);
      }
    }
  
  }, postal.fedx);
  
  postal.addWireTap(function(data, envelope){
    if(postal.fedx.canSendRemote(envelope.channel, envelope.topic)) {
      postal.fedx.send(envelope);
    }
  });

  return postal;

} ));