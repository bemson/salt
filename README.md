# Flow
by Bemi Faison

version 0.2.0
(3/20/11)

## DESCRIPTION

Flow is an evolved programming architecture that addresses the modes, exceptions, states and steps (or mess) inherent to coding JavaScript.

## FILES

* flow-min.js - Flow framework and dependencies (minified with the [YUI Compressor](http://developer.yahoo.com/yui/compressor/), version 2.4.2)
* src/ - Directory containing the source code
* src-test/ - Test suite
* LICENSE - The legal terms and conditions under which this software may be used
* README.md - This readme file

## INSTALLATION

Load Flow like any other external JavaScript file.

The Flow source code (located at "src/flow.js") requires the [GSet library](http://github.com/bemson/GSet/).

## USAGE

Below is a brief usage example. Full documentation is available in the [Flow wiki](http://github.com/bemson/Flow/wiki/).

**1. Create a Flow by giving it a _program_.**

Let's start with a program that logs someone in (to something) using ajax. Programs reference all the functions used in a task, grouped by their essential state. (Functionality may be further isolated based on when a state is entered, exited, targeted, etc.)

```js
var login = new Flow({
  _in: showLoginModal,
  _main: focusOnForm,
  submit: {
    _in: disableModal,
    _main: function () {
      doAjaxThen(login.submit.handleAjax);
      this.wait(login.submit.timeout, 10000); // timeout in 10 seconds
    },
    handleAjax: function (data) {
      if (data.ok) {
        login.submit.success();
      } else {
        login.failed('Invalid login!');
      }
    },
    success: doSomethingNext,
    timeout: function () {
      cancelAjax();
      login.failed('Could not reach login server!');
    },
    _out: function () {
      enableModal();
    },
  },
  failed: {
    _main: function (msg) {
      showFailMsg(msg);
    },
    _out: clearFailMsg
  },
  cancel: function () {
    this.target(0); // exits the program
  },
  _out: hideLoginModal
});
```

**2. Navigate your program by giving Flow a state to target.**

By default, Flow returns a function-list that reflects your program terms and structure, called a _map_. For example, invoking `login()`, tells Flow to navigate toward the program root, executing the following steps (internally):

```js
login._in();
login._main();
```

Invoking `login.submit()` _next_ executes these steps (again, internally):

```js
login.submit._in();
login.submit._main();
```

Flow always navigates from it's current position, to ensure your logic is executed in the proper context.

**3. There's no third step!**

Once the Flow is defined, use _map_ functions directly, or bind them to event handlers. Flows may also be referenced dynamically by id, in order to access instance methods - like retrieving a new _map_ with `var myMap = Flow('my flow id').map();`.

See the [Flow API](http://github.com/bemson/Flow/wiki/Flow-API) for more on the Flow instance and methods.

## LICENSE

Flow is available under the terms of the [MIT-License](http://en.wikipedia.org/wiki/MIT_License#License_terms).

Copyright 2011, Bemi Faison