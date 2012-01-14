var T = {
  type: function (thing) {
    return Object.prototype.toString.call(thing).match(/\s(.+)\]$/)[1].toLowerCase();
  }
};

module('Package');

test('Dependencies', 3, function () {
  equal(typeof Flow, 'function', 'The Flow platform is present.');
  var pkgs = Flow.pkg();
  ok(~pkgs.indexOf('core'), 'The "core" package is present.');
  ok(~pkgs.indexOf('debug'), 'The "debug" package is present.');
});

test('Definition', 7, function () {
  var debugPkgDef = Flow.pkg('debug');
  'addStatus|init|slow|onBegin|onTraverse|onEnd|monitor'.split('|').forEach(function (mbr) {
    ok(debugPkgDef.hasOwnProperty(mbr), 'The debug package-definition has a "' + mbr + '" member.');
  });
});

test('Instance', 4, function () {
  var debugInst = Flow.pkg('debug')(new Flow());
  'log'.split('|').forEach(function (mbr) {
    equal(typeof debugInst[mbr], 'function', 'The package-instance method "' + mbr + '" is present.');
  });
  'id|name|events'.split('|').forEach(function (mbr) {
    ok(typeof debugInst[mbr] !== 'undefined', 'The package-instance property "' + mbr + '" is present.');
  });
});
