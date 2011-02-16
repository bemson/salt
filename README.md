# Flow
by Bemi Faison

2/15/11
version 0.2.0

## DESCRIPTION

Flow is a new way to structure JavaScript code, by stubbing logic before coding functionality. Technically, it is a function sequencer and iterator, an approach that bridges the gap between programming methodologies and the mess (modes, exceptions, states, and steps) inherent to web-application development. The result is an evolved controller paradigm, enabling dependencies and states for JavaScript routines.

## INSTALLATION

Flow requires the [Proxy library](http://github.com/bemson/Proxy/).

Use Flow within a web browser. Load the `src/flow.js` file like any other external JavaScript library file.

## USAGE

Documentation is available in the [Flow wiki](http://github.com/bemson/Flow/wiki/).

Create a Flow using the `new` operator and a _tree_ (an object-literal), containing all functions for the Flow.

    var a = new Flow({
      x: {
        p: {}
      },
      h: {}
    });

The return value is not an instance, but a _map_ (or linked-list of functions) that mirror the Flow's _tree_. From the above code, any of the following points (or "nodes") are now executable.

    a();
		a.x();
    a.x.p();
    a.h();

Invoking any map-function, causes Flow to traverse toward that node. Flow executes meta-functions (like set-up and tear-down functions) along the way.

For example, invoking `a.h()` actually executes:

    a._in();
    a.x._over();
    a.h._in();
    a.h._main();

Flow navigates from it's current position. Continuing the first example - now at node "h" - invoking `a.x.p()` actually executes:

    a.h._out();
    a.x._in();
    a.x.p._in();
    a.x.p._main();

## LICENSE

Flow is available under the terms of the [MIT-License](http://en.wikipedia.org/wiki/MIT_License#License_terms).

Copyright 2011, Bemi Faison