# Salt

**State And Logic Traversal, for today's infinite-application.**

version 0.5.0
by Bemi Faison

[![Build Status](https://travis-ci.org/bemson/salt.png?branch=master)](https://travis-ci.org/bemson/salt)

## Description

Salt is a state-based JavaScript library that offers unparalleled code organization and unprecedented flow control. No matter how you code an application, the JavaScript event loop sees it as a sequence of functions, invoked over time. Salt simply provides a pattern for describing that sequence, along with an API to control timing. The result captures the flow to your functionality, in code, bridging the gap between specification and implementation.

In this age of the "infinite application" (ever-changing requirements, never-ending enhancements) Salt is designed to produce long-lived documents. Traditional, bottom-up designs inevitably fail the test of _change_; any implementation _works_, but - like shifting blocks of a pyramid - it's not long before things fall apart. Salt recognizes that an application is greater than the sum of it's parts. The top-down approach gives a holistic view of functional relationships, and thus greater confidence and freedom to change them.


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

```
0: ..//
1: //
2: //piece/
3: //piece/together/
4: //speak/
```

The first two states exist for every Salt instance: the _null_ and _program-root_ states, respectively. As well, all instances start "on" the _null_ state, which parents the _program-root_ - the first state from your program. The numbers represent each state's compilation order, and may be used when specifying navigation targets.

#### Relying on state order

While tag order is irrelevant, state order _can_ matter in a program. Despite [every known JavaScript runtime](https://github.com/bemson/salt/wiki/About-Key-Order-Preservation) exhibiting the same [FIFO](http://en.wikipedia.org/wiki/FIFO) object-member policy, wary developers can rest assured that you do not have to use the order dependent features of Salt.

For instance, with the example above, you could replace the spatial query "@next" with the relative query "../speak". The relative query requires a specific sibling. The spatial query requires a specific relationship. Both retain a level of portability, via the `_tail` tag.


### Controlling and Accessing your Salt instance

With your Salt instance created, you can direct it to a given program state, using any of the pre-compiled endpoints, in order to execute your logic. Navigation ends when the destination state is both transitioned "in" and "on" by the Salt instance.

```js
helloSalt.go('//piece/together');
// hello world!
```

As the console output above demonstrates, Salt invokes transition logic while navigating _towards_ a destination state. Parent states are entered, sibling states may be stepped "over" (towards a leaf-state) or "backwards-over" (towards the _program-root_). Either way, functionality may be added to a given transition, per state along a known path, allowing you to define infinitely granular structures, and implement even more discrete logic.

You can also inspect the `.state` property, in order to determine _where_ your Salt instance is in your program.

```js
console.log(helloSalt.state.path);  // "//speak/"
console.log(helloSalt.state.name);  // "speak"
console.log(helloSalt.state.index); // 4
```

To "exit" a program, direct Salt to it's _null_ state (at index 0). The _null_ state parents your program root, allowing you to trigger entry/exit transitions logic for that state.

```js
helloSalt.go(0);
// good-bye!
```

Salt has several features that exploit it's contextual execution environment. For example, the `_data` tag allows for "scoped" properties, which exist in (and only in) the state that declared it. Now on the __null_ state, our salt no longer has a `data.phrase` property. This is because we've exited the _program-root_ that declares it.

```js
console.log(helloSalt.data.phrase); // undefined
```

------

Salt is a hybrid declarative and procedural architecture, which offers many development and extension possibilities. Please visit the [online wiki](http://github.com/bemson/salt/wiki) to review the [Salt instance API](https://github.com/bemson/salt/wiki/Salt-API) and [program tag glossary](https://github.com/bemson/salt/wiki/Progam-Tags).


## Installation

Salt works within modern JavaScript environments, including CommonJS (Node.js) and AMD (require.js). If it isn't compatible with your favorite runtime, please file a bug, or (better still) make a pull-request.

#### Dependencies

Salt depends on the [Panzer](http://github.com/bemson/Panzer) library, which has it's own dependencies and requirements.

Salt uses the following ECMAScript 5 features:
  * [Array.forEach](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach)
  * [Array.map](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/map)
  * [Object.keys](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/keys)
  * [String.trim](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String/trim)

You will need to implement shims for incompatible environments - specifically , Internet Explorer versions 6, 7 & 8.

### Web Browsers

Use a `<SCRIPT>` tag to load the _salt.min.js_ file in your web page. The file includes Salt dependencies for your convenience. Loading this file adds the `Salt` namespace to the global scope.

```html
  <script type="text/javascript" src="path/to/salt.min.js"></script>
  <script type="text/javascript">
    // ... Salt dependent code ...
  </script>
```

### Node.js

Use [npm](http://npmjs.org) to install the [salt](https://npmjs.org/package/salt) module, along with it's dependencies. The _salt_ module exports the Salt constructor, not a module namespace.

```bash
npm install salt
```

Then require and use it in your application code:

```js
var Salt = require('salt');

// ... Salt dependent code ...
```

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

## Shout-outs

  * Peter Jones - Best. Sounding. Board. Ever.
  * [Tom Longston](https://github.com/nym) - For being my first guinea-pig, more than four years ago...
  * [Malaney J. Hill](https://github.com/malaney) - For helping demystify the **m.e.s.s.** in code (i.e., modes, exceptions, stages, and steps).
  * [WF2 crew](https://github.com/wf2) - Were it not for your frustrating legacy code, this project would not exist.

## License

Flow is available under the terms of the [MIT-License](http://en.wikipedia.org/wiki/MIT_License#License_terms).

Copyright 2014, Bemi Faison