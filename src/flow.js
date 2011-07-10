/*
* Flow (NextGen) v0.X
* http://github.com/bemson/Flow/
*
* Copyright 2011, Bemi Faison
* Released under the MIT License
*/
!function (window, undefined) {
 // init vars
 var sig = {}, // private signature object for priviledged access
   pkgDefs = [], // collection of package-definitions
   pkgsIdx = {}, // name index of package-definitions
   genStates = new genData( // spawn state generator
     function (name, value, parent, dataset, flags) {
       // init vars
       var state = this, // alias state
         isInvalid = name && !pkgDefs.every(function (pkgDef) { // flag true when a package deems this an invalid key
           // init vars
           var hdlr = pkgDef.pkg.invalidKey; // get invalidKey handler - returns/evaluates true when the name is invalid
           // return true when there is no handler, or it's function that returns true, or a regex that returns true
           return !hdlr || !(typeof hdlr === 'function' ? hdlr(name, value) : hdlr.test(name));
         }),
         isData = name && !pkgDefs.every(function (pkgDef) { // flag true when a package deems this a data key
           // init vars
           var hdlr = pkgDef.pkg.dataKey; // get dataKey handler - returns/evaluates true when the name is invalid
           // return true when there is no handler, or it's function that returns true, or a regex that returns true
           return !hdlr || !(typeof hdlr === 'function' ? hdlr(name, value) : hdlr.test(name));
         });
       // if this key is invalid or flagged as data...
       if (isInvalid || isData) {
         // exclude from dataset and don't scan
         flags.exclude = 1;
         // don't scan this value
         flags.scanValue = 0;
         // if valid data, capture in parent data
         if (isData && !isInvalid) parent.data[name] = value;
       } else { // otherwise, when this key is not invalid or data...
         // set default property values to undefined (presence reduces prototype property lookups)
         state.inContext = state.parentIndex = state.previousIndex = state.nextIndex = state.firstChildIndex = undefined;
         // capture index of this item once added
         state.index = dataset.length + 1;
         // capture depth
         state.depth = parent ? parent.depth + 1 : 1; // start depth at 1, since _flow state will be prepended later
         // set name
         state.name = parent ? name : '_root';
         // init data property - holds any attributes of this state
         state.data = {};
         // start or extend parent location
         state.location = parent ? parent.location + name + '/' : '//';
         // init child collection
         state.children = [];
         // if there is a parent state...
         if (parent) {
           // set parent index
           state.parentIndex = parent.index;
           // if there are no children, set first child index
           if (!parent.children.length) parent.firstChildIndex = state.index;
           // capture the index of this state in the parent's child collection
           state.childIndex = parent.children.push(state.index) - 1;
           // set this state as the last child of the parent
           parent.lastChildIndex = state.index;
           // if not the first child...
           if (state.childIndex) {
             // reference index of previous state
             state.previousIndex = parent.children[state.childIndex - 1];
             // reference index of this state in the previous state
             dataset[state.previousIndex - 1].nextIndex = state.index;
           }
         }
       }
     }
   );
 // define prototype base for FlowAPI instances
 function ProxyModel() {}
 // create
 function definePackage(name) {
   // package returns the private instance of it's public proxy
   function pkg(pxy) {
     // init vars
     var flow = pxy && pxy.toString(sig); // pass secret to pxy's toString
     // return the package instance with this name
     return typeof flow === 'object' && (flow.pkgs.filter(function (pkgInst) {
       return pkgInst.name === name
     })[0] || {}).pkg
   }
   // set default static properties
   pkg.init = pkg.dataKey = pkg.invalidKey = pkg.onStart = pkg.onEnd = pkg.onFinish = pkg.onTraverse = 0;
   // define new prototype-model for this package
   function Model() {}
   // chain existing FlowModel to this model
   Model.prototype = new ProxyModel();
   // define new FlowModel from this extended chain
   ProxyModel = Model;
   // expose the model's prototype for adding API methods
   pkg.api = Model.prototype;
   // define package definition object, to capture and index this package and it's model
   pkgsIdx[name] = pkgDefs.push({
     name: name,
     pkg: pkg,
     model: Model
   }) - 1;
   // return package
   return pkg;
 }
 function getStates(program) {
   // init vars
   var states = genStates(program); // parse initial states
   // set parent and childIndex of root
   states[0].parentIndex = states[0].childIndex = 0;
   // prepend flow state
   states.unshift(genStates()[0]);
   // reference index of root as child of flow
   states[0].children.push(1);
   // set name
   states[0].name = '_flow';
   // set index
   states[0].index = 0;
   // set depth
   states[0].depth = 0;
   // set location
   states[0].location = '..//';
   // reference the first and last child index
   states[0].firstChildIndex = states[0].lastChildIndex = 1;
   // return states
   return states;
 }
 function Flow(program, proxy) {
   // init vars
   var flow = this; // alias this instance
   // states for this program
   flow.states = getStates(program);
   // define shared pkg api
   flow.shared = {
     // index of the current program state
     currentIndex: 0,
     // index of the target program state
     targetIndex: 0,
     // define scoped call to direct this flow
     go: function (idx) {
       // set target to the state at the given index
       flow.target = flow.states[idx];
       // set target index
       flow.shared.targetIndex = idx;
       // set internal stop flag
       flow.stop = 0;
       // traverse towards the target
       return flow.go();
     },
     // define scoped call to stop this flow
     stop: function () {
       // set internal stop flag
       flow.stop = 1;
       // flag success in setting the stop flag
       return true;
     }
   };
   // init current state reference
   flow.current = flow.states[0];
   // init target state and looping flags
   flow.target = flow.looping = 0;
   // define a pkg instance for each definition...
   flow.pkgs = pkgDefs.map(function (pkgDef) {
     // init vars
     var pkgInst = { // init pkg instance
       // capture package name for lookups
       name: pkgDef.name
     };
     // define base package
     function pkgBase() {}
     // extend the base package prototype
     pkgBase.prototype = new pkgDef.pkg();
     // set pkg to new pkgBase
     pkgInst.pkg = new pkgBase();
     // clone states from this flow
     pkgInst.pkg.states = flow.states.map(function (state) {
       // define anonymous constructor
       function copyState() {};
       // use state as prototype for this object
       copyState.prototype = state;
       // return copy of this state
       return new copyState();
     });
     // if there is a package initialization function...
     if (pkgDef.pkg.init) {
       // initialize package instance according to the definition's function
       pkgDef.pkg.init.call(pkgInst.pkg);
     }
     // add flow and proxy properties
     // expose shared api to this package instance
     pkgInst.pkg.flow = flow.shared;
     // expose public proxy to this package instance
     pkgInst.pkg.proxy = proxy;
     // return the pkgInst
     return pkgInst;
   });
   console.log('built flow',flow);
 }
 Flow.prototype = {
   // head towards the current target
   go: function () {
     // init vars
     var flow = this, // alias self
       states = flow.states, // alias states (for minification & performance)
       shared = flow.shared, // alias shared (for minification & performance)
       dir, // direction of traversal movement
       curState = flow.current, // alias the current state (for minification & performance)
       nextIsEvent = 0, // flag when the nextInt is an event (when 0) or state index (when 1)
       nextInt = 0, // integer representing the state index or event type
       firedStop, // flag when we've fired the stop event
       firedFinish; // flag when we've fired the finish event
     // if already looping...
     if (flow.looping) {
       // flag true if there is a current target
       return !!flow.target;
     }
     // flag that this flow is looping
     flow.looping = 1;
     // fire start event
     flow.fire('Start');
     // while looping...
     while (flow.looping) {
       // if there is a target and we haven't stopped...
       if (flow.target && !flow.stop) {
         // reset firedStop and firedFinish flags
         firedStop = firedFinish = 0;
         // get traversal direction
         dir = flow.target.index - curState.index;
         // if moving backwards...
         if (dir < 0) {
           // if within this state...
           if (curState.inContext) {
             // flag that we're doing an event
             nextIsEvent = 1;
             // set to out event
             nextInt = 2;
             // flag that we've set an out event for this state
             curState.setOut = 1;
             // flag that we're out of the current state
             curState.inContext = 0;
           } else if (curState.setOut) { // or, when we've already done an out event with this state...
             // flag that we're switch the current state
             nextIsEvent = 0;
             // set to the previous or parent state
             nextInt = curState.previousIndex || curState.parentIndex;
           } else { // otherwise, when we're not in context and haven't been set outside...
             // flag that we're doing an event
             nextIsEvent = 1;
             // set to bover event
             nextInt = 4;
             // flag that we've set an out event for this state
             curState.setOut = 1;
           }
         } else if (dir) { // or, when going forwards...
           // if the next state is less-than or equal-to the target state...
           if (curState.nextIndex <= flow.target.index) {
             // if within this state...
             if (curState.inContext) {
               // flag that we're doing an event
               nextIsEvent = 1;
               // set to out event
               nextInt = 2;
               // flag that we've set an out event for this state
               curState.setOut = 1;
               // flag that we're out of the current state
               curState.inContext = 0;
             } else if (curState.setOut) { // or, when we've already done an out event with this state...
               // flag that we're switch the current state
               nextIsEvent = 0;
               // set to the next index
               nextInt = curState.nextIndex;
             } else { // otherwise, when out of context and there hasn't been an out event...
               // flag that we're doing an event
               nextIsEvent = 1;
               // set to over event
               nextInt = 3;
               // flag that we've set an out event for this state
               curState.setOut = 1;
             }
           } else { // otherwise, when the next state is not less than the target....
             // if we're in this state...
             if (curState.inContext) {
               // flag that we're switching the current state
               nextIsEvent = 0;
               // set to the first child
               nextInt = curState.firstChildIndex;
             } else { // otherwise, when we're not in this state...
               // flag that we're doing an event
               nextIsEvent = 1;
               // set to in event
               nextInt = 1;
               // flag that we're in the current state
               curState.inContext = 1;
             }
           }
         } else { // (otherwise), when on the target state...
           // flag that we're doing an event
           nextIsEvent = 1;
           // set to in or on event, based on the current context
           nextInt = curState.inContext ? 0 : 1;
           // if already in context...
           if (curState.inContext) {
             // clear internal target
             flow.target = 0;
             // clear shared target (set to negative one)
             shared.targetIndex = -1;
           }
           // flag that we're in (or now on) the current state
           curState.inContext = 1;
         }
         // if doing an event...
         if (nextIsEvent) {
           // fire traverse event with the resolved next target
           flow.fire('Traverse', [nextInt]);
         } else { // otherwise, when changing the current state...
           // reset setOut flag from the current state
           curState.setOut 