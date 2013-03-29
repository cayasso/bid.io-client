/**
 * Module exports
 */

exports.parse = parse;

/**
 * Parses an URI
 *
 * @author Steven Levithan <stevenlevithan.com> (MIT license)
 * @api public
 */

var re = /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;
var parts = ['source', 'protocol', 'authority', 'userInfo', 'user', 'password',
             'host', 'port', 'relative', 'path', 'directory', 'file', 'query',
             'anchor'];

function parse (str) {
  var m = re.exec(str || '') , uri = {} , i = 14;
  while (i--) {
    uri[parts[i]] = m[i] || '';
  }
 
  return uri;
}