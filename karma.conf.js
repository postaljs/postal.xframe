module.exports = function( config ) {
	config.set( {

		// base path that will be used to resolve all patterns (eg. files, exclude)
		basePath: "",

		// frameworks to use
		// available frameworks: https://npmjs.org/browse/keyword/karma-adapter
		frameworks: [ "mocha" ],

		// list of files / patterns to load in the browser
		files: [
			"karma.globals.js",
			"node_modules/babel-core/browser-polyfill.js",
			"node_modules/jquery/dist/jquery.js",
			"node_modules/lodash/lodash.js",
			"node_modules/expect.js/expect.js",
			"node_modules/mocha/mocha.js",
			"node_modules/postal/lib/postal.js",
			"node_modules/postal.federation/lib/postal.federation.js",
			"lib/postal.xframe.js",
			"spec/*.spec.js"
		],

		// list of files to exclude
		exclude: [],

		// preprocess matching files before serving them to the browser
		// available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
		preprocessors: {},

		// test results reporter to use
		// possible values: 'dots', 'progress'
		// available reporters: https://npmjs.org/browse/keyword/karma-reporter
		reporters: [ "spec" ],

		// web server port
		port: 9876,

		// enable / disable colors in the output (reporters and logs)
		colors: true,

		// level of logging
		// possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
		logLevel: config.LOG_INFO,

		// enable / disable watching file and executing tests whenever any file changes
		autoWatch: true,

		// start these browsers
		// available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
		browsers: [ "Chrome" ],

		coverageReporter: {
			reporters: [
				{ type: "html" },
				{ type: "text-summary" }
			],
			dir: "coverage/"
		},

		// Continuous Integration mode
		// if true, Karma captures browsers, runs the tests and exits
		singleRun: false,

		client: {
			mocha: {
				reporter: "html", // change Karma's debug.html to the mocha web reporter
				ui: "bdd"
			}
		}
	} );
};
