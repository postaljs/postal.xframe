# postal.xframe

## Version 0.2.0	 (Dual Licensed [MIT](http://www.opensource.org/licenses/mit-license) & [GPL](http://www.opensource.org/licenses/gpl-license))

## What is it?
postal.xframe is a [postal.federation](https://github.com/postaljs/postal.federation) plugin - enabling you to 'federate' instances of [postal](https://github.com/postaljs/postal.js) across iframe/window boundaries in the browser.

## Why would I use it?
Cross-frame messaging can be a serious sore spot (those that have been there, say 'Amen'). This plugin bridges two or more instances of postal so that they can share messages. For example, if you have postal in the parent window, as well as in an iframe (and have included postal.federation and postal.xframe), you can tell the two instances of postal to federate, enabling messages that get published in the parent window to be pushed down to the iframe and published *as if they were locally published* and vice versa. This enables you to write your components to worry only about handling messages - and the infrastructure concerns of where they originate, how they get there, etc., are already taken care of by postal.xframe.

## How do I use it?
Until I have time to write an API walk-through, the tests, the dirty examples and the code itself will have to suffice…. More to come soon!
