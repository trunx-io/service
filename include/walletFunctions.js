const uuid = require('uuid');
const { getStore, knownTables } = require('./store.js')

function auditAction(table, data, type) {
  return new Promise(async (resolve, reject) => {
    let store = getStore();
    if (data.privatKey) data.privatKey = "*".repeat(53);
    store["audit"].get('data').push({ table, data, type, timestamp: new Date() }).write();
    resolve();
  });
}

let walletFunctions = {};

walletFunctions.addObject = (table, data) => {
  return new Promise(async (resolve, reject) => {
    if(!knownTables.includes(table)) return reject(`unknown table: ${table}`);

    let found, store = getStore();

    switch(table) {
      case 'keys':
        if(data.privatKey) {
          if(!data.privatKey) reject("missing 'privatKey' key(s)")
          found = store[table].get('data').find({ privatKey: data.privatKey }).value();
        } else if (data.publicKey) {
          if(!data.publicKey) reject("missing 'publicKey' key(s)")
          found = store[table].get('data').find({ publicKey: data.publicKey }).value();
        } else {
          if(!data.privatKey || !data.publicKey)
            reject("object must have either 'privatKey' or 'publicKey' key(s)")
        }
        break;
      case 'accounts':
          if(!data.account_name || !data.chain_id)
            reject("missing 'account_name' and/or 'chain_id' key(s)")
          found = store[table].get('data').find({ account_name: data.account_name, chain_id: data.chain_id }).value();
        break;
      case 'chains':
          if(!data.server) reject("missing 'server' key(s)")
          found = store[table].get('data').find({ server: data.server }).value();
        break;
      case 'apps':
          if(!data.url) reject("missing 'url' key(s)")
          found = store[table].get('data').find({ url: data.url }).value();
        break;
      case 'miners':
          if(!data.account_name) reject("missing 'account_name' key(s)")
          found = store[table].get('data').find({ account_name: data.account_name }).value();
        break;
      case 'settings':
          if(!data.name) reject("missing 'name' key(s)")
          found = store[table].get('data').find({ name: data.name }).value();
        break;
      default:
        // code above should not allow this; do nothing
    }

    if(found) return reject(`adding object to table '${table}' violates uniqueness constraint`);

    console.log(`[${Date.now()}] - adding object to table: ${table}`);
    store[table].get('data').push({_id: uuid.v4(), ...data, updated: new Date()}).write();
    await auditAction(table, data, 'add');
    resolve(getStore()[table].get('data').value());
  });
}

walletFunctions.removeObject = (table, _id) => {
  return new Promise(async (resolve, reject) => {
    if(!knownTables.includes(table)) return reject(`unknown table: ${table}`);
    console.log(`[${Date.now()}] - removing object from table: ${table}, _id: ${_id}`);
    let store = getStore();
    let found = store[table].get('data').find({_id}).value();
    if(!found) {return resolve(getStore()[table].get('data').value());}
    store[table].get('data').remove({ _id }).write();
    await auditAction(table, found, 'remove');
    resolve(getStore()[table].get('data').value());
  });
}

walletFunctions.updateObject = (table, _id, data) => {
  return new Promise(async (resolve, reject) => {
    if(!knownTables.includes(table)) return reject(`unknown table: ${table}`);
    console.log(`[${Date.now()}] - updating object in table: ${table}, _id: ${_id}`);
    let store = getStore();
    let found = store[table].get('data').find({_id}).value();
    if(table === 'settings' && found && found.name === 'mnemonic')
      reject('user not allowed to change wallet mnemonic phrase');
    if(!found) {return resolve(getStore()[table].get('data').value());}
    store[table].get('data').find({ _id }).assign({...data, updated: new Date()}).write();
    await auditAction(table, {...found, ...data}, 'update');
    resolve(getStore()[table].get('data').value());
  });
}

module.exports = { walletFunctions, auditAction };
