# Flow
by Bemi Faison

version 0.1.2, January 12th, 2011

## DESCRIPTION

Flow is a function sequencer and iterator that bridges the gap between programming methodologies and the mess (modes, exceptions, states, and steps) inherent to JavaScript web-application development. Flow introduces an evolved controller paradigm, providing an order-dependent and stateful execution environment.

## INSTALLATION

Flow requires the [Proxy library](http://github.com/bemson/Proxy/).

Use Flow within a web browser. Load the `src/flow.js` file like any other external JavaScript library file.

## USAGE

Documentation is available in the [Flow wiki](http://github.com/bemson/Flow/wiki/).

Create a Flow using the `new` operator and a _tree_ (an object-literal), containing all functions in the Flow.

    var a = new Flow({
      b: {
        c: {}
      },
      e: {}
    });

Use the returned _map_ (a linked-list of functions) to navigate the tree.

    a();
    a.b.c();
    ...

Flow executes meta-functions as it traverses nodes in a tree. Meta-functions are similar to set-up and tear-down functions.

Invoking `a.e()` executes:

    a._in();
    a.b._over();
    a.e._in();
    a.e._main();

Flow traverses the tree from it's current position. Thus, now invoking `a.b.c()` executes:

    a.e._out();
    a.b._in();
    a.b.c._in();
    a.b.c._main();

## LICENSE

Flow is available under the terms of the [MIT-License](http://en.wikipedia.org/wiki/MIT_License#License_terms).

Copyright 2011, Bemi Faison