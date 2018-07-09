'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SocketHelperFactory = exports.SocketHelper = undefined;

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _task = require('./task');

var _queue = require('./queue');

var _errors = require('./errors');

var _logger = require('./logger');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var SocketHelper = exports.SocketHelper = function () {
  /**
     * @param {SocketPort} socket
     * @param {Queue<Task>} queue
     * @param options
     */
  function SocketHelper(socket, queue, options) {
    (0, _classCallCheck3.default)(this, SocketHelper);

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

  (0, _createClass3.default)(SocketHelper, [{
    key: 'write',
    value: function write(buffer) {
      var task = new _task.Task(buffer, this.options);
      this.queue.push(task);

      return task.promise;
    }

    /**
       * @private
       */

  }, {
    key: 'bindToSocketPort',
    value: function bindToSocketPort() {
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

  }, {
    key: 'handleTask',
    value: function handleTask(task, done) {
      var _this2 = this;

      this.logger.info('Write: ' + task.payload.toString('HEX'));
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
          _this2.logger.info('Read : ' + response.toString('HEX'));
          task.resolve(response);
        });
      };

      this.socket.on('data', onData);

      task.promise.catch(function () {}).finally(function () {
        _this2.socket.removeListener('data', onData);
        done();
      });
    }
  }]);
  return SocketHelper;
}();

var SocketHelperFactory = exports.SocketHelperFactory = function () {
  function SocketHelperFactory() {
    (0, _classCallCheck3.default)(this, SocketHelperFactory);
  }

  (0, _createClass3.default)(SocketHelperFactory, null, [{
    key: 'create',

    /**
     * @param {SocketPort} socket
     * @param options
     * @returns {SocketHelper}
     */
    value: function create(socket, options) {
      var queue = new _queue.Queue(options.queueTimeout);
      return new SocketHelper(socket, queue, options);
    }
  }]);
  return SocketHelperFactory;
}();