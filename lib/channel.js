/**
 * Module dependencies.
 */

var Emitter = require('./eventemitter2').EventEmitter2;
var debug = require('debug')('bid.io-client:channel');
var parser = require('./parser');
var url = require('./url');
var encode = parser.encode;
var decode = parser.decode;
var packets = parser.packets;
var slice = [].slice;
var actions;
var isArray = Array.isArray ? Array.isArray : function _isArray(obj) {
  return Object.prototype.toString.call(obj) === "[object Array]";
};

/**
 * Constants declarations.
 */

// Event delimiter
var DELIMITER = '::';

// Event wildcard
var WILDCARD = '*';

// Events black list
var EVENTS = [
  'message',
  'close',
  'connect',
  'connecting',
  'connect_failed',
  'reconnect',
  'reconnecting',
  'reconnect_failed',
  'disconnect'
];

// Actions white list
var ACTIONS = [
  'fetch',
  'query',
  'lock',
  'unlock',
  'pending',
  'complete',
  'error',
  'update'
];

// Actions regular expression
var ACTIONS_RE = new RegExp('^(' + ACTIONS.join('|') + ')$');

/**
 * Module exports.
 */

module.exports = Channel;

/**
 * Channel constructor.
 *
 * @param {String} name channel name
 * @param {Manager} manager manager instance
 * @param {Function} fn callback
 * @api private
 */

function Channel (name, manager) {

  Emitter.call(this, {
    delimiter: DELIMITER,
    wildcard: true
  });

  this.io = manager.io;
  this.opts = manager.opts;
  this.url = manager.url;
  this.ns = manager.ns || 'stream';
  this.name = name;
  this.watches = {};
  this.evts = {};
  this.connect();
}

/**
 * Inherits from `EventEmitter`.
 */

Channel.prototype.__proto__ = Emitter.prototype;

/**
 * Get a `socket` instance and connect to it.
 *
 * @return {Channel} self
 * @api public
 */

Channel.prototype.connect = function () {
  var channel = this;
  var url = this.buildUrl(this.name);
  var l = EVENTS.length;

  this.socket = this.io.connect(url, this.opts);

  for (var i = 0; i < l; i++) {
    this.bind(EVENTS[i]);
  }

  this.socket.on(this.ns, function (packet) {
    channel.onstream.call(channel, packet);
  });

  return this;
};

/**
 * Called up on incoming stream message.
 *
 * @param {Object} packet
 * @return {Channel} self
 * @api private
 */

Channel.prototype.onstream = function (packet) {
  var raw = decode(packet);
  var id = raw.id;
  var action = raw.type;
  var data = raw.data;
  var event = this.ns + DELIMITER + (id || WILDCARD) + DELIMITER + action;
  this.emit(event, data, action);
  return this;
};

/**
 * Bind socket events to channel.
 *
 * @param {String} ev event name
 * @return {Channel} self
 * @api public
 */

Channel.prototype.bind = function (ev) {
  var self = this;
  this.evts[ev] = function () {
    var args = slice.call(arguments);
    self.emit.apply(self, [ev].concat(args));
  };
  self.socket.on(ev, this.evts[ev]);
  return this;
};

/**
 * Bind socket events to channel.
 *
 * @param {String} ev event name
 * @return {Channel} self
 * @api public
 */

Channel.prototype.unbind = function (ev) {
  this.socket.removeListener(ev, this.evts[ev]);
  return this;
};

/**
 * Disconnect from `channel`.
 *
 * @return {Channel} self
 * @api public
 */

Channel.prototype.disconnect = function () {
  var l = EVENTS.length;
  for (var i = 0; i < l; i++) {
    this.unbind(EVENTS[i]);
    this.socket.disconnect();
  }
  return this;
};

/**
 * Watch a `bid` or all `bids` in a `channel`.
 *
 * @param {String|Number} id the bid id or actions to watch
 * @param {String} actions the the actions to watch
 * @param {Function} fn callback
 * @return {Channel} self
 * @api public
 */

Channel.prototype.watch = function (id, action, fn) {
  return this._watch(id, action, 'on', fn);
};

/**
 * Stop watching a `bid` or all `bids` from a `channel`.
 *
 * @param {String|Number} id the bid id to unwatch
 * @param {String|Array} action the action(s) to unwatch
 * @param {Function} fn the callback function
 * @return {Channel} self
 * @api public
 */

Channel.prototype.unwatch = function (id, action, fn) {
  return this._watch(id, action, 'off', fn);
};

/**
 * This is the actuall watch unwatch event.
 * 
 * @param {String|Number} id the bid id to unwatch
 * @param {String|Array} action the action(s) to watch or unwatch
 * @param {String} type the method type to execute, could be `off` or `on`
 * @param {Function} fn the callback function
 * @return {Channel} self
 * @api public
 */

