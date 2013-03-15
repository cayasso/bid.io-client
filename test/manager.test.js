/**
 * Module dependencies
 */

var Manager = require('./../lib/manager');
var Channel = require('./../lib/channel');
var expect = require('expect.js');
var Emitter = require('./../lib/events').EventEmitter;

// Mock socket.io
var io = {
	connect: function (url, opts) {
		this.url = url;
		this.opts = opts;
		var socket = new Emitter();
		socket.disconnect = function () {};
		return socket;
	}
};

var manager = new Manager(io, 'http://localhost', {});

describe('index', function(){

	it('should set required properties', function () {
		expect(manager).to.have.property('io');
		expect(manager).to.have.property('url');
		expect(manager).to.have.property('opts');
	});

	it('should call regular socket.io connect method', function () {
		expect(manager.connect()).to.be.an(Emitter);
	});

	it('should allow passing arguments to socket.io connect method', function () {
		expect(manager.connect()).to.be.an(Emitter);
	});

	it('should join a new channel', function () {
		expect(manager.join('32')).to.be.a(Channel);
	});

	it('should cache new channel', function () {
		expect(manager.join('31')).to.be.eql(manager.chnls['31']);
	});

	it('should leave a channel', function () {
		expect(manager.join('33')).to.be.eql(manager.chnls['33']);
		manager.leave('33');
		expect(manager.chnls['33']).to.not.be.ok();
	});

});