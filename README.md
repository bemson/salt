# Salt

**State And Logic Traversal, for today's infinite-application.**

version 0.5.5
by Bemi Faison

[![Build Status](https://travis-ci.org/bemson/salt.png?branch=master)](https://travis-ci.org/bemson/salt)

## Description

Salt is a state-based JavaScript library that offers unparalleled code organization and unprecedented flow control. No matter how you write code, the [event loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/EventLoop#Event_loop) sees it as a sequence of functions, invoked over time. Salt provides a simple pattern to describe those sequences, along with an API to control timing. The result is an async-agnostic flow of your functionality, _in_ code, bridging the gap between specification and implementation.

Salt is designed to produce long-lived documents that can grow with your requirements. Traditional, bottom-up designs fail this test of architecture, because change inevitably destabilizes dependency models. Instead, Salt uses an autonomy model that groups isolated logic, and accommodates change with increasingly granular states. This top-down approach provides a holistic view of your application's functional relationships, along with the freedom and confidence to change them.


## Usage

Use Salt to define and control your "program". Programs use structure to abstract functionality into state and logic; each lexical scope forms a state, and logic is declared via "tags" - i.e., keys prefixed by an underscore ("_"). Tags declare everything, from state behavior, access control rules, and - of course - bind callbacks to transitions.


### Defining your Program

Begin by passing your program to a new Salt instance. The "hello world!" example below features a contrived number of states, in order to demonstrate additional features.

```js
var helloSalt = new Salt({
  _data: 'phrase',
  piece: {
    _in: function () {
      this.data.phrase = 'hello';
    },
    together: function () {
      this.data.phrase += ' world!';
    },
    _tail: '@next'
  },
  speak: function () {
    console.log(this.data.phrase);
  },
  _out: function () {
    console.log('good-bye!');
  }
});
```

Internally, Salt compiles this into a private state-chart, where the following endpoints may now be traversed.

  1. "..//" at index 0
  2. "//" at index 1
  3. "//piece/" at index 2
  4. "//piece/together/" at index 3
  5. "//speak/" at index 4

The first two states exist in every Salt instance: the _null_ and _program-root_ states, respectively. As well, all instances start "on" the _null_ state, which parents the _program-root_ - the first state from your program. The state index reflects it's compilation order, and can be used to reference navigation targets.

#### Using state order in logic

While tag order is irrelevant, state order _can_ matter in a program. Understandably, some developers are uncomfortable treating an object like an array. Thus, despite exhibiting the same [FIFO](http://en.wikipedia.org/wiki/FIFO) object-member behavior, wary developers can rest assured that you Salt may be used with it's order-dependent features. Read more [about key order preservation](https://github.com/bemson/salt/wiki/About-Key-Order-Preservation) in the wiki.

For instance, with the example above, you could replace the spatial query "@next" with the relative query "../speak". The relative query requires a specific sibling; a state named "speak. The spatial query requires a specific relationship; the older/right-adjacent sibling state. Both retain a level of portability, but only one relies on sibling order.


### Controlling your Salt instance

In order to execute your logic, direct your Salt instance toward a program state - i.e., one of the pre-compiled endpoints. Salt then observes the logic of states along it's navigation path, which can invoke functions based on _how_ a state is traversed (or, the transition type). Navigation ends when the destination state has completed an "on" transition.

The example below uses the `.go()` method to direct our Salt instance towards the "//piece/together/" state.

```js
helloSalt.go('//piece/together');
// hello world!
```

You can also inspect the `.state` property, in order to determine _where_ your Salt instance is in your program.

```js
console.log(helloSalt.state.path);  // "//speak/"
console.log(helloSalt.state.name);  // "speak"
console.log(helloSalt.state.index); // 4
```

To "exit" a program, direct Salt toward it's _null_ state (at index 0). The _null_ state parents the program root, allowing you to trigger any program entry/exit logic.

```js
helloSalt.go(0);
// good-bye!
```

This program also uses the `_data` tag to define "scoped" data properties. While the `.data.phrase` property is used, it's no longer available when on the _null_ state. This is because the Salt instance exited the state which declared the scoped property.

```js
console.log(helloSalt.state.index); // 0
console.log(helloSalt.data.phrase); // undefined
```

------

Salt features a hybrid, declarative and procedural architecture, which offers many programmatic advantages and opportunities... it's extensible to boot! Please visit the [online wiki](http://github.com/bemson/salt/wiki) to review the [instance API](https://github.com/bemson/salt/wiki/Salt-API) and [program tag glossary](https://github.com/bemson/salt/wiki/Program-Tags), for information on how to best use Salt in your code.


## Installation

Salt works within modern JavaScript environments, including CommonJS (Node.js) and AMD (require.js). If it isn't compatible with your favorite runtime, please file a bug, or (better still) make a pull-request.

#### Dependencies

Salt depends on the [Panzer](http://github.com/bemson/Panzer) library. Visit the Panzer project page, to learn about it's dependencies and requirements.

Salt also uses the following ECMAScript 5 features:
  * [Array.filter](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/filter)
  * [Array.map](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/map)
  * [Object.keys](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/keys)
  * [String.trim](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String/trim)

You will need to implement shims for these methods in unsupported environments - specifically , Internet Explorer versions 6, 7 & 8. ([Augment.js](http://augmentjs.com/) shims these and other missing methods.)

### Web Browsers

Use a `<SCRIPT>` tag to load the _salt.min.js_ file in your web page. The file includes Salt dependencies for your convenience. Loading this file adds the `Salt` namespace to the global scope.

```html
  <script type="text/javascript" src="path/to/salt.min.js"></script>
  <script type="text/javascript">
    // ... Salt dependent code ...
  </script>
```

### Node.js

  * `npm install salt` if you're using [npm](http://npmjs.org/)
  * `component install bemson/salt` if you're using [component](https://github.com/component/component)
  * `bower install salt` if you're using [Bower](http://bower.io)

### AMD

Assuming you have a [require.js](http://requirejs.org/) compatible loader, configure an alias for the Salt module (the alias "salt" is recommended, for consistency). The _salt_ module exports the Salt constructor, not a module namespace.

```js
require.config({
  paths: {
    salt: 'libs/salt'
  }
});
```

**Note:** You will need to define additional aliases, in order to load Salt dependencies.

Then require and use the module in your application code:

```js
require(['salt'], function (Salt) {
  // ... Salt dependent code ...
});
```

**Warning:** Do not load the minified file via AMD, since it includes Salt dependencies which themselves export modules. Use AMD optimizers like [r.js](https://github.com/jrburke/r.js/) in order to roll-up your dependency tree.

## Testing

Salt has over 350 unit tests to inspire and guide your usage. They were written with [Mocha](http://visionmedia.github.io/mocha), using [Chai](http://chaijs.com/) and [Sinon](http://sinonjs.org) (via the [Sinon-chai](http://chaijs.com/plugins/sinon-chai) plugin).

  * To browse test results, visit [Salt on Travis-CI](https://travis-ci.org/bemson/salt).
  * To run tests in Node, invoke `npm test`
  * To run tests in a browser: (1) install Salt, then (2) load _test/index.html_ locally. (Unfortunately, the tests do not run in IE6, 7, or 8.)

## Shout-outs

  * Peter Jones - Best. Sounding. Board. Ever.
  * [Tom Longson](https://github.com/nym) - My first guinea-pig, some three years ago...
  * [Malaney J. Hill](https://github.com/malaney) - We demystified the **m.e.s.s.** in code: modes, exceptions, states, and steps.
  * [WF2 crew](https://github.com/wf2) - Your horrifically frustrating legacy code started all of this.

## License

Salt is available under the terms of the [MIT-License](http://en.wikipedia.org/wiki/MIT_License#License_terms).

Copyright 2014, Bemi Faison

[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/bemson/salt/trend.png)](https://bitdeli.com/free "Bitdeli Badge")

