global.fs = require('fs');
global.path = require('path');
const { initIPCServer } = require('./include/ipcServer.js');

class Service {
  constructor(props) {
    global.dataDir = props.dataDir;
    global.socketName = props.socketName;    
  }

  async start() {
    console.log(`starting wallet service with name: ${socketName}`)
    return await initIPCServer(socketName); // start listening on named socket
  }

}

module.exports = Service;
