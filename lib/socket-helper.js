'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SocketHelper = exports.SocketHelperFactory = undefined;

var _task = require('./task');

var _queue = require('./queue');

var _errors = require('./errors');

var _logger = require('./logger');

class SocketHelperFactory {
  /**
   * @param {SocketPort} soket
   * @param options
   * @returns {SocketHelper}
   */
  static create(socket, options) {
    var queue = new _queue.Queue(options.queueTimeout);
    return new SocketHelper(socket, queue, options);
  }
}

exports.SocketHelperFactory = SocketHelperFactory;
class SocketHelper {
  /**
     * @param {SocketPort} socket
     * @param {Queue<Task>} queue
     * @param options
     */
  constructor(socket, queue, options) {

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
    this.socket = socket;
    this.logger = new _logger.Logger(options);

    this.bindToSocketPort();
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

  bindToSocketPort() {
    var _this = this;

    this.socket.on('connect', function () {
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
    this.socket.write(task.payload, function (error) {
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

    this.socket.on('data', onData);

    task.promise.catch(function () {}).finally(function () {
      _this2.socket.removeListener('data', onData);
      done();
    });
  }

}
exports.SocketHelper = SocketHelper;