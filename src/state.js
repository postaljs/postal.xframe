import _ from "lodash";

export let env = {
	origin: location.origin || location.protocol + "//" + location.host,
	isWorker: ( typeof window === "undefined" ) && postMessage && location,
	// I know, I KNOW. The alternative was very expensive perf & time-wise
	// so I saved you a perf hit by checking the stinking UA. Sigh.
	// I sought the opinion of several other devs. We all traveled
	// to the far east to consult with the wisdom of a monk - turns
	// out he didn"t know JavaScript, and our passports were stolen on the
	// return trip. We stowed away aboard a freighter headed back to the
	// US and by the time we got back, no one had heard of IE 8 or 9. True story.
	useEagerSerialize: /MSIE [8,9]/.test( navigator.userAgent )
};

const defaults = {
	allowedOrigins: [ env.origin ],
	enabled: true,
	defaultOriginUrl: "*",
	safeSerialize: false
};

export let state = {
	workers: [],
	config: _.extend( {}, defaults ),
	defaults
};
