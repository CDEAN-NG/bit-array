/**
 * JavaScript BitArray - v0.2.0
 *
 * Licensed under the revised BSD License.
 * Copyright 2010-2012 Bram Stein
 * All rights reserved.
 */

const AcceptedTypeArrays =['Uint8Array','Int8Array', 'Uint16Array','int16Array','Uint32Array','Int32Array'];

/**
 * Creates a new empty BitArray with the given length or initialises the BitArray with the given hex representation.
 */
var BitArray = function (size, hex, array) {
    this.length = size;
    this.buffer = new ArrayBuffer(Math.ceil(this.length / 32) * 4);
    this.wordArray = new Uint32Array(this.buffer);
    if (hex) {
        hex = hex.slice(/^0x/.exec(hex) ? 2 : 0);

        if (hex.length * 4 > this.length) {
            throw 'Hex value is too large for this bit array.'
        } else if (hex.length * 4 < this.length) {
            // pad it
            while(hex.length * 4 < this.length) {
                hex = '0' + hex;
            }
        }

        for (var i = 0; i < (hex.length / 8); i++) {
            var slice = hex.slice(i * 8, i * 8 + 8);
            this.wordArray[i] = parseInt(slice, 16);
        }
    }
};


BitArray.typedArray = function (array) {
    if( AcceptedTypeArrays.includes(array.constructor.name) ){
        let ba = new BitArray(array.byteLength * 8);
        ba.buffer = array.buffer.slice(array.byteOffset,array.buffer.byteLength - array.byteOffset);
        ba.wordArray = new Uint32Array(ba.buffer);
        return ba;
    }
    return null;
};

/**
 * Returns the total number of bits in this BitArray.
 */
BitArray.prototype.size = function() {
    return this.length;
};

/**
 * Sets the bit at index to a value (boolean.)
 */
BitArray.prototype.set = function(index, value) {
    if (arguments.length !== 2) {
        throw 'Index and value are required arguments.';
    }
    if (index > this.length - 1) {
        throw 'Index too large.' + index + ' ' + this.length;
    }
    var wordOffset = Math.floor(index / 32);
    // The underlying byte buffer will be initialized to zeros.
    var bitOffset = index - wordOffset * 32;
    if (value) {
        this.wordArray[wordOffset] |= (1 << bitOffset);
    } else {
        this.wordArray[wordOffset] &= ~(1 << bitOffset);
    }
    return this;
};

/**
 * Toggles the bit at index. If the bit is on, it is turned off. Likewise, if the bit is off it is turned on.
 */
BitArray.prototype.toggle = function(index) {
    if (index > this.length - 1) {
        throw 'Index too large.';
    }
    var wordOffset = Math.floor(index / 32);
    var bitOffset = index - wordOffset * 32;
    this.wordArray[wordOffset] ^= 1 << bitOffset;
    return this;
};

/**
 * Returns the value of the bit at index (boolean.)
 */
BitArray.prototype.get = function(index) {
    if (index > this.length - 1) {
        throw 'Index too large.';
    }
    var wordOffset = Math.floor(index / 32);
    var bitOffset = index - wordOffset * 32;
    return !! (this.wordArray[wordOffset] & (1 << bitOffset));
};

/**
 * Resets the BitArray so that it is empty and can be re-used.
 */
BitArray.prototype.reset = function() {
    this.buffer = new ArrayBuffer(Math.ceil(this.length / 32) * 4);
    this.wordArray = new Uint32Array(this.buffer);
    return this;
};

/**
 * Returns a copy of this BitArray.
 */
BitArray.prototype.copy = function() {
    var cp = new BitArray(this.length);
    for (var i = 0; i < this.wordArray.length; i++) {
        cp.wordArray[i] = this.wordArray[i];
    }
    return cp;
};

/**
 * Returns true if this BitArray equals another. Two BitArrays are considered
 * equal if both have the same length and bit pattern.
 */
BitArray.prototype.equals = function(x) {
    if (this.length !== x.length) {
        return false;
    }
    for (var i = 0; i < this.wordArray.length; i++) {
        if (this.wordArray[i] !== x.wordArray[i]) {
            return false;
        }
    }
    return true;
};

/**
 * Returns the JSON representation of this BitArray.
 */
BitArray.prototype.toJSON = function() {
    return JSON.stringify(this.toArray());
};

/**
 * Returns a string representation of the BitArray with bits
 * in mathemetical order.
 */
BitArray.prototype.toBinaryString = function () {
	return this.toArray().map(function (value) {
		return value ? '1' : '0';
	}).reverse().join('');
};

/**
 * Returns a hexadecimal string representation of the BitArray
 * with bits in logical order.
 */
BitArray.prototype.toHexString = function () {
    var result = [];

    for (var i = 0; i < this.wordArray.length; i += 1) {
        //result.push(this.wordArray[i].toString(16));
        result.push(('00000000' + (this.wordArray[i] >>> 0).toString(16)).slice(-8));
    }
    return result.join('');
};

/**
 * Returns a string representation of the BitArray with bits
 * in logical order.
 */
BitArray.prototype.toString = function() {
    return this.toArray().map(function(value) {
        return value ? '1': '0';
    }).join('');
};

/**
 * Convert the BitArray to an Array of boolean values (slow).
 */
BitArray.prototype.toArray = function() {
    var result = [];
    for (var i = 0; i < this.length; i++) {
        result.push(Boolean(this.get(i)));
    }
    return result;
};

/**
 * Returns the total number of bits set to one in this BitArray.
 */
BitArray.prototype.count = function() {
    var total = 0;
    for (var i = 0; i < this.wordArray.length; i++) {
        x = this.wordArray[i];
        // count bits of each 2-bit chunk
        x = x - ((x >> 1) & 0x55555555);
        // count bits of each 4-bit chunk
        x = (x & 0x33333333) + ((x >> 2) & 0x33333333);
        // count bits of each 8-bit chunk
        x = x + (x >> 4);
        // mask out junk
        x &= 0xF0F0F0F;
        // add all four 8-bit chunks
        total += (x * 0x01010101) >> 24;
    }
    return total;
};

/**
 * Inverts this BitArray.
 */
BitArray.prototype.not = function() {
    for (var i = 0; i < this.wordArray.length; i++) {
        this.wordArray[i] = ~(this.wordArray[i]);
    }
    return this;
};

/**
 * Bitwise OR on the values of this BitArray using BitArray x.
 */
BitArray.prototype.or = function(x) {
    if (this.length !== x.length) {
        throw 'Arguments must be of the same length.';
    }
    for (var i = 0; i < this.wordArray.length; i++) {
        this.wordArray[i] |= x.wordArray[i];
    }
    return this;
};

/**
 * Bitwise AND on the values of this BitArray using BitArray x.
 */
BitArray.prototype.and = function(x) {
    if (this.length !== x.length) {
        throw 'Arguments must be of the same length.';
    }
    for (var i = 0; i < this.wordArray.length; i++) {
        this.wordArray[i] &= x.wordArray[i];
    }
    return this;
};

/**
 * Bitwise XOR on the values of this BitArray using BitArray x.
 */
BitArray.prototype.xor = function(x) {
    if (this.length !== x.length) {
        throw 'Arguments must be of the same length.';
    }
    for (var i = 0; i < this.wordArray.length; i++) {
        this.wordArray[i] ^= x.wordArray[i];
    }
    return this;
};

module.exports = BitArray;
