/**
 * Module dependencies
 */

var Manager = require('./../lib/manager');
var expect = require('expect.js');
var Emitter = require('./../events').EventEmitter;
// Overwrite Channel for testing
//bio.Channel = function () { };

// Mock socket.io
var io = {
	connect: function (ui, opts) {
		return new Emitter();
	}
};

var manager = Manager(io, 'http://localhost', {});

describe('index', function(){

	it('should set required properties', function () {
		expect(manager).to.have.property('io');
		expect(manager).to.have.property('url');
		expect(manager).to.have.property('opts');
	});

	/*it('should join a new channel', function () {
		expect(manager.join('32')).to.be.a('function');
	});

	it('should expose protocol', function () {
		expect(bio.protocol).to.be.a('number');
	});

	it('should expose manager', function () {
		expect(bio).to.have.property('Manager');
	});

	it('should expose channel', function () {
		expect(bio).to.have.property('Channel');
	});

	it('should error if no socket.io object passed', function () {
		expect(bio).throwError();
	});*/

});