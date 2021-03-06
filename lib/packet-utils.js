'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.DATA_TYPES = undefined;
exports.getDataBuffer = getDataBuffer;
exports.parseFc03Packet = parseFc03Packet;
exports.addCrc = addCrc;
exports.checkCrc = checkCrc;

var _crc = require('crc');

var _crc2 = _interopRequireDefault(_crc);

var _bufferput = require('bufferput');

var _bufferput2 = _interopRequireDefault(_bufferput);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var DATA_TYPES = exports.DATA_TYPES = {
    INT: 1,
    UINT: 2,
    ASCII: 3
};

/**
 * Slice header, bytes count and crc. Return buffer only with data
 * @param {Buffer} buffer
 */
function getDataBuffer(buffer) {
    return buffer.slice(9, buffer.length);
}

/**
 * Parse function 03 response packet (read holding registers)
 * @param {Buffer} buffer
 * @param {number} [dataType]
 * @returns {number[]}
 */
function parseFc03Packet(buffer, dataType) {
    var results = [];

    for (var i = 0; i <= buffer.length - 2; i += 2) {
        results.push(readDataFromBuffer(buffer, i, dataType));
    }

    return results;
}

/**
 * Returns new buffer signed with CRC
 * @param {Buffer} buf
 * @returns {Buffer}
 */
function addCrc(buf) {
    return new _bufferput2.default().put(buf).word16le(_crc2.default.crc16modbus(buf)).buffer();
}

/**
 *
 * @param {Buffer} buffer
 * @returns boolean
 */
function checkCrc(buffer) {
    var pdu = buffer.slice(0, buffer.length - 2);
    return buffer.equals(this.addCrc(pdu));
}

/**
 *
 * @param {Buffer} buffer
 * @param {int} offset
 * @param {int} [dataType]
 * @returns {number | string}
 */
function readDataFromBuffer(buffer, offset, dataType) {
    switch (dataType) {
        case DATA_TYPES.UINT:
            return buffer.readUInt16BE(offset);
        case DATA_TYPES.ASCII:
            return buffer.toString('ascii', offset, offset + 2);
        default:
            return buffer.readInt16BE(offset);
    }
}