describe("postal.xframe - unit tests", function () {
  var getFakeEvent = function(postMsg) {
    return {
      data : postal.fedx.transports.xframe.getWrapper("ready"),
      source : {
        postMessage : postMsg
      },
      origin: window.location.origin
    }
  };
  describe("When checking configuration", function () {
    describe("When using defaults", function () {
      it("should return expected default values", function () {
        expect(postal.fedx.transports.xframe.config()).to.eql({
          autoReciprocate : true,
          allowedOrigins : [ window.location.origin ],
          enabled : true,
          originUrl : window.location.origin
        });
      });
    });
    describe("When setting specific configuration values", function () {
      beforeEach(function () {
        postal.fedx.transports.xframe.config({
          autoReciprocate : false,
          enabled : false
        });
      });
      afterEach(function () {
        postal.fedx.transports.xframe.config({});
      });
      it("should return expected values", function () {
        expect(postal.fedx.transports.xframe.config()).to.eql({
          autoReciprocate : false,
          allowedOrigins : [ window.location.origin ],
          enabled : false,
          originUrl : window.location.origin
        });
      });
    });
    describe("When setting entire configuration", function () {
      beforeEach(function () {
        postal.fedx.transports.xframe.config({
          autoReciprocate : false,
          allowedOrigins : [ "who.com" ],
          enabled : false,
          originUrl : "donna.noble.uk"
        });
      });
      afterEach(function () {
        postal.fedx.transports.xframe.config({});
      });
      it("should return expected values", function () {
        expect(postal.fedx.transports.xframe.config()).to.eql({
          autoReciprocate : false,
          allowedOrigins : [ "who.com" ],
          enabled : false,
          originUrl : "donna.noble.uk"
        });
      });
    });
  });

  describe("When calling getWrapper", function () {
    var _instanceId;
    beforeEach(function(){
      _instanceId = postal.instanceId;
      postal.instanceId = "test123";
    });
    afterEach(function(){
      postal.instanceId = _instanceId;
    });
    describe("With ready event type", function() {
      it('should produce the correct ready event wrapper', function(){
        expect(postal.fedx.transports.xframe.getWrapper('ready')).to.eql({
          postal     : true,
          type       : 'ready',
          instanceId : postal.instanceId
        });
      });
    });
    describe("With message event type", function() {
      it('should produce the correct message event wrapper', function(){
        expect(postal.fedx.transports.xframe.getWrapper('message', { channel: "test", topic: "test.ing", data: "hai!" })).to.eql({
          postal     : true,
          type       : 'message',
          instanceId : postal.instanceId,
          envelope   : { channel: "test", topic: "test.ing", data: "hai!" }
        });
      });
    });
  });

  describe("When calling onPostMessage", function(){
    var _addClient, _transportClient, _type, _msg, _origin, _instanceId, _fakeClient = {};
    var fakeAddClient = function(transportClient, type) {
      _transportClient = transportClient;
      _type = type;
      transportClient.attachToClient(_fakeClient);
    };
    beforeEach(function(){
      _instanceId = postal.instanceId;
      postal.instanceId = "test123";
      _addClient = postal.fedx.addClient;
      postal.fedx.addClient = fakeAddClient;
    });
    afterEach(function(){
      postal.instanceId = _instanceId;
      postal.fedx.addClient = _addClient;
      _transportClient = undefined;
      _type = undefined;
    });
    describe("With a ready event", function(){
      beforeEach(function(){
        postal.fedx.transports.xframe.onPostMessage(
          getFakeEvent(function(msg, origin) {
            _msg = msg;
            _origin = origin;
          })
        );
      });
      it('should call postal.fedx.addClient with correct arguments', function(){
        expect(_transportClient).to.have.property("source");
        expect(_transportClient).to.have.property("instanceId");
        expect(_transportClient).to.have.property("autoReciprocate");
        expect(_transportClient).to.have.property("send");
        expect(_transportClient).to.have.property("reciprocate");
        expect(_transportClient).to.have.property("attachToClient");
        expect(_transportClient.instanceId).to.be(postal.instanceId);
        expect(_transportClient.autoReciprocate).to.be(true);
        expect(_type).to.be("xframe");
      });
      it('should call attachToClient', function(){
        expect(_fakeClient).to.have.property("xframe");
        expect(_fakeClient.xframe).to.have.property("source");
        expect(_fakeClient.xframe).to.have.property("instanceId");
        expect(_fakeClient.xframe).to.have.property("autoReciprocate");
        expect(_fakeClient.xframe).to.have.property("send");
        expect(_fakeClient.xframe).to.have.property("reciprocate");
        expect(_fakeClient.xframe).to.have.property("attachToClient");
        expect(_fakeClient.xframe.instanceId).to.be(postal.instanceId);
        expect(_fakeClient.xframe.autoReciprocate).to.be(true);
      });
      it('should call postMessage due to auto-reciprocation', function(){
        expect(_msg).to.eql({
          postal     : true,
          type       : 'ready',
          instanceId : postal.instanceId
        });
        expect(_origin).to.be(window.location.origin);
      });
    });
    describe("With a message event", function(){
      var _envelope, _senderId, _onMsg;
      var _fakeOnMsg = function(envelope, senderId) {
        _envelope = envelope;
        _senderId = senderId;
      };
      beforeEach(function(){
        _onMsg = postal.fedx.onFederatedMsg;
        postal.fedx.onFederatedMsg = _fakeOnMsg;
        postal.fedx.transports.xframe.onPostMessage({
          origin     : window.location.origin,
          data: {
            postal     : true,
            type       : 'message',
            instanceId : postal.instanceId,
            envelope   : {
              channel : "something",
              topic   : "interest.ing",
              data    : "Oh, hai Batman!"
            }
          }
        });
      });
      afterEach(function(){
        postal.fedx.onFederatedMsg = _onMsg;
      });
      it('should invoke postal.fedx.onFederatedMsg with correct arguments', function(){
        expect(_envelope).to.eql({
          channel : "something",
          topic   : "interest.ing",
          data    : "Oh, hai Batman!"
        });
        expect(_senderId).to.be(postal.instanceId);
      });
    });
  });

  describe("When calling shouldProcess", function () {
    describe("With default values", function () {
      it('should return true', function(){
        expect(postal.fedx.transports.xframe.shouldProcess(getFakeEvent(function(){}))).to.be(true);
      })
    });
    describe("With matching domains", function () {
      it('should return true', function(){
        var evnt = getFakeEvent(function(){});
        evnt.origin = window.location.origin;
        expect(postal.fedx.transports.xframe.shouldProcess(evnt)).to.be(true);
      });
    });
    describe("With mismatched domains", function () {
      it('should return false', function(){
        var evnt = getFakeEvent(function(){});
        evnt.origin = "http://something.else.com:3080";
        expect(postal.fedx.transports.xframe.shouldProcess(evnt)).to.be(false);
      });
    });
    describe("With plugin disabled", function () {
      beforeEach(function(){
        postal.fedx.transports.xframe.config({enabled: false});
      });
      afterEach(function(){
        postal.fedx.transports.xframe.config({});
      });
      it('should return false', function(){
        var evnt = getFakeEvent(function(){});
        expect(postal.fedx.transports.xframe.shouldProcess(evnt)).to.be(false);
      })
    });
  });

  describe("When calling signalReady", function () {
    var origGetTargets, _msg, _domain;
    var mockedTargets = [
      {
        postMessage: function(msg, domain) {
          _msg = msg;
          _domain = domain;
        }
      }
    ];
    beforeEach(function(){
      origGetTargets = postal.fedx.transports.xframe.getTargets;
      postal.fedx.transports.xframe.getTargets = function() {
        return [mockedTargets[0]];
      };
    });
    afterEach(function(){
      postal.fedx.transports.xframe.getTargets = origGetTargets;
      _msg = undefined;
      _domain = undefined;
    });
    describe("With no target override argument provided", function(){
      it('should invoke postMessage with the correct arguments', function(){
        postal.fedx.transports.xframe.signalReady();
        expect(_msg).to.eql({
          postal     : true,
          type       : 'ready',
          instanceId : postal.instanceId
        });
        expect(_domain).to.be(window.location.origin);
      });
    });
    describe("With a non-array target override argument provided", function(){
      var _msg2, _domain2;
      postal.fedx.transports.xframe.signalReady({
        postMessage: function(msg, domain) {
          _msg2 = msg;
          _domain2 = domain;
        }
      });
      it('should invoke postMessage with the correct arguments', function(){
        expect(_msg2).to.eql({
          postal     : true,
          type       : 'ready',
          instanceId : postal.instanceId
        });
        expect(_domain2).to.be(window.location.origin);
        expect(_msg).to.be(undefined);
        expect(_domain).to.be(undefined);
      });
    });
    describe("With an array of target overrides provided", function(){
      var _msg2 = 0, _domain2 = 0;
      postal.fedx.transports.xframe.signalReady([
        {
          postMessage: function(msg, domain) {
            _msg2 += 1;
            _domain2 += 1;
          }
        },
        {
          postMessage: function(msg, domain) {
            _msg2 += 1;
            _domain2 += 1;
          }
        }
      ]);
      it('should invoke postMessage with the correct arguments', function(){
        expect(_msg2).to.be(2);
        expect(_domain2).to.be(2);
        expect(_msg).to.be(undefined);
        expect(_domain).to.be(undefined);
      });
    });
  });
});