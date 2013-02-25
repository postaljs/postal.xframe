(function ( root, factory ) {
	if ( typeof module === "object" && module.exports ) {
		// Node, or CommonJS-Like environments
		module.exports = factory( require( "underscore" ), require( "postal.federation" ) );
	} else if ( typeof define === "function" && define.amd ) {
		// AMD. Register as an anonymous module.
		define( ["underscore", "postal.federation"], function ( _, postal ) {
			return factory( _, postal, root );
		} );
	} else {
		// Browser globals
		root.postal = factory( root._, root.postal, root );
	}
}( this, function ( _, postal, global, undefined ) {

	//import("xframe.js");

	return postal;

} ));