Flow - version 0.1

by Bemi Faison (bemson@gmail.com)

# Flow

Flow is an evolved controller construct that bridges the gap between programming methodologies and the modes, exceptions, states, and steps (or MESS), prevelant in web-application development. Flow makes code immediately meaningful, accessible and testable.

## Using Flow

Flow defines and enforces function-trees, compiled from an object-literal that describes their relationships and roles. 

1. Map the flow

Similar to prototyping a class


Flow returns a linked-list of functions, which mirrors the tree structure.



Flow introduces a simple pattern to code meaningful routines, which are immediately accessible and testable.


Flow makes definable moments of code meaningful, accessible and testable, using a simple, lightweight pattern and syntax.


Flow bridges the gap between programming methodologies and the MESS (modes, exceptions, states and steps) of web-application development. Flow manages the MESS through path-oriented-programming (POP), a pattern for making defineable moments of code meaningful, accessible, and testable. POP focuses on _where_ functions exists, and uses meta functions and properties as an execution context.

Flow is an advanced controller, designed to tame your code. every signficant moment of your code id

 utilizing aspect-oriented-programming, life-cycle constructs, to identify and target every 

Every defineable moment of code can be identified and targeted for

Flow defines and enforces routine dependencies, enabling control over when functions execute. This dependency tree is compiled from an object-literal that describes the relationships and roles of functions. Flow returns a linked-list of functions, which mirrors the tree structure.

### Creating a flow

    var app = new Flow({
      _in: function () {
        // setup stuff
      },
      login: {
        _in: function () {
          // init widget
        },
        _out: function () {
          // destroy widget
        },
        submit: {
          _main: function () {},
          _over: function () {}
        },
        success: function () {},
        fail: function () {}
      }
    });

Unlike other "expressive" syntax, the map function - returned from creating a new Flow - mirrors the structure given, and each point is executable.

Invoke any point of your flow using the same structure as the dependency tree.

    app.login.fail();


// invokes the following in sequence
app._in()
app.login._in()
app.submit._over()
app.fail()

## Dependent Code

Flow uses [Proxy.js] - Share and use privileged objects with ease.