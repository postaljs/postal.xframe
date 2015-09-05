var _ = require( "lodash" );
var gulp = require( "gulp" );
var eslint = require( "gulp-eslint" );
var uglify = require( "gulp-uglify" );
var rename = require( "gulp-rename" );
var gutil = require( "gulp-util" );
var express = require( "express" );
var path = require( "path" );
var open = require( "open" );
var port = 3080;
var jscs = require( "gulp-jscs" );
var gulpChanged = require( "gulp-changed" );
var webpack = require( "webpack-stream" );
var karma = require( "karma" );
var sourcemaps = require( "gulp-sourcemaps" );

gulp.task( "build:es5", [ "format" ], function() {
	return gulp.src( "src/index.js" )
		.pipe( webpack( require( "./webpack.config.js" ) ) )
		.pipe( rename( "postal.xframe.js" ) )
		.pipe( gulp.dest( "lib/" ) )
		.pipe( sourcemaps.init( { loadMaps: true } ) )
		.pipe( uglify( {
			preserveComments: "license",
			compress: {
				/*eslint-disable */
				negate_iife: false
				/*eslint-enable */
			}
		} ) )
		.pipe( rename( "postal.xframe.min.js" ) )
		.pipe( sourcemaps.write( "./" ) )
		.pipe( gulp.dest( "lib/" ) );
} );

gulp.task( "default", [ "build:es5" ] );

function runTests( options, done ) {
	global.KARMA = true;
	var server = new karma.Server( _.extend( {
		configFile: path.join( __dirname, "/karma.conf.js" ),
		singleRun: true

		// no-op keeps karma from process.exit'ing gulp
	}, options ), done || function() {} );

	server.start();
}

gulp.task( "test", [ "format", "build:es5" ], function( done ) {
	// There are issues with the osx reporter keeping
	// the node process running, so this forces the main
	// test task to not show errors in a notification
	runTests( { reporters: [ "spec" ] }, function( err ) {
		if ( err !== 0 ) {
			// Exit with the error code
			throw err;
		} else {
			done( null );
		}
	} );
} );

gulp.task( "coverage", [ "format", "build:es5" ], function( done ) {
	// There are issues with the osx reporter keeping
	// the node process running, so this forces the main
	// test task to not show errors in a notification
	runTests( {
		reporters: [ "progress", "coverage" ],
		preprocessors: {
			"lib/**/*.js": [ "coverage" ]
		}
	}, function( err ) {
		if ( err !== 0 ) {
			// Exit with the error code
			process.exit( err );
		} else {
			done( null );
		}
	} );
} );

gulp.task( "lint", function() {
	return gulp.src( [ "src/**/*.js", "spec/**/*.spec.js" ] )
	.pipe( eslint() )
	.pipe( eslint.format() )
	.pipe( eslint.failOnError() );
} );

gulp.task( "format", [ "lint" ], function() {
	return gulp.src( [ "*.js", "{src,spec}/**/*.js" ] )
		.pipe( jscs( {
			configPath: ".jscsrc",
			fix: true
		} ) )
		.on( "error", function( error ) {
			gutil.log( gutil.colors.red( error.message ) );
			this.end();
		} )
		.pipe( gulpChanged( ".", { hasChanged: gulpChanged.compareSha1Digest } ) )
		.pipe( gulp.dest( "." ) );
} );

gulp.task( "watch", function() {
	gulp.watch( "src/**/*", [ "default" ] );
} );

var createServer = function( port ) {
	var p = path.resolve( "./" );
	var app = express();
	app.use( express.static( p ) );
	app.listen( port, function() {
		gutil.log( "Listening on", port );
	} );

	return {
		app: app
	};
};

var servers;

gulp.task( "server", function() {
	if ( !servers ) {
		servers = createServer( port );
	}
	open( "http://localhost:" + port + "/index.html" );
} );
