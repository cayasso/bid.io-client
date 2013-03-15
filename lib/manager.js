/**
 * Module dependencies.
 */

var Channel = require('./channel');
var debug = require('debug')('bid.io-client:manager');


var FORCE_NEW_CONNECTION = 'force new connection';

if ('undefined' === typeof eio && 'undefined' === typeof io ) {
  throw Error('Please include socket.io client.');
}

/**
 * Module exports.
 */

module.exports = Manager;

/**
 * Manager constructor.
 *
 * @param {String} url the connection url
 * @param {Object} opts options
 * @api public
 */

function Manager (url, opts) {
  opts = opts || {};
  this.url = url;
  this.io = io;
  this.opts = opts;
  this.chnls = {};
}

/**
 * Connect with regular `socket.io`.
 *
 * @param {String|Object} url the connection `url` or `options`
 * @param {Object} opts `socket.io` connection options
 * @return {Socket} socket insntance
 * @api public
 */

Manager.prototype.connect = function (url, opts) {
  if ('string' !== typeof url) {
    opts = url;
    url = null;
  }
  url = url || this.url;
  return io.connect(url, opts);
};

/**
 * Connect to a `channel`.
 *
 * @param {String} name the channel name
 * @param {Function} fn callback function
 * @return {Manager} self
 * @api public
 */

Manager.prototype.join = function (name, opts) {
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

Manager.prototype.leave = function (name) {
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
