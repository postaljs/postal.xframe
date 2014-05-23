##v0.3.0

* CommonJS module wrapper now returns a factory function, to which you need to pass a postal instance (ideally, you can pass the output of the postal.federation module since it returns postal, but passing postal will work as well as long as postal.federation has been loaded prior).