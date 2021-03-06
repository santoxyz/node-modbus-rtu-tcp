'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.SerialHelper = exports.SerialHelperFactory = undefined;

var _task = require('./task');

var _queue = require('./queue');

var _errors = require('./errors');

var _logger = require('./logger');

class SerialHelperFactory {
    /**
     * @param {SerialPort} serialPort
     * @param options
     * @returns {SerialHelper}
     */
    static create(serialPort, options) {
        var queue = new _queue.Queue(options.queueTimeout);
        return new SerialHelper(serialPort, queue, options);
    }
}

exports.SerialHelperFactory = SerialHelperFactory;
class SerialHelper {
    /**
     * @param {SerialPort} serialPort
     * @param {Queue<Task>} queue
     * @param options
     */
    constructor(serialPort, queue, options) {
        /**
         * @type {Queue<Task>}
         * @private
         */
        this.queue = queue;
        queue.setTaskHandler(this.handleTask.bind(this));

        /**
         * @private
         */
        this.options = options;
        this.serialPort = serialPort;
        this.logger = new _logger.Logger(options);

        this.bindToSerialPort();
    }

    /**
     *
     * @param {Buffer} buffer
     * @returns {Promise}
     */
    write(buffer) {
        var task = new _task.Task(buffer);
        this.queue.push(task);

        return task.promise;
    }

    /**
     * @private
     */
    bindToSerialPort() {
        var _this = this;

        this.serialPort.on('open', function () {
            _this.queue.start();
        });
    }

    /**
     *
     * @param {Task} task
     * @param {function} done
     * @private
     */
    handleTask(task, done) {
        var _this2 = this;

        this.logger.info('write ' + task.payload.toString('HEX'));
        this.serialPort.write(task.payload, function (error) {
            if (error) {
                task.reject(error);
            }
        });

        // set execution timeout for task
        setTimeout(function () {
            task.reject(new _errors.ModbusResponseTimeout(_this2.options.responseTimeout));
        }, this.options.responseTimeout);

        var onData = function onData(data) {
            task.receiveData(data, function (response) {
                _this2.logger.info('resp ' + response.toString('HEX'));
                task.resolve(response);
            });
        };

        this.serialPort.on('data', onData);

        task.promise.catch(function () {}).finally(function () {
            _this2.serialPort.removeListener('data', onData);
            done();
        });
    }
}
exports.SerialHelper = SerialHelper;