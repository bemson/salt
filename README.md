# Flow
Tame your code.

1/2/11
version 0.1.0
by Bemi Faison (bemson@gmail.com)

## DESCRIPTION

Flow is a function manager that bridges the gap between programming methodologies and the modes, exceptions, states, and steps (or MESS) inherent to JavaScript web-application development. Flow defines functions using a construct that captures their context, purpose, and content (i.e., the mess), making each immediately meaningful, accessible and testable. Flow sequences and iterates over these functions, observing their order-dependent and stateful execution.

## INSTALLATION

Use Flow within a web browser. Load the `src/flow.js` file like any other external JavaScript library file.

Flow requires the [Proxy library](http://github.com/bemson/Proxy/).

## USAGE

Create a Flow using the `new` operator and the required _tree_ argument. The tree is an object-literal (which permits further nesting) containing all the functions in a Flow.

    var page = new Flow({
        _in: function () {},
        form: {
            _in: function () {},
            _main: function () {},
            submit: {
                _main: function () {},
                fail: {
                    _over: function () {},
                    _main: function () {}
                },
                pass: function () {}
            },
            _out: fuction () {}
        }
    });

Flow returns a linked-list of functions called a _map_, which mirrors the tree structure - excluding specially-purposed functions, prefixed with an underscore. Any linked-function in a map may be invoked directly (with or without arguments), and instructs Flow to navigate towards and execute the target routine along with any routines in it's path.

For example, invoking `page.form.submit(foo)` would cause Flow to (internally) invoke the following routines, sequentially:

    page._in();
    page.form._in();
    page.form.submit._main(foo);

More information about Flow is available in the [Flow wiki](http://github.com/bemson/Flow/wiki/).

## LICENSE

Flow is available under the terms of the [MIT-License](http://en.wikipedia.org/wiki/MIT_License#License_terms).

Copyright 2011, Bemi Faison