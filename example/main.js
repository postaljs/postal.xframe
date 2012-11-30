/*global postal*/
postal.addWireTap(function(d, e) {
  console.log("ID: " + postal.instanceId + " " + JSON.stringify(e, null, 4));
});

$(function() {

  postal.instanceId = "parent";

  postal.subscribe({
    channel: "parentz",
    topic: "#",
    callback: function(d, e) {
      $("#msgs").append("<div><pre>" + JSON.stringify(e, null, 4) + "</pre></div>");
    }
  });

  $("#msg1").on('click', function(){
    postal.publish({
      channel: "iframez",
      topic: "some.topic",
      data: "This message will appear in an iframe"
    });
  });

});