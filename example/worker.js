(function(global, undefined) {
    self.console = {
        log: function(msg) {
            postMessage("WORKER1: " + JSON.stringify(msg, null, 2));
        }
    };
    importScripts(
        "../node_modules/babel-core/browser-polyfill.js",
        "../node_modules/lodash/lodash.js",
        "../node_modules/postal/lib/postal.js",
        "../node_modules/postal.federation/lib/postal.federation.js",
        "../lib/postal.xframe.js"
    );
    postal.instanceId("worker1");
    postal.fedx.configure({
        filterMode: "blacklist"
    });
    postal.subscribe({
        channel: "webworker1",
        topic: "hit.me.baby.one.more.time",
        callback: function(d, e) {
            postal.publish({
                channel: "webworker",
                topic: "How.About.Them.Apples",
                data: "Hai, I am Worker 1."
            });
        }
    });
}(this));
