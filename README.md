[Integralist](http://www.integralist.co.uk/) - XHRl
================================

Description
-----------

AJAX based Script Loader.

Reasons for building 'yet another' dynamic script loader:

* I wanted to learn how to write one myself
* I wanted a script loader that actually informed the developer of errors! (aka jQuery which cryptically hides errors)
* I wanted to avoid typical browser sniffs used to keep execution order (e.g. LABjs)
* I wanted to avoid using hacks ([such as...](http://www.phpied.com/preload-then-execute/)) - used in a few script loaders.

Disclaimer
----------

I wrote this script not to compete with any of the existing script loaders, but to learn something new by the virtue of trying to build one for myself.

Just so you know, my main 'go to' script loader of choice is LABjs, and I still highly recommend it (it's got some awesome features, one of which is 'conditional loading').

Limitations
-----------

One limitation of this script loader is that because it relies on XMLHttpRequest all scripts loaded must be hosted on your own domain (i.e. you can't call jQuery from the Google CDN). Now for my use cases this isn't a problem, but for some people this may be a big deal. Take it or leave it.

Other Script Loaders
--------------------

Here's a list of other script loaders I've looked at...

* [LABjs](https://github.com/getify/LABjs)
* [YepNope.js](https://github.com/SlexAxton/yepnope.js)
* [RequireJs](https://github.com/jrburke/requirejs)
* [HeadJs](https://github.com/headjs/headjs)
* [ControlJs](http://stevesouders.com/controljs/)
* [Steal](https://github.com/jupiterjs/steal) (part of JMVC library)
* [loadrunner](https://github.com/danwrong/loadrunner/)