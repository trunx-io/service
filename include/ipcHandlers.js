const { walletFunctions } = require('./walletFunctions.js');
const {
  knownTables,
  getActiveWallet,
  initStore,
  getStore,
  setLockTimer,
  getLockTimerEnd,
  lockWallet
} = require('./store.js');

let ipcHandlers = {}

ipcHandlers['listWallets'] = async (args) => {
  console.log(`[${Date.now()}] - listing wallets`)
  let wallets = [];
  if(fs.existsSync(path.join(dataDir, 'wallets'))) {
    for(const walletName of fs.readdirSync(path.join(dataDir, 'wallets'))) {
      if(fs.lstatSync(path.join(dataDir, 'wallets', walletName)).isDirectory()) wallets.push(walletName);
    }
  }
  return { wallets, activeWallet: getActiveWallet() };
}

ipcHandlers['readStore'] = async (args) => {
  let store = getStore();
  if ( !store ) return "store not open. call db:unlock first";
  let result = {};
  for (const table of args.tables) {
    if (knownTables.includes(table))
      result[table] = store[table].get('data').value();
  }

  setLockTimer();
  return result;
}

ipcHandlers['addObject'] = async (args) => {
  let store = getStore();
  if ( !store ) return "store not open. call db:unlock first";
  let result = {};
  try {
    let { table, data } = args;
    result[table] = await walletFunctions.addObject(table, data);
  } catch(e) { result = e; }

  setLockTimer();
  return result;
}

ipcHandlers['removeObject'] = async (args) => {
  let store = getStore();
  if ( !store ) return "store not open. call db:unlock first";
  let result = {};
  try {
    let { table, _id } = args;
    result[table] = await walletFunctions.removeObject(table, _id);
  } catch(e) { result = e; }

  setLockTimer();
  return result;
}

ipcHandlers['updateObject'] = async (args) => {
  let store = getStore();
  if ( !store ) return "store not open. call db:unlock first";
  let result = {};
  try {
    let { table, _id, data } = args;
    result[table] = await walletFunctions.updateObject(table, _id, data);
  } catch(e) { result = e; }

  setLockTimer();
  return result;
}

ipcHandlers['lockWallet'] = async (args) => {
  console.log(`[${Date.now()}] - locking wallet`)
  return lockWallet();
}

ipcHandlers['unlockWallet'] = async (args) => {
  console.log(`[${Date.now()}] - unlocking wallet`)
  let filteredStore, store = await initStore(args);
  if(store) {
    // do not send back the audit table on unlock
    filteredStore = Object.assign({}, store);
    delete filteredStore.audit;
  }

  setLockTimer();
  return filteredStore ? filteredStore : "invalid password";
}

ipcHandlers['getLockTime'] = async () => {
  let activeWallet = getActiveWallet();
  return { locked: !activeWallet, lockTime: getLockTimerEnd(), activeWallet };
}

ipcHandlers['createBackup'] = async (args) => {
  let store = getStore();
  if ( !store ) return "store not open. call db:unlock first";
  console.log(`[${Date.now()}] - creating backup`)
  return store;
}

module.exports = { ipcHandlers }
