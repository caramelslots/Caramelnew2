import { r as __toESM, t as __commonJSMin } from "./rolldown-runtime-DC62tzP2.js";
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/extensions/Extensions.mjs
var ExtensionType = /* @__PURE__ */ ((ExtensionType2) => {
	ExtensionType2["Application"] = "application";
	ExtensionType2["WebGLPipes"] = "webgl-pipes";
	ExtensionType2["WebGLPipesAdaptor"] = "webgl-pipes-adaptor";
	ExtensionType2["WebGLSystem"] = "webgl-system";
	ExtensionType2["WebGPUPipes"] = "webgpu-pipes";
	ExtensionType2["WebGPUPipesAdaptor"] = "webgpu-pipes-adaptor";
	ExtensionType2["WebGPUSystem"] = "webgpu-system";
	ExtensionType2["CanvasSystem"] = "canvas-system";
	ExtensionType2["CanvasPipesAdaptor"] = "canvas-pipes-adaptor";
	ExtensionType2["CanvasPipes"] = "canvas-pipes";
	ExtensionType2["Asset"] = "asset";
	ExtensionType2["LoadParser"] = "load-parser";
	ExtensionType2["ResolveParser"] = "resolve-parser";
	ExtensionType2["CacheParser"] = "cache-parser";
	ExtensionType2["DetectionParser"] = "detection-parser";
	ExtensionType2["MaskEffect"] = "mask-effect";
	ExtensionType2["BlendMode"] = "blend-mode";
	ExtensionType2["TextureSource"] = "texture-source";
	ExtensionType2["Environment"] = "environment";
	ExtensionType2["ShapeBuilder"] = "shape-builder";
	ExtensionType2["Batcher"] = "batcher";
	return ExtensionType2;
})(ExtensionType || {});
var normalizeExtension = (ext) => {
	if (typeof ext === "function" || typeof ext === "object" && ext.extension) {
		if (!ext.extension) throw new Error("Extension class must have an extension object");
		ext = {
			...typeof ext.extension !== "object" ? { type: ext.extension } : ext.extension,
			ref: ext
		};
	}
	if (typeof ext === "object") ext = { ...ext };
	else throw new Error("Invalid extension type");
	if (typeof ext.type === "string") ext.type = [ext.type];
	return ext;
};
var normalizeExtensionPriority = (ext, defaultPriority) => normalizeExtension(ext).priority ?? defaultPriority;
var extensions = {
	/** @ignore */
	_addHandlers: {},
	/** @ignore */
	_removeHandlers: {},
	/** @ignore */
	_queue: {},
	/**
	* Remove extensions from PixiJS.
	* @param extensions - Extensions to be removed.
	* @returns {extensions} For chaining.
	*/
	remove(...extensions2) {
		extensions2.map(normalizeExtension).forEach((ext) => {
			ext.type.forEach((type) => this._removeHandlers[type]?.(ext));
		});
		return this;
	},
	/**
	* Register new extensions with PixiJS.
	* @param extensions - The spread of extensions to add to PixiJS.
	* @returns {extensions} For chaining.
	*/
	add(...extensions2) {
		extensions2.map(normalizeExtension).forEach((ext) => {
			ext.type.forEach((type) => {
				const handlers = this._addHandlers;
				const queue = this._queue;
				if (!handlers[type]) {
					queue[type] = queue[type] || [];
					queue[type]?.push(ext);
				} else handlers[type]?.(ext);
			});
		});
		return this;
	},
	/**
	* Internal method to handle extensions by name.
	* @param type - The extension type.
	* @param onAdd  - Function handler when extensions are added/registered {@link StrictExtensionFormat}.
	* @param onRemove  - Function handler when extensions are removed/unregistered {@link StrictExtensionFormat}.
	* @returns {extensions} For chaining.
	*/
	handle(type, onAdd, onRemove) {
		const addHandlers = this._addHandlers;
		const removeHandlers = this._removeHandlers;
		if (addHandlers[type] || removeHandlers[type]) throw new Error(`Extension type ${type} already has a handler`);
		addHandlers[type] = onAdd;
		removeHandlers[type] = onRemove;
		const queue = this._queue;
		if (queue[type]) {
			queue[type]?.forEach((ext) => onAdd(ext));
			delete queue[type];
		}
		return this;
	},
	/**
	* Handle a type, but using a map by `name` property.
	* @param type - Type of extension to handle.
	* @param map - The object map of named extensions.
	* @returns {extensions} For chaining.
	*/
	handleByMap(type, map) {
		return this.handle(type, (extension) => {
			if (extension.name) map[extension.name] = extension.ref;
		}, (extension) => {
			if (extension.name) delete map[extension.name];
		});
	},
	/**
	* Handle a type, but using a list of extensions with a `name` property.
	* @param type - Type of extension to handle.
	* @param map - The array of named extensions.
	* @param defaultPriority - Fallback priority if none is defined.
	* @returns {extensions} For chaining.
	*/
	handleByNamedList(type, map, defaultPriority = -1) {
		return this.handle(type, (extension) => {
			if (map.findIndex((item) => item.name === extension.name) >= 0) return;
			map.push({
				name: extension.name,
				value: extension.ref
			});
			map.sort((a, b) => normalizeExtensionPriority(b.value, defaultPriority) - normalizeExtensionPriority(a.value, defaultPriority));
		}, (extension) => {
			const index = map.findIndex((item) => item.name === extension.name);
			if (index !== -1) map.splice(index, 1);
		});
	},
	/**
	* Handle a type, but using a list of extensions.
	* @param type - Type of extension to handle.
	* @param list - The list of extensions.
	* @param defaultPriority - The default priority to use if none is specified.
	* @returns {extensions} For chaining.
	*/
	handleByList(type, list, defaultPriority = -1) {
		return this.handle(type, (extension) => {
			if (list.includes(extension.ref)) return;
			list.push(extension.ref);
			list.sort((a, b) => normalizeExtensionPriority(b, defaultPriority) - normalizeExtensionPriority(a, defaultPriority));
		}, (extension) => {
			const index = list.indexOf(extension.ref);
			if (index !== -1) list.splice(index, 1);
		});
	},
	/**
	* Mixin the source object into the target object.
	* @param Target - The target object to mix into.
	* @param sources - The source(s) object to mix from
	*/
	mixin(Target, ...sources) {
		for (const source of sources) Object.defineProperties(Target.prototype, Object.getOwnPropertyDescriptors(source));
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/maths/point/ObservablePoint.mjs
var ObservablePoint = class ObservablePoint {
	/**
	* Creates a new `ObservablePoint`
	* @param observer - Observer to pass to listen for change events.
	* @param {number} [x=0] - position of the point on the x axis
	* @param {number} [y=0] - position of the point on the y axis
	*/
	constructor(observer, x, y) {
		this._x = x || 0;
		this._y = y || 0;
		this._observer = observer;
	}
	/**
	* Creates a clone of this point.
	* @param observer - Optional observer to pass to the new observable point.
	* @returns a copy of this observable point
	*/
	clone(observer) {
		return new ObservablePoint(observer ?? this._observer, this._x, this._y);
	}
	/**
	* Sets the point to a new `x` and `y` position.
	* If `y` is omitted, both `x` and `y` will be set to `x`.
	* @param {number} [x=0] - position of the point on the x axis
	* @param {number} [y=x] - position of the point on the y axis
	* @returns The observable point instance itself
	*/
	set(x = 0, y = x) {
		if (this._x !== x || this._y !== y) {
			this._x = x;
			this._y = y;
			this._observer._onUpdate(this);
		}
		return this;
	}
	/**
	* Copies x and y from the given point (`p`)
	* @param p - The point to copy from. Can be any of type that is or extends `PointData`
	* @returns The observable point instance itself
	*/
	copyFrom(p) {
		if (this._x !== p.x || this._y !== p.y) {
			this._x = p.x;
			this._y = p.y;
			this._observer._onUpdate(this);
		}
		return this;
	}
	/**
	* Copies this point's x and y into that of the given point (`p`)
	* @param p - The point to copy to. Can be any of type that is or extends `PointData`
	* @returns The point (`p`) with values updated
	*/
	copyTo(p) {
		p.set(this._x, this._y);
		return p;
	}
	/**
	* Accepts another point (`p`) and returns `true` if the given point is equal to this point
	* @param p - The point to check
	* @returns Returns `true` if both `x` and `y` are equal
	*/
	equals(p) {
		return p.x === this._x && p.y === this._y;
	}
	toString() {
		return `[pixi.js/math:ObservablePoint x=0 y=0 scope=${this._observer}]`;
	}
	/** Position of the observable point on the x axis. */
	get x() {
		return this._x;
	}
	set x(value) {
		if (this._x !== value) {
			this._x = value;
			this._observer._onUpdate(this);
		}
	}
	/** Position of the observable point on the y axis. */
	get y() {
		return this._y;
	}
	set y(value) {
		if (this._y !== value) {
			this._y = value;
			this._observer._onUpdate(this);
		}
	}
};
var eventemitter3_default = (/* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
	var has = Object.prototype.hasOwnProperty;
	var prefix = "~";
	/**
	* Constructor to create a storage for our `EE` objects.
	* An `Events` instance is a plain object whose properties are event names.
	*
	* @constructor
	* @private
	*/
	function Events() {}
	if (Object.create) {
		Events.prototype = Object.create(null);
		if (!new Events().__proto__) prefix = false;
	}
	/**
	* Representation of a single event listener.
	*
	* @param {Function} fn The listener function.
	* @param {*} context The context to invoke the listener with.
	* @param {Boolean} [once=false] Specify if the listener is a one-time listener.
	* @constructor
	* @private
	*/
	function EE(fn, context, once) {
		this.fn = fn;
		this.context = context;
		this.once = once || false;
	}
	/**
	* Add a listener for a given event.
	*
	* @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
	* @param {(String|Symbol)} event The event name.
	* @param {Function} fn The listener function.
	* @param {*} context The context to invoke the listener with.
	* @param {Boolean} once Specify if the listener is a one-time listener.
	* @returns {EventEmitter}
	* @private
	*/
	function addListener(emitter, event, fn, context, once) {
		if (typeof fn !== "function") throw new TypeError("The listener must be a function");
		var listener = new EE(fn, context || emitter, once), evt = prefix ? prefix + event : event;
		if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
		else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
		else emitter._events[evt] = [emitter._events[evt], listener];
		return emitter;
	}
	/**
	* Clear event by name.
	*
	* @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
	* @param {(String|Symbol)} evt The Event name.
	* @private
	*/
	function clearEvent(emitter, evt) {
		if (--emitter._eventsCount === 0) emitter._events = new Events();
		else delete emitter._events[evt];
	}
	/**
	* Minimal `EventEmitter` interface that is molded against the Node.js
	* `EventEmitter` interface.
	*
	* @constructor
	* @public
	*/
	function EventEmitter() {
		this._events = new Events();
		this._eventsCount = 0;
	}
	/**
	* Return an array listing the events for which the emitter has registered
	* listeners.
	*
	* @returns {Array}
	* @public
	*/
	EventEmitter.prototype.eventNames = function eventNames() {
		var names = [], events, name;
		if (this._eventsCount === 0) return names;
		for (name in events = this._events) if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
		if (Object.getOwnPropertySymbols) return names.concat(Object.getOwnPropertySymbols(events));
		return names;
	};
	/**
	* Return the listeners registered for a given event.
	*
	* @param {(String|Symbol)} event The event name.
	* @returns {Array} The registered listeners.
	* @public
	*/
	EventEmitter.prototype.listeners = function listeners(event) {
		var evt = prefix ? prefix + event : event, handlers = this._events[evt];
		if (!handlers) return [];
		if (handlers.fn) return [handlers.fn];
		for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) ee[i] = handlers[i].fn;
		return ee;
	};
	/**
	* Return the number of listeners listening to a given event.
	*
	* @param {(String|Symbol)} event The event name.
	* @returns {Number} The number of listeners.
	* @public
	*/
	EventEmitter.prototype.listenerCount = function listenerCount(event) {
		var evt = prefix ? prefix + event : event, listeners = this._events[evt];
		if (!listeners) return 0;
		if (listeners.fn) return 1;
		return listeners.length;
	};
	/**
	* Calls each of the listeners registered for a given event.
	*
	* @param {(String|Symbol)} event The event name.
	* @returns {Boolean} `true` if the event had listeners, else `false`.
	* @public
	*/
	EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
		var evt = prefix ? prefix + event : event;
		if (!this._events[evt]) return false;
		var listeners = this._events[evt], len = arguments.length, args, i;
		if (listeners.fn) {
			if (listeners.once) this.removeListener(event, listeners.fn, void 0, true);
			switch (len) {
				case 1: return listeners.fn.call(listeners.context), true;
				case 2: return listeners.fn.call(listeners.context, a1), true;
				case 3: return listeners.fn.call(listeners.context, a1, a2), true;
				case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
				case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
				case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
			}
			for (i = 1, args = new Array(len - 1); i < len; i++) args[i - 1] = arguments[i];
			listeners.fn.apply(listeners.context, args);
		} else {
			var length = listeners.length, j;
			for (i = 0; i < length; i++) {
				if (listeners[i].once) this.removeListener(event, listeners[i].fn, void 0, true);
				switch (len) {
					case 1:
						listeners[i].fn.call(listeners[i].context);
						break;
					case 2:
						listeners[i].fn.call(listeners[i].context, a1);
						break;
					case 3:
						listeners[i].fn.call(listeners[i].context, a1, a2);
						break;
					case 4:
						listeners[i].fn.call(listeners[i].context, a1, a2, a3);
						break;
					default:
						if (!args) for (j = 1, args = new Array(len - 1); j < len; j++) args[j - 1] = arguments[j];
						listeners[i].fn.apply(listeners[i].context, args);
				}
			}
		}
		return true;
	};
	/**
	* Add a listener for a given event.
	*
	* @param {(String|Symbol)} event The event name.
	* @param {Function} fn The listener function.
	* @param {*} [context=this] The context to invoke the listener with.
	* @returns {EventEmitter} `this`.
	* @public
	*/
	EventEmitter.prototype.on = function on(event, fn, context) {
		return addListener(this, event, fn, context, false);
	};
	/**
	* Add a one-time listener for a given event.
	*
	* @param {(String|Symbol)} event The event name.
	* @param {Function} fn The listener function.
	* @param {*} [context=this] The context to invoke the listener with.
	* @returns {EventEmitter} `this`.
	* @public
	*/
	EventEmitter.prototype.once = function once(event, fn, context) {
		return addListener(this, event, fn, context, true);
	};
	/**
	* Remove the listeners of a given event.
	*
	* @param {(String|Symbol)} event The event name.
	* @param {Function} fn Only remove the listeners that match this function.
	* @param {*} context Only remove the listeners that have this context.
	* @param {Boolean} once Only remove one-time listeners.
	* @returns {EventEmitter} `this`.
	* @public
	*/
	EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
		var evt = prefix ? prefix + event : event;
		if (!this._events[evt]) return this;
		if (!fn) {
			clearEvent(this, evt);
			return this;
		}
		var listeners = this._events[evt];
		if (listeners.fn) {
			if (listeners.fn === fn && (!once || listeners.once) && (!context || listeners.context === context)) clearEvent(this, evt);
		} else {
			for (var i = 0, events = [], length = listeners.length; i < length; i++) if (listeners[i].fn !== fn || once && !listeners[i].once || context && listeners[i].context !== context) events.push(listeners[i]);
			if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
			else clearEvent(this, evt);
		}
		return this;
	};
	/**
	* Remove all listeners, or those of the specified event.
	*
	* @param {(String|Symbol)} [event] The event name.
	* @returns {EventEmitter} `this`.
	* @public
	*/
	EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
		var evt;
		if (event) {
			evt = prefix ? prefix + event : event;
			if (this._events[evt]) clearEvent(this, evt);
		} else {
			this._events = new Events();
			this._eventsCount = 0;
		}
		return this;
	};
	EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
	EventEmitter.prototype.addListener = EventEmitter.prototype.on;
	EventEmitter.prefixed = prefix;
	EventEmitter.EventEmitter = EventEmitter;
	if ("undefined" !== typeof module) module.exports = EventEmitter;
})))(), 1)).default;
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/maths/misc/const.mjs
var PI_2 = Math.PI * 2;
var RAD_TO_DEG = 180 / Math.PI;
var DEG_TO_RAD = Math.PI / 180;
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/maths/point/Point.mjs
var Point = class Point {
	/**
	* Creates a new `Point`
	* @param {number} [x=0] - position of the point on the x axis
	* @param {number} [y=0] - position of the point on the y axis
	*/
	constructor(x = 0, y = 0) {
		/** Position of the point on the x axis */
		this.x = 0;
		/** Position of the point on the y axis */
		this.y = 0;
		this.x = x;
		this.y = y;
	}
	/**
	* Creates a clone of this point
	* @returns A clone of this point
	*/
	clone() {
		return new Point(this.x, this.y);
	}
	/**
	* Copies `x` and `y` from the given point into this point
	* @param p - The point to copy from
	* @returns The point instance itself
	*/
	copyFrom(p) {
		this.set(p.x, p.y);
		return this;
	}
	/**
	* Copies this point's x and y into the given point (`p`).
	* @param p - The point to copy to. Can be any of type that is or extends `PointData`
	* @returns The point (`p`) with values updated
	*/
	copyTo(p) {
		p.set(this.x, this.y);
		return p;
	}
	/**
	* Accepts another point (`p`) and returns `true` if the given point is equal to this point
	* @param p - The point to check
	* @returns Returns `true` if both `x` and `y` are equal
	*/
	equals(p) {
		return p.x === this.x && p.y === this.y;
	}
	/**
	* Sets the point to a new `x` and `y` position.
	* If `y` is omitted, both `x` and `y` will be set to `x`.
	* @param {number} [x=0] - position of the point on the `x` axis
	* @param {number} [y=x] - position of the point on the `y` axis
	* @returns The point instance itself
	*/
	set(x = 0, y = x) {
		this.x = x;
		this.y = y;
		return this;
	}
	toString() {
		return `[pixi.js/math:Point x=${this.x} y=${this.y}]`;
	}
	/**
	* A static Point object with `x` and `y` values of `0`. Can be used to avoid creating new objects multiple times.
	* @readonly
	*/
	static get shared() {
		tempPoint.x = 0;
		tempPoint.y = 0;
		return tempPoint;
	}
};
var tempPoint = new Point();
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/maths/matrix/Matrix.mjs
var Matrix = class Matrix {
	/**
	* @param a - x scale
	* @param b - y skew
	* @param c - x skew
	* @param d - y scale
	* @param tx - x translation
	* @param ty - y translation
	*/
	constructor(a = 1, b = 0, c = 0, d = 1, tx = 0, ty = 0) {
		/** An array of the current matrix. Only populated when `toArray` is called */
		this.array = null;
		this.a = a;
		this.b = b;
		this.c = c;
		this.d = d;
		this.tx = tx;
		this.ty = ty;
	}
	/**
	* Creates a Matrix object based on the given array. The Element to Matrix mapping order is as follows:
	*
	* a = array[0]
	* b = array[1]
	* c = array[3]
	* d = array[4]
	* tx = array[2]
	* ty = array[5]
	* @param array - The array that the matrix will be populated from.
	*/
	fromArray(array) {
		this.a = array[0];
		this.b = array[1];
		this.c = array[3];
		this.d = array[4];
		this.tx = array[2];
		this.ty = array[5];
	}
	/**
	* Sets the matrix properties.
	* @param a - Matrix component
	* @param b - Matrix component
	* @param c - Matrix component
	* @param d - Matrix component
	* @param tx - Matrix component
	* @param ty - Matrix component
	* @returns This matrix. Good for chaining method calls.
	*/
	set(a, b, c, d, tx, ty) {
		this.a = a;
		this.b = b;
		this.c = c;
		this.d = d;
		this.tx = tx;
		this.ty = ty;
		return this;
	}
	/**
	* Creates an array from the current Matrix object.
	* @param transpose - Whether we need to transpose the matrix or not
	* @param [out=new Float32Array(9)] - If provided the array will be assigned to out
	* @returns The newly created array which contains the matrix
	*/
	toArray(transpose, out) {
		if (!this.array) this.array = /* @__PURE__ */ new Float32Array(9);
		const array = out || this.array;
		if (transpose) {
			array[0] = this.a;
			array[1] = this.b;
			array[2] = 0;
			array[3] = this.c;
			array[4] = this.d;
			array[5] = 0;
			array[6] = this.tx;
			array[7] = this.ty;
			array[8] = 1;
		} else {
			array[0] = this.a;
			array[1] = this.c;
			array[2] = this.tx;
			array[3] = this.b;
			array[4] = this.d;
			array[5] = this.ty;
			array[6] = 0;
			array[7] = 0;
			array[8] = 1;
		}
		return array;
	}
	/**
	* Get a new position with the current transformation applied.
	* Can be used to go from a child's coordinate space to the world coordinate space. (e.g. rendering)
	* @param pos - The origin
	* @param {Point} [newPos] - The point that the new position is assigned to (allowed to be same as input)
	* @returns {Point} The new point, transformed through this matrix
	*/
	apply(pos, newPos) {
		newPos = newPos || new Point();
		const x = pos.x;
		const y = pos.y;
		newPos.x = this.a * x + this.c * y + this.tx;
		newPos.y = this.b * x + this.d * y + this.ty;
		return newPos;
	}
	/**
	* Get a new position with the inverse of the current transformation applied.
	* Can be used to go from the world coordinate space to a child's coordinate space. (e.g. input)
	* @param pos - The origin
	* @param {Point} [newPos] - The point that the new position is assigned to (allowed to be same as input)
	* @returns {Point} The new point, inverse-transformed through this matrix
	*/
	applyInverse(pos, newPos) {
		newPos = newPos || new Point();
		const a = this.a;
		const b = this.b;
		const c = this.c;
		const d = this.d;
		const tx = this.tx;
		const ty = this.ty;
		const id = 1 / (a * d + c * -b);
		const x = pos.x;
		const y = pos.y;
		newPos.x = d * id * x + -c * id * y + (ty * c - tx * d) * id;
		newPos.y = a * id * y + -b * id * x + (-ty * a + tx * b) * id;
		return newPos;
	}
	/**
	* Translates the matrix on the x and y.
	* @param x - How much to translate x by
	* @param y - How much to translate y by
	* @returns This matrix. Good for chaining method calls.
	*/
	translate(x, y) {
		this.tx += x;
		this.ty += y;
		return this;
	}
	/**
	* Applies a scale transformation to the matrix.
	* @param x - The amount to scale horizontally
	* @param y - The amount to scale vertically
	* @returns This matrix. Good for chaining method calls.
	*/
	scale(x, y) {
		this.a *= x;
		this.d *= y;
		this.c *= x;
		this.b *= y;
		this.tx *= x;
		this.ty *= y;
		return this;
	}
	/**
	* Applies a rotation transformation to the matrix.
	* @param angle - The angle in radians.
	* @returns This matrix. Good for chaining method calls.
	*/
	rotate(angle) {
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		const a1 = this.a;
		const c1 = this.c;
		const tx1 = this.tx;
		this.a = a1 * cos - this.b * sin;
		this.b = a1 * sin + this.b * cos;
		this.c = c1 * cos - this.d * sin;
		this.d = c1 * sin + this.d * cos;
		this.tx = tx1 * cos - this.ty * sin;
		this.ty = tx1 * sin + this.ty * cos;
		return this;
	}
	/**
	* Appends the given Matrix to this Matrix.
	* @param matrix - The matrix to append.
	* @returns This matrix. Good for chaining method calls.
	*/
	append(matrix) {
		const a1 = this.a;
		const b1 = this.b;
		const c1 = this.c;
		const d1 = this.d;
		this.a = matrix.a * a1 + matrix.b * c1;
		this.b = matrix.a * b1 + matrix.b * d1;
		this.c = matrix.c * a1 + matrix.d * c1;
		this.d = matrix.c * b1 + matrix.d * d1;
		this.tx = matrix.tx * a1 + matrix.ty * c1 + this.tx;
		this.ty = matrix.tx * b1 + matrix.ty * d1 + this.ty;
		return this;
	}
	/**
	* Appends two matrix's and sets the result to this matrix. AB = A * B
	* @param a - The matrix to append.
	* @param b - The matrix to append.
	* @returns This matrix. Good for chaining method calls.
	*/
	appendFrom(a, b) {
		const a1 = a.a;
		const b1 = a.b;
		const c1 = a.c;
		const d1 = a.d;
		const tx = a.tx;
		const ty = a.ty;
		const a2 = b.a;
		const b2 = b.b;
		const c2 = b.c;
		const d2 = b.d;
		this.a = a1 * a2 + b1 * c2;
		this.b = a1 * b2 + b1 * d2;
		this.c = c1 * a2 + d1 * c2;
		this.d = c1 * b2 + d1 * d2;
		this.tx = tx * a2 + ty * c2 + b.tx;
		this.ty = tx * b2 + ty * d2 + b.ty;
		return this;
	}
	/**
	* Sets the matrix based on all the available properties
	* @param x - Position on the x axis
	* @param y - Position on the y axis
	* @param pivotX - Pivot on the x axis
	* @param pivotY - Pivot on the y axis
	* @param scaleX - Scale on the x axis
	* @param scaleY - Scale on the y axis
	* @param rotation - Rotation in radians
	* @param skewX - Skew on the x axis
	* @param skewY - Skew on the y axis
	* @returns This matrix. Good for chaining method calls.
	*/
	setTransform(x, y, pivotX, pivotY, scaleX, scaleY, rotation, skewX, skewY) {
		this.a = Math.cos(rotation + skewY) * scaleX;
		this.b = Math.sin(rotation + skewY) * scaleX;
		this.c = -Math.sin(rotation - skewX) * scaleY;
		this.d = Math.cos(rotation - skewX) * scaleY;
		this.tx = x - (pivotX * this.a + pivotY * this.c);
		this.ty = y - (pivotX * this.b + pivotY * this.d);
		return this;
	}
	/**
	* Prepends the given Matrix to this Matrix.
	* @param matrix - The matrix to prepend
	* @returns This matrix. Good for chaining method calls.
	*/
	prepend(matrix) {
		const tx1 = this.tx;
		if (matrix.a !== 1 || matrix.b !== 0 || matrix.c !== 0 || matrix.d !== 1) {
			const a1 = this.a;
			const c1 = this.c;
			this.a = a1 * matrix.a + this.b * matrix.c;
			this.b = a1 * matrix.b + this.b * matrix.d;
			this.c = c1 * matrix.a + this.d * matrix.c;
			this.d = c1 * matrix.b + this.d * matrix.d;
		}
		this.tx = tx1 * matrix.a + this.ty * matrix.c + matrix.tx;
		this.ty = tx1 * matrix.b + this.ty * matrix.d + matrix.ty;
		return this;
	}
	/**
	* Decomposes the matrix (x, y, scaleX, scaleY, and rotation) and sets the properties on to a transform.
	* @param transform - The transform to apply the properties to.
	* @returns The transform with the newly applied properties
	*/
	decompose(transform) {
		const a = this.a;
		const b = this.b;
		const c = this.c;
		const d = this.d;
		const pivot = transform.pivot;
		const skewX = -Math.atan2(-c, d);
		const skewY = Math.atan2(b, a);
		const delta = Math.abs(skewX + skewY);
		if (delta < 1e-5 || Math.abs(PI_2 - delta) < 1e-5) {
			transform.rotation = skewY;
			transform.skew.x = transform.skew.y = 0;
		} else {
			transform.rotation = 0;
			transform.skew.x = skewX;
			transform.skew.y = skewY;
		}
		transform.scale.x = Math.sqrt(a * a + b * b);
		transform.scale.y = Math.sqrt(c * c + d * d);
		transform.position.x = this.tx + (pivot.x * a + pivot.y * c);
		transform.position.y = this.ty + (pivot.x * b + pivot.y * d);
		return transform;
	}
	/**
	* Inverts this matrix
	* @returns This matrix. Good for chaining method calls.
	*/
	invert() {
		const a1 = this.a;
		const b1 = this.b;
		const c1 = this.c;
		const d1 = this.d;
		const tx1 = this.tx;
		const n = a1 * d1 - b1 * c1;
		this.a = d1 / n;
		this.b = -b1 / n;
		this.c = -c1 / n;
		this.d = a1 / n;
		this.tx = (c1 * this.ty - d1 * tx1) / n;
		this.ty = -(a1 * this.ty - b1 * tx1) / n;
		return this;
	}
	/** Checks if this matrix is an identity matrix */
	isIdentity() {
		return this.a === 1 && this.b === 0 && this.c === 0 && this.d === 1 && this.tx === 0 && this.ty === 0;
	}
	/**
	* Resets this Matrix to an identity (default) matrix.
	* @returns This matrix. Good for chaining method calls.
	*/
	identity() {
		this.a = 1;
		this.b = 0;
		this.c = 0;
		this.d = 1;
		this.tx = 0;
		this.ty = 0;
		return this;
	}
	/**
	* Creates a new Matrix object with the same values as this one.
	* @returns A copy of this matrix. Good for chaining method calls.
	*/
	clone() {
		const matrix = new Matrix();
		matrix.a = this.a;
		matrix.b = this.b;
		matrix.c = this.c;
		matrix.d = this.d;
		matrix.tx = this.tx;
		matrix.ty = this.ty;
		return matrix;
	}
	/**
	* Changes the values of the given matrix to be the same as the ones in this matrix
	* @param matrix - The matrix to copy to.
	* @returns The matrix given in parameter with its values updated.
	*/
	copyTo(matrix) {
		matrix.a = this.a;
		matrix.b = this.b;
		matrix.c = this.c;
		matrix.d = this.d;
		matrix.tx = this.tx;
		matrix.ty = this.ty;
		return matrix;
	}
	/**
	* Changes the values of the matrix to be the same as the ones in given matrix
	* @param matrix - The matrix to copy from.
	* @returns this
	*/
	copyFrom(matrix) {
		this.a = matrix.a;
		this.b = matrix.b;
		this.c = matrix.c;
		this.d = matrix.d;
		this.tx = matrix.tx;
		this.ty = matrix.ty;
		return this;
	}
	/**
	* check to see if two matrices are the same
	* @param matrix - The matrix to compare to.
	*/
	equals(matrix) {
		return matrix.a === this.a && matrix.b === this.b && matrix.c === this.c && matrix.d === this.d && matrix.tx === this.tx && matrix.ty === this.ty;
	}
	toString() {
		return `[pixi.js:Matrix a=${this.a} b=${this.b} c=${this.c} d=${this.d} tx=${this.tx} ty=${this.ty}]`;
	}
	/**
	* A default (identity) matrix.
	*
	* This is a shared object, if you want to modify it consider creating a new `Matrix`
	* @readonly
	*/
	static get IDENTITY() {
		return identityMatrix.identity();
	}
	/**
	* A static Matrix that can be used to avoid creating new objects.
	* Will always ensure the matrix is reset to identity when requested.
	* Use this object for fast but temporary calculations, as it may be mutated later on.
	* This is a different object to the `IDENTITY` object and so can be modified without changing `IDENTITY`.
	* @readonly
	*/
	static get shared() {
		return tempMatrix$2.identity();
	}
};
var tempMatrix$2 = new Matrix();
var identityMatrix = new Matrix();
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/maths/matrix/groupD8.mjs
var ux = [
	1,
	1,
	0,
	-1,
	-1,
	-1,
	0,
	1,
	1,
	1,
	0,
	-1,
	-1,
	-1,
	0,
	1
];
var uy = [
	0,
	1,
	1,
	1,
	0,
	-1,
	-1,
	-1,
	0,
	1,
	1,
	1,
	0,
	-1,
	-1,
	-1
];
var vx = [
	0,
	-1,
	-1,
	-1,
	0,
	1,
	1,
	1,
	0,
	1,
	1,
	1,
	0,
	-1,
	-1,
	-1
];
var vy = [
	1,
	1,
	0,
	-1,
	-1,
	-1,
	0,
	1,
	-1,
	-1,
	0,
	1,
	1,
	1,
	0,
	-1
];
var rotationCayley = [];
var rotationMatrices = [];
var signum = Math.sign;
function init() {
	for (let i = 0; i < 16; i++) {
		const row = [];
		rotationCayley.push(row);
		for (let j = 0; j < 16; j++) {
			const _ux = signum(ux[i] * ux[j] + vx[i] * uy[j]);
			const _uy = signum(uy[i] * ux[j] + vy[i] * uy[j]);
			const _vx = signum(ux[i] * vx[j] + vx[i] * vy[j]);
			const _vy = signum(uy[i] * vx[j] + vy[i] * vy[j]);
			for (let k = 0; k < 16; k++) if (ux[k] === _ux && uy[k] === _uy && vx[k] === _vx && vy[k] === _vy) {
				row.push(k);
				break;
			}
		}
	}
	for (let i = 0; i < 16; i++) {
		const mat = new Matrix();
		mat.set(ux[i], uy[i], vx[i], vy[i], 0, 0);
		rotationMatrices.push(mat);
	}
}
init();
var groupD8 = {
	/**
	* | Rotation | Direction |
	* |----------|-----------|
	* | 0°       | East      |
	* @memberof maths.groupD8
	* @constant {GD8Symmetry}
	*/
	E: 0,
	/**
	* | Rotation | Direction |
	* |----------|-----------|
	* | 45°↻     | Southeast |
	* @memberof maths.groupD8
	* @constant {GD8Symmetry}
	*/
	SE: 1,
	/**
	* | Rotation | Direction |
	* |----------|-----------|
	* | 90°↻     | South     |
	* @memberof maths.groupD8
	* @constant {GD8Symmetry}
	*/
	S: 2,
	/**
	* | Rotation | Direction |
	* |----------|-----------|
	* | 135°↻    | Southwest |
	* @memberof maths.groupD8
	* @constant {GD8Symmetry}
	*/
	SW: 3,
	/**
	* | Rotation | Direction |
	* |----------|-----------|
	* | 180°     | West      |
	* @memberof maths.groupD8
	* @constant {GD8Symmetry}
	*/
	W: 4,
	/**
	* | Rotation    | Direction    |
	* |-------------|--------------|
	* | -135°/225°↻ | Northwest    |
	* @memberof maths.groupD8
	* @constant {GD8Symmetry}
	*/
	NW: 5,
	/**
	* | Rotation    | Direction    |
	* |-------------|--------------|
	* | -90°/270°↻  | North        |
	* @memberof maths.groupD8
	* @constant {GD8Symmetry}
	*/
	N: 6,
	/**
	* | Rotation    | Direction    |
	* |-------------|--------------|
	* | -45°/315°↻  | Northeast    |
	* @memberof maths.groupD8
	* @constant {GD8Symmetry}
	*/
	NE: 7,
	/**
	* Reflection about Y-axis.
	* @memberof maths.groupD8
	* @constant {GD8Symmetry}
	*/
	MIRROR_VERTICAL: 8,
	/**
	* Reflection about the main diagonal.
	* @memberof maths.groupD8
	* @constant {GD8Symmetry}
	*/
	MAIN_DIAGONAL: 10,
	/**
	* Reflection about X-axis.
	* @memberof maths.groupD8
	* @constant {GD8Symmetry}
	*/
	MIRROR_HORIZONTAL: 12,
	/**
	* Reflection about reverse diagonal.
	* @memberof maths.groupD8
	* @constant {GD8Symmetry}
	*/
	REVERSE_DIAGONAL: 14,
	/**
	* @memberof maths.groupD8
	* @param {GD8Symmetry} ind - sprite rotation angle.
	* @returns {GD8Symmetry} The X-component of the U-axis
	*    after rotating the axes.
	*/
	uX: (ind) => ux[ind],
	/**
	* @memberof maths.groupD8
	* @param {GD8Symmetry} ind - sprite rotation angle.
	* @returns {GD8Symmetry} The Y-component of the U-axis
	*    after rotating the axes.
	*/
	uY: (ind) => uy[ind],
	/**
	* @memberof maths.groupD8
	* @param {GD8Symmetry} ind - sprite rotation angle.
	* @returns {GD8Symmetry} The X-component of the V-axis
	*    after rotating the axes.
	*/
	vX: (ind) => vx[ind],
	/**
	* @memberof maths.groupD8
	* @param {GD8Symmetry} ind - sprite rotation angle.
	* @returns {GD8Symmetry} The Y-component of the V-axis
	*    after rotating the axes.
	*/
	vY: (ind) => vy[ind],
	/**
	* @memberof maths.groupD8
	* @param {GD8Symmetry} rotation - symmetry whose opposite
	*   is needed. Only rotations have opposite symmetries while
	*   reflections don't.
	* @returns {GD8Symmetry} The opposite symmetry of `rotation`
	*/
	inv: (rotation) => {
		if (rotation & 8) return rotation & 15;
		return -rotation & 7;
	},
	/**
	* Composes the two D8 operations.
	*
	* Taking `^` as reflection:
	*
	* |       | E=0 | S=2 | W=4 | N=6 | E^=8 | S^=10 | W^=12 | N^=14 |
	* |-------|-----|-----|-----|-----|------|-------|-------|-------|
	* | E=0   | E   | S   | W   | N   | E^   | S^    | W^    | N^    |
	* | S=2   | S   | W   | N   | E   | S^   | W^    | N^    | E^    |
	* | W=4   | W   | N   | E   | S   | W^   | N^    | E^    | S^    |
	* | N=6   | N   | E   | S   | W   | N^   | E^    | S^    | W^    |
	* | E^=8  | E^  | N^  | W^  | S^  | E    | N     | W     | S     |
	* | S^=10 | S^  | E^  | N^  | W^  | S    | E     | N     | W     |
	* | W^=12 | W^  | S^  | E^  | N^  | W    | S     | E     | N     |
	* | N^=14 | N^  | W^  | S^  | E^  | N    | W     | S     | E     |
	*
	* [This is a Cayley table]{@link https://en.wikipedia.org/wiki/Cayley_table}
	* @memberof maths.groupD8
	* @param {GD8Symmetry} rotationSecond - Second operation, which
	*   is the row in the above cayley table.
	* @param {GD8Symmetry} rotationFirst - First operation, which
	*   is the column in the above cayley table.
	* @returns {GD8Symmetry} Composed operation
	*/
	add: (rotationSecond, rotationFirst) => rotationCayley[rotationSecond][rotationFirst],
	/**
	* Reverse of `add`.
	* @memberof maths.groupD8
	* @param {GD8Symmetry} rotationSecond - Second operation
	* @param {GD8Symmetry} rotationFirst - First operation
	* @returns {GD8Symmetry} Result
	*/
	sub: (rotationSecond, rotationFirst) => rotationCayley[rotationSecond][groupD8.inv(rotationFirst)],
	/**
	* Adds 180 degrees to rotation, which is a commutative
	* operation.
	* @memberof maths.groupD8
	* @param {number} rotation - The number to rotate.
	* @returns {number} Rotated number
	*/
	rotate180: (rotation) => rotation ^ 4,
	/**
	* Checks if the rotation angle is vertical, i.e. south
	* or north. It doesn't work for reflections.
	* @memberof maths.groupD8
	* @param {GD8Symmetry} rotation - The number to check.
	* @returns {boolean} Whether or not the direction is vertical
	*/
	isVertical: (rotation) => (rotation & 3) === 2,
	/**
	* Approximates the vector `V(dx,dy)` into one of the
	* eight directions provided by `groupD8`.
	* @memberof maths.groupD8
	* @param {number} dx - X-component of the vector
	* @param {number} dy - Y-component of the vector
	* @returns {GD8Symmetry} Approximation of the vector into
	*  one of the eight symmetries.
	*/
	byDirection: (dx, dy) => {
		if (Math.abs(dx) * 2 <= Math.abs(dy)) {
			if (dy >= 0) return groupD8.S;
			return groupD8.N;
		} else if (Math.abs(dy) * 2 <= Math.abs(dx)) {
			if (dx > 0) return groupD8.E;
			return groupD8.W;
		} else if (dy > 0) {
			if (dx > 0) return groupD8.SE;
			return groupD8.SW;
		} else if (dx > 0) return groupD8.NE;
		return groupD8.NW;
	},
	/**
	* Helps sprite to compensate texture packer rotation.
	* @memberof maths.groupD8
	* @param {Matrix} matrix - sprite world matrix
	* @param {GD8Symmetry} rotation - The rotation factor to use.
	* @param {number} tx - sprite anchoring
	* @param {number} ty - sprite anchoring
	*/
	matrixAppendRotationInv: (matrix, rotation, tx = 0, ty = 0) => {
		const mat = rotationMatrices[groupD8.inv(rotation)];
		mat.tx = tx;
		mat.ty = ty;
		matrix.append(mat);
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/maths/shapes/Rectangle.mjs
var tempPoints = [
	new Point(),
	new Point(),
	new Point(),
	new Point()
];
var Rectangle = class Rectangle {
	/**
	* @param x - The X coordinate of the upper-left corner of the rectangle
	* @param y - The Y coordinate of the upper-left corner of the rectangle
	* @param width - The overall width of the rectangle
	* @param height - The overall height of the rectangle
	*/
	constructor(x = 0, y = 0, width = 0, height = 0) {
		/**
		* The type of the object, mainly used to avoid `instanceof` checks
		* @default 'rectangle'
		*/
		this.type = "rectangle";
		this.x = Number(x);
		this.y = Number(y);
		this.width = Number(width);
		this.height = Number(height);
	}
	/** Returns the left edge of the rectangle. */
	get left() {
		return this.x;
	}
	/** Returns the right edge of the rectangle. */
	get right() {
		return this.x + this.width;
	}
	/** Returns the top edge of the rectangle. */
	get top() {
		return this.y;
	}
	/** Returns the bottom edge of the rectangle. */
	get bottom() {
		return this.y + this.height;
	}
	/** Determines whether the Rectangle is empty. */
	isEmpty() {
		return this.left === this.right || this.top === this.bottom;
	}
	/** A constant empty rectangle. This is a new object every time the property is accessed */
	static get EMPTY() {
		return new Rectangle(0, 0, 0, 0);
	}
	/**
	* Creates a clone of this Rectangle
	* @returns a copy of the rectangle
	*/
	clone() {
		return new Rectangle(this.x, this.y, this.width, this.height);
	}
	/**
	* Converts a Bounds object to a Rectangle object.
	* @param bounds - The bounds to copy and convert to a rectangle.
	* @returns Returns itself.
	*/
	copyFromBounds(bounds) {
		this.x = bounds.minX;
		this.y = bounds.minY;
		this.width = bounds.maxX - bounds.minX;
		this.height = bounds.maxY - bounds.minY;
		return this;
	}
	/**
	* Copies another rectangle to this one.
	* @param rectangle - The rectangle to copy from.
	* @returns Returns itself.
	*/
	copyFrom(rectangle) {
		this.x = rectangle.x;
		this.y = rectangle.y;
		this.width = rectangle.width;
		this.height = rectangle.height;
		return this;
	}
	/**
	* Copies this rectangle to another one.
	* @param rectangle - The rectangle to copy to.
	* @returns Returns given parameter.
	*/
	copyTo(rectangle) {
		rectangle.copyFrom(this);
		return rectangle;
	}
	/**
	* Checks whether the x and y coordinates given are contained within this Rectangle
	* @param x - The X coordinate of the point to test
	* @param y - The Y coordinate of the point to test
	* @returns Whether the x/y coordinates are within this Rectangle
	*/
	contains(x, y) {
		if (this.width <= 0 || this.height <= 0) return false;
		if (x >= this.x && x < this.x + this.width) {
			if (y >= this.y && y < this.y + this.height) return true;
		}
		return false;
	}
	/**
	* Checks whether the x and y coordinates given are contained within this rectangle including the stroke.
	* @param x - The X coordinate of the point to test
	* @param y - The Y coordinate of the point to test
	* @param strokeWidth - The width of the line to check
	* @param alignment - The alignment of the stroke, 0.5 by default
	* @returns Whether the x/y coordinates are within this rectangle
	*/
	strokeContains(x, y, strokeWidth, alignment = .5) {
		const { width, height } = this;
		if (width <= 0 || height <= 0) return false;
		const _x = this.x;
		const _y = this.y;
		const strokeWidthOuter = strokeWidth * (1 - alignment);
		const strokeWidthInner = strokeWidth - strokeWidthOuter;
		const outerLeft = _x - strokeWidthOuter;
		const outerRight = _x + width + strokeWidthOuter;
		const outerTop = _y - strokeWidthOuter;
		const outerBottom = _y + height + strokeWidthOuter;
		const innerLeft = _x + strokeWidthInner;
		const innerRight = _x + width - strokeWidthInner;
		const innerTop = _y + strokeWidthInner;
		const innerBottom = _y + height - strokeWidthInner;
		return x >= outerLeft && x <= outerRight && y >= outerTop && y <= outerBottom && !(x > innerLeft && x < innerRight && y > innerTop && y < innerBottom);
	}
	/**
	* Determines whether the `other` Rectangle transformed by `transform` intersects with `this` Rectangle object.
	* Returns true only if the area of the intersection is >0, this means that Rectangles
	* sharing a side are not overlapping. Another side effect is that an arealess rectangle
	* (width or height equal to zero) can't intersect any other rectangle.
	* @param {Rectangle} other - The Rectangle to intersect with `this`.
	* @param {Matrix} transform - The transformation matrix of `other`.
	* @returns {boolean} A value of `true` if the transformed `other` Rectangle intersects with `this`; otherwise `false`.
	*/
	intersects(other, transform) {
		if (!transform) {
			const x02 = this.x < other.x ? other.x : this.x;
			if ((this.right > other.right ? other.right : this.right) <= x02) return false;
			const y02 = this.y < other.y ? other.y : this.y;
			return (this.bottom > other.bottom ? other.bottom : this.bottom) > y02;
		}
		const x0 = this.left;
		const x1 = this.right;
		const y0 = this.top;
		const y1 = this.bottom;
		if (x1 <= x0 || y1 <= y0) return false;
		const lt = tempPoints[0].set(other.left, other.top);
		const lb = tempPoints[1].set(other.left, other.bottom);
		const rt = tempPoints[2].set(other.right, other.top);
		const rb = tempPoints[3].set(other.right, other.bottom);
		if (rt.x <= lt.x || lb.y <= lt.y) return false;
		const s = Math.sign(transform.a * transform.d - transform.b * transform.c);
		if (s === 0) return false;
		transform.apply(lt, lt);
		transform.apply(lb, lb);
		transform.apply(rt, rt);
		transform.apply(rb, rb);
		if (Math.max(lt.x, lb.x, rt.x, rb.x) <= x0 || Math.min(lt.x, lb.x, rt.x, rb.x) >= x1 || Math.max(lt.y, lb.y, rt.y, rb.y) <= y0 || Math.min(lt.y, lb.y, rt.y, rb.y) >= y1) return false;
		const nx = s * (lb.y - lt.y);
		const ny = s * (lt.x - lb.x);
		const n00 = nx * x0 + ny * y0;
		const n10 = nx * x1 + ny * y0;
		const n01 = nx * x0 + ny * y1;
		const n11 = nx * x1 + ny * y1;
		if (Math.max(n00, n10, n01, n11) <= nx * lt.x + ny * lt.y || Math.min(n00, n10, n01, n11) >= nx * rb.x + ny * rb.y) return false;
		const mx = s * (lt.y - rt.y);
		const my = s * (rt.x - lt.x);
		const m00 = mx * x0 + my * y0;
		const m10 = mx * x1 + my * y0;
		const m01 = mx * x0 + my * y1;
		const m11 = mx * x1 + my * y1;
		if (Math.max(m00, m10, m01, m11) <= mx * lt.x + my * lt.y || Math.min(m00, m10, m01, m11) >= mx * rb.x + my * rb.y) return false;
		return true;
	}
	/**
	* Pads the rectangle making it grow in all directions.
	* If paddingY is omitted, both paddingX and paddingY will be set to paddingX.
	* @param paddingX - The horizontal padding amount.
	* @param paddingY - The vertical padding amount.
	* @returns Returns itself.
	*/
	pad(paddingX = 0, paddingY = paddingX) {
		this.x -= paddingX;
		this.y -= paddingY;
		this.width += paddingX * 2;
		this.height += paddingY * 2;
		return this;
	}
	/**
	* Fits this rectangle around the passed one.
	* @param rectangle - The rectangle to fit.
	* @returns Returns itself.
	*/
	fit(rectangle) {
		const x1 = Math.max(this.x, rectangle.x);
		const x2 = Math.min(this.x + this.width, rectangle.x + rectangle.width);
		const y1 = Math.max(this.y, rectangle.y);
		const y2 = Math.min(this.y + this.height, rectangle.y + rectangle.height);
		this.x = x1;
		this.width = Math.max(x2 - x1, 0);
		this.y = y1;
		this.height = Math.max(y2 - y1, 0);
		return this;
	}
	/**
	* Enlarges rectangle that way its corners lie on grid
	* @param resolution - resolution
	* @param eps - precision
	* @returns Returns itself.
	*/
	ceil(resolution = 1, eps = .001) {
		const x2 = Math.ceil((this.x + this.width - eps) * resolution) / resolution;
		const y2 = Math.ceil((this.y + this.height - eps) * resolution) / resolution;
		this.x = Math.floor((this.x + eps) * resolution) / resolution;
		this.y = Math.floor((this.y + eps) * resolution) / resolution;
		this.width = x2 - this.x;
		this.height = y2 - this.y;
		return this;
	}
	/**
	* Enlarges this rectangle to include the passed rectangle.
	* @param rectangle - The rectangle to include.
	* @returns Returns itself.
	*/
	enlarge(rectangle) {
		const x1 = Math.min(this.x, rectangle.x);
		const x2 = Math.max(this.x + this.width, rectangle.x + rectangle.width);
		const y1 = Math.min(this.y, rectangle.y);
		const y2 = Math.max(this.y + this.height, rectangle.y + rectangle.height);
		this.x = x1;
		this.width = x2 - x1;
		this.y = y1;
		this.height = y2 - y1;
		return this;
	}
	/**
	* Returns the framing rectangle of the rectangle as a Rectangle object
	* @param out - optional rectangle to store the result
	* @returns The framing rectangle
	*/
	getBounds(out) {
		out || (out = new Rectangle());
		out.copyFrom(this);
		return out;
	}
	/**
	* Checks if this rectangle fully contains another rectangle.
	*
	* A rectangle contains another rectangle if all four corners of the other rectangle
	* lie within the bounds of this rectangle.
	*
	* ```ts
	* const container = new Rectangle(0, 0, 100, 100);
	* const inside = new Rectangle(25, 25, 50, 50);
	* const partial = new Rectangle(75, 75, 50, 50);
	*
	* container.containsRect(inside); // Returns true
	* container.containsRect(partial); // Returns false - partial overlap
	* ```
	*
	* Note: If either rectangle has a width or height of 0, this method returns false
	* since a zero-area rectangle cannot meaningfully contain another rectangle.
	* @param other - The rectangle to check if it is contained within this one
	* @returns True if the other rectangle is fully contained within this one
	*/
	containsRect(other) {
		if (this.width <= 0 || this.height <= 0) return false;
		const x1 = other.x;
		const y1 = other.y;
		const x2 = other.x + other.width;
		const y2 = other.y + other.height;
		return x1 >= this.x && x1 < this.x + this.width && y1 >= this.y && y1 < this.y + this.height && x2 >= this.x && x2 < this.x + this.width && y2 >= this.y && y2 < this.y + this.height;
	}
	toString() {
		return `[pixi.js/math:Rectangle x=${this.x} y=${this.y} width=${this.width} height=${this.height}]`;
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/utils/data/uid.mjs
var uidCache = { default: -1 };
function uid(name = "default") {
	if (uidCache[name] === void 0) uidCache[name] = -1;
	return ++uidCache[name];
}
function resetUids() {
	for (const key in uidCache) delete uidCache[key];
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/utils/logging/deprecation.mjs
var warnings = {};
var v8_0_0 = "8.0.0";
var v8_3_4 = "8.3.4";
function deprecation(version, message, ignoreDepth = 3) {
	if (warnings[message]) return;
	let stack = (/* @__PURE__ */ new Error()).stack;
	if (typeof stack === "undefined") console.warn("PixiJS Deprecation Warning: ", `${message}
Deprecated since v${version}`);
	else {
		stack = stack.split("\n").splice(ignoreDepth).join("\n");
		if (console.groupCollapsed) {
			console.groupCollapsed("%cPixiJS Deprecation Warning: %c%s", "color:#614108;background:#fffbe6", "font-weight:normal;color:#614108;background:#fffbe6", `${message}
Deprecated since v${version}`);
			console.warn(stack);
			console.groupEnd();
		} else {
			console.warn("PixiJS Deprecation Warning: ", `${message}
Deprecated since v${version}`);
			console.warn(stack);
		}
	}
	warnings[message] = true;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/utils/misc/NOOP.mjs
var NOOP = () => {};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/maths/misc/pow2.mjs
function nextPow2(v) {
	v += v === 0 ? 1 : 0;
	--v;
	v |= v >>> 1;
	v |= v >>> 2;
	v |= v >>> 4;
	v |= v >>> 8;
	v |= v >>> 16;
	return v + 1;
}
function isPow2(v) {
	return !(v & v - 1) && !!v;
}
function log2(v) {
	let r = (v > 65535 ? 1 : 0) << 4;
	v >>>= r;
	let shift = (v > 255 ? 1 : 0) << 3;
	v >>>= shift;
	r |= shift;
	shift = (v > 15 ? 1 : 0) << 2;
	v >>>= shift;
	r |= shift;
	shift = (v > 3 ? 1 : 0) << 1;
	v >>>= shift;
	r |= shift;
	return r | v >> 1;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/scene/container/utils/definedProps.mjs
function definedProps(obj) {
	const result = {};
	for (const key in obj) if (obj[key] !== void 0) result[key] = obj[key];
	return result;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/shared/texture/TextureStyle.mjs
var idHash$1 = /* @__PURE__ */ Object.create(null);
function createResourceIdFromString(value) {
	const id = idHash$1[value];
	if (id === void 0) idHash$1[value] = uid("resource");
	return id;
}
var _TextureStyle = class _TextureStyle extends eventemitter3_default {
	/**
	* @param options - options for the style
	*/
	constructor(options = {}) {
		super();
		this._resourceType = "textureSampler";
		this._touched = 0;
		/**
		* Specifies the maximum anisotropy value clamp used by the sampler.
		* Note: Most implementations support {@link GPUSamplerDescriptor#maxAnisotropy} values in range
		* between 1 and 16, inclusive. The used value of {@link GPUSamplerDescriptor#maxAnisotropy} will
		* be clamped to the maximum value that the platform supports.
		* @internal
		* @ignore
		*/
		this._maxAnisotropy = 1;
		/**
		* Has the style been destroyed?
		* @readonly
		*/
		this.destroyed = false;
		options = {
			..._TextureStyle.defaultOptions,
			...options
		};
		this.addressMode = options.addressMode;
		this.addressModeU = options.addressModeU ?? this.addressModeU;
		this.addressModeV = options.addressModeV ?? this.addressModeV;
		this.addressModeW = options.addressModeW ?? this.addressModeW;
		this.scaleMode = options.scaleMode;
		this.magFilter = options.magFilter ?? this.magFilter;
		this.minFilter = options.minFilter ?? this.minFilter;
		this.mipmapFilter = options.mipmapFilter ?? this.mipmapFilter;
		this.lodMinClamp = options.lodMinClamp;
		this.lodMaxClamp = options.lodMaxClamp;
		this.compare = options.compare;
		this.maxAnisotropy = options.maxAnisotropy ?? 1;
	}
	set addressMode(value) {
		this.addressModeU = value;
		this.addressModeV = value;
		this.addressModeW = value;
	}
	/** setting this will set wrapModeU,wrapModeV and wrapModeW all at once! */
	get addressMode() {
		return this.addressModeU;
	}
	set wrapMode(value) {
		deprecation(v8_0_0, "TextureStyle.wrapMode is now TextureStyle.addressMode");
		this.addressMode = value;
	}
	get wrapMode() {
		return this.addressMode;
	}
	set scaleMode(value) {
		this.magFilter = value;
		this.minFilter = value;
		this.mipmapFilter = value;
	}
	/** setting this will set magFilter,minFilter and mipmapFilter all at once!  */
	get scaleMode() {
		return this.magFilter;
	}
	/** Specifies the maximum anisotropy value clamp used by the sampler. */
	set maxAnisotropy(value) {
		this._maxAnisotropy = Math.min(value, 16);
		if (this._maxAnisotropy > 1) this.scaleMode = "linear";
	}
	get maxAnisotropy() {
		return this._maxAnisotropy;
	}
	get _resourceId() {
		return this._sharedResourceId || this._generateResourceId();
	}
	update() {
		this.emit("change", this);
		this._sharedResourceId = null;
	}
	_generateResourceId() {
		const bigKey = `${this.addressModeU}-${this.addressModeV}-${this.addressModeW}-${this.magFilter}-${this.minFilter}-${this.mipmapFilter}-${this.lodMinClamp}-${this.lodMaxClamp}-${this.compare}-${this._maxAnisotropy}`;
		this._sharedResourceId = createResourceIdFromString(bigKey);
		return this._resourceId;
	}
	/** Destroys the style */
	destroy() {
		this.destroyed = true;
		this.emit("destroy", this);
		this.emit("change", this);
		this.removeAllListeners();
	}
};
/** default options for the style */
_TextureStyle.defaultOptions = {
	addressMode: "clamp-to-edge",
	scaleMode: "linear"
};
var TextureStyle = _TextureStyle;
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/shared/texture/sources/TextureSource.mjs
var _TextureSource = class _TextureSource extends eventemitter3_default {
	/**
	* @param options - options for creating a new TextureSource
	*/
	constructor(options = {}) {
		super();
		this.options = options;
		/** unique id for this Texture source */
		this.uid = uid("textureSource");
		/**
		* The resource type used by this TextureSource. This is used by the bind groups to determine
		* how to handle this resource.
		* @ignore
		* @internal
		*/
		this._resourceType = "textureSource";
		/**
		* i unique resource id, used by the bind group systems.
		* This can change if the texture is resized or its resource changes
		*/
		this._resourceId = uid("resource");
		/**
		* this is how the backends know how to upload this texture to the GPU
		* It changes depending on the resource type. Classes that extend TextureSource
		* should override this property.
		* @ignore
		* @internal
		*/
		this.uploadMethodId = "unknown";
		this._resolution = 1;
		/** the pixel width of this texture source. This is the REAL pure number, not accounting resolution */
		this.pixelWidth = 1;
		/** the pixel height of this texture source. This is the REAL pure number, not accounting resolution */
		this.pixelHeight = 1;
		/**
		* the width of this texture source, accounting for resolution
		* eg pixelWidth 200, resolution 2, then width will be 100
		*/
		this.width = 1;
		/**
		* the height of this texture source, accounting for resolution
		* eg pixelHeight 200, resolution 2, then height will be 100
		*/
		this.height = 1;
		/**
		* The number of samples of a multisample texture. This is always 1 for non-multisample textures.
		* To enable multisample for a texture, set antialias to true
		* @internal
		* @ignore
		*/
		this.sampleCount = 1;
		/** The number of mip levels to generate for this texture. this is  overridden if autoGenerateMipmaps is true */
		this.mipLevelCount = 1;
		/**
		* Should we auto generate mipmaps for this texture? This will automatically generate mipmaps
		* for this texture when uploading to the GPU. Mipmapped textures take up more memory, but
		* can look better when scaled down.
		*
		* For performance reasons, it is recommended to NOT use this with RenderTextures, as they are often updated every frame.
		* If you do, make sure to call `updateMipmaps` after you update the texture.
		*/
		this.autoGenerateMipmaps = false;
		/** the format that the texture data has */
		this.format = "rgba8unorm";
		/** how many dimensions does this texture have? currently v8 only supports 2d */
		this.dimension = "2d";
		/**
		* Only really affects RenderTextures.
		* Should we use antialiasing for this texture. It will look better, but may impact performance as a
		* Blit operation will be required to resolve the texture.
		*/
		this.antialias = false;
		/**
		* Used by automatic texture Garbage Collection, stores last GC tick when it was bound
		* @protected
		*/
		this._touched = 0;
		/**
		* Used by the batcher to build texture batches. faster to have the variable here!
		* @protected
		*/
		this._batchTick = -1;
		/**
		* A temporary batch location for the texture batching. Here for performance reasons only!
		* @protected
		*/
		this._textureBindLocation = -1;
		options = {
			..._TextureSource.defaultOptions,
			...options
		};
		this.label = options.label ?? "";
		this.resource = options.resource;
		this.autoGarbageCollect = options.autoGarbageCollect;
		this._resolution = options.resolution;
		if (options.width) this.pixelWidth = options.width * this._resolution;
		else this.pixelWidth = this.resource ? this.resourceWidth ?? 1 : 1;
		if (options.height) this.pixelHeight = options.height * this._resolution;
		else this.pixelHeight = this.resource ? this.resourceHeight ?? 1 : 1;
		this.width = this.pixelWidth / this._resolution;
		this.height = this.pixelHeight / this._resolution;
		this.format = options.format;
		this.dimension = options.dimensions;
		this.mipLevelCount = options.mipLevelCount;
		this.autoGenerateMipmaps = options.autoGenerateMipmaps;
		this.sampleCount = options.sampleCount;
		this.antialias = options.antialias;
		this.alphaMode = options.alphaMode;
		this.style = new TextureStyle(definedProps(options));
		this.destroyed = false;
		this._refreshPOT();
	}
	/** returns itself */
	get source() {
		return this;
	}
	/** the style of the texture */
	get style() {
		return this._style;
	}
	set style(value) {
		if (this.style === value) return;
		this._style?.off("change", this._onStyleChange, this);
		this._style = value;
		this._style?.on("change", this._onStyleChange, this);
		this._onStyleChange();
	}
	/** setting this will set wrapModeU,wrapModeV and wrapModeW all at once! */
	get addressMode() {
		return this._style.addressMode;
	}
	set addressMode(value) {
		this._style.addressMode = value;
	}
	/** setting this will set wrapModeU,wrapModeV and wrapModeW all at once! */
	get repeatMode() {
		return this._style.addressMode;
	}
	set repeatMode(value) {
		this._style.addressMode = value;
	}
	/** Specifies the sampling behavior when the sample footprint is smaller than or equal to one texel. */
	get magFilter() {
		return this._style.magFilter;
	}
	set magFilter(value) {
		this._style.magFilter = value;
	}
	/** Specifies the sampling behavior when the sample footprint is larger than one texel. */
	get minFilter() {
		return this._style.minFilter;
	}
	set minFilter(value) {
		this._style.minFilter = value;
	}
	/** Specifies behavior for sampling between mipmap levels. */
	get mipmapFilter() {
		return this._style.mipmapFilter;
	}
	set mipmapFilter(value) {
		this._style.mipmapFilter = value;
	}
	/** Specifies the minimum and maximum levels of detail, respectively, used internally when sampling a texture. */
	get lodMinClamp() {
		return this._style.lodMinClamp;
	}
	set lodMinClamp(value) {
		this._style.lodMinClamp = value;
	}
	/** Specifies the minimum and maximum levels of detail, respectively, used internally when sampling a texture. */
	get lodMaxClamp() {
		return this._style.lodMaxClamp;
	}
	set lodMaxClamp(value) {
		this._style.lodMaxClamp = value;
	}
	_onStyleChange() {
		this.emit("styleChange", this);
	}
	/** call this if you have modified the texture outside of the constructor */
	update() {
		if (this.resource) {
			const resolution = this._resolution;
			if (this.resize(this.resourceWidth / resolution, this.resourceHeight / resolution)) return;
		}
		this.emit("update", this);
	}
	/** Destroys this texture source */
	destroy() {
		this.destroyed = true;
		this.emit("destroy", this);
		this.emit("change", this);
		if (this._style) {
			this._style.destroy();
			this._style = null;
		}
		this.uploadMethodId = null;
		this.resource = null;
		this.removeAllListeners();
	}
	/**
	* This will unload the Texture source from the GPU. This will free up the GPU memory
	* As soon as it is required fore rendering, it will be re-uploaded.
	*/
	unload() {
		this._resourceId = uid("resource");
		this.emit("change", this);
		this.emit("unload", this);
	}
	/** the width of the resource. This is the REAL pure number, not accounting resolution   */
	get resourceWidth() {
		const { resource } = this;
		return resource.naturalWidth || resource.videoWidth || resource.displayWidth || resource.width;
	}
	/** the height of the resource. This is the REAL pure number, not accounting resolution */
	get resourceHeight() {
		const { resource } = this;
		return resource.naturalHeight || resource.videoHeight || resource.displayHeight || resource.height;
	}
	/**
	* the resolution of the texture. Changing this number, will not change the number of pixels in the actual texture
	* but will the size of the texture when rendered.
	*
	* changing the resolution of this texture to 2 for example will make it appear twice as small when rendered (as pixel
	* density will have increased)
	*/
	get resolution() {
		return this._resolution;
	}
	set resolution(resolution) {
		if (this._resolution === resolution) return;
		this._resolution = resolution;
		this.width = this.pixelWidth / resolution;
		this.height = this.pixelHeight / resolution;
	}
	/**
	* Resize the texture, this is handy if you want to use the texture as a render texture
	* @param width - the new width of the texture
	* @param height - the new height of the texture
	* @param resolution - the new resolution of the texture
	* @returns - if the texture was resized
	*/
	resize(width, height, resolution) {
		resolution || (resolution = this._resolution);
		width || (width = this.width);
		height || (height = this.height);
		const newPixelWidth = Math.round(width * resolution);
		const newPixelHeight = Math.round(height * resolution);
		this.width = newPixelWidth / resolution;
		this.height = newPixelHeight / resolution;
		this._resolution = resolution;
		if (this.pixelWidth === newPixelWidth && this.pixelHeight === newPixelHeight) return false;
		this._refreshPOT();
		this.pixelWidth = newPixelWidth;
		this.pixelHeight = newPixelHeight;
		this.emit("resize", this);
		this._resourceId = uid("resource");
		this.emit("change", this);
		return true;
	}
	/**
	* Lets the renderer know that this texture has been updated and its mipmaps should be re-generated.
	* This is only important for RenderTexture instances, as standard Texture instances will have their
	* mipmaps generated on upload. You should call this method after you make any change to the texture
	*
	* The reason for this is is can be quite expensive to update mipmaps for a texture. So by default,
	* We want you, the developer to specify when this action should happen.
	*
	* Generally you don't want to have mipmaps generated on Render targets that are changed every frame,
	*/
	updateMipmaps() {
		if (this.autoGenerateMipmaps && this.mipLevelCount > 1) this.emit("updateMipmaps", this);
	}
	set wrapMode(value) {
		this._style.wrapMode = value;
	}
	get wrapMode() {
		return this._style.wrapMode;
	}
	set scaleMode(value) {
		this._style.scaleMode = value;
	}
	/** setting this will set magFilter,minFilter and mipmapFilter all at once!  */
	get scaleMode() {
		return this._style.scaleMode;
	}
	/**
	* Refresh check for isPowerOfTwo texture based on size
	* @private
	*/
	_refreshPOT() {
		this.isPowerOfTwo = isPow2(this.pixelWidth) && isPow2(this.pixelHeight);
	}
	static test(_resource) {
		throw new Error("Unimplemented");
	}
};
/** The default options used when creating a new TextureSource. override these to add your own defaults */
_TextureSource.defaultOptions = {
	resolution: 1,
	format: "bgra8unorm",
	alphaMode: "premultiply-alpha-on-upload",
	dimensions: "2d",
	mipLevelCount: 1,
	autoGenerateMipmaps: false,
	sampleCount: 1,
	antialias: false,
	autoGarbageCollect: false
};
var TextureSource = _TextureSource;
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/shared/texture/sources/BufferImageSource.mjs
var BufferImageSource = class extends TextureSource {
	constructor(options) {
		const buffer = options.resource || new Float32Array(options.width * options.height * 4);
		let format = options.format;
		if (!format) {
			if (buffer instanceof Float32Array) format = "rgba32float";
			else if (buffer instanceof Int32Array) format = "rgba32uint";
			else if (buffer instanceof Uint32Array) format = "rgba32uint";
			else if (buffer instanceof Int16Array) format = "rgba16uint";
			else if (buffer instanceof Uint16Array) format = "rgba16uint";
			else if (buffer instanceof Int8Array) format = "bgra8unorm";
			else format = "bgra8unorm";
		}
		super({
			...options,
			resource: buffer,
			format
		});
		this.uploadMethodId = "buffer";
	}
	static test(resource) {
		return resource instanceof Int8Array || resource instanceof Uint8Array || resource instanceof Uint8ClampedArray || resource instanceof Int16Array || resource instanceof Uint16Array || resource instanceof Int32Array || resource instanceof Uint32Array || resource instanceof Float32Array;
	}
};
BufferImageSource.extension = ExtensionType.TextureSource;
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/shared/texture/TextureMatrix.mjs
var tempMat = new Matrix();
var TextureMatrix = class {
	/**
	* @param texture - observed texture
	* @param clampMargin - Changes frame clamping, 0.5 by default. Use -0.5 for extra border.
	*/
	constructor(texture, clampMargin) {
		this.mapCoord = new Matrix();
		this.uClampFrame = /* @__PURE__ */ new Float32Array(4);
		this.uClampOffset = /* @__PURE__ */ new Float32Array(2);
		this._textureID = -1;
		this._updateID = 0;
		this.clampOffset = 0;
		if (typeof clampMargin === "undefined") this.clampMargin = texture.width < 10 ? 0 : .5;
		else this.clampMargin = clampMargin;
		this.isSimple = false;
		this.texture = texture;
	}
	/** Texture property. */
	get texture() {
		return this._texture;
	}
	set texture(value) {
		if (this.texture === value) return;
		this._texture?.removeListener("update", this.update, this);
		this._texture = value;
		this._texture.addListener("update", this.update, this);
		this.update();
	}
	/**
	* Multiplies uvs array to transform
	* @param uvs - mesh uvs
	* @param [out=uvs] - output
	* @returns - output
	*/
	multiplyUvs(uvs, out) {
		if (out === void 0) out = uvs;
		const mat = this.mapCoord;
		for (let i = 0; i < uvs.length; i += 2) {
			const x = uvs[i];
			const y = uvs[i + 1];
			out[i] = x * mat.a + y * mat.c + mat.tx;
			out[i + 1] = x * mat.b + y * mat.d + mat.ty;
		}
		return out;
	}
	/**
	* Updates matrices if texture was changed
	* @returns - whether or not it was updated
	*/
	update() {
		const tex = this._texture;
		this._updateID++;
		const uvs = tex.uvs;
		this.mapCoord.set(uvs.x1 - uvs.x0, uvs.y1 - uvs.y0, uvs.x3 - uvs.x0, uvs.y3 - uvs.y0, uvs.x0, uvs.y0);
		const orig = tex.orig;
		const trim = tex.trim;
		if (trim) {
			tempMat.set(orig.width / trim.width, 0, 0, orig.height / trim.height, -trim.x / trim.width, -trim.y / trim.height);
			this.mapCoord.append(tempMat);
		}
		const texBase = tex.source;
		const frame = this.uClampFrame;
		const margin = this.clampMargin / texBase._resolution;
		const offset = this.clampOffset / texBase._resolution;
		frame[0] = (tex.frame.x + margin + offset) / texBase.width;
		frame[1] = (tex.frame.y + margin + offset) / texBase.height;
		frame[2] = (tex.frame.x + tex.frame.width - margin + offset) / texBase.width;
		frame[3] = (tex.frame.y + tex.frame.height - margin + offset) / texBase.height;
		this.uClampOffset[0] = this.clampOffset / texBase.pixelWidth;
		this.uClampOffset[1] = this.clampOffset / texBase.pixelHeight;
		this.isSimple = tex.frame.width === texBase.width && tex.frame.height === texBase.height && tex.rotate === 0;
		return true;
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/shared/texture/Texture.mjs
var Texture = class extends eventemitter3_default {
	/**
	* @param {rendering.TextureOptions} options - Options for the texture
	*/
	constructor({ source, label, frame, orig, trim, defaultAnchor, defaultBorders, rotate, dynamic } = {}) {
		super();
		/** unique id for this texture */
		this.uid = uid("texture");
		/** A uvs object based on the given frame and the texture source */
		this.uvs = {
			x0: 0,
			y0: 0,
			x1: 0,
			y1: 0,
			x2: 0,
			y2: 0,
			x3: 0,
			y3: 0
		};
		/**
		* This is the area of the BaseTexture image to actually copy to the Canvas / WebGL when rendering,
		* irrespective of the actual frame size or placement (which can be influenced by trimmed texture atlases)
		*/
		this.frame = new Rectangle();
		/**
		* Does this Texture have any frame data assigned to it?
		*
		* This mode is enabled automatically if no frame was passed inside constructor.
		*
		* In this mode texture is subscribed to baseTexture events, and fires `update` on any change.
		*
		* Beware, after loading or resize of baseTexture event can fired two times!
		* If you want more control, subscribe on baseTexture itself.
		* @example
		* texture.on('update', () => {});
		*/
		this.noFrame = false;
		/**
		* Set to true if you plan on modifying the uvs of this texture.
		* When this is the case, sprites and other objects using the texture will
		* make sure to listen for changes to the uvs and update their vertices accordingly.
		*/
		this.dynamic = false;
		/** is it a texture? yes! used for type checking */
		this.isTexture = true;
		this.label = label;
		this.source = source?.source ?? new TextureSource();
		this.noFrame = !frame;
		if (frame) this.frame.copyFrom(frame);
		else {
			const { width, height } = this._source;
			this.frame.width = width;
			this.frame.height = height;
		}
		this.orig = orig || this.frame;
		this.trim = trim;
		this.rotate = rotate ?? 0;
		this.defaultAnchor = defaultAnchor;
		this.defaultBorders = defaultBorders;
		this.destroyed = false;
		this.dynamic = dynamic || false;
		this.updateUvs();
	}
	set source(value) {
		if (this._source) this._source.off("resize", this.update, this);
		this._source = value;
		value.on("resize", this.update, this);
		this.emit("update", this);
	}
	/** the underlying source of the texture (equivalent of baseTexture in v7) */
	get source() {
		return this._source;
	}
	/** returns a TextureMatrix instance for this texture. By default, that object is not created because its heavy. */
	get textureMatrix() {
		if (!this._textureMatrix) this._textureMatrix = new TextureMatrix(this);
		return this._textureMatrix;
	}
	/** The width of the Texture in pixels. */
	get width() {
		return this.orig.width;
	}
	/** The height of the Texture in pixels. */
	get height() {
		return this.orig.height;
	}
	/** Call this function when you have modified the frame of this texture. */
	updateUvs() {
		const { uvs, frame } = this;
		const { width, height } = this._source;
		const nX = frame.x / width;
		const nY = frame.y / height;
		const nW = frame.width / width;
		const nH = frame.height / height;
		let rotate = this.rotate;
		if (rotate) {
			const w2 = nW / 2;
			const h2 = nH / 2;
			const cX = nX + w2;
			const cY = nY + h2;
			rotate = groupD8.add(rotate, groupD8.NW);
			uvs.x0 = cX + w2 * groupD8.uX(rotate);
			uvs.y0 = cY + h2 * groupD8.uY(rotate);
			rotate = groupD8.add(rotate, 2);
			uvs.x1 = cX + w2 * groupD8.uX(rotate);
			uvs.y1 = cY + h2 * groupD8.uY(rotate);
			rotate = groupD8.add(rotate, 2);
			uvs.x2 = cX + w2 * groupD8.uX(rotate);
			uvs.y2 = cY + h2 * groupD8.uY(rotate);
			rotate = groupD8.add(rotate, 2);
			uvs.x3 = cX + w2 * groupD8.uX(rotate);
			uvs.y3 = cY + h2 * groupD8.uY(rotate);
		} else {
			uvs.x0 = nX;
			uvs.y0 = nY;
			uvs.x1 = nX + nW;
			uvs.y1 = nY;
			uvs.x2 = nX + nW;
			uvs.y2 = nY + nH;
			uvs.x3 = nX;
			uvs.y3 = nY + nH;
		}
	}
	/**
	* Destroys this texture
	* @param destroySource - Destroy the source when the texture is destroyed.
	*/
	destroy(destroySource = false) {
		if (this._source) {
			if (destroySource) {
				this._source.destroy();
				this._source = null;
			}
		}
		this._textureMatrix = null;
		this.destroyed = true;
		this.emit("destroy", this);
		this.removeAllListeners();
	}
	/**
	* Call this if you have modified the `texture outside` of the constructor.
	*
	* If you have modified this texture's source, you must separately call `texture.source.update()` to see those changes.
	*/
	update() {
		if (this.noFrame) {
			this.frame.width = this._source.width;
			this.frame.height = this._source.height;
		}
		this.updateUvs();
		this.emit("update", this);
	}
	/** @deprecated since 8.0.0 */
	get baseTexture() {
		deprecation(v8_0_0, "Texture.baseTexture is now Texture.source");
		return this._source;
	}
};
Texture.EMPTY = new Texture({
	label: "EMPTY",
	source: new TextureSource({ label: "EMPTY" })
});
Texture.EMPTY.destroy = NOOP;
Texture.WHITE = new Texture({
	source: new BufferImageSource({
		resource: new Uint8Array([
			255,
			255,
			255,
			255
		]),
		width: 1,
		height: 1,
		alphaMode: "premultiply-alpha-on-upload",
		label: "WHITE"
	}),
	label: "WHITE"
});
Texture.WHITE.destroy = NOOP;
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/utils/data/updateQuadBounds.mjs
function updateQuadBounds(bounds, anchor, texture) {
	const { width, height } = texture.orig;
	const trim = texture.trim;
	if (trim) {
		const sourceWidth = trim.width;
		const sourceHeight = trim.height;
		bounds.minX = trim.x - anchor._x * width;
		bounds.maxX = bounds.minX + sourceWidth;
		bounds.minY = trim.y - anchor._y * height;
		bounds.maxY = bounds.minY + sourceHeight;
	} else {
		bounds.minX = -anchor._x * width;
		bounds.maxX = bounds.minX + width;
		bounds.minY = -anchor._y * height;
		bounds.maxY = bounds.minY + height;
	}
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/scene/container/bounds/Bounds.mjs
var defaultMatrix = new Matrix();
var Bounds = class Bounds {
	constructor(minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity) {
		/** @default Infinity */
		this.minX = Infinity;
		/** @default Infinity */
		this.minY = Infinity;
		/** @default -Infinity */
		this.maxX = -Infinity;
		/** @default -Infinity */
		this.maxY = -Infinity;
		this.matrix = defaultMatrix;
		this.minX = minX;
		this.minY = minY;
		this.maxX = maxX;
		this.maxY = maxY;
	}
	/**
	* Checks if bounds are empty.
	* @returns - True if empty.
	*/
	isEmpty() {
		return this.minX > this.maxX || this.minY > this.maxY;
	}
	/** The bounding rectangle of the bounds. */
	get rectangle() {
		if (!this._rectangle) this._rectangle = new Rectangle();
		const rectangle = this._rectangle;
		if (this.minX > this.maxX || this.minY > this.maxY) {
			rectangle.x = 0;
			rectangle.y = 0;
			rectangle.width = 0;
			rectangle.height = 0;
		} else rectangle.copyFromBounds(this);
		return rectangle;
	}
	/** Clears the bounds and resets. */
	clear() {
		this.minX = Infinity;
		this.minY = Infinity;
		this.maxX = -Infinity;
		this.maxY = -Infinity;
		this.matrix = defaultMatrix;
		return this;
	}
	/**
	* Sets the bounds.
	* @param x0 - left X of frame
	* @param y0 - top Y of frame
	* @param x1 - right X of frame
	* @param y1 - bottom Y of frame
	*/
	set(x0, y0, x1, y1) {
		this.minX = x0;
		this.minY = y0;
		this.maxX = x1;
		this.maxY = y1;
	}
	/**
	* Adds sprite frame
	* @param x0 - left X of frame
	* @param y0 - top Y of frame
	* @param x1 - right X of frame
	* @param y1 - bottom Y of frame
	* @param matrix
	*/
	addFrame(x0, y0, x1, y1, matrix) {
		matrix || (matrix = this.matrix);
		const a = matrix.a;
		const b = matrix.b;
		const c = matrix.c;
		const d = matrix.d;
		const tx = matrix.tx;
		const ty = matrix.ty;
		let minX = this.minX;
		let minY = this.minY;
		let maxX = this.maxX;
		let maxY = this.maxY;
		let x = a * x0 + c * y0 + tx;
		let y = b * x0 + d * y0 + ty;
		if (x < minX) minX = x;
		if (y < minY) minY = y;
		if (x > maxX) maxX = x;
		if (y > maxY) maxY = y;
		x = a * x1 + c * y0 + tx;
		y = b * x1 + d * y0 + ty;
		if (x < minX) minX = x;
		if (y < minY) minY = y;
		if (x > maxX) maxX = x;
		if (y > maxY) maxY = y;
		x = a * x0 + c * y1 + tx;
		y = b * x0 + d * y1 + ty;
		if (x < minX) minX = x;
		if (y < minY) minY = y;
		if (x > maxX) maxX = x;
		if (y > maxY) maxY = y;
		x = a * x1 + c * y1 + tx;
		y = b * x1 + d * y1 + ty;
		if (x < minX) minX = x;
		if (y < minY) minY = y;
		if (x > maxX) maxX = x;
		if (y > maxY) maxY = y;
		this.minX = minX;
		this.minY = minY;
		this.maxX = maxX;
		this.maxY = maxY;
	}
	/**
	* Adds a rectangle to the bounds.
	* @param rect - The rectangle to be added.
	* @param matrix - The matrix to apply to the bounds.
	*/
	addRect(rect, matrix) {
		this.addFrame(rect.x, rect.y, rect.x + rect.width, rect.y + rect.height, matrix);
	}
	/**
	* Adds other {@link Bounds}.
	* @param bounds - The Bounds to be added
	* @param matrix
	*/
	addBounds(bounds, matrix) {
		this.addFrame(bounds.minX, bounds.minY, bounds.maxX, bounds.maxY, matrix);
	}
	/**
	* Adds other Bounds, masked with Bounds.
	* @param mask - The Bounds to be added.
	*/
	addBoundsMask(mask) {
		this.minX = this.minX > mask.minX ? this.minX : mask.minX;
		this.minY = this.minY > mask.minY ? this.minY : mask.minY;
		this.maxX = this.maxX < mask.maxX ? this.maxX : mask.maxX;
		this.maxY = this.maxY < mask.maxY ? this.maxY : mask.maxY;
	}
	/**
	* Adds other Bounds, multiplied with matrix.
	* @param matrix - The matrix to apply to the bounds.
	*/
	applyMatrix(matrix) {
		const minX = this.minX;
		const minY = this.minY;
		const maxX = this.maxX;
		const maxY = this.maxY;
		const { a, b, c, d, tx, ty } = matrix;
		let x = a * minX + c * minY + tx;
		let y = b * minX + d * minY + ty;
		this.minX = x;
		this.minY = y;
		this.maxX = x;
		this.maxY = y;
		x = a * maxX + c * minY + tx;
		y = b * maxX + d * minY + ty;
		this.minX = x < this.minX ? x : this.minX;
		this.minY = y < this.minY ? y : this.minY;
		this.maxX = x > this.maxX ? x : this.maxX;
		this.maxY = y > this.maxY ? y : this.maxY;
		x = a * minX + c * maxY + tx;
		y = b * minX + d * maxY + ty;
		this.minX = x < this.minX ? x : this.minX;
		this.minY = y < this.minY ? y : this.minY;
		this.maxX = x > this.maxX ? x : this.maxX;
		this.maxY = y > this.maxY ? y : this.maxY;
		x = a * maxX + c * maxY + tx;
		y = b * maxX + d * maxY + ty;
		this.minX = x < this.minX ? x : this.minX;
		this.minY = y < this.minY ? y : this.minY;
		this.maxX = x > this.maxX ? x : this.maxX;
		this.maxY = y > this.maxY ? y : this.maxY;
	}
	/**
	* Resizes the bounds object to include the given rectangle.
	* @param rect - The rectangle to be included.
	*/
	fit(rect) {
		if (this.minX < rect.left) this.minX = rect.left;
		if (this.maxX > rect.right) this.maxX = rect.right;
		if (this.minY < rect.top) this.minY = rect.top;
		if (this.maxY > rect.bottom) this.maxY = rect.bottom;
		return this;
	}
	/**
	* Resizes the bounds object to include the given bounds.
	* @param left - The left value of the bounds.
	* @param right - The right value of the bounds.
	* @param top - The top value of the bounds.
	* @param bottom - The bottom value of the bounds.
	*/
	fitBounds(left, right, top, bottom) {
		if (this.minX < left) this.minX = left;
		if (this.maxX > right) this.maxX = right;
		if (this.minY < top) this.minY = top;
		if (this.maxY > bottom) this.maxY = bottom;
		return this;
	}
	/**
	* Pads bounds object, making it grow in all directions.
	* If paddingY is omitted, both paddingX and paddingY will be set to paddingX.
	* @param paddingX - The horizontal padding amount.
	* @param paddingY - The vertical padding amount.
	*/
	pad(paddingX, paddingY = paddingX) {
		this.minX -= paddingX;
		this.maxX += paddingX;
		this.minY -= paddingY;
		this.maxY += paddingY;
		return this;
	}
	/** Ceils the bounds. */
	ceil() {
		this.minX = Math.floor(this.minX);
		this.minY = Math.floor(this.minY);
		this.maxX = Math.ceil(this.maxX);
		this.maxY = Math.ceil(this.maxY);
		return this;
	}
	/** Clones the bounds. */
	clone() {
		return new Bounds(this.minX, this.minY, this.maxX, this.maxY);
	}
	/**
	* Scales the bounds by the given values
	* @param x - The X value to scale by.
	* @param y - The Y value to scale by.
	*/
	scale(x, y = x) {
		this.minX *= x;
		this.minY *= y;
		this.maxX *= x;
		this.maxY *= y;
		return this;
	}
	/** the x value of the bounds. */
	get x() {
		return this.minX;
	}
	set x(value) {
		const width = this.maxX - this.minX;
		this.minX = value;
		this.maxX = value + width;
	}
	/** the y value of the bounds. */
	get y() {
		return this.minY;
	}
	set y(value) {
		const height = this.maxY - this.minY;
		this.minY = value;
		this.maxY = value + height;
	}
	/** the width value of the bounds. */
	get width() {
		return this.maxX - this.minX;
	}
	set width(value) {
		this.maxX = this.minX + value;
	}
	/** the height value of the bounds. */
	get height() {
		return this.maxY - this.minY;
	}
	set height(value) {
		this.maxY = this.minY + value;
	}
	/** the left value of the bounds. */
	get left() {
		return this.minX;
	}
	/** the right value of the bounds. */
	get right() {
		return this.maxX;
	}
	/** the top value of the bounds. */
	get top() {
		return this.minY;
	}
	/** the bottom value of the bounds. */
	get bottom() {
		return this.maxY;
	}
	/** Is the bounds positive. */
	get isPositive() {
		return this.maxX - this.minX > 0 && this.maxY - this.minY > 0;
	}
	get isValid() {
		return this.minX + this.minY !== Infinity;
	}
	/**
	* Adds screen vertices from array
	* @param vertexData - calculated vertices
	* @param beginOffset - begin offset
	* @param endOffset - end offset, excluded
	* @param matrix
	*/
	addVertexData(vertexData, beginOffset, endOffset, matrix) {
		let minX = this.minX;
		let minY = this.minY;
		let maxX = this.maxX;
		let maxY = this.maxY;
		matrix || (matrix = this.matrix);
		const a = matrix.a;
		const b = matrix.b;
		const c = matrix.c;
		const d = matrix.d;
		const tx = matrix.tx;
		const ty = matrix.ty;
		for (let i = beginOffset; i < endOffset; i += 2) {
			const localX = vertexData[i];
			const localY = vertexData[i + 1];
			const x = a * localX + c * localY + tx;
			const y = b * localX + d * localY + ty;
			minX = x < minX ? x : minX;
			minY = y < minY ? y : minY;
			maxX = x > maxX ? x : maxX;
			maxY = y > maxY ? y : maxY;
		}
		this.minX = minX;
		this.minY = minY;
		this.maxX = maxX;
		this.maxY = maxY;
	}
	/**
	* Checks if the point is contained within the bounds.
	* @param x - x coordinate
	* @param y - y coordinate
	*/
	containsPoint(x, y) {
		if (this.minX <= x && this.minY <= y && this.maxX >= x && this.maxY >= y) return true;
		return false;
	}
	toString() {
		return `[pixi.js:Bounds minX=${this.minX} minY=${this.minY} maxX=${this.maxX} maxY=${this.maxY} width=${this.width} height=${this.height}]`;
	}
	/**
	* Copies the bounds from another bounds object.
	* @param bounds - The bounds to copy from.
	* @returns - This bounds object.
	*/
	copyFrom(bounds) {
		this.minX = bounds.minX;
		this.minY = bounds.minY;
		this.maxX = bounds.maxX;
		this.maxY = bounds.maxY;
		return this;
	}
};
//#endregion
//#region node_modules/.pnpm/@pixi+colord@2.9.6/node_modules/@pixi/colord/index.mjs
var r = {
	grad: .9,
	turn: 360,
	rad: 360 / (2 * Math.PI)
};
var t = function(r) {
	return "string" == typeof r ? r.length > 0 : "number" == typeof r;
};
var n = function(r, t, n) {
	return void 0 === t && (t = 0), void 0 === n && (n = Math.pow(10, t)), Math.round(n * r) / n + 0;
};
var e = function(r, t, n) {
	return void 0 === t && (t = 0), void 0 === n && (n = 1), r > n ? n : r > t ? r : t;
};
var u = function(r) {
	return (r = isFinite(r) ? r % 360 : 0) > 0 ? r : r + 360;
};
var a = function(r) {
	return {
		r: e(r.r, 0, 255),
		g: e(r.g, 0, 255),
		b: e(r.b, 0, 255),
		a: e(r.a)
	};
};
var o = function(r) {
	return {
		r: n(r.r),
		g: n(r.g),
		b: n(r.b),
		a: n(r.a, 3)
	};
};
var i = /^#([0-9a-f]{3,8})$/i;
var s = function(r) {
	var t = r.toString(16);
	return t.length < 2 ? "0" + t : t;
};
var h = function(r) {
	var t = r.r, n = r.g, e = r.b, u = r.a, a = Math.max(t, n, e), o = a - Math.min(t, n, e), i = o ? a === t ? (n - e) / o : a === n ? 2 + (e - t) / o : 4 + (t - n) / o : 0;
	return {
		h: 60 * (i < 0 ? i + 6 : i),
		s: a ? o / a * 100 : 0,
		v: a / 255 * 100,
		a: u
	};
};
var b = function(r) {
	var t = r.h, n = r.s, e = r.v, u = r.a;
	t = t / 360 * 6, n /= 100, e /= 100;
	var a = Math.floor(t), o = e * (1 - n), i = e * (1 - (t - a) * n), s = e * (1 - (1 - t + a) * n), h = a % 6;
	return {
		r: 255 * [
			e,
			i,
			o,
			o,
			s,
			e
		][h],
		g: 255 * [
			s,
			e,
			e,
			i,
			o,
			o
		][h],
		b: 255 * [
			o,
			o,
			s,
			e,
			e,
			i
		][h],
		a: u
	};
};
var g = function(r) {
	return {
		h: u(r.h),
		s: e(r.s, 0, 100),
		l: e(r.l, 0, 100),
		a: e(r.a)
	};
};
var d = function(r) {
	return {
		h: n(r.h),
		s: n(r.s),
		l: n(r.l),
		a: n(r.a, 3)
	};
};
var f = function(r) {
	return b((n = (t = r).s, {
		h: t.h,
		s: (n *= ((e = t.l) < 50 ? e : 100 - e) / 100) > 0 ? 2 * n / (e + n) * 100 : 0,
		v: e + n,
		a: t.a
	}));
	var t, n, e;
};
var c = function(r) {
	return {
		h: (t = h(r)).h,
		s: (u = (200 - (n = t.s)) * (e = t.v) / 100) > 0 && u < 200 ? n * e / 100 / (u <= 100 ? u : 200 - u) * 100 : 0,
		l: u / 2,
		a: t.a
	};
	var t, n, e, u;
};
var l = /^hsla?\(\s*([+-]?\d*\.?\d+)(deg|rad|grad|turn)?\s*,\s*([+-]?\d*\.?\d+)%\s*,\s*([+-]?\d*\.?\d+)%\s*(?:,\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i;
var p = /^hsla?\(\s*([+-]?\d*\.?\d+)(deg|rad|grad|turn)?\s+([+-]?\d*\.?\d+)%\s+([+-]?\d*\.?\d+)%\s*(?:\/\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i;
var v = /^rgba?\(\s*([+-]?\d*\.?\d+)(%)?\s*,\s*([+-]?\d*\.?\d+)(%)?\s*,\s*([+-]?\d*\.?\d+)(%)?\s*(?:,\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i;
var m = /^rgba?\(\s*([+-]?\d*\.?\d+)(%)?\s+([+-]?\d*\.?\d+)(%)?\s+([+-]?\d*\.?\d+)(%)?\s*(?:\/\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i;
var y = {
	string: [
		[function(r) {
			var t = i.exec(r);
			return t ? (r = t[1]).length <= 4 ? {
				r: parseInt(r[0] + r[0], 16),
				g: parseInt(r[1] + r[1], 16),
				b: parseInt(r[2] + r[2], 16),
				a: 4 === r.length ? n(parseInt(r[3] + r[3], 16) / 255, 2) : 1
			} : 6 === r.length || 8 === r.length ? {
				r: parseInt(r.substr(0, 2), 16),
				g: parseInt(r.substr(2, 2), 16),
				b: parseInt(r.substr(4, 2), 16),
				a: 8 === r.length ? n(parseInt(r.substr(6, 2), 16) / 255, 2) : 1
			} : null : null;
		}, "hex"],
		[function(r) {
			var t = v.exec(r) || m.exec(r);
			return t ? t[2] !== t[4] || t[4] !== t[6] ? null : a({
				r: Number(t[1]) / (t[2] ? 100 / 255 : 1),
				g: Number(t[3]) / (t[4] ? 100 / 255 : 1),
				b: Number(t[5]) / (t[6] ? 100 / 255 : 1),
				a: void 0 === t[7] ? 1 : Number(t[7]) / (t[8] ? 100 : 1)
			}) : null;
		}, "rgb"],
		[function(t) {
			var n = l.exec(t) || p.exec(t);
			if (!n) return null;
			var e, u;
			return f(g({
				h: (e = n[1], u = n[2], void 0 === u && (u = "deg"), Number(e) * (r[u] || 1)),
				s: Number(n[3]),
				l: Number(n[4]),
				a: void 0 === n[5] ? 1 : Number(n[5]) / (n[6] ? 100 : 1)
			}));
		}, "hsl"]
	],
	object: [
		[function(r) {
			var n = r.r, e = r.g, u = r.b, o = r.a, i = void 0 === o ? 1 : o;
			return t(n) && t(e) && t(u) ? a({
				r: Number(n),
				g: Number(e),
				b: Number(u),
				a: Number(i)
			}) : null;
		}, "rgb"],
		[function(r) {
			var n = r.h, e = r.s, u = r.l, a = r.a, o = void 0 === a ? 1 : a;
			if (!t(n) || !t(e) || !t(u)) return null;
			return f(g({
				h: Number(n),
				s: Number(e),
				l: Number(u),
				a: Number(o)
			}));
		}, "hsl"],
		[function(r) {
			var n = r.h, a = r.s, o = r.v, i = r.a, s = void 0 === i ? 1 : i;
			if (!t(n) || !t(a) || !t(o)) return null;
			return b(function(r) {
				return {
					h: u(r.h),
					s: e(r.s, 0, 100),
					v: e(r.v, 0, 100),
					a: e(r.a)
				};
			}({
				h: Number(n),
				s: Number(a),
				v: Number(o),
				a: Number(s)
			}));
		}, "hsv"]
	]
};
var N = function(r, t) {
	for (var n = 0; n < t.length; n++) {
		var e = t[n][0](r);
		if (e) return [e, t[n][1]];
	}
	return [null, void 0];
};
var x = function(r) {
	return "string" == typeof r ? N(r.trim(), y.string) : "object" == typeof r && null !== r ? N(r, y.object) : [null, void 0];
};
var M = function(r, t) {
	var n = c(r);
	return {
		h: n.h,
		s: e(n.s + 100 * t, 0, 100),
		l: n.l,
		a: n.a
	};
};
var H = function(r) {
	return (299 * r.r + 587 * r.g + 114 * r.b) / 1e3 / 255;
};
var $ = function(r, t) {
	var n = c(r);
	return {
		h: n.h,
		s: n.s,
		l: e(n.l + 100 * t, 0, 100),
		a: n.a
	};
};
var j = function() {
	function r(r) {
		this.parsed = x(r)[0], this.rgba = this.parsed || {
			r: 0,
			g: 0,
			b: 0,
			a: 1
		};
	}
	return r.prototype.isValid = function() {
		return null !== this.parsed;
	}, r.prototype.brightness = function() {
		return n(H(this.rgba), 2);
	}, r.prototype.isDark = function() {
		return H(this.rgba) < .5;
	}, r.prototype.isLight = function() {
		return H(this.rgba) >= .5;
	}, r.prototype.toHex = function() {
		return r = o(this.rgba), t = r.r, e = r.g, u = r.b, i = (a = r.a) < 1 ? s(n(255 * a)) : "", "#" + s(t) + s(e) + s(u) + i;
		var r, t, e, u, a, i;
	}, r.prototype.toRgb = function() {
		return o(this.rgba);
	}, r.prototype.toRgbString = function() {
		return r = o(this.rgba), t = r.r, n = r.g, e = r.b, (u = r.a) < 1 ? "rgba(" + t + ", " + n + ", " + e + ", " + u + ")" : "rgb(" + t + ", " + n + ", " + e + ")";
		var r, t, n, e, u;
	}, r.prototype.toHsl = function() {
		return d(c(this.rgba));
	}, r.prototype.toHslString = function() {
		return r = d(c(this.rgba)), t = r.h, n = r.s, e = r.l, (u = r.a) < 1 ? "hsla(" + t + ", " + n + "%, " + e + "%, " + u + ")" : "hsl(" + t + ", " + n + "%, " + e + "%)";
		var r, t, n, e, u;
	}, r.prototype.toHsv = function() {
		return r = h(this.rgba), {
			h: n(r.h),
			s: n(r.s),
			v: n(r.v),
			a: n(r.a, 3)
		};
		var r;
	}, r.prototype.invert = function() {
		return w({
			r: 255 - (r = this.rgba).r,
			g: 255 - r.g,
			b: 255 - r.b,
			a: r.a
		});
		var r;
	}, r.prototype.saturate = function(r) {
		return void 0 === r && (r = .1), w(M(this.rgba, r));
	}, r.prototype.desaturate = function(r) {
		return void 0 === r && (r = .1), w(M(this.rgba, -r));
	}, r.prototype.grayscale = function() {
		return w(M(this.rgba, -1));
	}, r.prototype.lighten = function(r) {
		return void 0 === r && (r = .1), w($(this.rgba, r));
	}, r.prototype.darken = function(r) {
		return void 0 === r && (r = .1), w($(this.rgba, -r));
	}, r.prototype.rotate = function(r) {
		return void 0 === r && (r = 15), this.hue(this.hue() + r);
	}, r.prototype.alpha = function(r) {
		return "number" == typeof r ? w({
			r: (t = this.rgba).r,
			g: t.g,
			b: t.b,
			a: r
		}) : n(this.rgba.a, 3);
		var t;
	}, r.prototype.hue = function(r) {
		var t = c(this.rgba);
		return "number" == typeof r ? w({
			h: r,
			s: t.s,
			l: t.l,
			a: t.a
		}) : n(t.h);
	}, r.prototype.isEqual = function(r) {
		return this.toHex() === w(r).toHex();
	}, r;
}();
var w = function(r) {
	return r instanceof j ? r : new j(r);
};
var S = [];
var k = function(r) {
	r.forEach(function(r) {
		S.indexOf(r) < 0 && (r(j, y), S.push(r));
	});
};
//#endregion
//#region node_modules/.pnpm/@pixi+colord@2.9.6/node_modules/@pixi/colord/plugins/names.mjs
function names_default(e, f) {
	var a = {
		white: "#ffffff",
		bisque: "#ffe4c4",
		blue: "#0000ff",
		cadetblue: "#5f9ea0",
		chartreuse: "#7fff00",
		chocolate: "#d2691e",
		coral: "#ff7f50",
		antiquewhite: "#faebd7",
		aqua: "#00ffff",
		azure: "#f0ffff",
		whitesmoke: "#f5f5f5",
		papayawhip: "#ffefd5",
		plum: "#dda0dd",
		blanchedalmond: "#ffebcd",
		black: "#000000",
		gold: "#ffd700",
		goldenrod: "#daa520",
		gainsboro: "#dcdcdc",
		cornsilk: "#fff8dc",
		cornflowerblue: "#6495ed",
		burlywood: "#deb887",
		aquamarine: "#7fffd4",
		beige: "#f5f5dc",
		crimson: "#dc143c",
		cyan: "#00ffff",
		darkblue: "#00008b",
		darkcyan: "#008b8b",
		darkgoldenrod: "#b8860b",
		darkkhaki: "#bdb76b",
		darkgray: "#a9a9a9",
		darkgreen: "#006400",
		darkgrey: "#a9a9a9",
		peachpuff: "#ffdab9",
		darkmagenta: "#8b008b",
		darkred: "#8b0000",
		darkorchid: "#9932cc",
		darkorange: "#ff8c00",
		darkslateblue: "#483d8b",
		gray: "#808080",
		darkslategray: "#2f4f4f",
		darkslategrey: "#2f4f4f",
		deeppink: "#ff1493",
		deepskyblue: "#00bfff",
		wheat: "#f5deb3",
		firebrick: "#b22222",
		floralwhite: "#fffaf0",
		ghostwhite: "#f8f8ff",
		darkviolet: "#9400d3",
		magenta: "#ff00ff",
		green: "#008000",
		dodgerblue: "#1e90ff",
		grey: "#808080",
		honeydew: "#f0fff0",
		hotpink: "#ff69b4",
		blueviolet: "#8a2be2",
		forestgreen: "#228b22",
		lawngreen: "#7cfc00",
		indianred: "#cd5c5c",
		indigo: "#4b0082",
		fuchsia: "#ff00ff",
		brown: "#a52a2a",
		maroon: "#800000",
		mediumblue: "#0000cd",
		lightcoral: "#f08080",
		darkturquoise: "#00ced1",
		lightcyan: "#e0ffff",
		ivory: "#fffff0",
		lightyellow: "#ffffe0",
		lightsalmon: "#ffa07a",
		lightseagreen: "#20b2aa",
		linen: "#faf0e6",
		mediumaquamarine: "#66cdaa",
		lemonchiffon: "#fffacd",
		lime: "#00ff00",
		khaki: "#f0e68c",
		mediumseagreen: "#3cb371",
		limegreen: "#32cd32",
		mediumspringgreen: "#00fa9a",
		lightskyblue: "#87cefa",
		lightblue: "#add8e6",
		midnightblue: "#191970",
		lightpink: "#ffb6c1",
		mistyrose: "#ffe4e1",
		moccasin: "#ffe4b5",
		mintcream: "#f5fffa",
		lightslategray: "#778899",
		lightslategrey: "#778899",
		navajowhite: "#ffdead",
		navy: "#000080",
		mediumvioletred: "#c71585",
		powderblue: "#b0e0e6",
		palegoldenrod: "#eee8aa",
		oldlace: "#fdf5e6",
		paleturquoise: "#afeeee",
		mediumturquoise: "#48d1cc",
		mediumorchid: "#ba55d3",
		rebeccapurple: "#663399",
		lightsteelblue: "#b0c4de",
		mediumslateblue: "#7b68ee",
		thistle: "#d8bfd8",
		tan: "#d2b48c",
		orchid: "#da70d6",
		mediumpurple: "#9370db",
		purple: "#800080",
		pink: "#ffc0cb",
		skyblue: "#87ceeb",
		springgreen: "#00ff7f",
		palegreen: "#98fb98",
		red: "#ff0000",
		yellow: "#ffff00",
		slateblue: "#6a5acd",
		lavenderblush: "#fff0f5",
		peru: "#cd853f",
		palevioletred: "#db7093",
		violet: "#ee82ee",
		teal: "#008080",
		slategray: "#708090",
		slategrey: "#708090",
		aliceblue: "#f0f8ff",
		darkseagreen: "#8fbc8f",
		darkolivegreen: "#556b2f",
		greenyellow: "#adff2f",
		seagreen: "#2e8b57",
		seashell: "#fff5ee",
		tomato: "#ff6347",
		silver: "#c0c0c0",
		sienna: "#a0522d",
		lavender: "#e6e6fa",
		lightgreen: "#90ee90",
		orange: "#ffa500",
		orangered: "#ff4500",
		steelblue: "#4682b4",
		royalblue: "#4169e1",
		turquoise: "#40e0d0",
		yellowgreen: "#9acd32",
		salmon: "#fa8072",
		saddlebrown: "#8b4513",
		sandybrown: "#f4a460",
		rosybrown: "#bc8f8f",
		darksalmon: "#e9967a",
		lightgoldenrodyellow: "#fafad2",
		snow: "#fffafa",
		lightgrey: "#d3d3d3",
		lightgray: "#d3d3d3",
		dimgray: "#696969",
		dimgrey: "#696969",
		olivedrab: "#6b8e23",
		olive: "#808000"
	}, r = {};
	for (var d in a) r[a[d]] = d;
	var l = {};
	e.prototype.toName = function(f) {
		if (!(this.rgba.a || this.rgba.r || this.rgba.g || this.rgba.b)) return "transparent";
		var d, i, n = r[this.toHex()];
		if (n) return n;
		if (null == f ? void 0 : f.closest) {
			var o = this.toRgb(), t = 1 / 0, b = "black";
			if (!l.length) for (var c in a) l[c] = new e(a[c]).toRgb();
			for (var g in a) {
				var u = (d = o, i = l[g], Math.pow(d.r - i.r, 2) + Math.pow(d.g - i.g, 2) + Math.pow(d.b - i.b, 2));
				u < t && (t = u, b = g);
			}
			return b;
		}
	};
	f.string.push([function(f) {
		var r = f.toLowerCase(), d = "transparent" === r ? "#0000" : a[r];
		return d ? new e(d).toRgb() : null;
	}, "name"]);
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/color/Color.mjs
k([names_default]);
var _Color = class _Color {
	/**
	* @param {ColorSource} value - Optional value to use, if not provided, white is used.
	*/
	constructor(value = 16777215) {
		this._value = null;
		this._components = /* @__PURE__ */ new Float32Array(4);
		this._components.fill(1);
		this._int = 16777215;
		this.value = value;
	}
	/** Get red component (0 - 1) */
	get red() {
		return this._components[0];
	}
	/** Get green component (0 - 1) */
	get green() {
		return this._components[1];
	}
	/** Get blue component (0 - 1) */
	get blue() {
		return this._components[2];
	}
	/** Get alpha component (0 - 1) */
	get alpha() {
		return this._components[3];
	}
	/**
	* Set the value, suitable for chaining
	* @param value
	* @see Color.value
	*/
	setValue(value) {
		this.value = value;
		return this;
	}
	/**
	* The current color source.
	*
	* When setting:
	* - Setting to an instance of `Color` will copy its color source and components.
	* - Otherwise, `Color` will try to normalize the color source and set the components.
	*   If the color source is invalid, an `Error` will be thrown and the `Color` will left unchanged.
	*
	* Note: The `null` in the setter's parameter type is added to match the TypeScript rule: return type of getter
	* must be assignable to its setter's parameter type. Setting `value` to `null` will throw an `Error`.
	*
	* When getting:
	* - A return value of `null` means the previous value was overridden (e.g., {@link Color.multiply multiply},
	*   {@link Color.premultiply premultiply} or {@link Color.round round}).
	* - Otherwise, the color source used when setting is returned.
	*/
	set value(value) {
		if (value instanceof _Color) {
			this._value = this._cloneSource(value._value);
			this._int = value._int;
			this._components.set(value._components);
		} else if (value === null) throw new Error("Cannot set Color#value to null");
		else if (this._value === null || !this._isSourceEqual(this._value, value)) {
			this._value = this._cloneSource(value);
			this._normalize(this._value);
		}
	}
	get value() {
		return this._value;
	}
	/**
	* Copy a color source internally.
	* @param value - Color source
	*/
	_cloneSource(value) {
		if (typeof value === "string" || typeof value === "number" || value instanceof Number || value === null) return value;
		else if (Array.isArray(value) || ArrayBuffer.isView(value)) return value.slice(0);
		else if (typeof value === "object" && value !== null) return { ...value };
		return value;
	}
	/**
	* Equality check for color sources.
	* @param value1 - First color source
	* @param value2 - Second color source
	* @returns `true` if the color sources are equal, `false` otherwise.
	*/
	_isSourceEqual(value1, value2) {
		const type1 = typeof value1;
		if (type1 !== typeof value2) return false;
		else if (type1 === "number" || type1 === "string" || value1 instanceof Number) return value1 === value2;
		else if (Array.isArray(value1) && Array.isArray(value2) || ArrayBuffer.isView(value1) && ArrayBuffer.isView(value2)) {
			if (value1.length !== value2.length) return false;
			return value1.every((v, i) => v === value2[i]);
		} else if (value1 !== null && value2 !== null) {
			const keys1 = Object.keys(value1);
			const keys2 = Object.keys(value2);
			if (keys1.length !== keys2.length) return false;
			return keys1.every((key) => value1[key] === value2[key]);
		}
		return value1 === value2;
	}
	/**
	* Convert to a RGBA color object.
	* @example
	* import { Color } from 'pixi.js';
	* new Color('white').toRgb(); // returns { r: 1, g: 1, b: 1, a: 1 }
	*/
	toRgba() {
		const [r, g, b, a] = this._components;
		return {
			r,
			g,
			b,
			a
		};
	}
	/**
	* Convert to a RGB color object.
	* @example
	* import { Color } from 'pixi.js';
	* new Color('white').toRgb(); // returns { r: 1, g: 1, b: 1 }
	*/
	toRgb() {
		const [r, g, b] = this._components;
		return {
			r,
			g,
			b
		};
	}
	/** Convert to a CSS-style rgba string: `rgba(255,255,255,1.0)`. */
	toRgbaString() {
		const [r, g, b] = this.toUint8RgbArray();
		return `rgba(${r},${g},${b},${this.alpha})`;
	}
	toUint8RgbArray(out) {
		const [r, g, b] = this._components;
		if (!this._arrayRgb) this._arrayRgb = [];
		out || (out = this._arrayRgb);
		out[0] = Math.round(r * 255);
		out[1] = Math.round(g * 255);
		out[2] = Math.round(b * 255);
		return out;
	}
	toArray(out) {
		if (!this._arrayRgba) this._arrayRgba = [];
		out || (out = this._arrayRgba);
		const [r, g, b, a] = this._components;
		out[0] = r;
		out[1] = g;
		out[2] = b;
		out[3] = a;
		return out;
	}
	toRgbArray(out) {
		if (!this._arrayRgb) this._arrayRgb = [];
		out || (out = this._arrayRgb);
		const [r, g, b] = this._components;
		out[0] = r;
		out[1] = g;
		out[2] = b;
		return out;
	}
	/**
	* Convert to a hexadecimal number.
	* @example
	* import { Color } from 'pixi.js';
	* new Color('white').toNumber(); // returns 16777215
	*/
	toNumber() {
		return this._int;
	}
	/**
	* Convert to a BGR number
	* @example
	* import { Color } from 'pixi.js';
	* new Color(0xffcc99).toBgrNumber(); // returns 0x99ccff
	*/
	toBgrNumber() {
		const [r, g, b] = this.toUint8RgbArray();
		return (b << 16) + (g << 8) + r;
	}
	/**
	* Convert to a hexadecimal number in little endian format (e.g., BBGGRR).
	* @example
	* import { Color } from 'pixi.js';
	* new Color(0xffcc99).toLittleEndianNumber(); // returns 0x99ccff
	* @returns {number} - The color as a number in little endian format.
	*/
	toLittleEndianNumber() {
		const value = this._int;
		return (value >> 16) + (value & 65280) + ((value & 255) << 16);
	}
	/**
	* Multiply with another color. This action is destructive, and will
	* override the previous `value` property to be `null`.
	* @param {ColorSource} value - The color to multiply by.
	*/
	multiply(value) {
		const [r, g, b, a] = _Color._temp.setValue(value)._components;
		this._components[0] *= r;
		this._components[1] *= g;
		this._components[2] *= b;
		this._components[3] *= a;
		this._refreshInt();
		this._value = null;
		return this;
	}
	/**
	* Converts color to a premultiplied alpha format. This action is destructive, and will
	* override the previous `value` property to be `null`.
	* @param alpha - The alpha to multiply by.
	* @param {boolean} [applyToRGB=true] - Whether to premultiply RGB channels.
	* @returns {Color} - Itself.
	*/
	premultiply(alpha, applyToRGB = true) {
		if (applyToRGB) {
			this._components[0] *= alpha;
			this._components[1] *= alpha;
			this._components[2] *= alpha;
		}
		this._components[3] = alpha;
		this._refreshInt();
		this._value = null;
		return this;
	}
	/**
	* Premultiplies alpha with current color.
	* @param {number} alpha - The alpha to multiply by.
	* @param {boolean} [applyToRGB=true] - Whether to premultiply RGB channels.
	* @returns {number} tint multiplied by alpha
	*/
	toPremultiplied(alpha, applyToRGB = true) {
		if (alpha === 1) return (255 << 24) + this._int;
		if (alpha === 0) return applyToRGB ? 0 : this._int;
		let r = this._int >> 16 & 255;
		let g = this._int >> 8 & 255;
		let b = this._int & 255;
		if (applyToRGB) {
			r = r * alpha + .5 | 0;
			g = g * alpha + .5 | 0;
			b = b * alpha + .5 | 0;
		}
		return (alpha * 255 << 24) + (r << 16) + (g << 8) + b;
	}
	/**
	* Convert to a hexadecimal string.
	* @example
	* import { Color } from 'pixi.js';
	* new Color('white').toHex(); // returns "#ffffff"
	*/
	toHex() {
		const hexString = this._int.toString(16);
		return `#${"000000".substring(0, 6 - hexString.length) + hexString}`;
	}
	/**
	* Convert to a hexadecimal string with alpha.
	* @example
	* import { Color } from 'pixi.js';
	* new Color('white').toHexa(); // returns "#ffffffff"
	*/
	toHexa() {
		const alphaString = Math.round(this._components[3] * 255).toString(16);
		return this.toHex() + "00".substring(0, 2 - alphaString.length) + alphaString;
	}
	/**
	* Set alpha, suitable for chaining.
	* @param alpha
	*/
	setAlpha(alpha) {
		this._components[3] = this._clamp(alpha);
		return this;
	}
	/**
	* Normalize the input value into rgba
	* @param value - Input value
	*/
	_normalize(value) {
		let r;
		let g;
		let b;
		let a;
		if ((typeof value === "number" || value instanceof Number) && value >= 0 && value <= 16777215) {
			const int = value;
			r = (int >> 16 & 255) / 255;
			g = (int >> 8 & 255) / 255;
			b = (int & 255) / 255;
			a = 1;
		} else if ((Array.isArray(value) || value instanceof Float32Array) && value.length >= 3 && value.length <= 4) {
			value = this._clamp(value);
			[r, g, b, a = 1] = value;
		} else if ((value instanceof Uint8Array || value instanceof Uint8ClampedArray) && value.length >= 3 && value.length <= 4) {
			value = this._clamp(value, 0, 255);
			[r, g, b, a = 255] = value;
			r /= 255;
			g /= 255;
			b /= 255;
			a /= 255;
		} else if (typeof value === "string" || typeof value === "object") {
			if (typeof value === "string") {
				const match = _Color.HEX_PATTERN.exec(value);
				if (match) value = `#${match[2]}`;
			}
			const color = w(value);
			if (color.isValid()) {
				({r, g, b, a} = color.rgba);
				r /= 255;
				g /= 255;
				b /= 255;
			}
		}
		if (r !== void 0) {
			this._components[0] = r;
			this._components[1] = g;
			this._components[2] = b;
			this._components[3] = a;
			this._refreshInt();
		} else throw new Error(`Unable to convert color ${value}`);
	}
	/** Refresh the internal color rgb number */
	_refreshInt() {
		this._clamp(this._components);
		const [r, g, b] = this._components;
		this._int = (r * 255 << 16) + (g * 255 << 8) + (b * 255 | 0);
	}
	/**
	* Clamps values to a range. Will override original values
	* @param value - Value(s) to clamp
	* @param min - Minimum value
	* @param max - Maximum value
	*/
	_clamp(value, min = 0, max = 1) {
		if (typeof value === "number") return Math.min(Math.max(value, min), max);
		value.forEach((v, i) => {
			value[i] = Math.min(Math.max(v, min), max);
		});
		return value;
	}
	/**
	* Check if the value is a color-like object
	* @param value - Value to check
	* @returns True if the value is a color-like object
	* @static
	* @example
	* import { Color } from 'pixi.js';
	* Color.isColorLike('white'); // returns true
	* Color.isColorLike(0xffffff); // returns true
	* Color.isColorLike([1, 1, 1]); // returns true
	*/
	static isColorLike(value) {
		return typeof value === "number" || typeof value === "string" || value instanceof Number || value instanceof _Color || Array.isArray(value) || value instanceof Uint8Array || value instanceof Uint8ClampedArray || value instanceof Float32Array || value.r !== void 0 && value.g !== void 0 && value.b !== void 0 || value.r !== void 0 && value.g !== void 0 && value.b !== void 0 && value.a !== void 0 || value.h !== void 0 && value.s !== void 0 && value.l !== void 0 || value.h !== void 0 && value.s !== void 0 && value.l !== void 0 && value.a !== void 0 || value.h !== void 0 && value.s !== void 0 && value.v !== void 0 || value.h !== void 0 && value.s !== void 0 && value.v !== void 0 && value.a !== void 0;
	}
};
/**
* Default Color object for static uses
* @example
* import { Color } from 'pixi.js';
* Color.shared.setValue(0xffffff).toHex(); // '#ffffff'
*/
_Color.shared = new _Color();
/**
* Temporary Color object for static uses internally.
* As to not conflict with Color.shared.
* @ignore
*/
_Color._temp = new _Color();
/** Pattern for hex strings */
_Color.HEX_PATTERN = /^(#|0x)?(([a-f0-9]{3}){1,2}([a-f0-9]{2})?)$/i;
var Color = _Color;
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/culling/cullingMixin.mjs
var cullingMixin = {
	cullArea: null,
	cullable: false,
	cullableChildren: true
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/utils/pool/Pool.mjs
var Pool = class {
	/**
	* Constructs a new Pool.
	* @param ClassType - The constructor of the items in the pool.
	* @param {number} [initialSize] - The initial size of the pool.
	*/
	constructor(ClassType, initialSize) {
		this._pool = [];
		this._count = 0;
		this._index = 0;
		this._classType = ClassType;
		if (initialSize) this.prepopulate(initialSize);
	}
	/**
	* Prepopulates the pool with a given number of items.
	* @param total - The number of items to add to the pool.
	*/
	prepopulate(total) {
		for (let i = 0; i < total; i++) this._pool[this._index++] = new this._classType();
		this._count += total;
	}
	/**
	* Gets an item from the pool. Calls the item's `init` method if it exists.
	* If there are no items left in the pool, a new one will be created.
	* @param {unknown} [data] - Optional data to pass to the item's constructor.
	* @returns {T} The item from the pool.
	*/
	get(data) {
		let item;
		if (this._index > 0) item = this._pool[--this._index];
		else item = new this._classType();
		item.init?.(data);
		return item;
	}
	/**
	* Returns an item to the pool. Calls the item's `reset` method if it exists.
	* @param {T} item - The item to return to the pool.
	*/
	return(item) {
		item.reset?.();
		this._pool[this._index++] = item;
	}
	/**
	* Gets the number of items in the pool.
	* @readonly
	* @member {number}
	*/
	get totalSize() {
		return this._count;
	}
	/**
	* Gets the number of items in the pool that are free to use without needing to create more.
	* @readonly
	* @member {number}
	*/
	get totalFree() {
		return this._index;
	}
	/**
	* Gets the number of items in the pool that are currently in use.
	* @readonly
	* @member {number}
	*/
	get totalUsed() {
		return this._count - this._index;
	}
	/** clears the pool - mainly used for debugging! */
	clear() {
		this._pool.length = 0;
		this._index = 0;
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/utils/pool/PoolGroup.mjs
var PoolGroupClass = class {
	constructor() {
		/**
		* A map to store the pools by their class type.
		* @private
		*/
		this._poolsByClass = /* @__PURE__ */ new Map();
	}
	/**
	* Prepopulates a specific pool with a given number of items.
	* @template T The type of items in the pool. Must extend PoolItem.
	* @param {PoolItemConstructor<T>} Class - The constructor of the items in the pool.
	* @param {number} total - The number of items to add to the pool.
	*/
	prepopulate(Class, total) {
		this.getPool(Class).prepopulate(total);
	}
	/**
	* Gets an item from a specific pool.
	* @template T The type of items in the pool. Must extend PoolItem.
	* @param {PoolItemConstructor<T>} Class - The constructor of the items in the pool.
	* @param {unknown} [data] - Optional data to pass to the item's constructor.
	* @returns {T} The item from the pool.
	*/
	get(Class, data) {
		return this.getPool(Class).get(data);
	}
	/**
	* Returns an item to its respective pool.
	* @param {PoolItem} item - The item to return to the pool.
	*/
	return(item) {
		this.getPool(item.constructor).return(item);
	}
	/**
	* Gets a specific pool based on the class type.
	* @template T The type of items in the pool. Must extend PoolItem.
	* @param {PoolItemConstructor<T>} ClassType - The constructor of the items in the pool.
	* @returns {Pool<T>} The pool of the given class type.
	*/
	getPool(ClassType) {
		if (!this._poolsByClass.has(ClassType)) this._poolsByClass.set(ClassType, new Pool(ClassType));
		return this._poolsByClass.get(ClassType);
	}
	/** gets the usage stats of each pool in the system */
	stats() {
		const stats = {};
		this._poolsByClass.forEach((pool) => {
			const name = stats[pool._classType.name] ? pool._classType.name + pool._classType.ID : pool._classType.name;
			stats[name] = {
				free: pool.totalFree,
				used: pool.totalUsed,
				size: pool.totalSize
			};
		});
		return stats;
	}
};
var BigPool = new PoolGroupClass();
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/scene/container/container-mixins/cacheAsTextureMixin.mjs
var cacheAsTextureMixin = {
	/**
	* Is this container cached as a texture?
	* @readonly
	* @type {boolean}
	* @memberof scene.Container#
	*/
	get isCachedAsTexture() {
		return !!this.renderGroup?.isCachedAsTexture;
	},
	cacheAsTexture(val) {
		if (typeof val === "boolean" && val === false) this.disableRenderGroup();
		else {
			this.enableRenderGroup();
			this.renderGroup.enableCacheAsTexture(val === true ? {} : val);
		}
	},
	/**
	* Updates the cached texture. Will flag that this container's cached texture needs to be redrawn.
	* This will happen on the next render.
	* @memberof scene.Container#
	*/
	updateCacheTexture() {
		this.renderGroup?.updateCacheTexture();
	},
	/**
	* Allows backwards compatibility with pixi.js below version v8. Use `cacheAsTexture` instead.
	* @deprecated
	*/
	get cacheAsBitmap() {
		return this.isCachedAsTexture;
	},
	/**
	* @deprecated
	*/
	set cacheAsBitmap(val) {
		deprecation("v8.6.0", "cacheAsBitmap is deprecated, use cacheAsTexture instead.");
		this.cacheAsTexture(val);
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/utils/data/removeItems.mjs
function removeItems(arr, startIdx, removeCount) {
	const length = arr.length;
	let i;
	if (startIdx >= length || removeCount === 0) return;
	removeCount = startIdx + removeCount > length ? length - startIdx : removeCount;
	const len = length - removeCount;
	for (i = startIdx; i < len; ++i) arr[i] = arr[i + removeCount];
	arr.length = len;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/scene/container/container-mixins/childrenHelperMixin.mjs
var childrenHelperMixin = {
	allowChildren: true,
	/**
	* Removes all children from this container that are within the begin and end indexes.
	* @param beginIndex - The beginning position.
	* @param endIndex - The ending position. Default value is size of the container.
	* @returns - List of removed children
	* @memberof scene.Container#
	*/
	removeChildren(beginIndex = 0, endIndex) {
		const end = endIndex ?? this.children.length;
		const range = end - beginIndex;
		const removed = [];
		if (range > 0 && range <= end) {
			for (let i = end - 1; i >= beginIndex; i--) {
				const child = this.children[i];
				if (!child) continue;
				removed.push(child);
				child.parent = null;
			}
			removeItems(this.children, beginIndex, end);
			const renderGroup = this.renderGroup || this.parentRenderGroup;
			if (renderGroup) renderGroup.removeChildren(removed);
			for (let i = 0; i < removed.length; ++i) {
				this.emit("childRemoved", removed[i], this, i);
				removed[i].emit("removed", this);
			}
			if (removed.length > 0) this._didViewChangeTick++;
			return removed;
		} else if (range === 0 && this.children.length === 0) return removed;
		throw new RangeError("removeChildren: numeric values are outside the acceptable range.");
	},
	/**
	* Removes a child from the specified index position.
	* @param index - The index to get the child from
	* @returns The child that was removed.
	* @memberof scene.Container#
	*/
	removeChildAt(index) {
		const child = this.getChildAt(index);
		return this.removeChild(child);
	},
	/**
	* Returns the child at the specified index
	* @param index - The index to get the child at
	* @returns - The child at the given index, if any.
	* @memberof scene.Container#
	*/
	getChildAt(index) {
		if (index < 0 || index >= this.children.length) throw new Error(`getChildAt: Index (${index}) does not exist.`);
		return this.children[index];
	},
	/**
	* Changes the position of an existing child in the container
	* @param child - The child Container instance for which you want to change the index number
	* @param index - The resulting index number for the child container
	* @memberof scene.Container#
	*/
	setChildIndex(child, index) {
		if (index < 0 || index >= this.children.length) throw new Error(`The index ${index} supplied is out of bounds ${this.children.length}`);
		this.getChildIndex(child);
		this.addChildAt(child, index);
	},
	/**
	* Returns the index position of a child Container instance
	* @param child - The Container instance to identify
	* @returns - The index position of the child container to identify
	* @memberof scene.Container#
	*/
	getChildIndex(child) {
		const index = this.children.indexOf(child);
		if (index === -1) throw new Error("The supplied Container must be a child of the caller");
		return index;
	},
	/**
	* Adds a child to the container at a specified index. If the index is out of bounds an error will be thrown.
	* If the child is already in this container, it will be moved to the specified index.
	* @param {Container} child - The child to add.
	* @param {number} index - The absolute index where the child will be positioned at the end of the operation.
	* @returns {Container} The child that was added.
	* @memberof scene.Container#
	*/
	addChildAt(child, index) {
		if (!this.allowChildren) deprecation(v8_0_0, "addChildAt: Only Containers will be allowed to add children in v8.0.0");
		const { children } = this;
		if (index < 0 || index > children.length) throw new Error(`${child}addChildAt: The index ${index} supplied is out of bounds ${children.length}`);
		if (child.parent) {
			const currentIndex = child.parent.children.indexOf(child);
			if (child.parent === this && currentIndex === index) return child;
			if (currentIndex !== -1) child.parent.children.splice(currentIndex, 1);
		}
		if (index === children.length) children.push(child);
		else children.splice(index, 0, child);
		child.parent = this;
		child.didChange = true;
		child._updateFlags = 15;
		const renderGroup = this.renderGroup || this.parentRenderGroup;
		if (renderGroup) renderGroup.addChild(child);
		if (this.sortableChildren) this.sortDirty = true;
		this.emit("childAdded", child, this, index);
		child.emit("added", this);
		return child;
	},
	/**
	* Swaps the position of 2 Containers within this container.
	* @param child - First container to swap
	* @param child2 - Second container to swap
	* @memberof scene.Container#
	*/
	swapChildren(child, child2) {
		if (child === child2) return;
		const index1 = this.getChildIndex(child);
		const index2 = this.getChildIndex(child2);
		this.children[index1] = child2;
		this.children[index2] = child;
		const renderGroup = this.renderGroup || this.parentRenderGroup;
		if (renderGroup) renderGroup.structureDidChange = true;
		this._didContainerChangeTick++;
	},
	/**
	* Remove the Container from its parent Container. If the Container has no parent, do nothing.
	* @memberof scene.Container#
	*/
	removeFromParent() {
		this.parent?.removeChild(this);
	},
	/**
	* Reparent the child to this container, keeping the same worldTransform.
	* @param child - The child to reparent
	* @returns The first child that was reparented.
	* @memberof scene.Container#
	*/
	reparentChild(...child) {
		if (child.length === 1) return this.reparentChildAt(child[0], this.children.length);
		child.forEach((c) => this.reparentChildAt(c, this.children.length));
		return child[0];
	},
	/**
	* Reparent the child to this container at the specified index, keeping the same worldTransform.
	* @param child - The child to reparent
	* @param index - The index to reparent the child to
	* @memberof scene.Container#
	*/
	reparentChildAt(child, index) {
		if (child.parent === this) {
			this.setChildIndex(child, index);
			return child;
		}
		const childMat = child.worldTransform.clone();
		child.removeFromParent();
		this.addChildAt(child, index);
		const newMatrix = this.worldTransform.clone();
		newMatrix.invert();
		childMat.prepend(newMatrix);
		child.setFromMatrix(childMat);
		return child;
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/scene/container/container-mixins/collectRenderablesMixin.mjs
var collectRenderablesMixin = {
	/**
	* Main method to collect renderables from the container and its children.
	* It checks the container's properties to decide whether to use a simple or advanced collection method.
	* @param {InstructionSet} instructionSet - The set of instructions to which the renderables will be added.
	* @param {Renderer} renderer - The renderer responsible for rendering the scene.
	* @param {IRenderLayer} currentLayer - The current render layer being processed.
	* @memberof scene.Container#
	*/
	collectRenderables(instructionSet, renderer, currentLayer) {
		if (this.parentRenderLayer && this.parentRenderLayer !== currentLayer || this.globalDisplayStatus < 7 || !this.includeInBuild) return;
		if (this.sortableChildren) this.sortChildren();
		if (this.isSimple) this.collectRenderablesSimple(instructionSet, renderer, currentLayer);
		else if (this.renderGroup) renderer.renderPipes.renderGroup.addRenderGroup(this.renderGroup, instructionSet);
		else this.collectRenderablesWithEffects(instructionSet, renderer, currentLayer);
	},
	/**
	* Simple method for collecting renderables from the container's children.
	* This method is efficient and used when the container is marked as simple.
	* @param {InstructionSet} instructionSet - The set of instructions to which the renderables will be added.
	* @param {Renderer} renderer - The renderer responsible for rendering the scene.
	* @param {IRenderLayer} currentLayer - The current render layer being processed.
	* @memberof scene.Container#
	*/
	collectRenderablesSimple(instructionSet, renderer, currentLayer) {
		const children = this.children;
		const length = children.length;
		for (let i = 0; i < length; i++) children[i].collectRenderables(instructionSet, renderer, currentLayer);
	},
	/**
	* Advanced method for collecting renderables, which handles additional effects.
	* This method is used when the container has complex processing needs.
	* @param {InstructionSet} instructionSet - The set of instructions to which the renderables will be added.
	* @param {Renderer} renderer - The renderer responsible for rendering the scene.
	* @param {IRenderLayer} currentLayer - The current render layer being processed.
	* @memberof scene.Container#
	*/
	collectRenderablesWithEffects(instructionSet, renderer, currentLayer) {
		const { renderPipes } = renderer;
		for (let i = 0; i < this.effects.length; i++) {
			const effect = this.effects[i];
			renderPipes[effect.pipe].push(effect, this, instructionSet);
		}
		this.collectRenderablesSimple(instructionSet, renderer, currentLayer);
		for (let i = this.effects.length - 1; i >= 0; i--) {
			const effect = this.effects[i];
			renderPipes[effect.pipe].pop(effect, this, instructionSet);
		}
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/filters/FilterEffect.mjs
var FilterEffect = class {
	constructor() {
		/** the pipe that knows how to handle this effect */
		this.pipe = "filter";
		/** the priority of this effect */
		this.priority = 1;
	}
	destroy() {
		for (let i = 0; i < this.filters.length; i++) this.filters[i].destroy();
		this.filters = null;
		this.filterArea = null;
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/mask/MaskEffectManager.mjs
var MaskEffectManagerClass = class {
	constructor() {
		/**
		* @private
		*/
		this._effectClasses = [];
		this._tests = [];
		this._initialized = false;
	}
	init() {
		if (this._initialized) return;
		this._initialized = true;
		this._effectClasses.forEach((test) => {
			this.add({
				test: test.test,
				maskClass: test
			});
		});
	}
	add(test) {
		this._tests.push(test);
	}
	getMaskEffect(item) {
		if (!this._initialized) this.init();
		for (let i = 0; i < this._tests.length; i++) {
			const test = this._tests[i];
			if (test.test(item)) return BigPool.get(test.maskClass, item);
		}
		return item;
	}
	returnMaskEffect(effect) {
		BigPool.return(effect);
	}
};
var MaskEffectManager = new MaskEffectManagerClass();
extensions.handleByList(ExtensionType.MaskEffect, MaskEffectManager._effectClasses);
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/scene/container/container-mixins/effectsMixin.mjs
var effectsMixin = {
	_maskEffect: null,
	_maskOptions: { inverse: false },
	_filterEffect: null,
	/**
	* @todo Needs docs.
	* @memberof scene.Container#
	* @type {Array<Effect>}
	*/
	effects: [],
	_markStructureAsChanged() {
		const renderGroup = this.renderGroup || this.parentRenderGroup;
		if (renderGroup) renderGroup.structureDidChange = true;
	},
	/**
	* @todo Needs docs.
	* @param effect - The effect to add.
	* @memberof scene.Container#
	* @ignore
	*/
	addEffect(effect) {
		if (this.effects.indexOf(effect) !== -1) return;
		this.effects.push(effect);
		this.effects.sort((a, b) => a.priority - b.priority);
		this._markStructureAsChanged();
		this._updateIsSimple();
	},
	/**
	* @todo Needs docs.
	* @param effect - The effect to remove.
	* @memberof scene.Container#
	* @ignore
	*/
	removeEffect(effect) {
		const index = this.effects.indexOf(effect);
		if (index === -1) return;
		this.effects.splice(index, 1);
		this._markStructureAsChanged();
		this._updateIsSimple();
	},
	set mask(value) {
		const effect = this._maskEffect;
		if (effect?.mask === value) return;
		if (effect) {
			this.removeEffect(effect);
			MaskEffectManager.returnMaskEffect(effect);
			this._maskEffect = null;
		}
		if (value === null || value === void 0) return;
		this._maskEffect = MaskEffectManager.getMaskEffect(value);
		this.addEffect(this._maskEffect);
	},
	/**
	* Used to set mask and control mask options.
	* @param options
	* @example
	* import { Graphics, Sprite } from 'pixi.js';
	*
	* const graphics = new Graphics();
	* graphics.beginFill(0xFF3300);
	* graphics.drawRect(50, 250, 100, 100);
	* graphics.endFill();
	*
	* const sprite = new Sprite(texture);
	* sprite.setMask({
	*     mask: graphics,
	*     inverse: true,
	* });
	* @memberof scene.Container#
	*/
	setMask(options) {
		this._maskOptions = {
			...this._maskOptions,
			...options
		};
		if (options.mask) this.mask = options.mask;
		this._markStructureAsChanged();
	},
	/**
	* Sets a mask for the displayObject. A mask is an object that limits the visibility of an
	* object to the shape of the mask applied to it. In PixiJS a regular mask must be a
	* {@link Graphics} or a {@link Sprite} object. This allows for much faster masking in canvas as it
	* utilities shape clipping. Furthermore, a mask of an object must be in the subtree of its parent.
	* Otherwise, `getLocalBounds` may calculate incorrect bounds, which makes the container's width and height wrong.
	* To remove a mask, set this property to `null`.
	*
	* For sprite mask both alpha and red channel are used. Black mask is the same as transparent mask.
	* @example
	* import { Graphics, Sprite } from 'pixi.js';
	*
	* const graphics = new Graphics();
	* graphics.beginFill(0xFF3300);
	* graphics.drawRect(50, 250, 100, 100);
	* graphics.endFill();
	*
	* const sprite = new Sprite(texture);
	* sprite.mask = graphics;
	* @memberof scene.Container#
	*/
	get mask() {
		return this._maskEffect?.mask;
	},
	set filters(value) {
		if (!Array.isArray(value) && value) value = [value];
		const effect = this._filterEffect || (this._filterEffect = new FilterEffect());
		value = value;
		const hasFilters = value?.length > 0;
		const didChange = hasFilters !== effect.filters?.length > 0;
		value = Array.isArray(value) ? value.slice(0) : value;
		effect.filters = Object.freeze(value);
		if (didChange) {
			if (hasFilters) this.addEffect(effect);
			else {
				this.removeEffect(effect);
				effect.filters = value ?? null;
			}
		}
	},
	/**
	* Sets the filters for the displayObject.
	* IMPORTANT: This is a WebGL only feature and will be ignored by the canvas renderer.
	* To remove filters simply set this property to `'null'`.
	* @memberof scene.Container#
	*/
	get filters() {
		return this._filterEffect?.filters;
	},
	set filterArea(value) {
		this._filterEffect || (this._filterEffect = new FilterEffect());
		this._filterEffect.filterArea = value;
	},
	/**
	* The area the filter is applied to. This is used as more of an optimization
	* rather than figuring out the dimensions of the displayObject each frame you can set this rectangle.
	*
	* Also works as an interaction mask.
	* @memberof scene.Container#
	*/
	get filterArea() {
		return this._filterEffect?.filterArea;
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/scene/container/container-mixins/findMixin.mjs
var findMixin = {
	/**
	* The instance label of the object.
	* @memberof scene.Container#
	* @member {string} label
	*/
	label: null,
	/**
	* The instance name of the object.
	* @deprecated since 8.0.0
	* @see scene.Container#label
	* @member {string} name
	* @memberof scene.Container#
	*/
	get name() {
		deprecation(v8_0_0, "Container.name property has been removed, use Container.label instead");
		return this.label;
	},
	set name(value) {
		deprecation(v8_0_0, "Container.name property has been removed, use Container.label instead");
		this.label = value;
	},
	/**
	* @method getChildByName
	* @deprecated since 8.0.0
	* @param {string} name - Instance name.
	* @param {boolean}[deep=false] - Whether to search recursively
	* @returns {Container} The child with the specified name.
	* @see scene.Container#getChildByLabel
	* @memberof scene.Container#
	*/
	getChildByName(name, deep = false) {
		return this.getChildByLabel(name, deep);
	},
	/**
	* Returns the first child in the container with the specified label.
	*
	* Recursive searches are done in a pre-order traversal.
	* @memberof scene.Container#
	* @param {string|RegExp} label - Instance label.
	* @param {boolean}[deep=false] - Whether to search recursively
	* @returns {Container} The child with the specified label.
	*/
	getChildByLabel(label, deep = false) {
		const children = this.children;
		for (let i = 0; i < children.length; i++) {
			const child = children[i];
			if (child.label === label || label instanceof RegExp && label.test(child.label)) return child;
		}
		if (deep) for (let i = 0; i < children.length; i++) {
			const found = children[i].getChildByLabel(label, true);
			if (found) return found;
		}
		return null;
	},
	/**
	* Returns all children in the container with the specified label.
	* @memberof scene.Container#
	* @param {string|RegExp} label - Instance label.
	* @param {boolean}[deep=false] - Whether to search recursively
	* @param {Container[]} [out=[]] - The array to store matching children in.
	* @returns {Container[]} An array of children with the specified label.
	*/
	getChildrenByLabel(label, deep = false, out = []) {
		const children = this.children;
		for (let i = 0; i < children.length; i++) {
			const child = children[i];
			if (child.label === label || label instanceof RegExp && label.test(child.label)) out.push(child);
		}
		if (deep) for (let i = 0; i < children.length; i++) children[i].getChildrenByLabel(label, true, out);
		return out;
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/scene/container/bounds/utils/matrixAndBoundsPool.mjs
var matrixPool = new Pool(Matrix);
var boundsPool = new Pool(Bounds);
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/scene/container/container-mixins/getFastGlobalBoundsMixin.mjs
var tempMatrix$1 = new Matrix();
var getFastGlobalBoundsMixin = {
	/**
	* Computes the global bounds for the container, considering its children and optionally
	* factoring in render layers. It starts by clearing the provided bounds object, then
	* recursively calculates the bounds, and finally applies the world transformation.
	* @param {boolean} [factorRenderLayers] - Whether to consider render layers in the calculation.
	* @param {Bounds} [bounds] - The bounds object to store the result. If not provided, a new one is created.
	* @returns {Bounds} The computed bounds.
	* @memberof scene.Container#
	*/
	getFastGlobalBounds(factorRenderLayers, bounds) {
		bounds || (bounds = new Bounds());
		bounds.clear();
		this._getGlobalBoundsRecursive(!!factorRenderLayers, bounds, this.parentRenderLayer);
		if (!bounds.isValid) bounds.set(0, 0, 0, 0);
		const renderGroup = this.renderGroup || this.parentRenderGroup;
		bounds.applyMatrix(renderGroup.worldTransform);
		return bounds;
	},
	/**
	* Recursively calculates the global bounds for the container and its children.
	* It considers visibility, measurability, and effects, and applies transformations
	* as necessary to compute the bounds accurately.
	* @param {boolean} factorRenderLayers - Whether to consider render layers in the calculation.
	* @param {Bounds} bounds - The bounds object to update with the calculated values.
	* @param {IRenderLayer} currentLayer - The current render layer being processed.
	* @memberof scene.Container#
	*/
	_getGlobalBoundsRecursive(factorRenderLayers, bounds, currentLayer) {
		let localBounds = bounds;
		if (factorRenderLayers && this.parentRenderLayer && this.parentRenderLayer !== currentLayer) return;
		if (this.localDisplayStatus !== 7 || !this.measurable) return;
		const manageEffects = !!this.effects.length;
		if (this.renderGroup || manageEffects) localBounds = boundsPool.get().clear();
		if (this.boundsArea) bounds.addRect(this.boundsArea, this.worldTransform);
		else {
			if (this.renderPipeId) {
				const viewBounds = this.bounds;
				localBounds.addFrame(viewBounds.minX, viewBounds.minY, viewBounds.maxX, viewBounds.maxY, this.groupTransform);
			}
			const children = this.children;
			for (let i = 0; i < children.length; i++) children[i]._getGlobalBoundsRecursive(factorRenderLayers, localBounds, currentLayer);
		}
		if (manageEffects) {
			let advanced = false;
			const renderGroup = this.renderGroup || this.parentRenderGroup;
			for (let i = 0; i < this.effects.length; i++) if (this.effects[i].addBounds) {
				if (!advanced) {
					advanced = true;
					localBounds.applyMatrix(renderGroup.worldTransform);
				}
				this.effects[i].addBounds(localBounds, true);
			}
			if (advanced) {
				localBounds.applyMatrix(renderGroup.worldTransform.copyTo(tempMatrix$1).invert());
				bounds.addBounds(localBounds, this.relativeGroupTransform);
			}
			bounds.addBounds(localBounds);
			boundsPool.return(localBounds);
		} else if (this.renderGroup) {
			bounds.addBounds(localBounds, this.relativeGroupTransform);
			boundsPool.return(localBounds);
		}
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/scene/container/bounds/getGlobalBounds.mjs
function getGlobalBounds(target, skipUpdateTransform, bounds) {
	bounds.clear();
	let parentTransform;
	let pooledMatrix;
	if (target.parent) {
		if (!skipUpdateTransform) {
			pooledMatrix = matrixPool.get().identity();
			parentTransform = updateTransformBackwards(target, pooledMatrix);
		} else parentTransform = target.parent.worldTransform;
	} else parentTransform = Matrix.IDENTITY;
	_getGlobalBounds(target, bounds, parentTransform, skipUpdateTransform);
	if (pooledMatrix) matrixPool.return(pooledMatrix);
	if (!bounds.isValid) bounds.set(0, 0, 0, 0);
	return bounds;
}
function _getGlobalBounds(target, bounds, parentTransform, skipUpdateTransform) {
	if (!target.visible || !target.measurable) return;
	let worldTransform;
	if (!skipUpdateTransform) {
		target.updateLocalTransform();
		worldTransform = matrixPool.get();
		worldTransform.appendFrom(target.localTransform, parentTransform);
	} else worldTransform = target.worldTransform;
	const parentBounds = bounds;
	const preserveBounds = !!target.effects.length;
	if (preserveBounds) bounds = boundsPool.get().clear();
	if (target.boundsArea) bounds.addRect(target.boundsArea, worldTransform);
	else {
		if (target.bounds) {
			bounds.matrix = worldTransform;
			bounds.addBounds(target.bounds);
		}
		for (let i = 0; i < target.children.length; i++) _getGlobalBounds(target.children[i], bounds, worldTransform, skipUpdateTransform);
	}
	if (preserveBounds) {
		for (let i = 0; i < target.effects.length; i++) target.effects[i].addBounds?.(bounds);
		parentBounds.addBounds(bounds, Matrix.IDENTITY);
		boundsPool.return(bounds);
	}
	if (!skipUpdateTransform) matrixPool.return(worldTransform);
}
function updateTransformBackwards(target, parentTransform) {
	const parent = target.parent;
	if (parent) {
		updateTransformBackwards(parent, parentTransform);
		parent.updateLocalTransform();
		parentTransform.append(parent.localTransform);
	}
	return parentTransform;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/scene/container/utils/multiplyHexColors.mjs
function multiplyHexColors(color1, color2) {
	if (color1 === 16777215 || !color2) return color2;
	if (color2 === 16777215 || !color1) return color1;
	const r1 = color1 >> 16 & 255;
	const g1 = color1 >> 8 & 255;
	const b1 = color1 & 255;
	const r2 = color2 >> 16 & 255;
	const g2 = color2 >> 8 & 255;
	const b2 = color2 & 255;
	const r = r1 * r2 / 255 | 0;
	const g = g1 * g2 / 255 | 0;
	const b = b1 * b2 / 255 | 0;
	return (r << 16) + (g << 8) + b;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/scene/container/utils/multiplyColors.mjs
var WHITE_BGR = 16777215;
function multiplyColors(localBGRColor, parentBGRColor) {
	if (localBGRColor === WHITE_BGR) return parentBGRColor;
	if (parentBGRColor === WHITE_BGR) return localBGRColor;
	return multiplyHexColors(localBGRColor, parentBGRColor);
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/scene/container/container-mixins/getGlobalMixin.mjs
function bgr2rgb(color) {
	return ((color & 255) << 16) + (color & 65280) + (color >> 16 & 255);
}
var getGlobalMixin = {
	/**
	* Returns the global (compound) alpha of the container within the scene.
	* @param skipUpdate - Performance optimization flag:
	*   - If false (default): Recalculates the entire alpha chain through parents for accuracy
	*   - If true: Uses cached worldAlpha from the last render pass for better performance
	* @returns The resulting alpha value (between 0 and 1)
	* @example
	* // Accurate but slower - recalculates entire alpha chain
	* const preciseAlpha = container.getGlobalAlpha();
	*
	* // Faster but may be outdated - uses cached alpha
	* const cachedAlpha = container.getGlobalAlpha(true);
	*/
	getGlobalAlpha(skipUpdate) {
		if (skipUpdate) {
			if (this.renderGroup) return this.renderGroup.worldAlpha;
			if (this.parentRenderGroup) return this.parentRenderGroup.worldAlpha * this.alpha;
			return this.alpha;
		}
		let alpha = this.alpha;
		let current = this.parent;
		while (current) {
			alpha *= current.alpha;
			current = current.parent;
		}
		return alpha;
	},
	/**
	* Returns the global transform matrix of the container within the scene.
	* @param matrix - Optional matrix to store the result. If not provided, a new Matrix will be created.
	* @param skipUpdate - Performance optimization flag:
	*   - If false (default): Recalculates the entire transform chain for accuracy
	*   - If true: Uses cached worldTransform from the last render pass for better performance
	* @returns The resulting transformation matrix (either the input matrix or a new one)
	* @example
	* // Accurate but slower - recalculates entire transform chain
	* const preciseTransform = container.getGlobalTransform();
	*
	* // Faster but may be outdated - uses cached transform
	* const cachedTransform = container.getGlobalTransform(undefined, true);
	*
	* // Reuse existing matrix
	* const existingMatrix = new Matrix();
	* container.getGlobalTransform(existingMatrix);
	*/
	getGlobalTransform(matrix, skipUpdate) {
		if (skipUpdate) return matrix.copyFrom(this.worldTransform);
		this.updateLocalTransform();
		const parentTransform = updateTransformBackwards(this, matrixPool.get().identity());
		matrix.appendFrom(this.localTransform, parentTransform);
		matrixPool.return(parentTransform);
		return matrix;
	},
	/**
	* Returns the global (compound) tint color of the container within the scene.
	* @param skipUpdate - Performance optimization flag:
	*   - If false (default): Recalculates the entire tint chain through parents for accuracy
	*   - If true: Uses cached worldColor from the last render pass for better performance
	* @returns The resulting tint color as a 24-bit RGB number (0xRRGGBB)
	* @example
	* // Accurate but slower - recalculates entire tint chain
	* const preciseTint = container.getGlobalTint();
	*
	* // Faster but may be outdated - uses cached tint
	* const cachedTint = container.getGlobalTint(true);
	*/
	getGlobalTint(skipUpdate) {
		if (skipUpdate) {
			if (this.renderGroup) return bgr2rgb(this.renderGroup.worldColor);
			if (this.parentRenderGroup) return bgr2rgb(multiplyColors(this.localColor, this.parentRenderGroup.worldColor));
			return this.tint;
		}
		let color = this.localColor;
		let parent = this.parent;
		while (parent) {
			color = multiplyColors(color, parent.localColor);
			parent = parent.parent;
		}
		return bgr2rgb(color);
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/utils/logging/warn.mjs
var warnCount = 0;
var maxWarnings = 500;
function warn(...args) {
	if (warnCount === maxWarnings) return;
	warnCount++;
	if (warnCount === maxWarnings) console.warn("PixiJS Warning: too many warnings, no more warnings will be reported to the console by PixiJS.");
	else console.warn("PixiJS Warning: ", ...args);
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/scene/container/bounds/getLocalBounds.mjs
function getLocalBounds(target, bounds, relativeMatrix) {
	bounds.clear();
	relativeMatrix || (relativeMatrix = Matrix.IDENTITY);
	_getLocalBounds(target, bounds, relativeMatrix, target, true);
	if (!bounds.isValid) bounds.set(0, 0, 0, 0);
	return bounds;
}
function _getLocalBounds(target, bounds, parentTransform, rootContainer, isRoot) {
	let relativeTransform;
	if (!isRoot) {
		if (!target.visible || !target.measurable) return;
		target.updateLocalTransform();
		const localTransform = target.localTransform;
		relativeTransform = matrixPool.get();
		relativeTransform.appendFrom(localTransform, parentTransform);
	} else {
		relativeTransform = matrixPool.get();
		relativeTransform = parentTransform.copyTo(relativeTransform);
	}
	const parentBounds = bounds;
	const preserveBounds = !!target.effects.length;
	if (preserveBounds) bounds = boundsPool.get().clear();
	if (target.boundsArea) bounds.addRect(target.boundsArea, relativeTransform);
	else {
		if (target.renderPipeId) {
			bounds.matrix = relativeTransform;
			bounds.addBounds(target.bounds);
		}
		const children = target.children;
		for (let i = 0; i < children.length; i++) _getLocalBounds(children[i], bounds, relativeTransform, rootContainer, false);
	}
	if (preserveBounds) {
		for (let i = 0; i < target.effects.length; i++) target.effects[i].addLocalBounds?.(bounds, rootContainer);
		parentBounds.addBounds(bounds, Matrix.IDENTITY);
		boundsPool.return(bounds);
	}
	matrixPool.return(relativeTransform);
}
function getParent(target, root, matrix) {
	const parent = target.parent;
	if (!parent) {
		warn("Item is not inside the root container");
		return;
	}
	if (parent !== root) {
		getParent(parent, root, matrix);
		parent.updateLocalTransform();
		matrix.append(parent.localTransform);
	}
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/scene/container/utils/checkChildrenDidChange.mjs
function checkChildrenDidChange(container, previousData) {
	const children = container.children;
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		const uid = child.uid;
		const didChange = (child._didViewChangeTick & 65535) << 16 | child._didContainerChangeTick & 65535;
		const index = previousData.index;
		if (previousData.data[index] !== uid || previousData.data[index + 1] !== didChange) {
			previousData.data[previousData.index] = uid;
			previousData.data[previousData.index + 1] = didChange;
			previousData.didChange = true;
		}
		previousData.index = index + 2;
		if (child.children.length) checkChildrenDidChange(child, previousData);
	}
	return previousData.didChange;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/scene/container/container-mixins/measureMixin.mjs
var tempMatrix = new Matrix();
var measureMixin = {
	_localBoundsCacheId: -1,
	_localBoundsCacheData: null,
	_setWidth(value, localWidth) {
		const sign = Math.sign(this.scale.x) || 1;
		if (localWidth !== 0) this.scale.x = value / localWidth * sign;
		else this.scale.x = sign;
	},
	_setHeight(value, localHeight) {
		const sign = Math.sign(this.scale.y) || 1;
		if (localHeight !== 0) this.scale.y = value / localHeight * sign;
		else this.scale.y = sign;
	},
	/**
	* Retrieves the local bounds of the container as a Bounds object.
	* @returns - The bounding area.
	* @memberof scene.Container#
	*/
	getLocalBounds() {
		if (!this._localBoundsCacheData) this._localBoundsCacheData = {
			data: [],
			index: 1,
			didChange: false,
			localBounds: new Bounds()
		};
		const localBoundsCacheData = this._localBoundsCacheData;
		localBoundsCacheData.index = 1;
		localBoundsCacheData.didChange = false;
		if (localBoundsCacheData.data[0] !== this._didViewChangeTick) {
			localBoundsCacheData.didChange = true;
			localBoundsCacheData.data[0] = this._didViewChangeTick;
		}
		checkChildrenDidChange(this, localBoundsCacheData);
		if (localBoundsCacheData.didChange) getLocalBounds(this, localBoundsCacheData.localBounds, tempMatrix);
		return localBoundsCacheData.localBounds;
	},
	/**
	* Calculates and returns the (world) bounds of the display object as a [Rectangle]{@link Rectangle}.
	* @param skipUpdate - Setting to `true` will stop the transforms of the scene graph from
	*  being updated. This means the calculation returned MAY be out of date BUT will give you a
	*  nice performance boost.
	* @param bounds - Optional bounds to store the result of the bounds calculation.
	* @returns - The minimum axis-aligned rectangle in world space that fits around this object.
	* @memberof scene.Container#
	*/
	getBounds(skipUpdate, bounds) {
		return getGlobalBounds(this, skipUpdate, bounds || new Bounds());
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/scene/container/container-mixins/onRenderMixin.mjs
var onRenderMixin = {
	_onRender: null,
	set onRender(func) {
		const renderGroup = this.renderGroup || this.parentRenderGroup;
		if (!func) {
			if (this._onRender) renderGroup?.removeOnRender(this);
			this._onRender = null;
			return;
		}
		if (!this._onRender) renderGroup?.addOnRender(this);
		this._onRender = func;
	},
	/**
	* This callback is used when the container is rendered. This is where you should add your custom
	* logic that is needed to be run every frame.
	*
	* In v7 many users used `updateTransform` for this, however the way v8 renders objects is different
	* and "updateTransform" is no longer called every frame
	* @example
	* const container = new Container();
	* container.onRender = () => {
	*    container.rotation += 0.01;
	* };
	* @memberof scene.Container#
	*/
	get onRender() {
		return this._onRender;
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/scene/container/container-mixins/sortMixin.mjs
var sortMixin = {
	_zIndex: 0,
	/**
	* Should children be sorted by zIndex at the next render call.
	*
	* Will get automatically set to true if a new child is added, or if a child's zIndex changes.
	* @type {boolean}
	* @memberof scene.Container#
	*/
	sortDirty: false,
	/**
	* If set to true, the container will sort its children by `zIndex` value
	* when the next render is called, or manually if `sortChildren()` is called.
	*
	* This actually changes the order of elements in the array, so should be treated
	* as a basic solution that is not performant compared to other solutions,
	* such as {@link https://github.com/pixijs/layers PixiJS Layers}
	*
	* Also be aware of that this may not work nicely with the `addChildAt()` function,
	* as the `zIndex` sorting may cause the child to automatically sorted to another position.
	* @type {boolean}
	* @memberof scene.Container#
	*/
	sortableChildren: false,
	/**
	* The zIndex of the container.
	*
	* Setting this value, will automatically set the parent to be sortable. Children will be automatically
	* sorted by zIndex value; a higher value will mean it will be moved towards the end of the array,
	* and thus rendered on top of other display objects within the same container.
	* @see scene.Container#sortableChildren
	* @memberof scene.Container#
	*/
	get zIndex() {
		return this._zIndex;
	},
	set zIndex(value) {
		if (this._zIndex === value) return;
		this._zIndex = value;
		this.depthOfChildModified();
	},
	depthOfChildModified() {
		if (this.parent) {
			this.parent.sortableChildren = true;
			this.parent.sortDirty = true;
		}
		if (this.parentRenderGroup) this.parentRenderGroup.structureDidChange = true;
	},
	/**
	* Sorts children by zIndex.
	* @memberof scene.Container#
	*/
	sortChildren() {
		if (!this.sortDirty) return;
		this.sortDirty = false;
		this.children.sort(sortChildren);
	}
};
function sortChildren(a, b) {
	return a._zIndex - b._zIndex;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/scene/container/container-mixins/toLocalGlobalMixin.mjs
var toLocalGlobalMixin = {
	/**
	* Returns the global position of the container.
	* @param point - The optional point to write the global value to.
	* @param skipUpdate - Should we skip the update transform.
	* @returns - The updated point.
	* @memberof scene.Container#
	*/
	getGlobalPosition(point = new Point(), skipUpdate = false) {
		if (this.parent) this.parent.toGlobal(this._position, point, skipUpdate);
		else {
			point.x = this._position.x;
			point.y = this._position.y;
		}
		return point;
	},
	/**
	* Calculates the global position of the container.
	* @param position - The world origin to calculate from.
	* @param point - A Point object in which to store the value, optional
	*  (otherwise will create a new Point).
	* @param skipUpdate - Should we skip the update transform.
	* @returns - A point object representing the position of this object.
	* @memberof scene.Container#
	*/
	toGlobal(position, point, skipUpdate = false) {
		const globalMatrix = this.getGlobalTransform(matrixPool.get(), skipUpdate);
		point = globalMatrix.apply(position, point);
		matrixPool.return(globalMatrix);
		return point;
	},
	/**
	* Calculates the local position of the container relative to another point.
	* @param position - The world origin to calculate from.
	* @param from - The Container to calculate the global position from.
	* @param point - A Point object in which to store the value, optional
	*  (otherwise will create a new Point).
	* @param skipUpdate - Should we skip the update transform
	* @returns - A point object representing the position of this object
	* @memberof scene.Container#
	*/
	toLocal(position, from, point, skipUpdate) {
		if (from) position = from.toGlobal(position, point, skipUpdate);
		const globalMatrix = this.getGlobalTransform(matrixPool.get(), skipUpdate);
		point = globalMatrix.applyInverse(position, point);
		matrixPool.return(globalMatrix);
		return point;
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/shared/instructions/InstructionSet.mjs
var InstructionSet = class {
	constructor() {
		/** a unique id for this instruction set used through the renderer */
		this.uid = uid("instructionSet");
		/** the array of instructions */
		this.instructions = [];
		/** the actual size of the array (any instructions passed this should be ignored) */
		this.instructionSize = 0;
		this.renderables = [];
		/** used by the garbage collector to track when the instruction set was last used */
		this.gcTick = 0;
	}
	/** reset the instruction set so it can be reused set size back to 0 */
	reset() {
		this.instructionSize = 0;
	}
	/**
	* Add an instruction to the set
	* @param instruction - add an instruction to the set
	*/
	add(instruction) {
		this.instructions[this.instructionSize++] = instruction;
	}
	/**
	* Log the instructions to the console (for debugging)
	* @internal
	* @ignore
	*/
	log() {
		this.instructions.length = this.instructionSize;
		console.table(this.instructions, ["type", "action"]);
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/shared/texture/TexturePool.mjs
var count = 0;
var TexturePoolClass = class {
	/**
	* @param textureOptions - options that will be passed to BaseRenderTexture constructor
	* @param {SCALE_MODE} [textureOptions.scaleMode] - See {@link SCALE_MODE} for possible values.
	*/
	constructor(textureOptions) {
		this._poolKeyHash = /* @__PURE__ */ Object.create(null);
		this._texturePool = {};
		this.textureOptions = textureOptions || {};
		this.enableFullScreen = false;
	}
	/**
	* Creates texture with params that were specified in pool constructor.
	* @param pixelWidth - Width of texture in pixels.
	* @param pixelHeight - Height of texture in pixels.
	* @param antialias
	*/
	createTexture(pixelWidth, pixelHeight, antialias) {
		return new Texture({
			source: new TextureSource({
				...this.textureOptions,
				width: pixelWidth,
				height: pixelHeight,
				resolution: 1,
				antialias,
				autoGarbageCollect: false
			}),
			label: `texturePool_${count++}`
		});
	}
	/**
	* Gets a Power-of-Two render texture or fullScreen texture
	* @param frameWidth - The minimum width of the render texture.
	* @param frameHeight - The minimum height of the render texture.
	* @param resolution - The resolution of the render texture.
	* @param antialias
	* @returns The new render texture.
	*/
	getOptimalTexture(frameWidth, frameHeight, resolution = 1, antialias) {
		let po2Width = Math.ceil(frameWidth * resolution - 1e-6);
		let po2Height = Math.ceil(frameHeight * resolution - 1e-6);
		po2Width = nextPow2(po2Width);
		po2Height = nextPow2(po2Height);
		const key = (po2Width << 17) + (po2Height << 1) + (antialias ? 1 : 0);
		if (!this._texturePool[key]) this._texturePool[key] = [];
		let texture = this._texturePool[key].pop();
		if (!texture) texture = this.createTexture(po2Width, po2Height, antialias);
		texture.source._resolution = resolution;
		texture.source.width = po2Width / resolution;
		texture.source.height = po2Height / resolution;
		texture.source.pixelWidth = po2Width;
		texture.source.pixelHeight = po2Height;
		texture.frame.x = 0;
		texture.frame.y = 0;
		texture.frame.width = frameWidth;
		texture.frame.height = frameHeight;
		texture.updateUvs();
		this._poolKeyHash[texture.uid] = key;
		return texture;
	}
	/**
	* Gets extra texture of the same size as input renderTexture
	* @param texture - The texture to check what size it is.
	* @param antialias - Whether to use antialias.
	* @returns A texture that is a power of two
	*/
	getSameSizeTexture(texture, antialias = false) {
		const source = texture.source;
		return this.getOptimalTexture(texture.width, texture.height, source._resolution, antialias);
	}
	/**
	* Place a render texture back into the pool.
	* @param renderTexture - The renderTexture to free
	*/
	returnTexture(renderTexture) {
		const key = this._poolKeyHash[renderTexture.uid];
		this._texturePool[key].push(renderTexture);
	}
	/**
	* Clears the pool.
	* @param destroyTextures - Destroy all stored textures.
	*/
	clear(destroyTextures) {
		destroyTextures = destroyTextures !== false;
		if (destroyTextures) for (const i in this._texturePool) {
			const textures = this._texturePool[i];
			if (textures) for (let j = 0; j < textures.length; j++) textures[j].destroy(true);
		}
		this._texturePool = {};
	}
};
var TexturePool = new TexturePoolClass();
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/scene/container/RenderGroup.mjs
var RenderGroup = class {
	constructor() {
		this.renderPipeId = "renderGroup";
		this.root = null;
		this.canBundle = false;
		this.renderGroupParent = null;
		this.renderGroupChildren = [];
		this.worldTransform = new Matrix();
		this.worldColorAlpha = 4294967295;
		this.worldColor = 16777215;
		this.worldAlpha = 1;
		this.childrenToUpdate = /* @__PURE__ */ Object.create(null);
		this.updateTick = 0;
		this.gcTick = 0;
		this.childrenRenderablesToUpdate = {
			list: [],
			index: 0
		};
		this.structureDidChange = true;
		this.instructionSet = new InstructionSet();
		this._onRenderContainers = [];
		/**
		* Indicates if the cached texture needs to be updated.
		* @default true
		*/
		this.textureNeedsUpdate = true;
		/**
		* Indicates if the container should be cached as a texture.
		* @default false
		*/
		this.isCachedAsTexture = false;
		this._matrixDirty = 7;
	}
	init(root) {
		this.root = root;
		if (root._onRender) this.addOnRender(root);
		root.didChange = true;
		const children = root.children;
		for (let i = 0; i < children.length; i++) {
			const child = children[i];
			child._updateFlags = 15;
			this.addChild(child);
		}
	}
	enableCacheAsTexture(options = {}) {
		this.textureOptions = options;
		this.isCachedAsTexture = true;
		this.textureNeedsUpdate = true;
	}
	disableCacheAsTexture() {
		this.isCachedAsTexture = false;
		if (this.texture) {
			TexturePool.returnTexture(this.texture);
			this.texture = null;
		}
	}
	updateCacheTexture() {
		this.textureNeedsUpdate = true;
	}
	reset() {
		this.renderGroupChildren.length = 0;
		for (const i in this.childrenToUpdate) {
			const childrenAtDepth = this.childrenToUpdate[i];
			childrenAtDepth.list.fill(null);
			childrenAtDepth.index = 0;
		}
		this.childrenRenderablesToUpdate.index = 0;
		this.childrenRenderablesToUpdate.list.fill(null);
		this.root = null;
		this.updateTick = 0;
		this.structureDidChange = true;
		this._onRenderContainers.length = 0;
		this.renderGroupParent = null;
		this.disableCacheAsTexture();
	}
	get localTransform() {
		return this.root.localTransform;
	}
	addRenderGroupChild(renderGroupChild) {
		if (renderGroupChild.renderGroupParent) renderGroupChild.renderGroupParent._removeRenderGroupChild(renderGroupChild);
		renderGroupChild.renderGroupParent = this;
		this.renderGroupChildren.push(renderGroupChild);
	}
	_removeRenderGroupChild(renderGroupChild) {
		const index = this.renderGroupChildren.indexOf(renderGroupChild);
		if (index > -1) this.renderGroupChildren.splice(index, 1);
		renderGroupChild.renderGroupParent = null;
	}
	addChild(child) {
		this.structureDidChange = true;
		child.parentRenderGroup = this;
		child.updateTick = -1;
		if (child.parent === this.root) child.relativeRenderGroupDepth = 1;
		else child.relativeRenderGroupDepth = child.parent.relativeRenderGroupDepth + 1;
		child.didChange = true;
		this.onChildUpdate(child);
		if (child.renderGroup) {
			this.addRenderGroupChild(child.renderGroup);
			return;
		}
		if (child._onRender) this.addOnRender(child);
		const children = child.children;
		for (let i = 0; i < children.length; i++) this.addChild(children[i]);
	}
	removeChild(child) {
		this.structureDidChange = true;
		if (child._onRender) {
			if (!child.renderGroup) this.removeOnRender(child);
		}
		child.parentRenderGroup = null;
		if (child.renderGroup) {
			this._removeRenderGroupChild(child.renderGroup);
			return;
		}
		const children = child.children;
		for (let i = 0; i < children.length; i++) this.removeChild(children[i]);
	}
	removeChildren(children) {
		for (let i = 0; i < children.length; i++) this.removeChild(children[i]);
	}
	onChildUpdate(child) {
		let childrenToUpdate = this.childrenToUpdate[child.relativeRenderGroupDepth];
		if (!childrenToUpdate) childrenToUpdate = this.childrenToUpdate[child.relativeRenderGroupDepth] = {
			index: 0,
			list: []
		};
		childrenToUpdate.list[childrenToUpdate.index++] = child;
	}
	updateRenderable(renderable) {
		if (renderable.globalDisplayStatus < 7) return;
		this.instructionSet.renderPipes[renderable.renderPipeId].updateRenderable(renderable);
		renderable.didViewUpdate = false;
	}
	onChildViewUpdate(child) {
		this.childrenRenderablesToUpdate.list[this.childrenRenderablesToUpdate.index++] = child;
	}
	get isRenderable() {
		return this.root.localDisplayStatus === 7 && this.worldAlpha > 0;
	}
	/**
	* adding a container to the onRender list will make sure the user function
	* passed in to the user defined 'onRender` callBack
	* @param container - the container to add to the onRender list
	*/
	addOnRender(container) {
		this._onRenderContainers.push(container);
	}
	removeOnRender(container) {
		this._onRenderContainers.splice(this._onRenderContainers.indexOf(container), 1);
	}
	runOnRender(renderer) {
		for (let i = 0; i < this._onRenderContainers.length; i++) this._onRenderContainers[i]._onRender(renderer);
	}
	destroy() {
		this.disableCacheAsTexture();
		this.renderGroupParent = null;
		this.root = null;
		this.childrenRenderablesToUpdate = null;
		this.childrenToUpdate = null;
		this.renderGroupChildren = null;
		this._onRenderContainers = null;
		this.instructionSet = null;
	}
	getChildren(out = []) {
		const children = this.root.children;
		for (let i = 0; i < children.length; i++) this._getChildren(children[i], out);
		return out;
	}
	_getChildren(container, out = []) {
		out.push(container);
		if (container.renderGroup) return out;
		const children = container.children;
		for (let i = 0; i < children.length; i++) this._getChildren(children[i], out);
		return out;
	}
	invalidateMatrices() {
		this._matrixDirty = 7;
	}
	/**
	* Returns the inverse of the world transform matrix.
	* @returns {Matrix} The inverse of the world transform matrix.
	*/
	get inverseWorldTransform() {
		if ((this._matrixDirty & 1) === 0) return this._inverseWorldTransform;
		this._matrixDirty &= -2;
		this._inverseWorldTransform || (this._inverseWorldTransform = new Matrix());
		return this._inverseWorldTransform.copyFrom(this.worldTransform).invert();
	}
	/**
	* Returns the inverse of the texture offset transform matrix.
	* @returns {Matrix} The inverse of the texture offset transform matrix.
	*/
	get textureOffsetInverseTransform() {
		if ((this._matrixDirty & 2) === 0) return this._textureOffsetInverseTransform;
		this._matrixDirty &= -3;
		this._textureOffsetInverseTransform || (this._textureOffsetInverseTransform = new Matrix());
		return this._textureOffsetInverseTransform.copyFrom(this.inverseWorldTransform).translate(-this._textureBounds.x, -this._textureBounds.y);
	}
	/**
	* Returns the inverse of the parent texture transform matrix.
	* This is used to properly transform coordinates when rendering into cached textures.
	* @returns {Matrix} The inverse of the parent texture transform matrix.
	*/
	get inverseParentTextureTransform() {
		if ((this._matrixDirty & 4) === 0) return this._inverseParentTextureTransform;
		this._matrixDirty &= -5;
		const parentCacheAsTexture = this._parentCacheAsTextureRenderGroup;
		if (parentCacheAsTexture) {
			this._inverseParentTextureTransform || (this._inverseParentTextureTransform = new Matrix());
			return this._inverseParentTextureTransform.copyFrom(this.worldTransform).prepend(parentCacheAsTexture.inverseWorldTransform).translate(-parentCacheAsTexture._textureBounds.x, -parentCacheAsTexture._textureBounds.y);
		}
		return this.worldTransform;
	}
	/**
	* Returns a matrix that transforms coordinates to the correct coordinate space of the texture being rendered to.
	* This is the texture offset inverse transform of the closest parent RenderGroup that is cached as a texture.
	* @returns {Matrix | null} The transform matrix for the cached texture coordinate space,
	* or null if no parent is cached as texture.
	*/
	get cacheToLocalTransform() {
		if (!this._parentCacheAsTextureRenderGroup) return null;
		return this._parentCacheAsTextureRenderGroup.textureOffsetInverseTransform;
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/scene/container/utils/assignWithIgnore.mjs
function assignWithIgnore(target, options, ignore = {}) {
	for (const key in options) if (!ignore[key] && options[key] !== void 0) target[key] = options[key];
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/scene/container/Container.mjs
var defaultSkew = new ObservablePoint(null);
var defaultPivot = new ObservablePoint(null);
var defaultScale = new ObservablePoint(null, 1, 1);
var UPDATE_COLOR = 1;
var UPDATE_BLEND = 2;
var UPDATE_VISIBLE = 4;
var UPDATE_TRANSFORM = 8;
var Container = class Container extends eventemitter3_default {
	constructor(options = {}) {
		super();
		/** unique id for this container */
		this.uid = uid("renderable");
		/** @private */
		this._updateFlags = 15;
		/** @private */
		this.renderGroup = null;
		/** @private */
		this.parentRenderGroup = null;
		/** @private */
		this.parentRenderGroupIndex = 0;
		/** @private */
		this.didChange = false;
		/** @private */
		this.didViewUpdate = false;
		/** @private */
		this.relativeRenderGroupDepth = 0;
		/**
		* The array of children of this container.
		* @readonly
		*/
		this.children = [];
		/** The display object container that contains this display object. */
		this.parent = null;
		/** @private */
		this.includeInBuild = true;
		/** @private */
		this.measurable = true;
		/** @private */
		this.isSimple = true;
		/**
		* @internal
		* @ignore
		*/
		this.updateTick = -1;
		/**
		* Current transform of the object based on local factors: position, scale, other stuff.
		* @readonly
		*/
		this.localTransform = new Matrix();
		/**
		* The relative group transform is a transform relative to the render group it belongs too. It will include all parent
		* transforms and up to the render group (think of it as kind of like a stage - but the stage can be nested).
		* If this container is is self a render group matrix will be relative to its parent render group
		* @readonly
		*/
		this.relativeGroupTransform = new Matrix();
		/**
		* The group transform is a transform relative to the render group it belongs too.
		* If this container is render group then this will be an identity matrix. other wise it
		* will be the same as the relativeGroupTransform.
		* Use this value when actually rendering things to the screen
		* @readonly
		*/
		this.groupTransform = this.relativeGroupTransform;
		/** If the object has been destroyed via destroy(). If true, it should not be used. */
		this.destroyed = false;
		/**
		* The coordinate of the object relative to the local coordinates of the parent.
		* @internal
		* @ignore
		*/
		this._position = new ObservablePoint(this, 0, 0);
		/**
		* The scale factor of the object.
		* @internal
		* @ignore
		*/
		this._scale = defaultScale;
		/**
		* The pivot point of the container that it rotates around.
		* @internal
		* @ignore
		*/
		this._pivot = defaultPivot;
		/**
		* The skew amount, on the x and y axis.
		* @internal
		* @ignore
		*/
		this._skew = defaultSkew;
		/**
		* The X-coordinate value of the normalized local X axis,
		* the first column of the local transformation matrix without a scale.
		* @internal
		* @ignore
		*/
		this._cx = 1;
		/**
		* The Y-coordinate value of the normalized local X axis,
		* the first column of the local transformation matrix without a scale.
		* @internal
		* @ignore
		*/
		this._sx = 0;
		/**
		* The X-coordinate value of the normalized local Y axis,
		* the second column of the local transformation matrix without a scale.
		* @internal
		* @ignore
		*/
		this._cy = 0;
		/**
		* The Y-coordinate value of the normalized local Y axis,
		* the second column of the local transformation matrix without a scale.
		* @internal
		* @ignore
		*/
		this._sy = 1;
		/**
		* The rotation amount.
		* @internal
		* @ignore
		*/
		this._rotation = 0;
		this.localColor = 16777215;
		this.localAlpha = 1;
		this.groupAlpha = 1;
		this.groupColor = 16777215;
		this.groupColorAlpha = 4294967295;
		/**
		* @internal
		* @ignore
		*/
		this.localBlendMode = "inherit";
		/**
		* @internal
		* @ignore
		*/
		this.groupBlendMode = "normal";
		/**
		* This property holds three bits: culled, visible, renderable
		* the third bit represents culling (0 = culled, 1 = not culled) 0b100
		* the second bit represents visibility (0 = not visible, 1 = visible) 0b010
		* the first bit represents renderable (0 = not renderable, 1 = renderable) 0b001
		* @internal
		* @ignore
		*/
		this.localDisplayStatus = 7;
		/**
		* @internal
		* @ignore
		*/
		this.globalDisplayStatus = 7;
		/**
		* A value that increments each time the containe is modified
		* eg children added, removed etc
		* @ignore
		*/
		this._didContainerChangeTick = 0;
		/**
		* A value that increments each time the container view is modified
		* eg texture swap, geometry change etc
		* @ignore
		*/
		this._didViewChangeTick = 0;
		/**
		* property that tracks if the container transform has changed
		* @ignore
		*/
		this._didLocalTransformChangeId = -1;
		this.effects = [];
		assignWithIgnore(this, options, {
			children: true,
			parent: true,
			effects: true
		});
		options.children?.forEach((child) => this.addChild(child));
		options.parent?.addChild(this);
	}
	/**
	* Mixes all enumerable properties and methods from a source object to Container.
	* @param source - The source of properties and methods to mix in.
	* @deprecated since 8.8.0
	*/
	static mixin(source) {
		deprecation("8.8.0", "Container.mixin is deprecated, please use extensions.mixin instead.");
		extensions.mixin(Container, source);
	}
	/**
	* We now use the _didContainerChangeTick and _didViewChangeTick to track changes
	* @deprecated since 8.2.6
	* @ignore
	*/
	set _didChangeId(value) {
		this._didViewChangeTick = value >> 12 & 4095;
		this._didContainerChangeTick = value & 4095;
	}
	get _didChangeId() {
		return this._didContainerChangeTick & 4095 | (this._didViewChangeTick & 4095) << 12;
	}
	/**
	* Adds one or more children to the container.
	*
	* Multiple items can be added like so: `myContainer.addChild(thingOne, thingTwo, thingThree)`
	* @param {...Container} children - The Container(s) to add to the container
	* @returns {Container} - The first child that was added.
	*/
	addChild(...children) {
		if (!this.allowChildren) deprecation(v8_0_0, "addChild: Only Containers will be allowed to add children in v8.0.0");
		if (children.length > 1) {
			for (let i = 0; i < children.length; i++) this.addChild(children[i]);
			return children[0];
		}
		const child = children[0];
		const renderGroup = this.renderGroup || this.parentRenderGroup;
		if (child.parent === this) {
			this.children.splice(this.children.indexOf(child), 1);
			this.children.push(child);
			if (renderGroup) renderGroup.structureDidChange = true;
			return child;
		}
		if (child.parent) child.parent.removeChild(child);
		this.children.push(child);
		if (this.sortableChildren) this.sortDirty = true;
		child.parent = this;
		child.didChange = true;
		child._updateFlags = 15;
		if (renderGroup) renderGroup.addChild(child);
		this.emit("childAdded", child, this, this.children.length - 1);
		child.emit("added", this);
		this._didViewChangeTick++;
		if (child._zIndex !== 0) child.depthOfChildModified();
		return child;
	}
	/**
	* Removes one or more children from the container.
	* @param {...Container} children - The Container(s) to remove
	* @returns {Container} The first child that was removed.
	*/
	removeChild(...children) {
		if (children.length > 1) {
			for (let i = 0; i < children.length; i++) this.removeChild(children[i]);
			return children[0];
		}
		const child = children[0];
		const index = this.children.indexOf(child);
		if (index > -1) {
			this._didViewChangeTick++;
			this.children.splice(index, 1);
			if (this.renderGroup) this.renderGroup.removeChild(child);
			else if (this.parentRenderGroup) this.parentRenderGroup.removeChild(child);
			if (child.parentRenderLayer) child.parentRenderLayer.detach(child);
			child.parent = null;
			this.emit("childRemoved", child, this, index);
			child.emit("removed", this);
		}
		return child;
	}
	/** @ignore */
	_onUpdate(point) {
		if (point) {
			if (point === this._skew) this._updateSkew();
		}
		this._didContainerChangeTick++;
		if (this.didChange) return;
		this.didChange = true;
		if (this.parentRenderGroup) this.parentRenderGroup.onChildUpdate(this);
	}
	set isRenderGroup(value) {
		if (!!this.renderGroup === value) return;
		if (value) this.enableRenderGroup();
		else this.disableRenderGroup();
	}
	/**
	* Returns true if this container is a render group.
	* This means that it will be rendered as a separate pass, with its own set of instructions
	*/
	get isRenderGroup() {
		return !!this.renderGroup;
	}
	/**
	* Calling this enables a render group for this container.
	* This means it will be rendered as a separate set of instructions.
	* The transform of the container will also be handled on the GPU rather than the CPU.
	*/
	enableRenderGroup() {
		if (this.renderGroup) return;
		const parentRenderGroup = this.parentRenderGroup;
		parentRenderGroup?.removeChild(this);
		this.renderGroup = BigPool.get(RenderGroup, this);
		this.groupTransform = Matrix.IDENTITY;
		parentRenderGroup?.addChild(this);
		this._updateIsSimple();
	}
	/** This will disable the render group for this container. */
	disableRenderGroup() {
		if (!this.renderGroup) return;
		const parentRenderGroup = this.parentRenderGroup;
		parentRenderGroup?.removeChild(this);
		BigPool.return(this.renderGroup);
		this.renderGroup = null;
		this.groupTransform = this.relativeGroupTransform;
		parentRenderGroup?.addChild(this);
		this._updateIsSimple();
	}
	/** @ignore */
	_updateIsSimple() {
		this.isSimple = !this.renderGroup && this.effects.length === 0;
	}
	/**
	* Current transform of the object based on world (parent) factors.
	* @readonly
	*/
	get worldTransform() {
		this._worldTransform || (this._worldTransform = new Matrix());
		if (this.renderGroup) this._worldTransform.copyFrom(this.renderGroup.worldTransform);
		else if (this.parentRenderGroup) this._worldTransform.appendFrom(this.relativeGroupTransform, this.parentRenderGroup.worldTransform);
		return this._worldTransform;
	}
	/**
	* The position of the container on the x axis relative to the local coordinates of the parent.
	* An alias to position.x
	*/
	get x() {
		return this._position.x;
	}
	set x(value) {
		this._position.x = value;
	}
	/**
	* The position of the container on the y axis relative to the local coordinates of the parent.
	* An alias to position.y
	*/
	get y() {
		return this._position.y;
	}
	set y(value) {
		this._position.y = value;
	}
	/**
	* The coordinate of the object relative to the local coordinates of the parent.
	* @since 4.0.0
	*/
	get position() {
		return this._position;
	}
	set position(value) {
		this._position.copyFrom(value);
	}
	/**
	* The rotation of the object in radians.
	* 'rotation' and 'angle' have the same effect on a display object; rotation is in radians, angle is in degrees.
	*/
	get rotation() {
		return this._rotation;
	}
	set rotation(value) {
		if (this._rotation !== value) {
			this._rotation = value;
			this._onUpdate(this._skew);
		}
	}
	/**
	* The angle of the object in degrees.
	* 'rotation' and 'angle' have the same effect on a display object; rotation is in radians, angle is in degrees.
	*/
	get angle() {
		return this.rotation * RAD_TO_DEG;
	}
	set angle(value) {
		this.rotation = value * DEG_TO_RAD;
	}
	/**
	* The center of rotation, scaling, and skewing for this display object in its local space. The `position`
	* is the projection of `pivot` in the parent's local space.
	*
	* By default, the pivot is the origin (0, 0).
	* @since 4.0.0
	*/
	get pivot() {
		if (this._pivot === defaultPivot) this._pivot = new ObservablePoint(this, 0, 0);
		return this._pivot;
	}
	set pivot(value) {
		if (this._pivot === defaultPivot) this._pivot = new ObservablePoint(this, 0, 0);
		typeof value === "number" ? this._pivot.set(value) : this._pivot.copyFrom(value);
	}
	/**
	* The skew factor for the object in radians.
	* @since 4.0.0
	*/
	get skew() {
		if (this._skew === defaultSkew) this._skew = new ObservablePoint(this, 0, 0);
		return this._skew;
	}
	set skew(value) {
		if (this._skew === defaultSkew) this._skew = new ObservablePoint(this, 0, 0);
		this._skew.copyFrom(value);
	}
	/**
	* The scale factors of this object along the local coordinate axes.
	*
	* The default scale is (1, 1).
	* @since 4.0.0
	*/
	get scale() {
		if (this._scale === defaultScale) this._scale = new ObservablePoint(this, 1, 1);
		return this._scale;
	}
	set scale(value) {
		if (this._scale === defaultScale) this._scale = new ObservablePoint(this, 0, 0);
		typeof value === "number" ? this._scale.set(value) : this._scale.copyFrom(value);
	}
	/**
	* The width of the Container, setting this will actually modify the scale to achieve the value set.
	* @memberof scene.Container#
	*/
	get width() {
		return Math.abs(this.scale.x * this.getLocalBounds().width);
	}
	set width(value) {
		const localWidth = this.getLocalBounds().width;
		this._setWidth(value, localWidth);
	}
	/**
	* The height of the Container, setting this will actually modify the scale to achieve the value set.
	* @memberof scene.Container#
	*/
	get height() {
		return Math.abs(this.scale.y * this.getLocalBounds().height);
	}
	set height(value) {
		const localHeight = this.getLocalBounds().height;
		this._setHeight(value, localHeight);
	}
	/**
	* Retrieves the size of the container as a [Size]{@link Size} object.
	* This is faster than get the width and height separately.
	* @param out - Optional object to store the size in.
	* @returns - The size of the container.
	* @memberof scene.Container#
	*/
	getSize(out) {
		if (!out) out = {};
		const bounds = this.getLocalBounds();
		out.width = Math.abs(this.scale.x * bounds.width);
		out.height = Math.abs(this.scale.y * bounds.height);
		return out;
	}
	/**
	* Sets the size of the container to the specified width and height.
	* This is faster than setting the width and height separately.
	* @param value - This can be either a number or a [Size]{@link Size} object.
	* @param height - The height to set. Defaults to the value of `width` if not provided.
	* @memberof scene.Container#
	*/
	setSize(value, height) {
		const size = this.getLocalBounds();
		if (typeof value === "object") {
			height = value.height ?? value.width;
			value = value.width;
		} else height ?? (height = value);
		value !== void 0 && this._setWidth(value, size.width);
		height !== void 0 && this._setHeight(height, size.height);
	}
	/** Called when the skew or the rotation changes. */
	_updateSkew() {
		const rotation = this._rotation;
		const skew = this._skew;
		this._cx = Math.cos(rotation + skew._y);
		this._sx = Math.sin(rotation + skew._y);
		this._cy = -Math.sin(rotation - skew._x);
		this._sy = Math.cos(rotation - skew._x);
	}
	/**
	* Updates the transform properties of the container (accepts partial values).
	* @param {object} opts - The options for updating the transform.
	* @param {number} opts.x - The x position of the container.
	* @param {number} opts.y - The y position of the container.
	* @param {number} opts.scaleX - The scale factor on the x-axis.
	* @param {number} opts.scaleY - The scale factor on the y-axis.
	* @param {number} opts.rotation - The rotation of the container, in radians.
	* @param {number} opts.skewX - The skew factor on the x-axis.
	* @param {number} opts.skewY - The skew factor on the y-axis.
	* @param {number} opts.pivotX - The x coordinate of the pivot point.
	* @param {number} opts.pivotY - The y coordinate of the pivot point.
	*/
	updateTransform(opts) {
		this.position.set(typeof opts.x === "number" ? opts.x : this.position.x, typeof opts.y === "number" ? opts.y : this.position.y);
		this.scale.set(typeof opts.scaleX === "number" ? opts.scaleX || 1 : this.scale.x, typeof opts.scaleY === "number" ? opts.scaleY || 1 : this.scale.y);
		this.rotation = typeof opts.rotation === "number" ? opts.rotation : this.rotation;
		this.skew.set(typeof opts.skewX === "number" ? opts.skewX : this.skew.x, typeof opts.skewY === "number" ? opts.skewY : this.skew.y);
		this.pivot.set(typeof opts.pivotX === "number" ? opts.pivotX : this.pivot.x, typeof opts.pivotY === "number" ? opts.pivotY : this.pivot.y);
		return this;
	}
	/**
	* Updates the local transform using the given matrix.
	* @param matrix - The matrix to use for updating the transform.
	*/
	setFromMatrix(matrix) {
		matrix.decompose(this);
	}
	/** Updates the local transform. */
	updateLocalTransform() {
		const localTransformChangeId = this._didContainerChangeTick;
		if (this._didLocalTransformChangeId === localTransformChangeId) return;
		this._didLocalTransformChangeId = localTransformChangeId;
		const lt = this.localTransform;
		const scale = this._scale;
		const pivot = this._pivot;
		const position = this._position;
		const sx = scale._x;
		const sy = scale._y;
		const px = pivot._x;
		const py = pivot._y;
		lt.a = this._cx * sx;
		lt.b = this._sx * sx;
		lt.c = this._cy * sy;
		lt.d = this._sy * sy;
		lt.tx = position._x - (px * lt.a + py * lt.c);
		lt.ty = position._y - (px * lt.b + py * lt.d);
	}
	set alpha(value) {
		if (value === this.localAlpha) return;
		this.localAlpha = value;
		this._updateFlags |= 1;
		this._onUpdate();
	}
	/** The opacity of the object. */
	get alpha() {
		return this.localAlpha;
	}
	set tint(value) {
		const bgr = Color.shared.setValue(value ?? 16777215).toBgrNumber();
		if (bgr === this.localColor) return;
		this.localColor = bgr;
		this._updateFlags |= 1;
		this._onUpdate();
	}
	/**
	* The tint applied to the sprite. This is a hex value.
	*
	* A value of 0xFFFFFF will remove any tint effect.
	* @default 0xFFFFFF
	*/
	get tint() {
		return bgr2rgb(this.localColor);
	}
	set blendMode(value) {
		if (this.localBlendMode === value) return;
		if (this.parentRenderGroup) this.parentRenderGroup.structureDidChange = true;
		this._updateFlags |= 2;
		this.localBlendMode = value;
		this._onUpdate();
	}
	/**
	* The blend mode to be applied to the sprite. Apply a value of `'normal'` to reset the blend mode.
	* @default 'normal'
	*/
	get blendMode() {
		return this.localBlendMode;
	}
	/** The visibility of the object. If false the object will not be drawn, and the transform will not be updated. */
	get visible() {
		return !!(this.localDisplayStatus & 2);
	}
	set visible(value) {
		const valueNumber = value ? 2 : 0;
		if ((this.localDisplayStatus & 2) === valueNumber) return;
		if (this.parentRenderGroup) this.parentRenderGroup.structureDidChange = true;
		this._updateFlags |= 4;
		this.localDisplayStatus ^= 2;
		this._onUpdate();
	}
	/** @ignore */
	get culled() {
		return !(this.localDisplayStatus & 4);
	}
	/** @ignore */
	set culled(value) {
		const valueNumber = value ? 0 : 4;
		if ((this.localDisplayStatus & 4) === valueNumber) return;
		if (this.parentRenderGroup) this.parentRenderGroup.structureDidChange = true;
		this._updateFlags |= 4;
		this.localDisplayStatus ^= 4;
		this._onUpdate();
	}
	/** Can this object be rendered, if false the object will not be drawn but the transform will still be updated. */
	get renderable() {
		return !!(this.localDisplayStatus & 1);
	}
	set renderable(value) {
		const valueNumber = value ? 1 : 0;
		if ((this.localDisplayStatus & 1) === valueNumber) return;
		this._updateFlags |= 4;
		this.localDisplayStatus ^= 1;
		if (this.parentRenderGroup) this.parentRenderGroup.structureDidChange = true;
		this._onUpdate();
	}
	/** Whether or not the object should be rendered. */
	get isRenderable() {
		return this.localDisplayStatus === 7 && this.groupAlpha > 0;
	}
	/**
	* Removes all internal references and listeners as well as removes children from the display list.
	* Do not use a Container after calling `destroy`.
	* @param options - Options parameter. A boolean will act as if all options
	*  have been set to that value
	* @param {boolean} [options.children=false] - if set to true, all the children will have their destroy
	*  method called as well. 'options' will be passed on to those calls.
	* @param {boolean} [options.texture=false] - Only used for children with textures e.g. Sprites. If options.children
	* is set to true it should destroy the texture of the child sprite
	* @param {boolean} [options.textureSource=false] - Only used for children with textures e.g. Sprites.
	* If options.children is set to true it should destroy the texture source of the child sprite
	* @param {boolean} [options.context=false] - Only used for children with graphicsContexts e.g. Graphics.
	* If options.children is set to true it should destroy the context of the child graphics
	*/
	destroy(options = false) {
		if (this.destroyed) return;
		this.destroyed = true;
		let oldChildren;
		if (this.children.length) oldChildren = this.removeChildren(0, this.children.length);
		this.removeFromParent();
		this.parent = null;
		this._maskEffect = null;
		this._filterEffect = null;
		this.effects = null;
		this._position = null;
		this._scale = null;
		this._pivot = null;
		this._skew = null;
		this.emit("destroyed", this);
		this.removeAllListeners();
		if ((typeof options === "boolean" ? options : options?.children) && oldChildren) for (let i = 0; i < oldChildren.length; ++i) oldChildren[i].destroy(options);
		this.renderGroup?.destroy();
		this.renderGroup = null;
	}
};
extensions.mixin(Container, childrenHelperMixin, getFastGlobalBoundsMixin, toLocalGlobalMixin, onRenderMixin, measureMixin, effectsMixin, findMixin, sortMixin, cullingMixin, cacheAsTextureMixin, getGlobalMixin, collectRenderablesMixin);
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/scene/view/ViewContainer.mjs
var ViewContainer = class extends Container {
	constructor(options) {
		super(options);
		/** @private */
		this.canBundle = true;
		/** @private */
		this.allowChildren = false;
		/** @private */
		this._roundPixels = 0;
		/** @private */
		this._lastUsed = -1;
		this._bounds = new Bounds(0, 1, 0, 0);
		this._boundsDirty = true;
	}
	/**
	* The local bounds of the view.
	* @type {rendering.Bounds}
	*/
	get bounds() {
		if (!this._boundsDirty) return this._bounds;
		this.updateBounds();
		this._boundsDirty = false;
		return this._bounds;
	}
	/**
	* Whether or not to round the x/y position of the sprite.
	* @type {boolean}
	*/
	get roundPixels() {
		return !!this._roundPixels;
	}
	set roundPixels(value) {
		this._roundPixels = value ? 1 : 0;
	}
	/**
	* Checks if the object contains the given point.
	* @param point - The point to check
	*/
	containsPoint(point) {
		const bounds = this.bounds;
		const { x, y } = point;
		return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
	}
	/** @private */
	onViewUpdate() {
		this._didViewChangeTick++;
		this._boundsDirty = true;
		if (this.didViewUpdate) return;
		this.didViewUpdate = true;
		const renderGroup = this.renderGroup || this.parentRenderGroup;
		if (renderGroup) renderGroup.onChildViewUpdate(this);
	}
	destroy(options) {
		super.destroy(options);
		this._bounds = null;
	}
	collectRenderablesSimple(instructionSet, renderer, currentLayer) {
		const { renderPipes, renderableGC } = renderer;
		renderPipes.blendMode.setBlendMode(this, this.groupBlendMode, instructionSet);
		renderPipes[this.renderPipeId].addRenderable(this, instructionSet);
		renderableGC.addRenderable(this);
		this.didViewUpdate = false;
		const children = this.children;
		const length = children.length;
		for (let i = 0; i < length; i++) children[i].collectRenderables(instructionSet, renderer, currentLayer);
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/scene/sprite/Sprite.mjs
var Sprite = class Sprite extends ViewContainer {
	/**
	* @param options - The options for creating the sprite.
	*/
	constructor(options = Texture.EMPTY) {
		if (options instanceof Texture) options = { texture: options };
		const { texture = Texture.EMPTY, anchor, roundPixels, width, height, ...rest } = options;
		super({
			label: "Sprite",
			...rest
		});
		this.renderPipeId = "sprite";
		this.batched = true;
		this._visualBounds = {
			minX: 0,
			maxX: 1,
			minY: 0,
			maxY: 0
		};
		this._anchor = new ObservablePoint({ _onUpdate: () => {
			this.onViewUpdate();
		} });
		if (anchor) this.anchor = anchor;
		else if (texture.defaultAnchor) this.anchor = texture.defaultAnchor;
		this.texture = texture;
		this.allowChildren = false;
		this.roundPixels = roundPixels ?? false;
		if (width !== void 0) this.width = width;
		if (height !== void 0) this.height = height;
	}
	/**
	* Helper function that creates a new sprite based on the source you provide.
	* The source can be - frame id, image, video, canvas element, video element, texture
	* @param source - Source to create texture from
	* @param [skipCache] - Whether to skip the cache or not
	* @returns The newly created sprite
	*/
	static from(source, skipCache = false) {
		if (source instanceof Texture) return new Sprite(source);
		return new Sprite(Texture.from(source, skipCache));
	}
	set texture(value) {
		value || (value = Texture.EMPTY);
		const currentTexture = this._texture;
		if (currentTexture === value) return;
		if (currentTexture && currentTexture.dynamic) currentTexture.off("update", this.onViewUpdate, this);
		if (value.dynamic) value.on("update", this.onViewUpdate, this);
		this._texture = value;
		if (this._width) this._setWidth(this._width, this._texture.orig.width);
		if (this._height) this._setHeight(this._height, this._texture.orig.height);
		this.onViewUpdate();
	}
	/** The texture that the sprite is using. */
	get texture() {
		return this._texture;
	}
	/**
	* The bounds of the sprite, taking the texture's trim into account.
	* @type {rendering.Bounds}
	*/
	get visualBounds() {
		updateQuadBounds(this._visualBounds, this._anchor, this._texture);
		return this._visualBounds;
	}
	/**
	* @deprecated
	*/
	get sourceBounds() {
		deprecation("8.6.1", "Sprite.sourceBounds is deprecated, use visualBounds instead.");
		return this.visualBounds;
	}
	/** @private */
	updateBounds() {
		const anchor = this._anchor;
		const texture = this._texture;
		const bounds = this._bounds;
		const { width, height } = texture.orig;
		bounds.minX = -anchor._x * width;
		bounds.maxX = bounds.minX + width;
		bounds.minY = -anchor._y * height;
		bounds.maxY = bounds.minY + height;
	}
	/**
	* Destroys this sprite renderable and optionally its texture.
	* @param options - Options parameter. A boolean will act as if all options
	*  have been set to that value
	* @param {boolean} [options.texture=false] - Should it destroy the current texture of the renderable as well
	* @param {boolean} [options.textureSource=false] - Should it destroy the textureSource of the renderable as well
	*/
	destroy(options = false) {
		super.destroy(options);
		if (typeof options === "boolean" ? options : options?.texture) {
			const destroyTextureSource = typeof options === "boolean" ? options : options?.textureSource;
			this._texture.destroy(destroyTextureSource);
		}
		this._texture = null;
		this._visualBounds = null;
		this._bounds = null;
		this._anchor = null;
	}
	/**
	* The anchor sets the origin point of the sprite. The default value is taken from the {@link Texture}
	* and passed to the constructor.
	*
	* The default is `(0,0)`, this means the sprite's origin is the top left.
	*
	* Setting the anchor to `(0.5,0.5)` means the sprite's origin is centered.
	*
	* Setting the anchor to `(1,1)` would mean the sprite's origin point will be the bottom right corner.
	*
	* If you pass only single parameter, it will set both x and y to the same value as shown in the example below.
	* @example
	* import { Sprite } from 'pixi.js';
	*
	* const sprite = new Sprite({texture: Texture.WHITE});
	* sprite.anchor.set(0.5); // This will set the origin to center. (0.5) is same as (0.5, 0.5).
	*/
	get anchor() {
		return this._anchor;
	}
	set anchor(value) {
		typeof value === "number" ? this._anchor.set(value) : this._anchor.copyFrom(value);
	}
	/** The width of the sprite, setting this will actually modify the scale to achieve the value set. */
	get width() {
		return Math.abs(this.scale.x) * this._texture.orig.width;
	}
	set width(value) {
		this._setWidth(value, this._texture.orig.width);
		this._width = value;
	}
	/** The height of the sprite, setting this will actually modify the scale to achieve the value set. */
	get height() {
		return Math.abs(this.scale.y) * this._texture.orig.height;
	}
	set height(value) {
		this._setHeight(value, this._texture.orig.height);
		this._height = value;
	}
	/**
	* Retrieves the size of the Sprite as a [Size]{@link Size} object.
	* This is faster than get the width and height separately.
	* @param out - Optional object to store the size in.
	* @returns - The size of the Sprite.
	*/
	getSize(out) {
		out || (out = {});
		out.width = Math.abs(this.scale.x) * this._texture.orig.width;
		out.height = Math.abs(this.scale.y) * this._texture.orig.height;
		return out;
	}
	/**
	* Sets the size of the Sprite to the specified width and height.
	* This is faster than setting the width and height separately.
	* @param value - This can be either a number or a [Size]{@link Size} object.
	* @param height - The height to set. Defaults to the value of `width` if not provided.
	*/
	setSize(value, height) {
		if (typeof value === "object") {
			height = value.height ?? value.width;
			value = value.width;
		} else height ?? (height = value);
		value !== void 0 && this._setWidth(value, this._texture.orig.width);
		height !== void 0 && this._setHeight(height, this._texture.orig.height);
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/environment-browser/BrowserAdapter.mjs
var BrowserAdapter = {
	createCanvas: (width, height) => {
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		return canvas;
	},
	getCanvasRenderingContext2D: () => CanvasRenderingContext2D,
	getWebGLRenderingContext: () => WebGLRenderingContext,
	getNavigator: () => navigator,
	getBaseUrl: () => document.baseURI ?? window.location.href,
	getFontFaceSet: () => document.fonts,
	fetch: (url, options) => fetch(url, options),
	parseXML: (xml) => {
		return new DOMParser().parseFromString(xml, "text/xml");
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/environment/adapter.mjs
var currentAdapter = BrowserAdapter;
var DOMAdapter = {
	/**
	* Returns the current adapter.
	* @returns {environment.Adapter} The current adapter.
	*/
	get() {
		return currentAdapter;
	},
	/**
	* Sets the current adapter.
	* @param adapter - The new adapter.
	*/
	set(adapter) {
		currentAdapter = adapter;
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/shared/texture/sources/CanvasSource.mjs
var CanvasSource = class extends TextureSource {
	constructor(options) {
		if (!options.resource) options.resource = DOMAdapter.get().createCanvas();
		if (!options.width) {
			options.width = options.resource.width;
			if (!options.autoDensity) options.width /= options.resolution;
		}
		if (!options.height) {
			options.height = options.resource.height;
			if (!options.autoDensity) options.height /= options.resolution;
		}
		super(options);
		this.uploadMethodId = "image";
		this.autoDensity = options.autoDensity;
		this.resizeCanvas();
		this.transparent = !!options.transparent;
	}
	resizeCanvas() {
		if (this.autoDensity) {
			this.resource.style.width = `${this.width}px`;
			this.resource.style.height = `${this.height}px`;
		}
		if (this.resource.width !== this.pixelWidth || this.resource.height !== this.pixelHeight) {
			this.resource.width = this.pixelWidth;
			this.resource.height = this.pixelHeight;
		}
	}
	resize(width = this.width, height = this.height, resolution = this._resolution) {
		const didResize = super.resize(width, height, resolution);
		if (didResize) this.resizeCanvas();
		return didResize;
	}
	static test(resource) {
		return globalThis.HTMLCanvasElement && resource instanceof HTMLCanvasElement || globalThis.OffscreenCanvas && resource instanceof OffscreenCanvas;
	}
	/**
	* Returns the 2D rendering context for the canvas.
	* Caches the context after creating it.
	* @returns The 2D rendering context of the canvas.
	*/
	get context2D() {
		return this._context2D || (this._context2D = this.resource.getContext("2d"));
	}
};
CanvasSource.extension = ExtensionType.TextureSource;
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/ticker/const.mjs
var UPDATE_PRIORITY = /* @__PURE__ */ ((UPDATE_PRIORITY2) => {
	UPDATE_PRIORITY2[UPDATE_PRIORITY2["INTERACTION"] = 50] = "INTERACTION";
	UPDATE_PRIORITY2[UPDATE_PRIORITY2["HIGH"] = 25] = "HIGH";
	UPDATE_PRIORITY2[UPDATE_PRIORITY2["NORMAL"] = 0] = "NORMAL";
	UPDATE_PRIORITY2[UPDATE_PRIORITY2["LOW"] = -25] = "LOW";
	UPDATE_PRIORITY2[UPDATE_PRIORITY2["UTILITY"] = -50] = "UTILITY";
	return UPDATE_PRIORITY2;
})(UPDATE_PRIORITY || {});
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/ticker/TickerListener.mjs
var TickerListener = class {
	/**
	* Constructor
	* @private
	* @param fn - The listener function to be added for one update
	* @param context - The listener context
	* @param priority - The priority for emitting
	* @param once - If the handler should fire once
	*/
	constructor(fn, context = null, priority = 0, once = false) {
		/** The next item in chain. */
		this.next = null;
		/** The previous item in chain. */
		this.previous = null;
		/** `true` if this listener has been destroyed already. */
		this._destroyed = false;
		this._fn = fn;
		this._context = context;
		this.priority = priority;
		this._once = once;
	}
	/**
	* Simple compare function to figure out if a function and context match.
	* @param fn - The listener function to be added for one update
	* @param context - The listener context
	* @returns `true` if the listener match the arguments
	*/
	match(fn, context = null) {
		return this._fn === fn && this._context === context;
	}
	/**
	* Emit by calling the current function.
	* @param ticker - The ticker emitting.
	* @returns Next ticker
	*/
	emit(ticker) {
		if (this._fn) {
			if (this._context) this._fn.call(this._context, ticker);
			else this._fn(ticker);
		}
		const redirect = this.next;
		if (this._once) this.destroy(true);
		if (this._destroyed) this.next = null;
		return redirect;
	}
	/**
	* Connect to the list.
	* @param previous - Input node, previous listener
	*/
	connect(previous) {
		this.previous = previous;
		if (previous.next) previous.next.previous = this;
		this.next = previous.next;
		previous.next = this;
	}
	/**
	* Destroy and don't use after this.
	* @param hard - `true` to remove the `next` reference, this
	*        is considered a hard destroy. Soft destroy maintains the next reference.
	* @returns The listener to redirect while emitting or removing.
	*/
	destroy(hard = false) {
		this._destroyed = true;
		this._fn = null;
		this._context = null;
		if (this.previous) this.previous.next = this.next;
		if (this.next) this.next.previous = this.previous;
		const redirect = this.next;
		this.next = hard ? null : redirect;
		this.previous = null;
		return redirect;
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/ticker/Ticker.mjs
var _Ticker = class _Ticker {
	constructor() {
		/**
		* Whether or not this ticker should invoke the method
		* {@link ticker.Ticker#start|start} automatically when a listener is added.
		*/
		this.autoStart = false;
		/**
		* Scalar time value from last frame to this frame.
		* This value is capped by setting {@link ticker.Ticker#minFPS|minFPS}
		* and is scaled with {@link ticker.Ticker#speed|speed}.
		* **Note:** The cap may be exceeded by scaling.
		*/
		this.deltaTime = 1;
		/**
		* The last time {@link ticker.Ticker#update|update} was invoked.
		* This value is also reset internally outside of invoking
		* update, but only when a new animation frame is requested.
		* If the platform supports DOMHighResTimeStamp,
		* this value will have a precision of 1 µs.
		*/
		this.lastTime = -1;
		/**
		* Factor of current {@link ticker.Ticker#deltaTime|deltaTime}.
		* @example
		* // Scales ticker.deltaTime to what would be
		* // the equivalent of approximately 120 FPS
		* ticker.speed = 2;
		*/
		this.speed = 1;
		/**
		* Whether or not this ticker has been started.
		* `true` if {@link ticker.Ticker#start|start} has been called.
		* `false` if {@link ticker.Ticker#stop|Stop} has been called.
		* While `false`, this value may change to `true` in the
		* event of {@link ticker.Ticker#autoStart|autoStart} being `true`
		* and a listener is added.
		*/
		this.started = false;
		/** Internal current frame request ID */
		this._requestId = null;
		/**
		* Internal value managed by minFPS property setter and getter.
		* This is the maximum allowed milliseconds between updates.
		*/
		this._maxElapsedMS = 100;
		/**
		* Internal value managed by minFPS property setter and getter.
		* This is the minimum allowed milliseconds between updates.
		*/
		this._minElapsedMS = 0;
		/** If enabled, deleting is disabled.*/
		this._protected = false;
		/** The last time keyframe was executed. Maintains a relatively fixed interval with the previous value. */
		this._lastFrame = -1;
		this._head = new TickerListener(null, null, Infinity);
		this.deltaMS = 1 / _Ticker.targetFPMS;
		this.elapsedMS = 1 / _Ticker.targetFPMS;
		this._tick = (time) => {
			this._requestId = null;
			if (this.started) {
				this.update(time);
				if (this.started && this._requestId === null && this._head.next) this._requestId = requestAnimationFrame(this._tick);
			}
		};
	}
	/**
	* Conditionally requests a new animation frame.
	* If a frame has not already been requested, and if the internal
	* emitter has listeners, a new frame is requested.
	* @private
	*/
	_requestIfNeeded() {
		if (this._requestId === null && this._head.next) {
			this.lastTime = performance.now();
			this._lastFrame = this.lastTime;
			this._requestId = requestAnimationFrame(this._tick);
		}
	}
	/**
	* Conditionally cancels a pending animation frame.
	* @private
	*/
	_cancelIfNeeded() {
		if (this._requestId !== null) {
			cancelAnimationFrame(this._requestId);
			this._requestId = null;
		}
	}
	/**
	* Conditionally requests a new animation frame.
	* If the ticker has been started it checks if a frame has not already
	* been requested, and if the internal emitter has listeners. If these
	* conditions are met, a new frame is requested. If the ticker has not
	* been started, but autoStart is `true`, then the ticker starts now,
	* and continues with the previous conditions to request a new frame.
	* @private
	*/
	_startIfPossible() {
		if (this.started) this._requestIfNeeded();
		else if (this.autoStart) this.start();
	}
	/**
	* Register a handler for tick events. Calls continuously unless
	* it is removed or the ticker is stopped.
	* @param fn - The listener function to be added for updates
	* @param context - The listener context
	* @param {number} [priority=UPDATE_PRIORITY.NORMAL] - The priority for emitting
	* @returns This instance of a ticker
	*/
	add(fn, context, priority = UPDATE_PRIORITY.NORMAL) {
		return this._addListener(new TickerListener(fn, context, priority));
	}
	/**
	* Add a handler for the tick event which is only execute once.
	* @param fn - The listener function to be added for one update
	* @param context - The listener context
	* @param {number} [priority=UPDATE_PRIORITY.NORMAL] - The priority for emitting
	* @returns This instance of a ticker
	*/
	addOnce(fn, context, priority = UPDATE_PRIORITY.NORMAL) {
		return this._addListener(new TickerListener(fn, context, priority, true));
	}
	/**
	* Internally adds the event handler so that it can be sorted by priority.
	* Priority allows certain handler (user, AnimatedSprite, Interaction) to be run
	* before the rendering.
	* @private
	* @param listener - Current listener being added.
	* @returns This instance of a ticker
	*/
	_addListener(listener) {
		let current = this._head.next;
		let previous = this._head;
		if (!current) listener.connect(previous);
		else {
			while (current) {
				if (listener.priority > current.priority) {
					listener.connect(previous);
					break;
				}
				previous = current;
				current = current.next;
			}
			if (!listener.previous) listener.connect(previous);
		}
		this._startIfPossible();
		return this;
	}
	/**
	* Removes any handlers matching the function and context parameters.
	* If no handlers are left after removing, then it cancels the animation frame.
	* @param fn - The listener function to be removed
	* @param context - The listener context to be removed
	* @returns This instance of a ticker
	*/
	remove(fn, context) {
		let listener = this._head.next;
		while (listener) if (listener.match(fn, context)) listener = listener.destroy();
		else listener = listener.next;
		if (!this._head.next) this._cancelIfNeeded();
		return this;
	}
	/**
	* The number of listeners on this ticker, calculated by walking through linked list
	* @readonly
	* @member {number}
	*/
	get count() {
		if (!this._head) return 0;
		let count = 0;
		let current = this._head;
		while (current = current.next) count++;
		return count;
	}
	/** Starts the ticker. If the ticker has listeners a new animation frame is requested at this point. */
	start() {
		if (!this.started) {
			this.started = true;
			this._requestIfNeeded();
		}
	}
	/** Stops the ticker. If the ticker has requested an animation frame it is canceled at this point. */
	stop() {
		if (this.started) {
			this.started = false;
			this._cancelIfNeeded();
		}
	}
	/** Destroy the ticker and don't use after this. Calling this method removes all references to internal events. */
	destroy() {
		if (!this._protected) {
			this.stop();
			let listener = this._head.next;
			while (listener) listener = listener.destroy(true);
			this._head.destroy();
			this._head = null;
		}
	}
	/**
	* Triggers an update. An update entails setting the
	* current {@link ticker.Ticker#elapsedMS|elapsedMS},
	* the current {@link ticker.Ticker#deltaTime|deltaTime},
	* invoking all listeners with current deltaTime,
	* and then finally setting {@link ticker.Ticker#lastTime|lastTime}
	* with the value of currentTime that was provided.
	* This method will be called automatically by animation
	* frame callbacks if the ticker instance has been started
	* and listeners are added.
	* @param {number} [currentTime=performance.now()] - the current time of execution
	*/
	update(currentTime = performance.now()) {
		let elapsedMS;
		if (currentTime > this.lastTime) {
			elapsedMS = this.elapsedMS = currentTime - this.lastTime;
			if (elapsedMS > this._maxElapsedMS) elapsedMS = this._maxElapsedMS;
			elapsedMS *= this.speed;
			if (this._minElapsedMS) {
				const delta = currentTime - this._lastFrame | 0;
				if (delta < this._minElapsedMS) return;
				this._lastFrame = currentTime - delta % this._minElapsedMS;
			}
			this.deltaMS = elapsedMS;
			this.deltaTime = this.deltaMS * _Ticker.targetFPMS;
			const head = this._head;
			let listener = head.next;
			while (listener) listener = listener.emit(this);
			if (!head.next) this._cancelIfNeeded();
		} else this.deltaTime = this.deltaMS = this.elapsedMS = 0;
		this.lastTime = currentTime;
	}
	/**
	* The frames per second at which this ticker is running.
	* The default is approximately 60 in most modern browsers.
	* **Note:** This does not factor in the value of
	* {@link ticker.Ticker#speed|speed}, which is specific
	* to scaling {@link ticker.Ticker#deltaTime|deltaTime}.
	* @member {number}
	* @readonly
	*/
	get FPS() {
		return 1e3 / this.elapsedMS;
	}
	/**
	* Manages the maximum amount of milliseconds allowed to
	* elapse between invoking {@link ticker.Ticker#update|update}.
	* This value is used to cap {@link ticker.Ticker#deltaTime|deltaTime},
	* but does not effect the measured value of {@link ticker.Ticker#FPS|FPS}.
	* When setting this property it is clamped to a value between
	* `0` and `Ticker.targetFPMS * 1000`.
	* @member {number}
	* @default 10
	*/
	get minFPS() {
		return 1e3 / this._maxElapsedMS;
	}
	set minFPS(fps) {
		const minFPS = Math.min(this.maxFPS, fps);
		const minFPMS = Math.min(Math.max(0, minFPS) / 1e3, _Ticker.targetFPMS);
		this._maxElapsedMS = 1 / minFPMS;
	}
	/**
	* Manages the minimum amount of milliseconds required to
	* elapse between invoking {@link ticker.Ticker#update|update}.
	* This will effect the measured value of {@link ticker.Ticker#FPS|FPS}.
	* If it is set to `0`, then there is no limit; PixiJS will render as many frames as it can.
	* Otherwise it will be at least `minFPS`
	* @member {number}
	* @default 0
	*/
	get maxFPS() {
		if (this._minElapsedMS) return Math.round(1e3 / this._minElapsedMS);
		return 0;
	}
	set maxFPS(fps) {
		if (fps === 0) this._minElapsedMS = 0;
		else {
			const maxFPS = Math.max(this.minFPS, fps);
			this._minElapsedMS = 1 / (maxFPS / 1e3);
		}
	}
	/**
	* The shared ticker instance used by {@link AnimatedSprite} and by
	* {@link VideoResource} to update animation frames / video textures.
	*
	* It may also be used by {@link Application} if created with the `sharedTicker` option property set to true.
	*
	* The property {@link ticker.Ticker#autoStart|autoStart} is set to `true` for this instance.
	* Please follow the examples for usage, including how to opt-out of auto-starting the shared ticker.
	* @example
	* import { Ticker } from 'pixi.js';
	*
	* const ticker = Ticker.shared;
	* // Set this to prevent starting this ticker when listeners are added.
	* // By default this is true only for the Ticker.shared instance.
	* ticker.autoStart = false;
	*
	* // FYI, call this to ensure the ticker is stopped. It should be stopped
	* // if you have not attempted to render anything yet.
	* ticker.stop();
	*
	* // Call this when you are ready for a running shared ticker.
	* ticker.start();
	* @example
	* import { autoDetectRenderer, Container } from 'pixi.js';
	*
	* // You may use the shared ticker to render...
	* const renderer = autoDetectRenderer();
	* const stage = new Container();
	* document.body.appendChild(renderer.view);
	* ticker.add((time) => renderer.render(stage));
	*
	* // Or you can just update it manually.
	* ticker.autoStart = false;
	* ticker.stop();
	* const animate = (time) => {
	*     ticker.update(time);
	*     renderer.render(stage);
	*     requestAnimationFrame(animate);
	* };
	* animate(performance.now());
	* @member {ticker.Ticker}
	* @readonly
	* @static
	*/
	static get shared() {
		if (!_Ticker._shared) {
			const shared = _Ticker._shared = new _Ticker();
			shared.autoStart = true;
			shared._protected = true;
		}
		return _Ticker._shared;
	}
	/**
	* The system ticker instance used by {@link BasePrepare} for core timing
	* functionality that shouldn't usually need to be paused, unlike the `shared`
	* ticker which drives visual animations and rendering which may want to be paused.
	*
	* The property {@link ticker.Ticker#autoStart|autoStart} is set to `true` for this instance.
	* @member {ticker.Ticker}
	* @readonly
	* @static
	*/
	static get system() {
		if (!_Ticker._system) {
			const system = _Ticker._system = new _Ticker();
			system.autoStart = true;
			system._protected = true;
		}
		return _Ticker._system;
	}
};
/**
* Target frames per millisecond.
* @static
*/
_Ticker.targetFPMS = .06;
var Ticker = _Ticker;
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/shared/utils/createIdFromString.mjs
var idCounts = /* @__PURE__ */ Object.create(null);
var idHash = /* @__PURE__ */ Object.create(null);
function createIdFromString(value, groupId) {
	let id = idHash[value];
	if (id === void 0) {
		if (idCounts[groupId] === void 0) idCounts[groupId] = 1;
		idHash[value] = id = idCounts[groupId]++;
	}
	return id;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/gl/shader/program/getTestContext.mjs
var context;
function getTestContext() {
	if (!context || context?.isContextLost()) context = DOMAdapter.get().createCanvas().getContext("webgl", {});
	return context;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/gl/shader/program/getMaxFragmentPrecision.mjs
var maxFragmentPrecision;
function getMaxFragmentPrecision() {
	if (!maxFragmentPrecision) {
		maxFragmentPrecision = "mediump";
		const gl = getTestContext();
		if (gl) {
			if (gl.getShaderPrecisionFormat) maxFragmentPrecision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT).precision ? "highp" : "mediump";
		}
	}
	return maxFragmentPrecision;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/gl/shader/program/preprocessors/addProgramDefines.mjs
function addProgramDefines(src, isES300, isFragment) {
	if (isES300) return src;
	if (isFragment) {
		src = src.replace("out vec4 finalColor;", "");
		return `
        
        #ifdef GL_ES // This checks if it is WebGL1
        #define in varying
        #define finalColor gl_FragColor
        #define texture texture2D
        #endif
        ${src}
        `;
	}
	return `
        
        #ifdef GL_ES // This checks if it is WebGL1
        #define in attribute
        #define out varying
        #endif
        ${src}
        `;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/gl/shader/program/preprocessors/ensurePrecision.mjs
function ensurePrecision(src, options, isFragment) {
	const maxSupportedPrecision = isFragment ? options.maxSupportedFragmentPrecision : options.maxSupportedVertexPrecision;
	if (src.substring(0, 9) !== "precision") {
		let precision = isFragment ? options.requestedFragmentPrecision : options.requestedVertexPrecision;
		if (precision === "highp" && maxSupportedPrecision !== "highp") precision = "mediump";
		return `precision ${precision} float;
${src}`;
	} else if (maxSupportedPrecision !== "highp" && src.substring(0, 15) === "precision highp") return src.replace("precision highp", "precision mediump");
	return src;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/gl/shader/program/preprocessors/insertVersion.mjs
function insertVersion(src, isES300) {
	if (!isES300) return src;
	return `#version 300 es
${src}`;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/gl/shader/program/preprocessors/setProgramName.mjs
var fragmentNameCache = {};
var VertexNameCache = {};
function setProgramName(src, { name = `pixi-program` }, isFragment = true) {
	name = name.replace(/\s+/g, "-");
	name += isFragment ? "-fragment" : "-vertex";
	const nameCache = isFragment ? fragmentNameCache : VertexNameCache;
	if (nameCache[name]) {
		nameCache[name]++;
		name += `-${nameCache[name]}`;
	} else nameCache[name] = 1;
	if (src.indexOf("#define SHADER_NAME") !== -1) return src;
	return `${`#define SHADER_NAME ${name}`}
${src}`;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/gl/shader/program/preprocessors/stripVersion.mjs
function stripVersion(src, isES300) {
	if (!isES300) return src;
	return src.replace("#version 300 es", "");
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/gl/shader/GlProgram.mjs
var processes = {
	stripVersion,
	ensurePrecision,
	addProgramDefines,
	setProgramName,
	insertVersion
};
var programCache$1 = /* @__PURE__ */ Object.create(null);
var _GlProgram = class _GlProgram {
	/**
	* Creates a shiny new GlProgram. Used by WebGL renderer.
	* @param options - The options for the program.
	*/
	constructor(options) {
		options = {
			..._GlProgram.defaultOptions,
			...options
		};
		const isES300 = options.fragment.indexOf("#version 300 es") !== -1;
		const preprocessorOptions = {
			stripVersion: isES300,
			ensurePrecision: {
				requestedFragmentPrecision: options.preferredFragmentPrecision,
				requestedVertexPrecision: options.preferredVertexPrecision,
				maxSupportedVertexPrecision: "highp",
				maxSupportedFragmentPrecision: getMaxFragmentPrecision()
			},
			setProgramName: { name: options.name },
			addProgramDefines: isES300,
			insertVersion: isES300
		};
		let fragment = options.fragment;
		let vertex = options.vertex;
		Object.keys(processes).forEach((processKey) => {
			const processOptions = preprocessorOptions[processKey];
			fragment = processes[processKey](fragment, processOptions, true);
			vertex = processes[processKey](vertex, processOptions, false);
		});
		this.fragment = fragment;
		this.vertex = vertex;
		this.transformFeedbackVaryings = options.transformFeedbackVaryings;
		this._key = createIdFromString(`${this.vertex}:${this.fragment}`, "gl-program");
	}
	/** destroys the program */
	destroy() {
		this.fragment = null;
		this.vertex = null;
		this._attributeData = null;
		this._uniformData = null;
		this._uniformBlockData = null;
		this.transformFeedbackVaryings = null;
	}
	/**
	* Helper function that creates a program for a given source.
	* It will check the program cache if the program has already been created.
	* If it has that one will be returned, if not a new one will be created and cached.
	* @param options - The options for the program.
	* @returns A program using the same source
	*/
	static from(options) {
		const key = `${options.vertex}:${options.fragment}`;
		if (!programCache$1[key]) programCache$1[key] = new _GlProgram(options);
		return programCache$1[key];
	}
};
/** The default options used by the program. */
_GlProgram.defaultOptions = {
	preferredVertexPrecision: "highp",
	preferredFragmentPrecision: "mediump"
};
var GlProgram = _GlProgram;
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/shared/geometry/utils/getAttributeInfoFromFormat.mjs
var attributeFormatData = {
	uint8x2: {
		size: 2,
		stride: 2,
		normalised: false
	},
	uint8x4: {
		size: 4,
		stride: 4,
		normalised: false
	},
	sint8x2: {
		size: 2,
		stride: 2,
		normalised: false
	},
	sint8x4: {
		size: 4,
		stride: 4,
		normalised: false
	},
	unorm8x2: {
		size: 2,
		stride: 2,
		normalised: true
	},
	unorm8x4: {
		size: 4,
		stride: 4,
		normalised: true
	},
	snorm8x2: {
		size: 2,
		stride: 2,
		normalised: true
	},
	snorm8x4: {
		size: 4,
		stride: 4,
		normalised: true
	},
	uint16x2: {
		size: 2,
		stride: 4,
		normalised: false
	},
	uint16x4: {
		size: 4,
		stride: 8,
		normalised: false
	},
	sint16x2: {
		size: 2,
		stride: 4,
		normalised: false
	},
	sint16x4: {
		size: 4,
		stride: 8,
		normalised: false
	},
	unorm16x2: {
		size: 2,
		stride: 4,
		normalised: true
	},
	unorm16x4: {
		size: 4,
		stride: 8,
		normalised: true
	},
	snorm16x2: {
		size: 2,
		stride: 4,
		normalised: true
	},
	snorm16x4: {
		size: 4,
		stride: 8,
		normalised: true
	},
	float16x2: {
		size: 2,
		stride: 4,
		normalised: false
	},
	float16x4: {
		size: 4,
		stride: 8,
		normalised: false
	},
	float32: {
		size: 1,
		stride: 4,
		normalised: false
	},
	float32x2: {
		size: 2,
		stride: 8,
		normalised: false
	},
	float32x3: {
		size: 3,
		stride: 12,
		normalised: false
	},
	float32x4: {
		size: 4,
		stride: 16,
		normalised: false
	},
	uint32: {
		size: 1,
		stride: 4,
		normalised: false
	},
	uint32x2: {
		size: 2,
		stride: 8,
		normalised: false
	},
	uint32x3: {
		size: 3,
		stride: 12,
		normalised: false
	},
	uint32x4: {
		size: 4,
		stride: 16,
		normalised: false
	},
	sint32: {
		size: 1,
		stride: 4,
		normalised: false
	},
	sint32x2: {
		size: 2,
		stride: 8,
		normalised: false
	},
	sint32x3: {
		size: 3,
		stride: 12,
		normalised: false
	},
	sint32x4: {
		size: 4,
		stride: 16,
		normalised: false
	}
};
function getAttributeInfoFromFormat(format) {
	return attributeFormatData[format] ?? attributeFormatData.float32;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/gpu/shader/utils/extractAttributesFromGpuProgram.mjs
var WGSL_TO_VERTEX_TYPES = {
	f32: "float32",
	"vec2<f32>": "float32x2",
	"vec3<f32>": "float32x3",
	"vec4<f32>": "float32x4",
	vec2f: "float32x2",
	vec3f: "float32x3",
	vec4f: "float32x4",
	i32: "sint32",
	"vec2<i32>": "sint32x2",
	"vec3<i32>": "sint32x3",
	"vec4<i32>": "sint32x4",
	u32: "uint32",
	"vec2<u32>": "uint32x2",
	"vec3<u32>": "uint32x3",
	"vec4<u32>": "uint32x4",
	bool: "uint32",
	"vec2<bool>": "uint32x2",
	"vec3<bool>": "uint32x3",
	"vec4<bool>": "uint32x4"
};
function extractAttributesFromGpuProgram({ source, entryPoint }) {
	const results = {};
	const mainVertStart = source.indexOf(`fn ${entryPoint}`);
	if (mainVertStart !== -1) {
		const arrowFunctionStart = source.indexOf("->", mainVertStart);
		if (arrowFunctionStart !== -1) {
			const functionArgsSubstring = source.substring(mainVertStart, arrowFunctionStart);
			const inputsRegex = /@location\((\d+)\)\s+([a-zA-Z0-9_]+)\s*:\s*([a-zA-Z0-9_<>]+)(?:,|\s|$)/g;
			let match;
			while ((match = inputsRegex.exec(functionArgsSubstring)) !== null) {
				const format = WGSL_TO_VERTEX_TYPES[match[3]] ?? "float32";
				results[match[2]] = {
					location: parseInt(match[1], 10),
					format,
					stride: getAttributeInfoFromFormat(format).stride,
					offset: 0,
					instance: false,
					start: 0
				};
			}
		}
	}
	return results;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/gpu/shader/utils/extractStructAndGroups.mjs
function extractStructAndGroups(wgsl) {
	const linePattern = /(^|[^/])@(group|binding)\(\d+\)[^;]+;/g;
	const groupPattern = /@group\((\d+)\)/;
	const bindingPattern = /@binding\((\d+)\)/;
	const namePattern = /var(<[^>]+>)? (\w+)/;
	const typePattern = /:\s*(\w+)/;
	const structPattern = /struct\s+(\w+)\s*{([^}]+)}/g;
	const structMemberPattern = /(\w+)\s*:\s*([\w\<\>]+)/g;
	const structName = /struct\s+(\w+)/;
	const groups = wgsl.match(linePattern)?.map((item) => ({
		group: parseInt(item.match(groupPattern)[1], 10),
		binding: parseInt(item.match(bindingPattern)[1], 10),
		name: item.match(namePattern)[2],
		isUniform: item.match(namePattern)[1] === "<uniform>",
		type: item.match(typePattern)[1]
	}));
	if (!groups) return {
		groups: [],
		structs: []
	};
	return {
		groups,
		structs: wgsl.match(structPattern)?.map((struct) => {
			const name = struct.match(structName)[1];
			const members = struct.match(structMemberPattern).reduce((acc, member) => {
				const [name2, type] = member.split(":");
				acc[name2.trim()] = type.trim();
				return acc;
			}, {});
			if (!members) return null;
			return {
				name,
				members
			};
		}).filter(({ name }) => groups.some((group) => group.type === name)) ?? []
	};
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/shared/shader/const.mjs
var ShaderStage = /* @__PURE__ */ ((ShaderStage2) => {
	ShaderStage2[ShaderStage2["VERTEX"] = 1] = "VERTEX";
	ShaderStage2[ShaderStage2["FRAGMENT"] = 2] = "FRAGMENT";
	ShaderStage2[ShaderStage2["COMPUTE"] = 4] = "COMPUTE";
	return ShaderStage2;
})(ShaderStage || {});
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/gpu/shader/utils/generateGpuLayoutGroups.mjs
function generateGpuLayoutGroups({ groups }) {
	const layout = [];
	for (let i = 0; i < groups.length; i++) {
		const group = groups[i];
		if (!layout[group.group]) layout[group.group] = [];
		if (group.isUniform) layout[group.group].push({
			binding: group.binding,
			visibility: ShaderStage.VERTEX | ShaderStage.FRAGMENT,
			buffer: { type: "uniform" }
		});
		else if (group.type === "sampler") layout[group.group].push({
			binding: group.binding,
			visibility: ShaderStage.FRAGMENT,
			sampler: { type: "filtering" }
		});
		else if (group.type === "texture_2d") layout[group.group].push({
			binding: group.binding,
			visibility: ShaderStage.FRAGMENT,
			texture: {
				sampleType: "float",
				viewDimension: "2d",
				multisampled: false
			}
		});
	}
	return layout;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/gpu/shader/utils/generateLayoutHash.mjs
function generateLayoutHash({ groups }) {
	const layout = [];
	for (let i = 0; i < groups.length; i++) {
		const group = groups[i];
		if (!layout[group.group]) layout[group.group] = {};
		layout[group.group][group.name] = group.binding;
	}
	return layout;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/gpu/shader/utils/removeStructAndGroupDuplicates.mjs
function removeStructAndGroupDuplicates(vertexStructsAndGroups, fragmentStructsAndGroups) {
	const structNameSet = /* @__PURE__ */ new Set();
	const dupeGroupKeySet = /* @__PURE__ */ new Set();
	return {
		structs: [...vertexStructsAndGroups.structs, ...fragmentStructsAndGroups.structs].filter((struct) => {
			if (structNameSet.has(struct.name)) return false;
			structNameSet.add(struct.name);
			return true;
		}),
		groups: [...vertexStructsAndGroups.groups, ...fragmentStructsAndGroups.groups].filter((group) => {
			const key = `${group.name}-${group.binding}`;
			if (dupeGroupKeySet.has(key)) return false;
			dupeGroupKeySet.add(key);
			return true;
		})
	};
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/gpu/shader/GpuProgram.mjs
var programCache = /* @__PURE__ */ Object.create(null);
var GpuProgram = class GpuProgram {
	/**
	* Create a new GpuProgram
	* @param options - The options for the gpu program
	*/
	constructor(options) {
		/**
		* @internal
		* @ignore
		*/
		this._layoutKey = 0;
		/**
		* @internal
		* @ignore
		*/
		this._attributeLocationsKey = 0;
		const { fragment, vertex, layout, gpuLayout, name } = options;
		this.name = name;
		this.fragment = fragment;
		this.vertex = vertex;
		if (fragment.source === vertex.source) {
			const structsAndGroups = extractStructAndGroups(fragment.source);
			this.structsAndGroups = structsAndGroups;
		} else {
			const vertexStructsAndGroups = extractStructAndGroups(vertex.source);
			const fragmentStructsAndGroups = extractStructAndGroups(fragment.source);
			this.structsAndGroups = removeStructAndGroupDuplicates(vertexStructsAndGroups, fragmentStructsAndGroups);
		}
		this.layout = layout ?? generateLayoutHash(this.structsAndGroups);
		this.gpuLayout = gpuLayout ?? generateGpuLayoutGroups(this.structsAndGroups);
		this.autoAssignGlobalUniforms = !!(this.layout[0]?.globalUniforms !== void 0);
		this.autoAssignLocalUniforms = !!(this.layout[1]?.localUniforms !== void 0);
		this._generateProgramKey();
	}
	_generateProgramKey() {
		const { vertex, fragment } = this;
		const bigKey = vertex.source + fragment.source + vertex.entryPoint + fragment.entryPoint;
		this._layoutKey = createIdFromString(bigKey, "program");
	}
	get attributeData() {
		this._attributeData ?? (this._attributeData = extractAttributesFromGpuProgram(this.vertex));
		return this._attributeData;
	}
	/** destroys the program */
	destroy() {
		this.gpuLayout = null;
		this.layout = null;
		this.structsAndGroups = null;
		this.fragment = null;
		this.vertex = null;
	}
	/**
	* Helper function that creates a program for a given source.
	* It will check the program cache if the program has already been created.
	* If it has that one will be returned, if not a new one will be created and cached.
	* @param options - The options for the program.
	* @returns A program using the same source
	*/
	static from(options) {
		const key = `${options.vertex.source}:${options.fragment.source}:${options.fragment.entryPoint}:${options.vertex.entryPoint}`;
		if (!programCache[key]) programCache[key] = new GpuProgram(options);
		return programCache[key];
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/shared/shader/types.mjs
var UNIFORM_TYPES_VALUES = [
	"f32",
	"i32",
	"vec2<f32>",
	"vec3<f32>",
	"vec4<f32>",
	"mat2x2<f32>",
	"mat3x3<f32>",
	"mat4x4<f32>",
	"mat3x2<f32>",
	"mat4x2<f32>",
	"mat2x3<f32>",
	"mat4x3<f32>",
	"mat2x4<f32>",
	"mat3x4<f32>",
	"vec2<i32>",
	"vec3<i32>",
	"vec4<i32>"
];
var UNIFORM_TYPES_MAP = UNIFORM_TYPES_VALUES.reduce((acc, type) => {
	acc[type] = true;
	return acc;
}, {});
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/shared/shader/utils/getDefaultUniformValue.mjs
function getDefaultUniformValue(type, size) {
	switch (type) {
		case "f32": return 0;
		case "vec2<f32>": return new Float32Array(2 * size);
		case "vec3<f32>": return new Float32Array(3 * size);
		case "vec4<f32>": return new Float32Array(4 * size);
		case "mat2x2<f32>": return new Float32Array([
			1,
			0,
			0,
			1
		]);
		case "mat3x3<f32>": return new Float32Array([
			1,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			1
		]);
		case "mat4x4<f32>": return new Float32Array([
			1,
			0,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			0,
			1
		]);
	}
	return null;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/shared/shader/UniformGroup.mjs
var _UniformGroup = class _UniformGroup {
	/**
	* Create a new Uniform group
	* @param uniformStructures - The structures of the uniform group
	* @param options - The optional parameters of this uniform group
	*/
	constructor(uniformStructures, options) {
		/** used internally to know if a uniform group was used in the last render pass */
		this._touched = 0;
		/** a unique id for this uniform group used through the renderer */
		this.uid = uid("uniform");
		/** a resource type, used to identify how to handle it when its in a bind group / shader resource */
		this._resourceType = "uniformGroup";
		/** the resource id used internally by the renderer to build bind group keys */
		this._resourceId = uid("resource");
		/** used ito identify if this is a uniform group */
		this.isUniformGroup = true;
		/**
		* used to flag if this Uniform groups data is different from what it has stored in its buffer / on the GPU
		* @internal
		* @ignore
		*/
		this._dirtyId = 0;
		this.destroyed = false;
		options = {
			..._UniformGroup.defaultOptions,
			...options
		};
		this.uniformStructures = uniformStructures;
		const uniforms = {};
		for (const i in uniformStructures) {
			const uniformData = uniformStructures[i];
			uniformData.name = i;
			uniformData.size = uniformData.size ?? 1;
			if (!UNIFORM_TYPES_MAP[uniformData.type]) throw new Error(`Uniform type ${uniformData.type} is not supported. Supported uniform types are: ${UNIFORM_TYPES_VALUES.join(", ")}`);
			uniformData.value ?? (uniformData.value = getDefaultUniformValue(uniformData.type, uniformData.size));
			uniforms[i] = uniformData.value;
		}
		this.uniforms = uniforms;
		this._dirtyId = 1;
		this.ubo = options.ubo;
		this.isStatic = options.isStatic;
		this._signature = createIdFromString(Object.keys(uniforms).map((i) => `${i}-${uniformStructures[i].type}`).join("-"), "uniform-group");
	}
	/** Call this if you want the uniform groups data to be uploaded to the GPU only useful if `isStatic` is true. */
	update() {
		this._dirtyId++;
	}
};
/** The default options used by the uniform group. */
_UniformGroup.defaultOptions = {
	/** if true the UniformGroup is handled as an Uniform buffer object. */
	ubo: false,
	/** if true, then you are responsible for when the data is uploaded to the GPU by calling `update()` */
	isStatic: false
};
var UniformGroup = _UniformGroup;
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/gpu/shader/BindGroup.mjs
var BindGroup = class {
	/**
	* Create a new instance eof the Bind Group.
	* @param resources - The resources that are bound together for use by a shader.
	*/
	constructor(resources) {
		/** The resources that are bound together for use by a shader. */
		this.resources = /* @__PURE__ */ Object.create(null);
		this._dirty = true;
		let index = 0;
		for (const i in resources) {
			const resource = resources[i];
			this.setResource(resource, index++);
		}
		this._updateKey();
	}
	/**
	* Updates the key if its flagged as dirty. This is used internally to
	* match this bind group to a WebGPU BindGroup.
	* @internal
	* @ignore
	*/
	_updateKey() {
		if (!this._dirty) return;
		this._dirty = false;
		const keyParts = [];
		let index = 0;
		for (const i in this.resources) keyParts[index++] = this.resources[i]._resourceId;
		this._key = keyParts.join("|");
	}
	/**
	* Set a resource at a given index. this function will
	* ensure that listeners will be removed from the current resource
	* and added to the new resource.
	* @param resource - The resource to set.
	* @param index - The index to set the resource at.
	*/
	setResource(resource, index) {
		const currentResource = this.resources[index];
		if (resource === currentResource) return;
		if (currentResource) resource.off?.("change", this.onResourceChange, this);
		resource.on?.("change", this.onResourceChange, this);
		this.resources[index] = resource;
		this._dirty = true;
	}
	/**
	* Returns the resource at the current specified index.
	* @param index - The index of the resource to get.
	* @returns - The resource at the specified index.
	*/
	getResource(index) {
		return this.resources[index];
	}
	/**
	* Used internally to 'touch' each resource, to ensure that the GC
	* knows that all resources in this bind group are still being used.
	* @param tick - The current tick.
	* @internal
	* @ignore
	*/
	_touch(tick) {
		const resources = this.resources;
		for (const i in resources) resources[i]._touched = tick;
	}
	/** Destroys this bind group and removes all listeners. */
	destroy() {
		const resources = this.resources;
		for (const i in resources) resources[i].off?.("change", this.onResourceChange, this);
		this.resources = null;
	}
	onResourceChange(resource) {
		this._dirty = true;
		if (resource.destroyed) {
			const resources = this.resources;
			for (const i in resources) if (resources[i] === resource) resources[i] = null;
		} else this._updateKey();
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/types.mjs
var RendererType = /* @__PURE__ */ ((RendererType2) => {
	RendererType2[RendererType2["WEBGL"] = 1] = "WEBGL";
	RendererType2[RendererType2["WEBGPU"] = 2] = "WEBGPU";
	RendererType2[RendererType2["BOTH"] = 3] = "BOTH";
	return RendererType2;
})(RendererType || {});
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/shared/shader/Shader.mjs
var Shader = class Shader extends eventemitter3_default {
	constructor(options) {
		super();
		/** A unique identifier for the shader */
		this.uid = uid("shader");
		/**
		* A record of the uniform groups and resources used by the shader.
		* This is used by WebGL renderer to sync uniform data.
		* @internal
		* @ignore
		*/
		this._uniformBindMap = /* @__PURE__ */ Object.create(null);
		this._ownedBindGroups = [];
		let { gpuProgram, glProgram, groups, resources, compatibleRenderers, groupMap } = options;
		this.gpuProgram = gpuProgram;
		this.glProgram = glProgram;
		if (compatibleRenderers === void 0) {
			compatibleRenderers = 0;
			if (gpuProgram) compatibleRenderers |= RendererType.WEBGPU;
			if (glProgram) compatibleRenderers |= RendererType.WEBGL;
		}
		this.compatibleRenderers = compatibleRenderers;
		const nameHash = {};
		if (!resources && !groups) resources = {};
		if (resources && groups) throw new Error("[Shader] Cannot have both resources and groups");
		else if (!gpuProgram && groups && !groupMap) throw new Error("[Shader] No group map or WebGPU shader provided - consider using resources instead.");
		else if (!gpuProgram && groups && groupMap) for (const i in groupMap) for (const j in groupMap[i]) {
			const uniformName = groupMap[i][j];
			nameHash[uniformName] = {
				group: i,
				binding: j,
				name: uniformName
			};
		}
		else if (gpuProgram && groups && !groupMap) {
			const groupData = gpuProgram.structsAndGroups.groups;
			groupMap = {};
			groupData.forEach((data) => {
				groupMap[data.group] = groupMap[data.group] || {};
				groupMap[data.group][data.binding] = data.name;
				nameHash[data.name] = data;
			});
		} else if (resources) {
			groups = {};
			groupMap = {};
			if (gpuProgram) gpuProgram.structsAndGroups.groups.forEach((data) => {
				groupMap[data.group] = groupMap[data.group] || {};
				groupMap[data.group][data.binding] = data.name;
				nameHash[data.name] = data;
			});
			let bindTick = 0;
			for (const i in resources) {
				if (nameHash[i]) continue;
				if (!groups[99]) {
					groups[99] = new BindGroup();
					this._ownedBindGroups.push(groups[99]);
				}
				nameHash[i] = {
					group: 99,
					binding: bindTick,
					name: i
				};
				groupMap[99] = groupMap[99] || {};
				groupMap[99][bindTick] = i;
				bindTick++;
			}
			for (const i in resources) {
				const name = i;
				let value = resources[i];
				if (!value.source && !value._resourceType) value = new UniformGroup(value);
				const data = nameHash[name];
				if (data) {
					if (!groups[data.group]) {
						groups[data.group] = new BindGroup();
						this._ownedBindGroups.push(groups[data.group]);
					}
					groups[data.group].setResource(value, data.binding);
				}
			}
		}
		this.groups = groups;
		this._uniformBindMap = groupMap;
		this.resources = this._buildResourceAccessor(groups, nameHash);
	}
	/**
	* Sometimes a resource group will be provided later (for example global uniforms)
	* In such cases, this method can be used to let the shader know about the group.
	* @param name - the name of the resource group
	* @param groupIndex - the index of the group (should match the webGPU shader group location)
	* @param bindIndex - the index of the bind point (should match the webGPU shader bind point)
	*/
	addResource(name, groupIndex, bindIndex) {
		var _a, _b;
		(_a = this._uniformBindMap)[groupIndex] || (_a[groupIndex] = {});
		(_b = this._uniformBindMap[groupIndex])[bindIndex] || (_b[bindIndex] = name);
		if (!this.groups[groupIndex]) {
			this.groups[groupIndex] = new BindGroup();
			this._ownedBindGroups.push(this.groups[groupIndex]);
		}
	}
	_buildResourceAccessor(groups, nameHash) {
		const uniformsOut = {};
		for (const i in nameHash) {
			const data = nameHash[i];
			Object.defineProperty(uniformsOut, data.name, {
				get() {
					return groups[data.group].getResource(data.binding);
				},
				set(value) {
					groups[data.group].setResource(value, data.binding);
				}
			});
		}
		return uniformsOut;
	}
	/**
	* Use to destroy the shader when its not longer needed.
	* It will destroy the resources and remove listeners.
	* @param destroyPrograms - if the programs should be destroyed as well.
	* Make sure its not being used by other shaders!
	*/
	destroy(destroyPrograms = false) {
		this.emit("destroy", this);
		if (destroyPrograms) {
			this.gpuProgram?.destroy();
			this.glProgram?.destroy();
		}
		this.gpuProgram = null;
		this.glProgram = null;
		this.removeAllListeners();
		this._uniformBindMap = null;
		this._ownedBindGroups.forEach((bindGroup) => {
			bindGroup.destroy();
		});
		this._ownedBindGroups = null;
		this.resources = null;
		this.groups = null;
	}
	static from(options) {
		const { gpu, gl, ...rest } = options;
		let gpuProgram;
		let glProgram;
		if (gpu) gpuProgram = GpuProgram.from(gpu);
		if (gl) glProgram = GlProgram.from(gl);
		return new Shader({
			gpuProgram,
			glProgram,
			...rest
		});
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/shared/state/State.mjs
var blendModeIds = {
	normal: 0,
	add: 1,
	multiply: 2,
	screen: 3,
	overlay: 4,
	erase: 5,
	"normal-npm": 6,
	"add-npm": 7,
	"screen-npm": 8,
	min: 9,
	max: 10
};
var _State = class _State {
	constructor() {
		this.data = 0;
		this.blendMode = "normal";
		this.polygonOffset = 0;
		this.blend = true;
		this.depthMask = true;
	}
	/**
	* Activates blending of the computed fragment color values.
	* @default true
	*/
	get blend() {
		return !!(this.data & 1);
	}
	set blend(value) {
		if (!!(this.data & 1) !== value) this.data ^= 1;
	}
	/**
	* Activates adding an offset to depth values of polygon's fragments
	* @default false
	*/
	get offsets() {
		return !!(this.data & 2);
	}
	set offsets(value) {
		if (!!(this.data & 2) !== value) this.data ^= 2;
	}
	/** The culling settings for this state none - No culling back - Back face culling front - Front face culling */
	set cullMode(value) {
		if (value === "none") {
			this.culling = false;
			return;
		}
		this.culling = true;
		this.clockwiseFrontFace = value === "front";
	}
	get cullMode() {
		if (!this.culling) return "none";
		return this.clockwiseFrontFace ? "front" : "back";
	}
	/**
	* Activates culling of polygons.
	* @default false
	*/
	get culling() {
		return !!(this.data & 4);
	}
	set culling(value) {
		if (!!(this.data & 4) !== value) this.data ^= 4;
	}
	/**
	* Activates depth comparisons and updates to the depth buffer.
	* @default false
	*/
	get depthTest() {
		return !!(this.data & 8);
	}
	set depthTest(value) {
		if (!!(this.data & 8) !== value) this.data ^= 8;
	}
	/**
	* Enables or disables writing to the depth buffer.
	* @default true
	*/
	get depthMask() {
		return !!(this.data & 32);
	}
	set depthMask(value) {
		if (!!(this.data & 32) !== value) this.data ^= 32;
	}
	/**
	* Specifies whether or not front or back-facing polygons can be culled.
	* @default false
	*/
	get clockwiseFrontFace() {
		return !!(this.data & 16);
	}
	set clockwiseFrontFace(value) {
		if (!!(this.data & 16) !== value) this.data ^= 16;
	}
	/**
	* The blend mode to be applied when this state is set. Apply a value of `normal` to reset the blend mode.
	* Setting this mode to anything other than NO_BLEND will automatically switch blending on.
	* @default 'normal'
	*/
	get blendMode() {
		return this._blendMode;
	}
	set blendMode(value) {
		this.blend = value !== "none";
		this._blendMode = value;
		this._blendModeId = blendModeIds[value] || 0;
	}
	/**
	* The polygon offset. Setting this property to anything other than 0 will automatically enable polygon offset fill.
	* @default 0
	*/
	get polygonOffset() {
		return this._polygonOffset;
	}
	set polygonOffset(value) {
		this.offsets = !!value;
		this._polygonOffset = value;
	}
	toString() {
		return `[pixi.js/core:State blendMode=${this.blendMode} clockwiseFrontFace=${this.clockwiseFrontFace} culling=${this.culling} depthMask=${this.depthMask} polygonOffset=${this.polygonOffset}]`;
	}
	/**
	* A quickly getting an instance of a State that is configured for 2d rendering.
	* @returns a new State with values set for 2d rendering
	*/
	static for2d() {
		const state = new _State();
		state.depthTest = false;
		state.blend = true;
		return state;
	}
};
_State.default2d = _State.for2d();
var State = _State;
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/batcher/gl/utils/checkMaxIfStatementsInShader.mjs
var fragTemplate = [
	"precision mediump float;",
	"void main(void){",
	"float test = 0.1;",
	"%forloop%",
	"gl_FragColor = vec4(0.0);",
	"}"
].join("\n");
function generateIfTestSrc(maxIfs) {
	let src = "";
	for (let i = 0; i < maxIfs; ++i) {
		if (i > 0) src += "\nelse ";
		if (i < maxIfs - 1) src += `if(test == ${i}.0){}`;
	}
	return src;
}
function checkMaxIfStatementsInShader(maxIfs, gl) {
	if (maxIfs === 0) throw new Error("Invalid value of `0` passed to `checkMaxIfStatementsInShader`");
	const shader = gl.createShader(gl.FRAGMENT_SHADER);
	try {
		while (true) {
			const fragmentSrc = fragTemplate.replace(/%forloop%/gi, generateIfTestSrc(maxIfs));
			gl.shaderSource(shader, fragmentSrc);
			gl.compileShader(shader);
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) maxIfs = maxIfs / 2 | 0;
			else break;
		}
	} finally {
		gl.deleteShader(shader);
	}
	return maxIfs;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/batcher/gl/utils/maxRecommendedTextures.mjs
var maxTexturesPerBatchCache = null;
function getMaxTexturesPerBatch() {
	if (maxTexturesPerBatchCache) return maxTexturesPerBatchCache;
	const gl = getTestContext();
	maxTexturesPerBatchCache = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
	maxTexturesPerBatchCache = checkMaxIfStatementsInShader(maxTexturesPerBatchCache, gl);
	gl.getExtension("WEBGL_lose_context")?.loseContext();
	return maxTexturesPerBatchCache;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/utils/data/ViewableBuffer.mjs
var ViewableBuffer = class {
	constructor(sizeOrBuffer) {
		if (typeof sizeOrBuffer === "number") this.rawBinaryData = new ArrayBuffer(sizeOrBuffer);
		else if (sizeOrBuffer instanceof Uint8Array) this.rawBinaryData = sizeOrBuffer.buffer;
		else this.rawBinaryData = sizeOrBuffer;
		this.uint32View = new Uint32Array(this.rawBinaryData);
		this.float32View = new Float32Array(this.rawBinaryData);
		this.size = this.rawBinaryData.byteLength;
	}
	/** View on the raw binary data as a `Int8Array`. */
	get int8View() {
		if (!this._int8View) this._int8View = new Int8Array(this.rawBinaryData);
		return this._int8View;
	}
	/** View on the raw binary data as a `Uint8Array`. */
	get uint8View() {
		if (!this._uint8View) this._uint8View = new Uint8Array(this.rawBinaryData);
		return this._uint8View;
	}
	/**  View on the raw binary data as a `Int16Array`. */
	get int16View() {
		if (!this._int16View) this._int16View = new Int16Array(this.rawBinaryData);
		return this._int16View;
	}
	/** View on the raw binary data as a `Int32Array`. */
	get int32View() {
		if (!this._int32View) this._int32View = new Int32Array(this.rawBinaryData);
		return this._int32View;
	}
	/** View on the raw binary data as a `Float64Array`. */
	get float64View() {
		if (!this._float64Array) this._float64Array = new Float64Array(this.rawBinaryData);
		return this._float64Array;
	}
	/** View on the raw binary data as a `BigUint64Array`. */
	get bigUint64View() {
		if (!this._bigUint64Array) this._bigUint64Array = new BigUint64Array(this.rawBinaryData);
		return this._bigUint64Array;
	}
	/**
	* Returns the view of the given type.
	* @param type - One of `int8`, `uint8`, `int16`,
	*    `uint16`, `int32`, `uint32`, and `float32`.
	* @returns - typed array of given type
	*/
	view(type) {
		return this[`${type}View`];
	}
	/** Destroys all buffer references. Do not use after calling this. */
	destroy() {
		this.rawBinaryData = null;
		this._int8View = null;
		this._uint8View = null;
		this._int16View = null;
		this.uint16View = null;
		this._int32View = null;
		this.uint32View = null;
		this.float32View = null;
	}
	/**
	* Returns the size of the given type in bytes.
	* @param type - One of `int8`, `uint8`, `int16`,
	*   `uint16`, `int32`, `uint32`, and `float32`.
	* @returns - size of the type in bytes
	*/
	static sizeOf(type) {
		switch (type) {
			case "int8":
			case "uint8": return 1;
			case "int16":
			case "uint16": return 2;
			case "int32":
			case "uint32":
			case "float32": return 4;
			default: throw new Error(`${type} isn't a valid view type`);
		}
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/shared/buffer/utils/fastCopy.mjs
function fastCopy(sourceBuffer, destinationBuffer) {
	const lengthDouble = sourceBuffer.byteLength / 8 | 0;
	const sourceFloat64View = new Float64Array(sourceBuffer, 0, lengthDouble);
	new Float64Array(destinationBuffer, 0, lengthDouble).set(sourceFloat64View);
	const remainingBytes = sourceBuffer.byteLength - lengthDouble * 8;
	if (remainingBytes > 0) {
		const sourceUint8View = new Uint8Array(sourceBuffer, lengthDouble * 8, remainingBytes);
		new Uint8Array(destinationBuffer, lengthDouble * 8, remainingBytes).set(sourceUint8View);
	}
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/shared/state/const.mjs
var BLEND_TO_NPM = {
	normal: "normal-npm",
	add: "add-npm",
	screen: "screen-npm"
};
var STENCIL_MODES = /* @__PURE__ */ ((STENCIL_MODES2) => {
	STENCIL_MODES2[STENCIL_MODES2["DISABLED"] = 0] = "DISABLED";
	STENCIL_MODES2[STENCIL_MODES2["RENDERING_MASK_ADD"] = 1] = "RENDERING_MASK_ADD";
	STENCIL_MODES2[STENCIL_MODES2["MASK_ACTIVE"] = 2] = "MASK_ACTIVE";
	STENCIL_MODES2[STENCIL_MODES2["INVERSE_MASK_ACTIVE"] = 3] = "INVERSE_MASK_ACTIVE";
	STENCIL_MODES2[STENCIL_MODES2["RENDERING_MASK_REMOVE"] = 4] = "RENDERING_MASK_REMOVE";
	STENCIL_MODES2[STENCIL_MODES2["NONE"] = 5] = "NONE";
	return STENCIL_MODES2;
})(STENCIL_MODES || {});
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/shared/state/getAdjustedBlendModeBlend.mjs
function getAdjustedBlendModeBlend(blendMode, textureSource) {
	if (textureSource.alphaMode === "no-premultiply-alpha") return BLEND_TO_NPM[blendMode] || blendMode;
	return blendMode;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/batcher/shared/BatchTextureArray.mjs
var BatchTextureArray = class {
	constructor() {
		/** Respective locations for textures. */
		this.ids = /* @__PURE__ */ Object.create(null);
		this.textures = [];
		this.count = 0;
	}
	/** Clear the textures and their locations. */
	clear() {
		for (let i = 0; i < this.count; i++) {
			const t = this.textures[i];
			this.textures[i] = null;
			this.ids[t.uid] = null;
		}
		this.count = 0;
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/batcher/shared/Batcher.mjs
var Batch = class {
	constructor() {
		this.renderPipeId = "batch";
		this.action = "startBatch";
		this.start = 0;
		this.size = 0;
		this.textures = new BatchTextureArray();
		this.blendMode = "normal";
		this.topology = "triangle-strip";
		this.canBundle = true;
	}
	destroy() {
		this.textures = null;
		this.gpuBindGroup = null;
		this.bindGroup = null;
		this.batcher = null;
	}
};
var batchPool = [];
var batchPoolIndex = 0;
function getBatchFromPool() {
	return batchPoolIndex > 0 ? batchPool[--batchPoolIndex] : new Batch();
}
function returnBatchToPool(batch) {
	batchPool[batchPoolIndex++] = batch;
}
var BATCH_TICK = 0;
var _Batcher = class _Batcher {
	constructor(options = {}) {
		/** unique id for this batcher */
		this.uid = uid("batcher");
		/** Indicates whether the batch data has been modified and needs updating. */
		this.dirty = true;
		/** The current index of the batch being processed. */
		this.batchIndex = 0;
		/** An array of all batches created during the current rendering process. */
		this.batches = [];
		this._elements = [];
		_Batcher.defaultOptions.maxTextures = _Batcher.defaultOptions.maxTextures ?? getMaxTexturesPerBatch();
		options = {
			..._Batcher.defaultOptions,
			...options
		};
		const { maxTextures, attributesInitialSize, indicesInitialSize } = options;
		this.attributeBuffer = new ViewableBuffer(attributesInitialSize * 4);
		this.indexBuffer = new Uint16Array(indicesInitialSize);
		this.maxTextures = maxTextures;
	}
	begin() {
		this.elementSize = 0;
		this.elementStart = 0;
		this.indexSize = 0;
		this.attributeSize = 0;
		for (let i = 0; i < this.batchIndex; i++) returnBatchToPool(this.batches[i]);
		this.batchIndex = 0;
		this._batchIndexStart = 0;
		this._batchIndexSize = 0;
		this.dirty = true;
	}
	add(batchableObject) {
		this._elements[this.elementSize++] = batchableObject;
		batchableObject._indexStart = this.indexSize;
		batchableObject._attributeStart = this.attributeSize;
		batchableObject._batcher = this;
		this.indexSize += batchableObject.indexSize;
		this.attributeSize += batchableObject.attributeSize * this.vertexSize;
	}
	checkAndUpdateTexture(batchableObject, texture) {
		const textureId = batchableObject._batch.textures.ids[texture._source.uid];
		if (!textureId && textureId !== 0) return false;
		batchableObject._textureId = textureId;
		batchableObject.texture = texture;
		return true;
	}
	updateElement(batchableObject) {
		this.dirty = true;
		const attributeBuffer = this.attributeBuffer;
		if (batchableObject.packAsQuad) this.packQuadAttributes(batchableObject, attributeBuffer.float32View, attributeBuffer.uint32View, batchableObject._attributeStart, batchableObject._textureId);
		else this.packAttributes(batchableObject, attributeBuffer.float32View, attributeBuffer.uint32View, batchableObject._attributeStart, batchableObject._textureId);
	}
	/**
	* breaks the batcher. This happens when a batch gets too big,
	* or we need to switch to a different type of rendering (a filter for example)
	* @param instructionSet
	*/
	break(instructionSet) {
		const elements = this._elements;
		if (!elements[this.elementStart]) return;
		let batch = getBatchFromPool();
		let textureBatch = batch.textures;
		textureBatch.clear();
		const firstElement = elements[this.elementStart];
		let blendMode = getAdjustedBlendModeBlend(firstElement.blendMode, firstElement.texture._source);
		let topology = firstElement.topology;
		if (this.attributeSize * 4 > this.attributeBuffer.size) this._resizeAttributeBuffer(this.attributeSize * 4);
		if (this.indexSize > this.indexBuffer.length) this._resizeIndexBuffer(this.indexSize);
		const f32 = this.attributeBuffer.float32View;
		const u32 = this.attributeBuffer.uint32View;
		const indexBuffer = this.indexBuffer;
		let size = this._batchIndexSize;
		let start = this._batchIndexStart;
		let action = "startBatch";
		const maxTextures = this.maxTextures;
		for (let i = this.elementStart; i < this.elementSize; ++i) {
			const element = elements[i];
			elements[i] = null;
			const source = element.texture._source;
			const adjustedBlendMode = getAdjustedBlendModeBlend(element.blendMode, source);
			const breakRequired = blendMode !== adjustedBlendMode || topology !== element.topology;
			if (source._batchTick === BATCH_TICK && !breakRequired) {
				element._textureId = source._textureBindLocation;
				size += element.indexSize;
				if (element.packAsQuad) {
					this.packQuadAttributes(element, f32, u32, element._attributeStart, element._textureId);
					this.packQuadIndex(indexBuffer, element._indexStart, element._attributeStart / this.vertexSize);
				} else {
					this.packAttributes(element, f32, u32, element._attributeStart, element._textureId);
					this.packIndex(element, indexBuffer, element._indexStart, element._attributeStart / this.vertexSize);
				}
				element._batch = batch;
				continue;
			}
			source._batchTick = BATCH_TICK;
			if (textureBatch.count >= maxTextures || breakRequired) {
				this._finishBatch(batch, start, size - start, textureBatch, blendMode, topology, instructionSet, action);
				action = "renderBatch";
				start = size;
				blendMode = adjustedBlendMode;
				topology = element.topology;
				batch = getBatchFromPool();
				textureBatch = batch.textures;
				textureBatch.clear();
				++BATCH_TICK;
			}
			element._textureId = source._textureBindLocation = textureBatch.count;
			textureBatch.ids[source.uid] = textureBatch.count;
			textureBatch.textures[textureBatch.count++] = source;
			element._batch = batch;
			size += element.indexSize;
			if (element.packAsQuad) {
				this.packQuadAttributes(element, f32, u32, element._attributeStart, element._textureId);
				this.packQuadIndex(indexBuffer, element._indexStart, element._attributeStart / this.vertexSize);
			} else {
				this.packAttributes(element, f32, u32, element._attributeStart, element._textureId);
				this.packIndex(element, indexBuffer, element._indexStart, element._attributeStart / this.vertexSize);
			}
		}
		if (textureBatch.count > 0) {
			this._finishBatch(batch, start, size - start, textureBatch, blendMode, topology, instructionSet, action);
			start = size;
			++BATCH_TICK;
		}
		this.elementStart = this.elementSize;
		this._batchIndexStart = start;
		this._batchIndexSize = size;
	}
	_finishBatch(batch, indexStart, indexSize, textureBatch, blendMode, topology, instructionSet, action) {
		batch.gpuBindGroup = null;
		batch.bindGroup = null;
		batch.action = action;
		batch.batcher = this;
		batch.textures = textureBatch;
		batch.blendMode = blendMode;
		batch.topology = topology;
		batch.start = indexStart;
		batch.size = indexSize;
		++BATCH_TICK;
		this.batches[this.batchIndex++] = batch;
		instructionSet.add(batch);
	}
	finish(instructionSet) {
		this.break(instructionSet);
	}
	/**
	* Resizes the attribute buffer to the given size (1 = 1 float32)
	* @param size - the size in vertices to ensure (not bytes!)
	*/
	ensureAttributeBuffer(size) {
		if (size * 4 <= this.attributeBuffer.size) return;
		this._resizeAttributeBuffer(size * 4);
	}
	/**
	* Resizes the index buffer to the given size (1 = 1 float32)
	* @param size - the size in vertices to ensure (not bytes!)
	*/
	ensureIndexBuffer(size) {
		if (size <= this.indexBuffer.length) return;
		this._resizeIndexBuffer(size);
	}
	_resizeAttributeBuffer(size) {
		const newArrayBuffer = new ViewableBuffer(Math.max(size, this.attributeBuffer.size * 2));
		fastCopy(this.attributeBuffer.rawBinaryData, newArrayBuffer.rawBinaryData);
		this.attributeBuffer = newArrayBuffer;
	}
	_resizeIndexBuffer(size) {
		const indexBuffer = this.indexBuffer;
		let newSize = Math.max(size, indexBuffer.length * 1.5);
		newSize += newSize % 2;
		const newIndexBuffer = newSize > 65535 ? new Uint32Array(newSize) : new Uint16Array(newSize);
		if (newIndexBuffer.BYTES_PER_ELEMENT !== indexBuffer.BYTES_PER_ELEMENT) for (let i = 0; i < indexBuffer.length; i++) newIndexBuffer[i] = indexBuffer[i];
		else fastCopy(indexBuffer.buffer, newIndexBuffer.buffer);
		this.indexBuffer = newIndexBuffer;
	}
	packQuadIndex(indexBuffer, index, indicesOffset) {
		indexBuffer[index] = indicesOffset + 0;
		indexBuffer[index + 1] = indicesOffset + 1;
		indexBuffer[index + 2] = indicesOffset + 2;
		indexBuffer[index + 3] = indicesOffset + 0;
		indexBuffer[index + 4] = indicesOffset + 2;
		indexBuffer[index + 5] = indicesOffset + 3;
	}
	packIndex(element, indexBuffer, index, indicesOffset) {
		const indices = element.indices;
		const size = element.indexSize;
		const indexOffset = element.indexOffset;
		const attributeOffset = element.attributeOffset;
		for (let i = 0; i < size; i++) indexBuffer[index++] = indicesOffset + indices[i + indexOffset] - attributeOffset;
	}
	destroy() {
		for (let i = 0; i < this.batches.length; i++) returnBatchToPool(this.batches[i]);
		this.batches = null;
		for (let i = 0; i < this._elements.length; i++) this._elements[i]._batch = null;
		this._elements = null;
		this.indexBuffer = null;
		this.attributeBuffer.destroy();
		this.attributeBuffer = null;
	}
};
_Batcher.defaultOptions = {
	maxTextures: null,
	attributesInitialSize: 4,
	indicesInitialSize: 6
};
var Batcher = _Batcher;
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/shared/buffer/const.mjs
var BufferUsage = /* @__PURE__ */ ((BufferUsage2) => {
	BufferUsage2[BufferUsage2["MAP_READ"] = 1] = "MAP_READ";
	BufferUsage2[BufferUsage2["MAP_WRITE"] = 2] = "MAP_WRITE";
	BufferUsage2[BufferUsage2["COPY_SRC"] = 4] = "COPY_SRC";
	BufferUsage2[BufferUsage2["COPY_DST"] = 8] = "COPY_DST";
	BufferUsage2[BufferUsage2["INDEX"] = 16] = "INDEX";
	BufferUsage2[BufferUsage2["VERTEX"] = 32] = "VERTEX";
	BufferUsage2[BufferUsage2["UNIFORM"] = 64] = "UNIFORM";
	BufferUsage2[BufferUsage2["STORAGE"] = 128] = "STORAGE";
	BufferUsage2[BufferUsage2["INDIRECT"] = 256] = "INDIRECT";
	BufferUsage2[BufferUsage2["QUERY_RESOLVE"] = 512] = "QUERY_RESOLVE";
	BufferUsage2[BufferUsage2["STATIC"] = 1024] = "STATIC";
	return BufferUsage2;
})(BufferUsage || {});
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/shared/buffer/Buffer.mjs
var Buffer = class extends eventemitter3_default {
	/**
	* Creates a new Buffer with the given options
	* @param options - the options for the buffer
	*/
	constructor(options) {
		let { data, size } = options;
		const { usage, label, shrinkToFit } = options;
		super();
		/**
		* emits when the underlying buffer has changed shape (i.e. resized)
		* letting the renderer know that it needs to discard the old buffer on the GPU and create a new one
		* @event change
		*/
		/**
		* emits when the underlying buffer data has been updated. letting the renderer know
		* that it needs to update the buffer on the GPU
		* @event update
		*/
		/**
		* emits when the buffer is destroyed. letting the renderer know that it needs to destroy the buffer on the GPU
		* @event destroy
		*/
		/** a unique id for this uniform group used through the renderer */
		this.uid = uid("buffer");
		/**
		* a resource type, used to identify how to handle it when its in a bind group / shader resource
		* @internal
		* @ignore
		*/
		this._resourceType = "buffer";
		/**
		* the resource id used internally by the renderer to build bind group keys
		* @internal
		* @ignore
		*/
		this._resourceId = uid("resource");
		/**
		* used internally to know if a uniform group was used in the last render pass
		* @internal
		* @ignore
		*/
		this._touched = 0;
		/**
		* @internal
		* @ignore
		*/
		this._updateID = 1;
		this._dataInt32 = null;
		/**
		* should the GPU buffer be shrunk when the data becomes smaller?
		* changing this will cause the buffer to be destroyed and a new one created on the GPU
		* this can be expensive, especially if the buffer is already big enough!
		* setting this to false will prevent the buffer from being shrunk. This will yield better performance
		* if you are constantly setting data that is changing size often.
		* @default true
		*/
		this.shrinkToFit = true;
		/**
		* Has the buffer been destroyed?
		* @readonly
		*/
		this.destroyed = false;
		if (data instanceof Array) data = new Float32Array(data);
		this._data = data;
		size ?? (size = data?.byteLength);
		const mappedAtCreation = !!data;
		this.descriptor = {
			size,
			usage,
			mappedAtCreation,
			label
		};
		this.shrinkToFit = shrinkToFit ?? true;
	}
	/** the data in the buffer */
	get data() {
		return this._data;
	}
	set data(value) {
		this.setDataWithSize(value, value.length, true);
	}
	get dataInt32() {
		if (!this._dataInt32) this._dataInt32 = new Int32Array(this.data.buffer);
		return this._dataInt32;
	}
	/** whether the buffer is static or not */
	get static() {
		return !!(this.descriptor.usage & BufferUsage.STATIC);
	}
	set static(value) {
		if (value) this.descriptor.usage |= BufferUsage.STATIC;
		else this.descriptor.usage &= ~BufferUsage.STATIC;
	}
	/**
	* Sets the data in the buffer to the given value. This will immediately update the buffer on the GPU.
	* If you only want to update a subset of the buffer, you can pass in the size of the data.
	* @param value - the data to set
	* @param size - the size of the data in bytes
	* @param syncGPU - should the buffer be updated on the GPU immediately?
	*/
	setDataWithSize(value, size, syncGPU) {
		this._updateID++;
		this._updateSize = size * value.BYTES_PER_ELEMENT;
		if (this._data === value) {
			if (syncGPU) this.emit("update", this);
			return;
		}
		const oldData = this._data;
		this._data = value;
		this._dataInt32 = null;
		if (!oldData || oldData.length !== value.length) {
			if (!this.shrinkToFit && oldData && value.byteLength < oldData.byteLength) {
				if (syncGPU) this.emit("update", this);
			} else {
				this.descriptor.size = value.byteLength;
				this._resourceId = uid("resource");
				this.emit("change", this);
			}
			return;
		}
		if (syncGPU) this.emit("update", this);
	}
	/**
	* updates the buffer on the GPU to reflect the data in the buffer.
	* By default it will update the entire buffer. If you only want to update a subset of the buffer,
	* you can pass in the size of the buffer to update.
	* @param sizeInBytes - the new size of the buffer in bytes
	*/
	update(sizeInBytes) {
		this._updateSize = sizeInBytes ?? this._updateSize;
		this._updateID++;
		this.emit("update", this);
	}
	/** Destroys the buffer */
	destroy() {
		this.destroyed = true;
		this.emit("destroy", this);
		this.emit("change", this);
		this._data = null;
		this.descriptor = null;
		this.removeAllListeners();
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/shared/geometry/utils/ensureIsBuffer.mjs
function ensureIsBuffer(buffer, index) {
	if (!(buffer instanceof Buffer)) {
		let usage = index ? BufferUsage.INDEX : BufferUsage.VERTEX;
		if (buffer instanceof Array) {
			if (index) {
				buffer = new Uint32Array(buffer);
				usage = BufferUsage.INDEX | BufferUsage.COPY_DST;
			} else {
				buffer = new Float32Array(buffer);
				usage = BufferUsage.VERTEX | BufferUsage.COPY_DST;
			}
		}
		buffer = new Buffer({
			data: buffer,
			label: index ? "index-mesh-buffer" : "vertex-mesh-buffer",
			usage
		});
	}
	return buffer;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/shared/geometry/utils/getGeometryBounds.mjs
function getGeometryBounds(geometry, attributeId, bounds) {
	const attribute = geometry.getAttribute(attributeId);
	if (!attribute) {
		bounds.minX = 0;
		bounds.minY = 0;
		bounds.maxX = 0;
		bounds.maxY = 0;
		return bounds;
	}
	const data = attribute.buffer.data;
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	const byteSize = data.BYTES_PER_ELEMENT;
	const offset = (attribute.offset || 0) / byteSize;
	const stride = (attribute.stride || 8) / byteSize;
	for (let i = offset; i < data.length; i += stride) {
		const x = data[i];
		const y = data[i + 1];
		if (x > maxX) maxX = x;
		if (y > maxY) maxY = y;
		if (x < minX) minX = x;
		if (y < minY) minY = y;
	}
	bounds.minX = minX;
	bounds.minY = minY;
	bounds.maxX = maxX;
	bounds.maxY = maxY;
	return bounds;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/shared/geometry/Geometry.mjs
function ensureIsAttribute(attribute) {
	if (attribute instanceof Buffer || Array.isArray(attribute) || attribute.BYTES_PER_ELEMENT) attribute = { buffer: attribute };
	attribute.buffer = ensureIsBuffer(attribute.buffer, false);
	return attribute;
}
var Geometry = class extends eventemitter3_default {
	/**
	* Create a new instance of a geometry
	* @param options - The options for the geometry.
	*/
	constructor(options = {}) {
		super();
		/** The unique id of the geometry. */
		this.uid = uid("geometry");
		/**
		* the layout key will be generated by WebGPU all geometries that have the same structure
		* will have the same layout key. This is used to cache the pipeline layout
		* @internal
		* @ignore
		*/
		this._layoutKey = 0;
		/** the instance count of the geometry to draw */
		this.instanceCount = 1;
		this._bounds = new Bounds();
		this._boundsDirty = true;
		const { attributes, indexBuffer, topology } = options;
		this.buffers = [];
		this.attributes = {};
		if (attributes) for (const i in attributes) this.addAttribute(i, attributes[i]);
		this.instanceCount = options.instanceCount ?? 1;
		if (indexBuffer) this.addIndex(indexBuffer);
		this.topology = topology || "triangle-list";
	}
	onBufferUpdate() {
		this._boundsDirty = true;
		this.emit("update", this);
	}
	/**
	* Returns the requested attribute.
	* @param id - The name of the attribute required
	* @returns - The attribute requested.
	*/
	getAttribute(id) {
		return this.attributes[id];
	}
	/**
	* Returns the index buffer
	* @returns - The index buffer.
	*/
	getIndex() {
		return this.indexBuffer;
	}
	/**
	* Returns the requested buffer.
	* @param id - The name of the buffer required.
	* @returns - The buffer requested.
	*/
	getBuffer(id) {
		return this.getAttribute(id).buffer;
	}
	/**
	* Used to figure out how many vertices there are in this geometry
	* @returns the number of vertices in the geometry
	*/
	getSize() {
		for (const i in this.attributes) {
			const attribute = this.attributes[i];
			return attribute.buffer.data.length / (attribute.stride / 4 || attribute.size);
		}
		return 0;
	}
	/**
	* Adds an attribute to the geometry.
	* @param name - The name of the attribute to add.
	* @param attributeOption - The attribute option to add.
	*/
	addAttribute(name, attributeOption) {
		const attribute = ensureIsAttribute(attributeOption);
		if (this.buffers.indexOf(attribute.buffer) === -1) {
			this.buffers.push(attribute.buffer);
			attribute.buffer.on("update", this.onBufferUpdate, this);
			attribute.buffer.on("change", this.onBufferUpdate, this);
		}
		this.attributes[name] = attribute;
	}
	/**
	* Adds an index buffer to the geometry.
	* @param indexBuffer - The index buffer to add. Can be a Buffer, TypedArray, or an array of numbers.
	*/
	addIndex(indexBuffer) {
		this.indexBuffer = ensureIsBuffer(indexBuffer, true);
		this.buffers.push(this.indexBuffer);
	}
	/** Returns the bounds of the geometry. */
	get bounds() {
		if (!this._boundsDirty) return this._bounds;
		this._boundsDirty = false;
		return getGeometryBounds(this, "aPosition", this._bounds);
	}
	/**
	* destroys the geometry.
	* @param destroyBuffers - destroy the buffers associated with this geometry
	*/
	destroy(destroyBuffers = false) {
		this.emit("destroy", this);
		this.removeAllListeners();
		if (destroyBuffers) this.buffers.forEach((buffer) => buffer.destroy());
		this.attributes = null;
		this.buffers = null;
		this.indexBuffer = null;
		this._bounds = null;
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/batcher/shared/BatchGeometry.mjs
var placeHolderBufferData = /* @__PURE__ */ new Float32Array(1);
var placeHolderIndexData = /* @__PURE__ */ new Uint32Array(1);
var BatchGeometry = class extends Geometry {
	constructor() {
		const attributeBuffer = new Buffer({
			data: placeHolderBufferData,
			label: "attribute-batch-buffer",
			usage: BufferUsage.VERTEX | BufferUsage.COPY_DST,
			shrinkToFit: false
		});
		const indexBuffer = new Buffer({
			data: placeHolderIndexData,
			label: "index-batch-buffer",
			usage: BufferUsage.INDEX | BufferUsage.COPY_DST,
			shrinkToFit: false
		});
		const stride = 24;
		super({
			attributes: {
				aPosition: {
					buffer: attributeBuffer,
					format: "float32x2",
					stride,
					offset: 0
				},
				aUV: {
					buffer: attributeBuffer,
					format: "float32x2",
					stride,
					offset: 8
				},
				aColor: {
					buffer: attributeBuffer,
					format: "unorm8x4",
					stride,
					offset: 16
				},
				aTextureIdAndRound: {
					buffer: attributeBuffer,
					format: "uint16x2",
					stride,
					offset: 20
				}
			},
			indexBuffer
		});
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/high-shader/compiler/utils/addBits.mjs
function addBits(srcParts, parts, name) {
	if (srcParts) for (const i in srcParts) {
		const part = parts[i.toLocaleLowerCase()];
		if (part) {
			let sanitisedPart = srcParts[i];
			if (i === "header") sanitisedPart = sanitisedPart.replace(/@in\s+[^;]+;\s*/g, "").replace(/@out\s+[^;]+;\s*/g, "");
			if (name) part.push(`//----${name}----//`);
			part.push(sanitisedPart);
		} else warn(`${i} placement hook does not exist in shader`);
	}
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/high-shader/compiler/utils/compileHooks.mjs
var findHooksRx = /\{\{(.*?)\}\}/g;
function compileHooks(programSrc) {
	const parts = {};
	(programSrc.match(findHooksRx)?.map((hook) => hook.replace(/[{()}]/g, "")) ?? []).forEach((hook) => {
		parts[hook] = [];
	});
	return parts;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/high-shader/compiler/utils/compileInputs.mjs
function extractInputs(fragmentSource, out) {
	let match;
	const regex = /@in\s+([^;]+);/g;
	while ((match = regex.exec(fragmentSource)) !== null) out.push(match[1]);
}
function compileInputs(fragments, template, sort = false) {
	const results = [];
	extractInputs(template, results);
	fragments.forEach((fragment) => {
		if (fragment.header) extractInputs(fragment.header, results);
	});
	const mainInput = results;
	if (sort) mainInput.sort();
	const finalString = mainInput.map((inValue, i) => `       @location(${i}) ${inValue},`).join("\n");
	let cleanedString = template.replace(/@in\s+[^;]+;\s*/g, "");
	cleanedString = cleanedString.replace("{{in}}", `
${finalString}
`);
	return cleanedString;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/high-shader/compiler/utils/compileOutputs.mjs
function extractOutputs(fragmentSource, out) {
	let match;
	const regex = /@out\s+([^;]+);/g;
	while ((match = regex.exec(fragmentSource)) !== null) out.push(match[1]);
}
function extractVariableName(value) {
	const match = /\b(\w+)\s*:/g.exec(value);
	return match ? match[1] : "";
}
function stripVariable(value) {
	return value.replace(/@.*?\s+/g, "");
}
function compileOutputs(fragments, template) {
	const results = [];
	extractOutputs(template, results);
	fragments.forEach((fragment) => {
		if (fragment.header) extractOutputs(fragment.header, results);
	});
	let index = 0;
	const mainStruct = results.sort().map((inValue) => {
		if (inValue.indexOf("builtin") > -1) return inValue;
		return `@location(${index++}) ${inValue}`;
	}).join(",\n");
	const mainStart = results.sort().map((inValue) => `       var ${stripVariable(inValue)};`).join("\n");
	const mainEnd = `return VSOutput(
            ${results.sort().map((inValue) => ` ${extractVariableName(inValue)}`).join(",\n")});`;
	let compiledCode = template.replace(/@out\s+[^;]+;\s*/g, "");
	compiledCode = compiledCode.replace("{{struct}}", `
${mainStruct}
`);
	compiledCode = compiledCode.replace("{{start}}", `
${mainStart}
`);
	compiledCode = compiledCode.replace("{{return}}", `
${mainEnd}
`);
	return compiledCode;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/high-shader/compiler/utils/injectBits.mjs
function injectBits(templateSrc, fragmentParts) {
	let out = templateSrc;
	for (const i in fragmentParts) {
		const parts = fragmentParts[i];
		if (parts.join("\n").length) out = out.replace(`{{${i}}}`, `//-----${i} START-----//
${parts.join("\n")}
//----${i} FINISH----//`);
		else out = out.replace(`{{${i}}}`, "");
	}
	return out;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/high-shader/compiler/compileHighShader.mjs
var cacheMap = /* @__PURE__ */ Object.create(null);
var bitCacheMap = /* @__PURE__ */ new Map();
var CACHE_UID = 0;
function compileHighShader({ template, bits }) {
	const cacheId = generateCacheId(template, bits);
	if (cacheMap[cacheId]) return cacheMap[cacheId];
	const { vertex, fragment } = compileInputsAndOutputs(template, bits);
	cacheMap[cacheId] = compileBits(vertex, fragment, bits);
	return cacheMap[cacheId];
}
function compileHighShaderGl({ template, bits }) {
	const cacheId = generateCacheId(template, bits);
	if (cacheMap[cacheId]) return cacheMap[cacheId];
	cacheMap[cacheId] = compileBits(template.vertex, template.fragment, bits);
	return cacheMap[cacheId];
}
function compileInputsAndOutputs(template, bits) {
	const vertexFragments = bits.map((shaderBit) => shaderBit.vertex).filter((v) => !!v);
	const fragmentFragments = bits.map((shaderBit) => shaderBit.fragment).filter((v) => !!v);
	let compiledVertex = compileInputs(vertexFragments, template.vertex, true);
	compiledVertex = compileOutputs(vertexFragments, compiledVertex);
	const compiledFragment = compileInputs(fragmentFragments, template.fragment, true);
	return {
		vertex: compiledVertex,
		fragment: compiledFragment
	};
}
function generateCacheId(template, bits) {
	return bits.map((highFragment) => {
		if (!bitCacheMap.has(highFragment)) bitCacheMap.set(highFragment, CACHE_UID++);
		return bitCacheMap.get(highFragment);
	}).sort((a, b) => a - b).join("-") + template.vertex + template.fragment;
}
function compileBits(vertex, fragment, bits) {
	const vertexParts = compileHooks(vertex);
	const fragmentParts = compileHooks(fragment);
	bits.forEach((shaderBit) => {
		addBits(shaderBit.vertex, vertexParts, shaderBit.name);
		addBits(shaderBit.fragment, fragmentParts, shaderBit.name);
	});
	return {
		vertex: injectBits(vertex, vertexParts),
		fragment: injectBits(fragment, fragmentParts)
	};
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/high-shader/defaultProgramTemplate.mjs
var vertexGPUTemplate = `
    @in aPosition: vec2<f32>;
    @in aUV: vec2<f32>;

    @out @builtin(position) vPosition: vec4<f32>;
    @out vUV : vec2<f32>;
    @out vColor : vec4<f32>;

    {{header}}

    struct VSOutput {
        {{struct}}
    };

    @vertex
    fn main( {{in}} ) -> VSOutput {

        var worldTransformMatrix = globalUniforms.uWorldTransformMatrix;
        var modelMatrix = mat3x3<f32>(
            1.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 1.0
          );
        var position = aPosition;
        var uv = aUV;

        {{start}}
        
        vColor = vec4<f32>(1., 1., 1., 1.);

        {{main}}

        vUV = uv;

        var modelViewProjectionMatrix = globalUniforms.uProjectionMatrix * worldTransformMatrix * modelMatrix;

        vPosition =  vec4<f32>((modelViewProjectionMatrix *  vec3<f32>(position, 1.0)).xy, 0.0, 1.0);
       
        vColor *= globalUniforms.uWorldColorAlpha;

        {{end}}

        {{return}}
    };
`;
var fragmentGPUTemplate = `
    @in vUV : vec2<f32>;
    @in vColor : vec4<f32>;
   
    {{header}}

    @fragment
    fn main(
        {{in}}
      ) -> @location(0) vec4<f32> {
        
        {{start}}

        var outColor:vec4<f32>;
      
        {{main}}
        
        var finalColor:vec4<f32> = outColor * vColor;

        {{end}}

        return finalColor;
      };
`;
var vertexGlTemplate = `
    in vec2 aPosition;
    in vec2 aUV;

    out vec4 vColor;
    out vec2 vUV;

    {{header}}

    void main(void){

        mat3 worldTransformMatrix = uWorldTransformMatrix;
        mat3 modelMatrix = mat3(
            1.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 1.0
          );
        vec2 position = aPosition;
        vec2 uv = aUV;
        
        {{start}}
        
        vColor = vec4(1.);
        
        {{main}}
        
        vUV = uv;
        
        mat3 modelViewProjectionMatrix = uProjectionMatrix * worldTransformMatrix * modelMatrix;

        gl_Position = vec4((modelViewProjectionMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);

        vColor *= uWorldColorAlpha;

        {{end}}
    }
`;
var fragmentGlTemplate = `
   
    in vec4 vColor;
    in vec2 vUV;

    out vec4 finalColor;

    {{header}}

    void main(void) {
        
        {{start}}

        vec4 outColor;
      
        {{main}}
        
        finalColor = outColor * vColor;
        
        {{end}}
    }
`;
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/high-shader/shader-bits/globalUniformsBit.mjs
var globalUniformsBit = {
	name: "global-uniforms-bit",
	vertex: { header: `
        struct GlobalUniforms {
            uProjectionMatrix:mat3x3<f32>,
            uWorldTransformMatrix:mat3x3<f32>,
            uWorldColorAlpha: vec4<f32>,
            uResolution: vec2<f32>,
        }

        @group(0) @binding(0) var<uniform> globalUniforms : GlobalUniforms;
        ` }
};
var globalUniformsUBOBitGl = {
	name: "global-uniforms-ubo-bit",
	vertex: { header: `
          uniform globalUniforms {
            mat3 uProjectionMatrix;
            mat3 uWorldTransformMatrix;
            vec4 uWorldColorAlpha;
            vec2 uResolution;
          };
        ` }
};
var globalUniformsBitGl = {
	name: "global-uniforms-bit",
	vertex: { header: `
          uniform mat3 uProjectionMatrix;
          uniform mat3 uWorldTransformMatrix;
          uniform vec4 uWorldColorAlpha;
          uniform vec2 uResolution;
        ` }
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/high-shader/compileHighShaderToProgram.mjs
function compileHighShaderGpuProgram({ bits, name }) {
	const source = compileHighShader({
		template: {
			fragment: fragmentGPUTemplate,
			vertex: vertexGPUTemplate
		},
		bits: [globalUniformsBit, ...bits]
	});
	return GpuProgram.from({
		name,
		vertex: {
			source: source.vertex,
			entryPoint: "main"
		},
		fragment: {
			source: source.fragment,
			entryPoint: "main"
		}
	});
}
function compileHighShaderGlProgram({ bits, name }) {
	return new GlProgram({
		name,
		...compileHighShaderGl({
			template: {
				vertex: vertexGlTemplate,
				fragment: fragmentGlTemplate
			},
			bits: [globalUniformsBitGl, ...bits]
		})
	});
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/high-shader/shader-bits/colorBit.mjs
var colorBit = {
	name: "color-bit",
	vertex: {
		header: `
            @in aColor: vec4<f32>;
        `,
		main: `
            vColor *= vec4<f32>(aColor.rgb * aColor.a, aColor.a);
        `
	}
};
var colorBitGl = {
	name: "color-bit",
	vertex: {
		header: `
            in vec4 aColor;
        `,
		main: `
            vColor *= vec4(aColor.rgb * aColor.a, aColor.a);
        `
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/high-shader/shader-bits/generateTextureBatchBit.mjs
var textureBatchBitGpuCache = {};
function generateBindingSrc(maxTextures) {
	const src = [];
	if (maxTextures === 1) {
		src.push("@group(1) @binding(0) var textureSource1: texture_2d<f32>;");
		src.push("@group(1) @binding(1) var textureSampler1: sampler;");
	} else {
		let bindingIndex = 0;
		for (let i = 0; i < maxTextures; i++) {
			src.push(`@group(1) @binding(${bindingIndex++}) var textureSource${i + 1}: texture_2d<f32>;`);
			src.push(`@group(1) @binding(${bindingIndex++}) var textureSampler${i + 1}: sampler;`);
		}
	}
	return src.join("\n");
}
function generateSampleSrc(maxTextures) {
	const src = [];
	if (maxTextures === 1) src.push("outColor = textureSampleGrad(textureSource1, textureSampler1, vUV, uvDx, uvDy);");
	else {
		src.push("switch vTextureId {");
		for (let i = 0; i < maxTextures; i++) {
			if (i === maxTextures - 1) src.push(`  default:{`);
			else src.push(`  case ${i}:{`);
			src.push(`      outColor = textureSampleGrad(textureSource${i + 1}, textureSampler${i + 1}, vUV, uvDx, uvDy);`);
			src.push(`      break;}`);
		}
		src.push(`}`);
	}
	return src.join("\n");
}
function generateTextureBatchBit(maxTextures) {
	if (!textureBatchBitGpuCache[maxTextures]) textureBatchBitGpuCache[maxTextures] = {
		name: "texture-batch-bit",
		vertex: {
			header: `
                @in aTextureIdAndRound: vec2<u32>;
                @out @interpolate(flat) vTextureId : u32;
            `,
			main: `
                vTextureId = aTextureIdAndRound.y;
            `,
			end: `
                if(aTextureIdAndRound.x == 1)
                {
                    vPosition = vec4<f32>(roundPixels(vPosition.xy, globalUniforms.uResolution), vPosition.zw);
                }
            `
		},
		fragment: {
			header: `
                @in @interpolate(flat) vTextureId: u32;

                ${generateBindingSrc(maxTextures)}
            `,
			main: `
                var uvDx = dpdx(vUV);
                var uvDy = dpdy(vUV);

                ${generateSampleSrc(maxTextures)}
            `
		}
	};
	return textureBatchBitGpuCache[maxTextures];
}
var textureBatchBitGlCache = {};
function generateSampleGlSrc(maxTextures) {
	const src = [];
	for (let i = 0; i < maxTextures; i++) {
		if (i > 0) src.push("else");
		if (i < maxTextures - 1) src.push(`if(vTextureId < ${i}.5)`);
		src.push("{");
		src.push(`	outColor = texture(uTextures[${i}], vUV);`);
		src.push("}");
	}
	return src.join("\n");
}
function generateTextureBatchBitGl(maxTextures) {
	if (!textureBatchBitGlCache[maxTextures]) textureBatchBitGlCache[maxTextures] = {
		name: "texture-batch-bit",
		vertex: {
			header: `
                in vec2 aTextureIdAndRound;
                out float vTextureId;

            `,
			main: `
                vTextureId = aTextureIdAndRound.y;
            `,
			end: `
                if(aTextureIdAndRound.x == 1.)
                {
                    gl_Position.xy = roundPixels(gl_Position.xy, uResolution);
                }
            `
		},
		fragment: {
			header: `
                in float vTextureId;

                uniform sampler2D uTextures[${maxTextures}];

            `,
			main: `

                ${generateSampleGlSrc(maxTextures)}
            `
		}
	};
	return textureBatchBitGlCache[maxTextures];
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/high-shader/shader-bits/roundPixelsBit.mjs
var roundPixelsBit = {
	name: "round-pixels-bit",
	vertex: { header: `
            fn roundPixels(position: vec2<f32>, targetSize: vec2<f32>) -> vec2<f32> 
            {
                return (floor(((position * 0.5 + 0.5) * targetSize) + 0.5) / targetSize) * 2.0 - 1.0;
            }
        ` }
};
var roundPixelsBitGl = {
	name: "round-pixels-bit",
	vertex: { header: `   
            vec2 roundPixels(vec2 position, vec2 targetSize)
            {       
                return (floor(((position * 0.5 + 0.5) * targetSize) + 0.5) / targetSize) * 2.0 - 1.0;
            }
        ` }
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/renderers/gl/shader/getBatchSamplersUniformGroup.mjs
var batchSamplersUniformGroupHash = {};
function getBatchSamplersUniformGroup(maxTextures) {
	let batchSamplersUniformGroup = batchSamplersUniformGroupHash[maxTextures];
	if (batchSamplersUniformGroup) return batchSamplersUniformGroup;
	const sampleValues = new Int32Array(maxTextures);
	for (let i = 0; i < maxTextures; i++) sampleValues[i] = i;
	batchSamplersUniformGroup = batchSamplersUniformGroupHash[maxTextures] = new UniformGroup({ uTextures: {
		value: sampleValues,
		type: `i32`,
		size: maxTextures
	} }, { isStatic: true });
	return batchSamplersUniformGroup;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/batcher/shared/DefaultShader.mjs
var DefaultShader = class extends Shader {
	constructor(maxTextures) {
		const glProgram = compileHighShaderGlProgram({
			name: "batch",
			bits: [
				colorBitGl,
				generateTextureBatchBitGl(maxTextures),
				roundPixelsBitGl
			]
		});
		const gpuProgram = compileHighShaderGpuProgram({
			name: "batch",
			bits: [
				colorBit,
				generateTextureBatchBit(maxTextures),
				roundPixelsBit
			]
		});
		super({
			glProgram,
			gpuProgram,
			resources: { batchSamplers: getBatchSamplersUniformGroup(maxTextures) }
		});
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/batcher/shared/DefaultBatcher.mjs
var defaultShader = null;
var _DefaultBatcher = class _DefaultBatcher extends Batcher {
	constructor() {
		super(...arguments);
		this.geometry = new BatchGeometry();
		this.shader = defaultShader || (defaultShader = new DefaultShader(this.maxTextures));
		this.name = _DefaultBatcher.extension.name;
		/** The size of one attribute. 1 = 32 bit. x, y, u, v, color, textureIdAndRound -> total = 6 */
		this.vertexSize = 6;
	}
	/**
	* Packs the attributes of a DefaultBatchableMeshElement into the provided views.
	* @param element - The DefaultBatchableMeshElement to pack.
	* @param float32View - The Float32Array view to pack into.
	* @param uint32View - The Uint32Array view to pack into.
	* @param index - The starting index in the views.
	* @param textureId - The texture ID to use.
	*/
	packAttributes(element, float32View, uint32View, index, textureId) {
		const textureIdAndRound = textureId << 16 | element.roundPixels & 65535;
		const wt = element.transform;
		const a = wt.a;
		const b = wt.b;
		const c = wt.c;
		const d = wt.d;
		const tx = wt.tx;
		const ty = wt.ty;
		const { positions, uvs } = element;
		const argb = element.color;
		const offset = element.attributeOffset;
		const end = offset + element.attributeSize;
		for (let i = offset; i < end; i++) {
			const i2 = i * 2;
			const x = positions[i2];
			const y = positions[i2 + 1];
			float32View[index++] = a * x + c * y + tx;
			float32View[index++] = d * y + b * x + ty;
			float32View[index++] = uvs[i2];
			float32View[index++] = uvs[i2 + 1];
			uint32View[index++] = argb;
			uint32View[index++] = textureIdAndRound;
		}
	}
	/**
	* Packs the attributes of a DefaultBatchableQuadElement into the provided views.
	* @param element - The DefaultBatchableQuadElement to pack.
	* @param float32View - The Float32Array view to pack into.
	* @param uint32View - The Uint32Array view to pack into.
	* @param index - The starting index in the views.
	* @param textureId - The texture ID to use.
	*/
	packQuadAttributes(element, float32View, uint32View, index, textureId) {
		const texture = element.texture;
		const wt = element.transform;
		const a = wt.a;
		const b = wt.b;
		const c = wt.c;
		const d = wt.d;
		const tx = wt.tx;
		const ty = wt.ty;
		const bounds = element.bounds;
		const w0 = bounds.maxX;
		const w1 = bounds.minX;
		const h0 = bounds.maxY;
		const h1 = bounds.minY;
		const uvs = texture.uvs;
		const argb = element.color;
		const textureIdAndRound = textureId << 16 | element.roundPixels & 65535;
		float32View[index + 0] = a * w1 + c * h1 + tx;
		float32View[index + 1] = d * h1 + b * w1 + ty;
		float32View[index + 2] = uvs.x0;
		float32View[index + 3] = uvs.y0;
		uint32View[index + 4] = argb;
		uint32View[index + 5] = textureIdAndRound;
		float32View[index + 6] = a * w0 + c * h1 + tx;
		float32View[index + 7] = d * h1 + b * w0 + ty;
		float32View[index + 8] = uvs.x1;
		float32View[index + 9] = uvs.y1;
		uint32View[index + 10] = argb;
		uint32View[index + 11] = textureIdAndRound;
		float32View[index + 12] = a * w0 + c * h0 + tx;
		float32View[index + 13] = d * h0 + b * w0 + ty;
		float32View[index + 14] = uvs.x2;
		float32View[index + 15] = uvs.y2;
		uint32View[index + 16] = argb;
		uint32View[index + 17] = textureIdAndRound;
		float32View[index + 18] = a * w1 + c * h0 + tx;
		float32View[index + 19] = d * h0 + b * w1 + ty;
		float32View[index + 20] = uvs.x3;
		float32View[index + 21] = uvs.y3;
		uint32View[index + 22] = argb;
		uint32View[index + 23] = textureIdAndRound;
	}
};
/** @ignore */
_DefaultBatcher.extension = {
	type: [ExtensionType.Batcher],
	name: "default"
};
var DefaultBatcher = _DefaultBatcher;
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/rendering/high-shader/shader-bits/localUniformBit.mjs
var localUniformBit = {
	name: "local-uniform-bit",
	vertex: {
		header: `

            struct LocalUniforms {
                uTransformMatrix:mat3x3<f32>,
                uColor:vec4<f32>,
                uRound:f32,
            }

            @group(1) @binding(0) var<uniform> localUniforms : LocalUniforms;
        `,
		main: `
            vColor *= localUniforms.uColor;
            modelMatrix *= localUniforms.uTransformMatrix;
        `,
		end: `
            if(localUniforms.uRound == 1)
            {
                vPosition = vec4(roundPixels(vPosition.xy, globalUniforms.uResolution), vPosition.zw);
            }
        `
	}
};
var localUniformBitGroup2 = {
	...localUniformBit,
	vertex: {
		...localUniformBit.vertex,
		header: localUniformBit.vertex.header.replace("group(1)", "group(2)")
	}
};
var localUniformBitGl = {
	name: "local-uniform-bit",
	vertex: {
		header: `

            uniform mat3 uTransformMatrix;
            uniform vec4 uColor;
            uniform float uRound;
        `,
		main: `
            vColor *= uColor;
            modelMatrix = uTransformMatrix;
        `,
		end: `
            if(uRound == 1.)
            {
                gl_Position.xy = roundPixels(gl_Position.xy, uResolution);
            }
        `
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/scene/sprite/BatchableSprite.mjs
var BatchableSprite = class {
	constructor() {
		this.batcherName = "default";
		this.topology = "triangle-list";
		this.attributeSize = 4;
		this.indexSize = 6;
		this.packAsQuad = true;
		this.roundPixels = 0;
		this._attributeStart = 0;
		this._batcher = null;
		this._batch = null;
	}
	get blendMode() {
		return this.renderable.groupBlendMode;
	}
	get color() {
		return this.renderable.groupColorAlpha;
	}
	reset() {
		this.renderable = null;
		this.texture = null;
		this._batcher = null;
		this._batch = null;
		this.bounds = null;
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.8.1/node_modules/pixi.js/lib/scene/graphics/gpu/colorToUniform.mjs
function colorToUniform(rgb, alpha, out, offset) {
	out[offset++] = (rgb >> 16 & 255) / 255;
	out[offset++] = (rgb >> 8 & 255) / 255;
	out[offset++] = (rgb & 255) / 255;
	out[offset++] = alpha;
}
function color32BitToUniform(abgr, out, offset) {
	const alpha = (abgr >> 24 & 255) / 255;
	out[offset++] = (abgr & 255) / 255 * alpha;
	out[offset++] = (abgr >> 8 & 255) / 255 * alpha;
	out[offset++] = (abgr >> 16 & 255) / 255 * alpha;
	out[offset++] = alpha;
}
//#endregion
export { UniformGroup as $, getFastGlobalBoundsMixin as $t, compileHooks as A, v8_3_4 as An, UPDATE_COLOR as At, Batcher as B, eventemitter3_default as Bn, onRenderMixin as Bt, vertexGPUTemplate as C, definedProps as Cn, CanvasSource as Ct, injectBits as D, NOOP as Dn, ViewContainer as Dt, compileHighShaderGl as E, nextPow2 as En, Sprite as Et, getGeometryBounds as F, Matrix as Fn, TexturePool as Ft, fastCopy as G, warn as Gt, getAdjustedBlendModeBlend as H, ExtensionType as Hn, checkChildrenDidChange as Ht, ensureIsBuffer as I, Point as In, TexturePoolClass as It, checkMaxIfStatementsInShader as J, multiplyColors as Jt, ViewableBuffer as K, bgr2rgb as Kt, Buffer as L, DEG_TO_RAD as Ln, InstructionSet as Lt, addBits as M, uid as Mn, UPDATE_VISIBLE as Mt, BatchGeometry as N, Rectangle as Nn, assignWithIgnore as Nt, compileOutputs as O, deprecation as On, Container as Ot, Geometry as P, groupD8 as Pn, RenderGroup as Pt, BindGroup as Q, updateTransformBackwards as Qt, BufferUsage as R, PI_2 as Rn, toLocalGlobalMixin as Rt, fragmentGlTemplate as S, TextureStyle as Sn, UPDATE_PRIORITY as St, compileHighShader as T, log2 as Tn, BrowserAdapter as Tt, BLEND_TO_NPM as U, extensions as Un, getLocalBounds as Ut, BatchTextureArray as V, ObservablePoint as Vn, measureMixin as Vt, STENCIL_MODES as W, normalizeExtensionPriority as Wn, getParent as Wt, Shader as X, _getGlobalBounds as Xt, State as Y, multiplyHexColors as Yt, RendererType as Z, getGlobalBounds as Zt, compileHighShaderGpuProgram as _, updateQuadBounds as _n, getMaxFragmentPrecision as _t, localUniformBitGl as a, MaskEffectManagerClass as an, generateLayoutHash as at, globalUniformsUBOBitGl as b, BufferImageSource as bn, Ticker as bt, DefaultShader as c, childrenHelperMixin as cn, extractStructAndGroups as ct, roundPixelsBitGl as d, BigPool as dn, GlProgram as dt, boundsPool as en, getDefaultUniformValue as et, generateTextureBatchBit as f, PoolGroupClass as fn, stripVersion as ft, compileHighShaderGlProgram as g, Bounds as gn, addProgramDefines as gt, colorBitGl as h, Color as hn, ensurePrecision as ht, localUniformBit as i, MaskEffectManager as in, removeStructAndGroupDuplicates as it, findHooksRx as j, resetUids as jn, UPDATE_TRANSFORM as jt, compileInputs as k, v8_0_0 as kn, UPDATE_BLEND as kt, getBatchSamplersUniformGroup as l, removeItems as ln, extractAttributesFromGpuProgram as lt, colorBit as m, cullingMixin as mn, insertVersion as mt, colorToUniform as n, findMixin as nn, UNIFORM_TYPES_VALUES as nt, localUniformBitGroup2 as o, FilterEffect as on, generateGpuLayoutGroups as ot, generateTextureBatchBitGl as p, Pool as pn, setProgramName as pt, getMaxTexturesPerBatch as q, getGlobalMixin as qt, BatchableSprite as r, effectsMixin as rn, GpuProgram as rt, DefaultBatcher as s, collectRenderablesMixin as sn, ShaderStage as st, color32BitToUniform as t, matrixPool as tn, UNIFORM_TYPES_MAP as tt, roundPixelsBit as u, cacheAsTextureMixin as un, getAttributeInfoFromFormat as ut, globalUniformsBit as v, Texture as vn, getTestContext as vt, vertexGlTemplate as w, isPow2 as wn, DOMAdapter as wt, fragmentGPUTemplate as x, TextureSource as xn, TickerListener as xt, globalUniformsBitGl as y, TextureMatrix as yn, createIdFromString as yt, Batch as z, RAD_TO_DEG as zn, sortMixin as zt };
