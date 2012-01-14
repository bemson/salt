/*!
 * Flow Package: timeout v1.0 / Bemi Faison (c) 2011 / MIT
 *
 * Depends on the Flow platform
 * http://github.com/bemson/Flow/tree/nextgen
 */
!function (Flow, window, undefined) {
	// if Flow and any required packages are missing, or this package already exists...
	if (!Flow || !getPkg('core') || getPkg('timeout')) {
		// exit this initialization function
		return;
	}

	var
		// reference the last defined package's wait call (which may be in it's prototype)
		superWaitMethod = Flow.pkg(Flow.pkg().slice(-1)[0]).proxy.wait,
		// initialize this package
		timePkg = Flow.pkg('timeout'),
		// reference the core package
		corePkg = Flow.pkg('core'),
		// capture the real setTimeout method
		setTimeout = window.setTimeout,
		// capture the real clearTimeout method
		clearTimeout = window.clearTimeout,
		// flag when the setTimeout call is coming from the proxy.wait() method
		calledFromWait = 0;

	// initialize the package-instance
	timePkg.init = function () {
		// collection of setTimeout delay times
		this.delays = [];
		// collection of setTimeout identifiers
		this.timers = [];
	};

	// clear any trailing timeout
	timePkg.onBegin = function () {
		// if timers remain...
		if () {
			
		}
	};

	// reset the timeout interval when traversing any state
	timePkg.onTraverse = function () {
		// reset the collection of timer delays
		this.delays = [];
		// reset the collection of timer references
		this.timers = [];
		// reset the collection of max delays
		this.maxDelays = [];
	};

	// return the given package if it exists (otherwise 0)
	function getPkg(pkgName) {
		return ~Flow.pkg().indexOf(pkgName) && Flow.pkg(pkgName);
	}

	// override the wait method
	timePkg.proxy.wait = function () {
		// protect this call to setTimeout
		calledFromWait = 1;
		// execute the next wait call in the prototype chain
		var waitResult = superWaitMethod.apply(this, arguments);
		// turn off protected flag
		calledFromWait = 0;
		// return result of wait call
		return waitResult;
	};

	// override the setTimeout method
	window.setTimeout = function (fnc, time) {
		var
			// capture pointer from invoking the intended setTimeout call
			setTimeoutPointer = setTimeout.apply(window, arguments),
			// reference the flow currently executing (if any)
			flow = corePkg.actives[0],
			// placeholders for calculating the max delay time
			oldMax, newMax;
		// if there is an active flow, and this call did not come from the .wait() method...
		if (flow && !calledFromWait) {
			// resolve this package's instance
			flow = timePkg(flow);
			// capture last/current maximum delay
			oldMax = flow.maxDelays.slice(-1)[0];
			// determine new max, based on the given time
			newMax = Math.max(oldMax, time);
			// capture this timeout pointer
			flow.timers.push(setTimeoutPointer);
			// capture this timeout delay
			flow.delays.push(time);
			// capture the max delay after setting this timeout
			flow.maxDelays.push(newMax);
			// if the max has changed...
			if (oldMax !== newMax) {
				// use .wait() to pause this flow for this max period of time
				flow.proxy.wait(newMax);
			}
		}
		// return the timeout pointer
		return setTimeoutPointer;
	};

	// override the clearTimeout method
	window.clearTimeout = function (id) {
		var
			// reference the flow currently executing (if any)
			flow = corePkg.actives[0],
			// placeholder for the matching identifier's index
			idIdx;
		// clear this timeout
		clearTimeout(id);
		// if there is an active flow, and this cleared a tracked timeout call
		if (flow && (flow = timePkg(flow) && ~(idIdx = flow.timers.indexOf(id)))) {
			// remove this timeout identifier from the timers
			flow.timers.slice(idIdx, 1);
			// remove this index from the delays collection
			flow.delays.slice(idIdx, 1);
			// remove this index from the maxDelays collection
			flow.maxDelays.slice(idIdx, 1);
			// if there is still a max delay...
			if (flow.maxDelays) {
				
			}
		}
	};
	
}((typeof require !== 'undefined' ? require('Flow.js') : this).Flow, this);