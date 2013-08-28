
/**
 * Module dependencies.
 */

var Manager = require('./manager');
var Channel = require('./channel');
var parser = require('./parser');

/**
 * Module exports.
 */

module.exports = exports = Factory;

/**
 * Looks up an existing `Manager` for multiplexing.
 * If the user summons:
 *
 * @api public
 */

function Factory(io, uri, opts) {
  opts = opts || {};
  if (!io.protocol || !io.connect ) {
    throw Error('Please include socket.io client.');
  }
  return new Manager(io, uri, opts);
}

/**
 * Protocol version.
 *
 * @api public
 */

exports.protocol = parser.protocol;

/**
 * Expose constructors for standalone build.
 *
 * @api public
 */

exports.Manager = Manager;
exports.Channel = Channel;
