# Flow
by Bemi Faison

version 0.1.1, January 10th, 2011

## DESCRIPTION

Flow is a function sequencer and iterator that bridges the gap between programming methodologies and the mess (modes, exceptions, states, and steps) inherent to JavaScript web-application development. Flow introduces an evolved controller paradigm, providing an order-dependent and stateful execution environment.

## INSTALLATION

Use Flow within a web browser. Load the `src/flow.js` file like any other external JavaScript library file.

Flow requires the [Proxy library](http://github.com/bemson/Proxy/).

## USAGE

Documentation for Flow is available in the [Flow wiki](http://github.com/bemson/Flow/wiki/).

Create a Flow using the `new` operator and a _tree_ (an object-literal), containing all functions in the Flow.

    var a = new Flow({
      b: {
        c: {}
      },
      e: {
        f: {}
      }
    });

Use the returned _map_ (a linked-list of functions) to navigate the tree.

    a();
    a.b.c();
    ...

Flow executes meta-functions as it traverses nodes in a tree. Meta-functions are similar to set-up and tear-down functions.

Invoking "a.e()" executes:

    a._in();
    a.b._over();
    a.e._in();
    a.e._main();

Flow traverses the tree from it's current position. Thus, now invoking "a.b.c()" executes:

    a.e._out();
    a.b._in();
    a.b.c._in();
    a.b.c._main();

## CHANGES

(These changes will be reflected in the documentation.)

* Fixed path-routing issue (bug #1)
* The `Flow.getController()` method is now `Flow.getFlow()`
* Flow accepts an optional initial string as a custom id
* Methods now available to the Flow-instance and meta-functions:
 * nodeName() -> name of current node                        
 * targetSelf() -> go to own node's main function
 * targetRoot() -> go to root of tree
 * targetNext() -> go to next sibling
 * targetPrevious() -> go to previous sibling
 * targetChild() -> go to first child
 *  targetParent() -> go to parent
 * isCurrent(map) -> flag when map is the current node/position
 * isTarget(map) -> flag when map is the traversal target
 * onTarget() -> flag when on traversal target  
 * wasTarget(map) -> flag when map was apart of the traversal path

## LICENSE

Flow is available under the terms of the [MIT-License](http://en.wikipedia.org/wiki/MIT_License#License_terms).

Copyright 2011, Bemi Faison