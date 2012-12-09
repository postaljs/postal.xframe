/*
 postal.federation
 Copyright (C) 2012 - Jim Cowart (http://freshbrewedcode.com/jimcowart)
 License: Dual licensed MIT & GPL v2.0
 Version 0.1.0
 */
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

  if(!postal.utils.createUUID) {
    postal.utils.createUUID = function() {
      var s = [];
      var hexDigits = "0123456789abcdef";
      for (var i = 0; i < 36; i++) {
        s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
      }
      s[14] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
      s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
      s[8] = s[13] = s[18] = s[23] = "-";
      return s.join("");
    }
  }
  
  var _defaults = {
    enabled          : true,
    filterMode       : 'whitelist',
    filterDirection  : 'both'
  };
  var _config = _defaults;
  var pings = {};
  var _packingSlips = {
    ping    : function() {
      return {
        type       : 'federation.ping',
        instanceId : postal.instanceId,
        timeStamp  : new Date(),
        ticket     : postal.utils.createUUID()
      }
    },
    pong    : function(ping) {
      return {
        type       : 'federation.pong',
        instanceId : postal.instanceId,
        timeStamp  : new Date(),
        pingData   : {
          instanceId : ping.instanceId,
          timeStamp  : ping.timeStamp,
          ticket     : ping.ticket
        }
      }
    },
    message : function(env) {
      return {
        type       : 'federation.message',
        instanceId : postal.instanceId,
        timeStamp  : new Date(),
        envelope   : env
      }
    } ,
    bundle  : function(packingSlips) {
      return {
        type         : 'federation.bundle',
        instanceId   : postal.instanceId,
        timeStamp    : new Date(),
        packingSlips : packingSlips
      }
    }
  };
  var _send = {
    ping    : function( data ) {
      var _targets = !data.target ? postal.fedx.transports[ data.transport ].getTargets() : _.isArray( data.target ) ? data.target : [ data.target ];
      _.each( _targets, function( target ){
        var packingSlip = postal.fedx.getPackingSlip( 'ping' );
        pings[packingSlip.ticket] = { target: target };
        postal.fedx.transports[ data.transport ].send( target, packingSlip);
      });
    },
    pong    : function( data ) {
      postal.fedx.transports[ data.transport ].send( data.source, postal.fedx.getPackingSlip( 'pong', data.packingSlip ));
    },
    bundle  : function( data ) {
      postal.fedx.transports[ data.transport ].send( data.target, postal.fedx.getPackingSlip( 'bundle', data.slips ));
    },
    message : function( data ) {
      data.envelope.originId = data.envelope.originId || postal.instanceId;
      var _targets = !data.target ? postal.fedx.clients : _.isArray( data.target ) ? data.target : [ data.target ];
  
      _.each(_targets, function(client, id) {
        client = client.send ? client : postal.fedx.clients[client];
        var env = _.clone(data.envelope);
        if(id !== env.lastSender &&
          ( !env.knownIds ||
            !env.knownIds.length ||
            (env.knownIds && !_.include(env.knownIds, id)))
          ) {
          env.knownIds = (env.knownIds || []).concat(_.without(_.keys(postal.fedx.clients), id));
          client.send( postal.fedx.getPackingSlip( 'message', env ));
        }
      });
    }
  };
  var _handle = {
    "federation.ping"    : function( data ) {
      if(!postal.fedx.clients[data.packingSlip.instanceId] || !postal.fedx.clients[data.packingSlip.instanceId][data.transport]) {
        // we're not federated with this client, so we need to send both a pong reply and a ping
        var slips = [
          postal.fedx.getPackingSlip( 'pong', data.packingSlip ),
          postal.fedx.getPackingSlip( 'ping' )
        ];
        pings[slips[1].ticket] = { target: data.source };
        _send.bundle( {
          transport : data.transport,
          target    : data.source,
          slips     : slips
        } );
      } else {
        _send.pong( data );
      }
    },
    "federation.pong"    : function( data ) {
      if( pings[ data.packingSlip.pingData.ticket ].target === data.source && data.packingSlip.pingData.instanceId === postal.instanceId ) {
        postal.fedx.addClient( postal.fedx.transports[ data.transport ].getClientInstance( data ), data.transport );
        pings[data.packingSlip.pingData.ticket] = undefined;
      }
    },
    "federation.message" : function( data ) {
      var env = data.packingSlip.envelope;
      if(_matchesFilter(env.channel, env.topic, 'in')){
        env.lastSender = data.packingSlip.instanceId;
        postal.publish(env);
      }
    },
    "federation.bundle"  : function( data ) {
      _.each( data.packingSlip.packingSlips, function( slip ) {
        postal.fedx.onFederatedMsg( _.extend( {}, data, { packingSlip: slip }));
      });
    }
  };
  var _matchesFilter = function( channel, topic, direction ) {
    var channelPresent = postal.fedx.filters[direction].hasOwnProperty(channel);
    var topicMatch = (channelPresent && _.any(postal.fedx.filters[direction][channel], function(binding){
      return postal.configuration.resolver.compare(binding, topic);
    }));
    var blacklisting = _config.filterMode === 'blacklist';
  
    return _config.enabled &&
      (
        (blacklisting && (!channelPresent || (channelPresent && !topicMatch))) ||
          (!blacklisting && channelPresent && topicMatch)
        );
  };
  
  var FederationClient = function(id) {
    this.id = id;
    this.activeTransport = undefined;
  };
  
  FederationClient.prototype.send = function(envelope, transport) {
    this[(transport || this.activeTransport)].send(envelope);
  };
  
  postal.fedx = _.extend({
  
    FederationClient: FederationClient,
  
    clients: {},
  
    transports: {},
  
    filters: { in: {}, out: {} },
  
    addClient: function(transportClient, type) {
      var client = this.clients[transportClient.instanceId] || (this.clients[transportClient.instanceId] = new FederationClient(transportClient.instanceId));
      if(!client[type]) {
        client[type] = transportClient;
      }
      client.activeTransport = client.activeTransport || type;
      postal.publish({
        channel : "postal.federation",
        topic   : "client.federated",
        data    : {
          remoteId         : transportClient.instanceId,
          localId          : postal.instanceId,
          autoReciprocated : false,
          transport        : type
        }
      });
    },
  
    addFilter: function(filters) {
      filters = _.isArray(filters) ? filters : [ filters ];
      _.each(filters, function(filter) {
        filter.direction = filter.direction || _config.filterDirection;
        _.each((filter.direction === 'both') ? [ 'in', 'out' ] : [ filter.direction ], function(dir){
          if(!this.filters[dir][filter.channel]) {
            this.filters[dir][filter.channel] = [ filter.topic ];
          } else if(!(_.include(this.filters[dir][filter.channel], filter.topic))) {
            this.filters[dir][filter.channel].push(filter.topic);
          }
        }, this);
      }, this);
    },
  
    removeFilter: function(filters) {
      filters = _.isArray(filters) ? filters : [ filters ];
      _.each(filters, function(filter) {
        filter.direction = filter.direction || _config.filterDirection;
        _.each((filter.direction === 'both') ? [ 'in', 'out' ] : [ filter.direction ], function(dir){
          if(this.filters[dir][filter.channel] && _.include(this.filters[dir][filter.channel], filter.topic)) {
            this.filters[dir][filter.channel] = _.without(this.filters[dir][filter.channel], filter.topic);
          }
        }, this);
      }, this);
    },
  
    canSendRemote: function(channel, topic) {
      return _matchesFilter(channel, topic, 'out');
    },
  
    configure: function(cfg) {
      if(cfg.filterMode && cfg.filterMode !== 'blacklist' && cfg.mode !== 'whitelist') {
        throw new Error("postal.fedx filterMode must be 'blacklist' or 'whitelist'.");
      }
      if(cfg){
        _config = _.defaults(cfg, _defaults);
      }
      return _config;
    },
  
    getPackingSlip: function(type, env) {
      if(_packingSlips.hasOwnProperty(type)) {
        return _packingSlips[type].apply(this, Array.prototype.slice.call(arguments, 1));
      }
    },
  
    onFederatedMsg: function(data) {
      if(_handle.hasOwnProperty(data.packingSlip.type)) {
        _handle[data.packingSlip.type](data);
      } else {
        throw new Error("postal.federation does not have a message handler for '" + data.packingSlip.type + "'.");
      }
    },
  
    send : function(envelope, target) {
      _send.message({ envelope: envelope, target: target });
    },
  
    signalReady: function(transport, trgt) {
      transport = transport || {};
      if(Object.prototype.toString.call(transport) === '[object String]') {
        _send.ping({ transport: transport, target: trgt });
      } else {
        _.each(this.transports, function(trans, name) {
          _send.ping({ transport: name, target: trgt });
        });
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