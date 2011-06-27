# Flow
by Bemi Faison

version 0.3 (nextgen)
(6/26/11)

## DESCRIPTION

Flow is a JavaScript framework that lets you define and execute related functions. Flow is designed to reduce code complexity, redundancy, and concurrency, for confident web development.

## NextGen Branch

The NextGen branch is an extensible version of Flow, which will serve as a platform for rich customizations.

### Packages

The Flow platform, will support customization through modules called _packages_. The goal of this refactoring effort is to support the core API of the "master" branch, via an extendable framework.

#### Customization

Packages will allow you to customize the following:

* Parsing of the program object
  * Determine which keys are invalid
  * Determine which keys are components (of a state)
  * Determine how states are structured
* Override the value returned from instantiating a Flow
* Customize the Flow instance
* Respond when Flow navigates a program
  * Before navigating
  * When navigation is halted
  * When navigation completes
* Respond when any state is traversed
* Provide methods to program functions

#### Data and Namespace Sandboxing (and Sharing)

Packages will obviate worries over namespace and object actions. Each will have it's own proxy to the flow instance and each program state. Additions and (most) edits to these objects, would only impact the instigating package. As well, every package may leverage another's, by way of accessing it's properties and methods.

## FILES

* flow-min.js - Flow framework and dependencies (minified with [UglifyJS](http://marijnhaverbeke.nl/uglifyjs) )
* src/ - Directory containing the source code
* src-test/ - Test suite
* LICENSE - The legal terms and conditions under which this software may be used
* README.md - This readme file

## INSTALLATION

**The "nextgen" branch is not recommended for use at this time.**

## USAGE

_Full documentation on the master branch is available in the [Flow wiki](http://github.com/bemson/Flow/wiki/)._

### Defining Packages

The following demonstrates how to define a Flow package:

```js

// define a package
var debug = Flow.pkg('debug');

// provide a RegExp that identifies component keys (attributes of a state)
debug.dataKey = /^#/;

// provide a RegExp that identifies invalid keys
debug.invalidKey = /\$/;

// add custom properties to each state
debug.initState = function (state) {
  var pkg = this,
    arrayOfAllStates = pkg._Flow.states;
  state.customDebugProperty = "State #"state.index + " in " + arrayOfAllStates.length;
};

// customize properties of this package when added to a new flow instance
debug.initFlow = function () {
  var pkg = this;
  pkg.callsToDebugMethods = 0;
  pkg.someSandboxedProperty = 'foo';
}

// override the value returned after calling "new Flow(program [, extraParamN...])"
debug.overrideReturn = function (extraParam1, extraParam2) {
  var pkg = this;
  if (extraParam1) {
    console.log('log something for debugging purposes');
  }
  // if a third parameter is passed...
  if (extraParam2) {
    // return number of states parsed
    return pkg._Flow.states.length;
  } else {
    // return the (public) Flow instance
    return pkg._proxy;
  }
};

debug.onStart = function () {
  var pkg = this;
  console.log("The flow is about to navigate it's program");
};
debug.onStop = function () {
  var pkg = this;
  console.log("The flow was stopped before it completed it's navigating");
};
debug.onEnd = function () {
  var pkg = this;
  console.log("The flow has reached it's navigation target");
};

debug.onTraverse = function (moveInt) {
  var pkg = this,
    state = pkg.state, // the current state (being traversed)
    msg = "Traversing ";
  switch (moveInt) {
    case 0:
      msg += "into";
    break;
    case 1:
      msg += "on";
    break;
    case 2:
      msg += "out of";
    break;
    case 3:
      msg += "over";
    break;
    case 4:
      msg += "backwards-over";
    break;
  }
  console.log(msg + " the " + state.name + "state");
}

// provide a method to all program functions
debug.methods.log = function () {
  var pkg = this;
  // if this method is not being called from it's sandbox, call from it's package
  if (pkg.name !== 'debug') return pkg.pkgs.debug.log();
  // increment properties specific to this package
  pkg.callsToDebugMethods++;
  console.log("The current state is ", pkg.state.name, ", and it's custom debug flag value is: ", pkg.state.customDebugProperty);
};

// provide another method to all program functions
debug.methods.listPkgs = function () {
  // if this method is not being called from it's sandbox, call from it's package
  if (pkg.name !== 'debug') return pkg.pkgs.debug.listPkgs();
  // increment properties specific to this package
  pkg.callsToDebugMethods++;
  console.log("Number of debug methods called by program functions (or other packages):", pkg.callsToDebugMethods);
  console.log('Here are all the loaded packages ',
    Flow.pkg().map(
      function (p) {
        return p.name;
      }
    )
  );
};

```

### Accessing Package Methods

Below demonstrates how a program function can access a package method.

```js
// assume the "core" and "debug" packages are loaded.
var myFlow = new Flow({
    var flow = this;
    // check to see if the debug package is present...
    if (flow.pkgs.debug) {
      flow.listPkgs();
      flow.pkgs.debug.log();
    }
  }, true, false); // additional parameters are passed to packages with .overrideReturn methods

// .go() is a core package method
myFlow.go(1);
// called explicitly, in case other packages override .go()
myFlow.pkgs.core.go(1);
```

## LICENSE

Flow is available under the terms of the [MIT-License](http://en.wikipedia.org/wiki/MIT_License#License_terms).

Copyright 2011, Bemi Faison
