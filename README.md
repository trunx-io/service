# TrunxIO Service

## Install from NPM
- `npm install -g @trunx-io/service`

---

## How to Run the TrunxIO service
The TrunxIO service can be started via an executable or used as a module in a node JS script. An example node JS script is below:
```
const { runService, stopService } = require('@trunx-io/service')
process.on("SIGINT", stopService);
(async () => { await runService({dataDir: './trunx-data-directory', socketName: 'trunxio1'}) })();
```
