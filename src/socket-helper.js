import { Task } from './task';
import { Queue } from './queue';
import { ModbusResponseTimeout } from './errors';
import { Logger } from './logger';

export class SocketHelperFactory {
    /**
     * @param {SocketPort} soket
     * @param options
     * @returns {SocketHelper}
     */
    static create(socket, options) {
        const queue = new Queue(options.queueTimeout);
        return new SocketHelper(socket, queue, options);
    }
}

export class SocketHelper {
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
    this.logger = new Logger(options);

    this.bindToSocketPort();
  }

  /**
     *
     * @param {Buffer} buffer
     * @returns {Promise}
     */


    write(buffer) {
        const task = new Task(buffer);
      this.queue.push(task);

      return task.promise;
    }

    /**
       * @private
       */

    bindToSocketPort() {
        this.socket.on('connect', () => {
            this.queue.start();
      });
    }

    /**
       *
       * @param {Task} task
       * @param {function} done
       * @private
       */

    handleTask(task, done) {
        this.logger.info('write ' + task.payload.toString('HEX'));
        this.socket.write(task.payload, (error) => {
        if (error) {
          task.reject(error);
        }
      });

      // set execution timeout for task
        setTimeout(() => {
            task.reject(new ModbusResponseTimeout(this.options.responseTimeout));
      }, this.options.responseTimeout);

        const onData = (data) => {
            task.receiveData(data, (response) => {
                this.logger.info('resp ' + response.toString('HEX'));
          task.resolve(response);
        });
      };

      this.socket.on('data', onData);

        task.promise.catch(() => {}).finally(() => {
            this.socket.removeListener('data', onData);
        done();
      });
    }

}
