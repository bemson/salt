# Flow :: NextGen Branch
by Bemi Faison

version 0.X
(10/5/11)

## DESCRIPTION

Flow is a JavaScript framework that lets you define and execute related functions. Flow is designed to reduce code complexity, redundancy, and concurrency, for confident web development.

### NextGen Implementation

The Flow platform is an independent event loop that - when directed - starts, stops, and traverses states in a program. Access to and control of the Flow platform is provided via modules of code called _Packages_. Thus, the Core package is required to use Flow as described above.

## FILES

* src/ - Directory containing the source code
* src-test/ - Test suites for the minified source code
* README.md - This readme file
* LICENSE - The legal terms and conditions under which this software may be used
* flow-min.js - The Flow platform, including dependencies
* core-package-min.js - The "Core" package (requires flow-min.js)

All minified files have been compressed with [UglifyJS](http://marijnhaverbeke.nl/uglifyjs)

## INSTALLATION

Flow (nextgen) requires [genData v1.1](https://github.com/bemson/genData).

**At this time, this branch is not recommended for production.**

## USAGE

For documentation and tutorials on using Flow (as originally intended), see the [Flow wiki](http://github.com/bemson/Flow/wiki/).

## LICENSE

Flow is available under the terms of the [MIT-License](http://en.wikipedia.org/wiki/MIT_License#License_terms).

Copyright 2011, Bemi Faison