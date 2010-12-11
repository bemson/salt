Flow = function () {
	
}

var sys = {
	emptyFnc: function () {},
	isFnc: function (v) {
		return typeof v === 'function'
	},
	isStr: function (v) {
		return typeof v === 'string'
	},
	meta: {
		fncs: ['in','main','out','over'],
		keys: ['name'],
		prefix: '_'
	}
};

function Node(def, name, parent) {
	var node = this,
		i,meta;

	node.nodes = [];
	node.fncs = {};
	//node.parent = parent;
	node.name = name;
	node.position = parent ? parent.nodes.length : 0;
	node.path = parent ? parent.path + '.' + node.position : '0';

	if (sys.isFnc(def)) {
		node.fncs.main = def;
	} else {
		for (i in def) {
			if (def.hasOwnProperty(i)) {
				if (i.charAt(0) === sys.meta.prefix) {
					meta = i.substring(1);
					if (sys.meta.fncs.indexOf(meta) > -1 && sys.isFnc(def[i])) {
						node.fncs[meta] = def[i];
					} else if (sys.meta.keys.indexOf(meta) > -1 && sys.isStr(def[i])) {
						node[meta] = def[i];
					} else {
						// throw error - illegal prefix / unknown meta
					}
				} else {
					//def[i][sys.meta.prefix + 'name'] = i;
					node.nodes.push(new Node(def[i],i,node));
				}
			}
		}
	}
}
