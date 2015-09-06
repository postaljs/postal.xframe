## v0.5.0

* Converted to ES6.
* Moved to webpack build.
* Enabled Karma-based tests.

## v0.4.0

* Switched examples and spec files to use node modules instead of bower
* Updated dependencies in bower.json
* Removed minified file from bower main
* CommonJS now exports instance instead of factory function

## v0.3.2

* Fixed a bug where cross frame publishing failed in Safari due to postMessage.apply failing silently.

## v0.3.0-rc1

* CommonJS module wrapper now returns a factory function, to which you need to pass a postal instance (ideally, you can pass the output of the postal.federation module since it returns postal, but passing postal will work as well as long as postal.federation has been loaded prior).