Channel.prototype._watch = function (id, action, type, fn) {

  var event;
  var actions;

  if ('function' === typeof id) {
    fn = id; action = WILDCARD; id = WILDCARD;
  } else if (isArray(id) || ACTIONS_RE.test(id) || ~(id + '').indexOf(' ')) {
    fn = action; action = id; id = WILDCARD;
  } else if ('function' === typeof action){
    fn = action; action = WILDCARD;
  } else if (!id){
    id = WILDCARD;
  }

  // Lets create the event string
  event = this.ns + DELIMITER + id + DELIMITER;

  if ('off' === type && !fn) {
    type = 'removeAllListeners';
  }

  // if action is valid then check to see if its
  // an array.
  if (action) {
    if (isArray(action)) {
      actions = action;
    } else {

      // if it is a string then convert it to an array
      if ('string' === typeof action && WILDCARD !== action) {
        actions = action.split(' ');
      }
    }
  }

  if (actions) {
    var l = actions.length;
    // add register each event by action
    for (var i = 0; i < l; i++) {
      action = actions[i];
      if (!ACTIONS_RE.test(action)) continue;

      if (this.name === '160')
        console.log(type, event + action, fn);

      this[type](event + action, fn);
    }
  } else {
    if (this.name === '160')
      console.log(type, event + WILDCARD, fn);

    // register a wildcard event
    this[type](event + WILDCARD, fn);
  }

  return this;
};

/**
 * Fetch a `bid` from server.
 *
 * @param {String|Number} id the bid id
 * @param {Function} fn callback
 * @return {Channel} self
 * @api public
 */

Channel.prototype.fetch = function (id, fn) {
  return this.send('fetch', id, fn);
};

/**
 * Fetch a `bid` or `bids` from server.
 *
 * @param {String|Number|Object} query
 * @param {Function} fn callback
 * @return {Channel} self
 * @api public
 */

Channel.prototype.find = function (query, fn) {
  return this.send('query', '', query, fn);
};

/**
 * Lock a `bid` by opening it.
 *
 * @param {String|Number} id the bid id
 * @param {Object} owner owner object with at least an id attribute
 * @param {Function} fn callback
 * @return {Channel} self
 * @api public
 */

Channel.prototype.open = function (id, owner, fn) {
  return this.send('lock', id, owner, fn);
};

/**
 * Cancel a `bid` by unlocking it.
 *
 * @param {String|Number} id the bid id
 * @param {Object} owner owner object with at least an id attribute
 * @param {Function} fn callback
 * @return {Channel} self
 * @api public
 */

Channel.prototype.cancel = function (id, owner, fn) {
  return this.send('unlock', id, owner, fn);
};

/**
 * Claim a `bid`.
 *
 * @param {String|Number} id the bid id
 * @param {Object} owner owner object with at least an id attribute
 * @param {Function} fn callback
 * @return {Channel} self
 * @api public
 */

Channel.prototype.claim = function (id, owner, fn) {
  return this.send('claim', id, owner, fn);
};

/**
 * Set `bid` to pending.
 *
 * @param {String|Number} id the bid id
 * @param {Object} owner owner object with at least an id attribute
 * @param {Function} fn callback
 * @return {Channel} self
 * @api public
 */

Channel.prototype.pending = function (id, owner, fn) {
  return this.send('pending', id, owner, fn);
};

/**
 * Complete (close) a `bid`.
 *
 * @param {String|Number} id the bid id
 * @param {Object} owner owner object with at least an id attribute
 * @param {Function} fn callback
 * @return {Channel} self
 * @api public
 */

Channel.prototype.complete = function (id, owner, fn) {
  return this.send('complete', id, owner, fn);
};

/**
 * Force unlock a `bid`.
 *
 * @param {String|Number} id the bid id
 * @param {Object} owner owner object with at least an id attribute
 * @param {Function} fn callback
 * @return {Channel} self
 * @api public
 */

Channel.prototype.forceunlock = function (id, owner, fn) {
  return this.send('forceunlock', id, owner, fn);
};

/**
 * Update a `bid` data.
 *
 * @param {String|Number} id the bid id
 * @param {Object} data data object
 * @param {Function} fn callback
 * @return {Channel} self
 * @api public
 */

Channel.prototype.update = function (id, data, fn) {
  return this.send('update', id, data, fn);
};

/**
 * Send response to server.
 *
 * @param {Number} type request type
 * @param {String|Number} id the bid id
 * @param {Object} owner owner object
 * @return {Channel} self
 * @api private
 */

Channel.prototype.send = function (type, id, owner, fn) {
  var data;
  if ('function' === typeof owner) {
    fn = owner;
    owner = null;
  }

  // handle query and update cases
  data = ('query' === type) ?
  { query: owner } :
  (('update' === type) ?
    { update: owner } :
    { owner: owner });

  // encode our data
  var packet = encode({ type: type, id: id, data: data });
  this.request(packet, fn);
  return this;
};

/**
 * Send request to the server.
 *
 * @param {Object} packet
 * @param {Function} fn callback function
 * @return {Channel} self
 * @api private
 */

Channel.prototype.request = function (packet, fn) {
  this.socket.emit(this.ns, packet, this.response(fn));
  return this;
};

/**
 * Handle response from the server.
 *
 * @param {Function} fn callback function
 * @return {Function}
 * @api private
 */

Channel.prototype.response = function (fn) {
  return function (packet) {
    var result = decode(packet);
    if ('error' == result.type) {
      if (fn) fn(result.data);
    } else {
      if (fn) fn(null, result.data);
    }
  };
};

/**
 * Build a `channel` url.
 *
 * @param {String} channel the channel name
 * @param {String} urlStr the provided url
 * @return {String} url the chanel url
 * @api private
 */

Channel.prototype.buildUrl = function (channel, urlStr) {
  var obj = url.parse(urlStr || this.url);
  return [obj.protocol, '://', obj.authority, obj.path, '/', channel, '?', obj.query].join('');
};