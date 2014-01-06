/**
 * Module dependencies.
 */

var Channel = require('./channel')
  , debug = require('debug')('bid.io-client:manager')
  , FORCE_NEW_CONNECTION = 'force new connection';

/**
 * Module exports.
 */

module.exports = Manager;

/**
 * Manager constructor.
 *
 * @param {Object} io socket.io client object
 * @param {String} url the connection url
 * @param {Object} opts options
 * @api public
 */

function Manager(io, url, opts) {
  opts = opts || {};
  this.url = url;
  this.io = io;
  this.opts = opts;
  this.chnls = {};
  this.conn = null;
}

/**
 * Connect with regular `socket.io`.
 *
 * @param {String|Object} url the connection `url` or `options`
 * @param {Object} opts `socket.io` connection options
 * @return {Socket} socket insntance
 * @api public
 */

Manager.prototype.connect = function connect(url, opts) {
  if ('string' !== typeof url) {
    opts = url;
    url = null;
  }
  url = url || this.url;
  this.conn = this.io.connect(url, opts);
  return this.conn;
};

/**
 * Connect to a `channel`.
 *
 * @param {String} name the channel name
 * @param {Function} fn callback function
 * @return {Manager} self
 * @api public
 */

Manager.prototype.join = function join(name, opts) {
  opts = opts || {};
  debug('joining channel %s', name);
  var fnc = opts[FORCE_NEW_CONNECTION];
  var chnl = this.chnls[name];
  if (fnc) this.opts[FORCE_NEW_CONNECTION] = fnc;
  if (chnl && !fnc) return chnl;
  chnl = new Channel(name, this);
  this.chnls[name] = chnl;
  return this.chnls[name];
};

/**
 * Disconnect to a `channel`.
 *
 * @param {String} name the channel name
 * @return {Manager} self
 * @api public
 */

Manager.prototype.leave = function leave(name) {
  var chnl = this.chnls[name];
  if (chnl) {
    debug('disconnecting from channel %s', name);
    chnl.disconnect();
    delete this.chnls[name];
  } else {
    debug('unable to find channel %s', name);
  }
  return this;
};

/**
 * Get a stored `channel` connection for use.
 *
 * @param {String} name the name of the `channel` to get
 * @return {Channel} the `channel` instance
 * @api public
 */

Manager.prototype.getChannel = function getChannel(name) {
  var chnl = this.chnls[name];
  if (!chnl) return debug("Channel '%s' doesn't exist.", name);
  return chnl;
};
