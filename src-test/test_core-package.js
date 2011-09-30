module('Package');

test('Dependencies', 2, function () {
  ok(Array.prototype.every, 'Array.prototype.every exists.');
  ok(Flow.pkg().filter(function (pkg) {
      return pkg === 'core';
    }).length, 'The "core" package is present.');
});

test('Definition', 8, function () {
  var corePkgDef = Flow.pkg('core');
  'addStatus|events|dataKey|invalidKey|init|onBegin|onTraverse|onEnd'.split('|').forEach(function (mbr) {
    ok(corePkgDef[mbr], 'The package-definition has a "' + mbr + '" member.');
  });
});

test('Instance', 5, function () {
  var coreInst = Flow.pkg('core')(new Flow());
  'indexOf|vetIndexOf|getVar|scopeVars|go'.split('|').forEach(function (mbr) {
    equal(typeof coreInst[mbr], 'function', 'The package-instance method "' + mbr + '" is present.');
  });
});

test('Proxy', 9, function () {
  var flow = new Flow();
  'map|query|lock|vars|args|target|go|wait|status'.split('|').forEach(function (mbr) {
    equal(typeof flow[mbr], 'function', 'The proxy method "' + mbr + '" is present.');
  });
});

module('Definition');

