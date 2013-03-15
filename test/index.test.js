/**
 * Module dependencies
 */

var bio = require('./../lib/index');
var expect = require('expect.js');

describe('index', function(){

	it('should expose a function', function () {
		expect(bio).to.be.a('function');
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
	});

});
