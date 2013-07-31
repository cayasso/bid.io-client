/**
 * Module dependencies.
 */

var Emitter = require('./events').EventEmitter;
var debug = require('debug')('bid.io-client:channel');
var parser = require('./parser');
var url = require('./url');
var encode = parser.encode;
var decode = parser.decode;
var packets = parser.packets;

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
  this.io = manager.io;
  this.opts = manager.opts;
  this.url = manager.url;
  this.ns = manager.ns || 'stream';
  this.name = name;
  this.watches = {};
  this.evts = {};
  this.actions = [
    'fetch',
    'query',
    'lock',
    'unlock',
    'pending',
    'complete',
    'error',
    'update'
  ];
  this.events = [
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
  var url = this.buildUrl(this.name);
  this.socket = this.io.connect(url, this.opts);
  for (var i = 0, e; e = this.events[i]; i++) {
    this.bind(e);
  }
  return this;
};

/**
 * Disconnect from `channel`.
 *
 * @return {Channel} self
 * @api public
 */

Channel.prototype.disconnect = function () {
  for (var i = 0, e; e = this.events[i]; i++) {
    this.unbind(e);
    this.socket.disconnect();
  }
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
    var args = Array.prototype.slice.call(arguments);
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
 * Watch a `bid` or all `bids` in a `channel`.
 *
 * @param {String|Number} bidId the bid id or actions to watch
 * @param {String} actions the the actions to watch
 * @param {Function} fn callback
 * @return {Channel} self
 * @api public
 */

Channel.prototype.watch = function (bidId, actions, fn) {
  if ('function' === typeof bidId) {
    fn = bidId; actions = '*'; bidId = null;
  } else if (~this.actions.indexOf(bidId)) {
    fn = actions; actions = bidId; bidId = null;
  } else if ('function' === typeof actions){
    fn = actions; actions = '*';
  }

  var self = this;
  var args = [].slice.apply(arguments);

  // validate action
  var valid = function (action) {
    actions = actions.toString();
    return ~actions.indexOf(action);
  };

  if (self.watches[bidId || this.name]) return this;

  var cb = function (packet) {
    var result = decode(packet);
    var id = result.id;
    var type = result.type;
    var action = type;
    var isValid = valid(action);
    var isMine = bidId && id == bidId;
    var notMine = bidId && id != bidId;
    if (notMine) return;
    if ((isMine && isValid) ||
      (isMine && valid('*')) || (!bidId && isValid ||
        valid('*'))) return fn(result.data, action);
  };
  self.watches[bidId || this.name] = cb;
  self.socket.on(this.ns, cb);
  return this;
};

/**
 * Stop watching a `bid` or all `bids` from a `channel`.
 *
 * @param {String|Number} id the bid id to unwatch
 * @return {Channel} self
 * @api public
 */

Channel.prototype.unwatch = function (id) {
  var watch = this.watches[id || this.name];
  if (watch) {
    this.socket.removeListener(this.ns, watch);
    delete this.watches[id];
    console.log('unwatching bid: ', id, 'actions: ', actions);
  }
  return this;
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