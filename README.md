# node-modbus-rtu
This is a fork of [thekip/node-modbus-rtu](https://github.com/thekip/node-modbus-rtu) to handle Modbus RTU like protocol over TCP Sockets

## Implementation notes
This library implement ONLY **ModbusRTU Master** and only most important features:
 * **03** Read Holding Registers
 * **06** Write Single Register
 * **16** Write Multiple Registers

Coil functions (readCoils, writeCoils) is not implemented yet. But you can fork and add this.

## Minimal requirements
NodeJS >=5

if you have older NodeJS version, you should install `modbus-rtu@0.1.*` version 
or update NodeJS (the 8.0 version is out, how long you will be use legacy builds? :) )

## Installation
The simplest way, install via npm, type to console:

`npm i modbus-rtu-tcp --save`

## Benefits
1. **Queue**. This is a killer-feature of this library. Behind the scene it use a simple queue.
All request what you do stack to this queue and execute only if previous was finished or timeouted.
It means that using this library you can write to modbus without waiting a response of previously command.
That make you code much cleaner and decoupled. See examples below.

2. **Promises** Promises is a great pattern for the last time. Promises make async code more clean and readable.
All communication functions return promises, so you can easily process data or catch exceptions.

## Examples

### The basic example
```js
import net from 'net';
import Reconnect from 'node-net-reconnect';
import { ModbusMaster } from './../src/';

const socket = net.Socket();

const options = {
  host: '127.0.0.1',
  port: 5008,
  retryTime: 1000, // 1s for every retry
  retryAlways: true, // retry even if the connection was closed on purpose
};


const recon = new Reconnect(socket, options);

const modbusMaster = new ModbusMaster(socket, {
  debug: true,
});
setInterval(() => {
  modbusMaster.readHoldingRegisters(1, 107, 2);
}, 1000);

// Modbus starts automatically on "connect" event
socket.connect(options);

```

### Queueing

Queue turn this:

```js
//  requests
master.readHoldingRegisters(1, 0, 4).then((data) => {
    console.log(data);

    master.readHoldingRegisters(2, 0, 4).then((data) => {
        console.log(data);

        master.readHoldingRegisters(2, 0, 4).then((data) => {
            console.log(data);

            master.readHoldingRegisters(2, 0, 4).then((data) => {
                console.log(data);
            })
        })
    })
})
```

Into this:

```js
master.readHoldingRegisters(1, 0, 4).then((data) => {
    console.log(data);
});
master.readHoldingRegisters(2, 0, 4).then((data) => {
    console.log(data);
});
master.readHoldingRegisters(3, 0, 4).then((data) => {
    console.log(data);
});
master.readHoldingRegisters(4, 0, 4).then((data) => {
    console.log(data);
});
```

This makes possible to write code in synchronous style.

Check more examples in `/examples` folder in repository.

## The main problem

Communicating via serial port is sequential. It means you can't write few requests and then read few responses.

You have to write request then wait response and then writing another request, one by one.

The first problem is, if we call functions in script in synchronous style (one by one without callbacks),
they will write to port immediately. As result response from slaves will returns unordered and we receive trash.

To deal with this problem all request instead of directly writing to port are put to the queue, and promise is returned.

## API Documentation

### new ModbusMaster(socket, [options])

Constructor of modbus class.

* **socket** - instance of net socket object
* **options** - object with Modbus options

**List of options:**
* `responseTimeout`: default `500`
* `debug`: default `false`; enable logging to console. 

### master.readHoldingRegisters
```ts
readHoldingRegisters<T>(slave: int, start: int, length: int, [dataType = DATA_TYPES.INT]): Promise<T[]>;
```

Modbus function read holding registers.

Modbus holding register can store only 16-bit data types, 
but specification does'nt define exactly what data type can be stored.

Registers could be combined together to form any of these 32-bit data types:
* A 32-bit unsigned integer (a number between 0 and 4,294,967,295)
* A 32-bit signed integer (a number between -2,147,483,648 and 2,147,483,647)
* A 32-bit single precision IEEE floating point number.
* A four character ASCII string (4 typed letters)

More registers can be combined to form longer ASCII strings.  
Each register being used to store two ASCII characters (two bytes).

To parse this combined data types, you can get raw buffer in callback and parse it on your own.

By default bytes treated as **signed integer**.

**Supported Data Types**

* `DATA_TYPES.UINT` A 16-bit unsigned integer (a whole number between 0 and 65535)
* `DATA_TYPES.INT` A 16-bit signed integer (a whole number between -32768 and 32767)
* `DATA_TYPES.ASCII` A two character ASCII string (2 typed letters)

**List of function arguments:**

* **slave** - slave address (1..247)
* **start** - start register for reading
* **length** - how many registers to read
* **dataType** - dataType or function. If function is provided, this will be used for parsing raw buffer. dataType is one of `DATA_TYPES`

**Returns Promise<T[]>** which will be fulfilled with array of data

### master.writeSingleRegister
```ts
writeSingleRegister(slave: int, register: int, value: int, [retryCount=10]) -> Promise<void>
```

Modbus function write single register.
If fails will be repeated `retryCount` times.

* **slave** - slave address (1..247)
* **register** - register number for write
* **value** - int value
* **retryCount** - int count of attempts. Set 1, if you don't want to retry request on fail.

**Returns Promise**


### master.writeMultipleRegisters
```ts
writeMultipleRegisters(slave: int, start: int, array[int]) -> Promise<void>
```

Modbus function write multiple registers.

You can set starting register and data array. Register from `start` to `array.length` will be filled with array data

* **slave** - slave address (1..247)
* **start** - starting register number for write
* **array** - array of values

**Returns promise**

## Testing
To run test, type to console:

`npm test`

Or run manually entire test (by executing test file via node).

Please feel free to create PR with you tests.


## Deploy

babel src --out-dir lib
