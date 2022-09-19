const ipc = require("node-ipc");
const { ipcHandlers } = require('./ipcHandlers.js');

// https://stackoverflow.com/a/20392392
function tryParseJSON(jsonString){
    try {
        var o = JSON.parse(jsonString);

        // Handle non-exception-throwing cases:
        // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
        // but... JSON.parse(null) returns null, and typeof null === "object", 
        // so we must check for that, too. Thankfully, null is falsey, so this suffices:
        if (o && typeof o === "object") {
            return o;
        }
    }
    catch (e) { }

    return false;
};

// Functions
function ipcConnect(opts, func) {
  ipc.config.silent = opts.silent || true;
  ipc.config.maxRetries = opts.maxRetries !== undefined ? opts.maxRetries : 3;
  ipc.connectTo(opts.id, () => {
    func(ipc.of[opts.id])
  })
}

async function isSocketListening(name) {
  return new Promise((resolve, reject) => {
    ipcConnect({id: name, maxRetries: 1}, function(client) {
      client.on('connect', () => {ipc.disconnect(name);resolve(true)})
      client.on('destroy', () => resolve(false))
    })
  })
}

async function initIPCServer(socketName) {
  if(await isSocketListening(socketName)) return {error: `socket (${socketName}) is already running.`}

  ipc.config.id = socketName
  ipc.config.silent = true

  ipc.serve(() => {
    ipc.server.on('message', (data, socket) => {
      let msg = tryParseJSON(data) || data;

      let { id, name, args } = msg

      if(name == 'stopServer') {
        var fs = require('fs')
        ipc.server.stop()
        ipc.disconnect(socketName)
        ipc.server.emit(
          socket,
          'message',
          JSON.stringify({ type: 'reply', id, result: {data: 'ipc server stoppped'} })
        )
        return
      }

      if (ipcHandlers[name]) {
        ipcHandlers[name](args).then(
          result => {
            ipc.server.emit(
              socket,
              'message',
              JSON.stringify({ type: 'reply', id, result })
            )
          },
          error => {
            // Up to you how to handle errors, if you want to forward
            // them, etc
            ipc.server.emit(
              socket,
              'message',
              JSON.stringify({ type: 'error', id })
            )
            throw error
          }
        )
      } else {
        console.warn('Unknown method: ' + name)
        ipc.server.emit(
          socket,
          'message',
          JSON.stringify({ type: 'reply', id, result: null })
        )
      }
    })
  })

  ipc.server.start()
  // console.log("Started IPC server with named pipe/socket")
}

function send(name, args) {
  ipc.server.broadcast('message', JSON.stringify({ type: 'push', name, args }))
}

module.exports = { initIPCServer }
