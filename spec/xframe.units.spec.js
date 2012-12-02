describe("postal.xframe - unit tests", function () {
  var getFakeEvent = function(postMsg) {
    return {
      data : postal.fedx.transports.xframe.getXframeWrapper("ready"),
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

  describe("When calling clientOptionsFromEvent", function () {
    var instanceId, _msg, _domain, result;
    var cfg = postal.fedx.transports.xframe.config();
    var postMsg = function (msg, domain) {
      _msg = msg;
      _domain = domain;
    };
    beforeEach(function(){
      instanceId = postal.instanceId;
      postal.instanceId = "testing123";
      result = postal.fedx.transports.xframe.clientOptionsFromEvent(getFakeEvent(postMsg));
    });
    afterEach(function(){
      postal.instanceId = instanceId;
    });
    it('should produce the correct options object', function() {
      expect(result.id).to.be(postal.instanceId);
      expect(result.type).to.be('xframe');
      expect(result).to.have.property("send");
      expect(result).to.have.property("postSetup");
    });
    it('should send the correct reciprocate msg', function(){
      result.postSetup();
      expect(_msg).to.eql(postal.fedx.transports.xframe.getXframeWrapper("ready"));
      expect(_domain).to.eql(cfg.originUrl);
    });
    it('should send the correct payload when sending a message', function(){
      result.send({
        channel: "SomeChannel",
        topic: "Topicy.topic",
        data: "Oh, Hai!"
      });
      expect(_msg).to.eql(_.defaults({ envelope: {
        channel: "SomeChannel",
        topic: "Topicy.topic",
        data: "Oh, Hai!"
      }}, postal.fedx.transports.xframe.getXframeWrapper("message")));
      expect(_domain).to.eql(cfg.originUrl);
    });
  });

  describe("When calling getXframeWrapper", function () {
    describe("With ready event type", function() {
      it('should produce the correct ready event wrapper', function(){
        expect(postal.fedx.transports.xframe.getXframeWrapper('ready')).to.eql({
          postal     : true,
          type       : 'ready',
          instanceId : postal.instanceId
        });
      });
    });
    describe("With message event type", function() {
      it('should produce the correct message event wrapper', function(){
        expect(postal.fedx.transports.xframe.getXframeWrapper('message')).to.eql({
          postal     : true,
          type       : 'message',
          instanceId : postal.instanceId
        });
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