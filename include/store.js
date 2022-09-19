const uuid = require('uuid');
const low = require('lowdb');
const Cryptr = require('cryptr');
const FileSync = require('lowdb/adapters/FileSync.js');

let store, lockTimer, lockTimerEnd, activeWallet;
let knownTables = ['keys','accounts','chains','apps','miners','settings','audit'];

function initStore(args){
    return new Promise( async (resolve, reject)=>{
        const cryptr = new Cryptr(args.password);

        let walletName, newDatabaseCreated = false;

        try{
            walletName = args.walletName || "default";
            activeWallet = path.join(dataDir, 'wallets', walletName);

            if(!fs.existsSync(activeWallet)) {
                fs.mkdirSync(activeWallet, {recursive: true});
                newDatabaseCreated = true;
            }

            const keys_adapter = new FileSync(path.join(activeWallet, 'keys.json'), {
                deserialize: function (str){ return JSON.parse( cryptr.decrypt(str)  )},
                serialize: function(obj) { return cryptr.encrypt( JSON.stringify(obj) )}
            });

            const accounts_adapter = new FileSync(path.join(activeWallet, 'accounts.json'), {
                deserialize: function (str){ return JSON.parse( cryptr.decrypt(str)  )},
                serialize: function(obj) { return cryptr.encrypt( JSON.stringify(obj) )}
            });

            const chains_adapter = new FileSync(path.join(activeWallet, 'chains.json'), {
                deserialize: function (str){ return JSON.parse( cryptr.decrypt(str)  )},
                serialize: function(obj) { return cryptr.encrypt( JSON.stringify(obj) )}
            });

            const apps_adapter = new FileSync(path.join(activeWallet, 'apps.json'), {
                deserialize: function (str){ return JSON.parse( cryptr.decrypt(str)  )},
                serialize: function(obj) { return cryptr.encrypt( JSON.stringify(obj) )}
            });

            const miners_adapter = new FileSync(path.join(activeWallet, 'miners.json'), {
                deserialize: function (str){ return JSON.parse( cryptr.decrypt(str)  )},
                serialize: function(obj) { return cryptr.encrypt( JSON.stringify(obj) )}
            });

            const settings_adapter = new FileSync(path.join(activeWallet, 'settings.json'), {
                deserialize: function (str){ return JSON.parse( cryptr.decrypt(str)  )},
                serialize: function(obj) { return cryptr.encrypt( JSON.stringify(obj) )}
            });

            const audit_adapter = new FileSync(path.join(activeWallet, 'audit.json'), {
                deserialize: function (str){ return JSON.parse( cryptr.decrypt(str)  )},
                serialize: function(obj) { return cryptr.encrypt( JSON.stringify(obj) )}
            });

            store = {
                keys: low(keys_adapter),
                accounts: low(accounts_adapter),
                chains: low(chains_adapter),
                apps: low(apps_adapter),
                miners: low(miners_adapter),
                settings: low(settings_adapter),
                audit: low(audit_adapter),
            }

            // set defaults when initializing a new wallet database
            store.keys.defaults({data: []}).write();
            store.accounts.defaults({data: []}).write();
            store.chains.defaults({data: []}).write();
            store.apps.defaults({data: []}).write();
            store.miners.defaults({data: []}).write();
            store.settings.defaults({data: [
                { _id: uuid.v4(), name: 'autolock', value: 600 },
                { _id: uuid.v4(), name: 'mnemonic', value: args.mnemonic },
            ]}).write()
            store.audit.defaults({data: []}).write();

            if ( newDatabaseCreated ) {
                console.log(`[${Date.now()}] - wallet database created`);
                const { auditAction } = require('./walletFunctions.js');
                await auditAction('database', { path: activeWallet }, 'create');
            } else {
                console.log(`[${Date.now()}] - wallet unlocked`);
            }
        } catch(e) {
            if(e.toString().includes("Unsupported state or unable to authenticate data")) {
                console.log(`[${Date.now()}] - error: user entered invalid password`);
                resolve();
            }
            else {
                console.log(`[${Date.now()}] - error: ${e.toString()}`);
                throw new Error(e);
            }
        }

        resolve({...store, activeWallet});
    })
}

function getStore() { return store; }
function getActiveWallet() { return activeWallet; }
function getLockTimerEnd() { return lockTimerEnd; }
function setLockTimer() {
    clearInterval(lockTimer);
    if ( !store ) return;
    var autolockObject = store && store['settings'].get('data').find({name: "autolock"}).value();
    var autolockTimeout = autolockObject && autolockObject.value || 600; // default: 600 seconds autolock
    lockTimer = setTimeout(lockWallet, autolockTimeout * 1000);
    lockTimerEnd = Date.now() + autolockTimeout * 1000;
}
function lockWallet() {
    store = undefined;
    activeWallet = undefined;
    if ( lockTimer ) clearInterval(lockTimer);
    lockTimerEnd = Date.now();
    return { data: 'locked' };
}

module.exports = { knownTables, getActiveWallet, initStore, getStore, setLockTimer, getLockTimerEnd, lockWallet }
