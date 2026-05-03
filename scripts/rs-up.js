const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const mongoose = require('mongoose');

const ROOT = path.resolve(__dirname, '..');
const DATA_ROOT = path.join(ROOT, '.mongo-data');
const PIDS_FILE = path.join(DATA_ROOT, 'pids.json');
const MONGOD = process.env.MONGOD || 'C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe';
const NODES = [
    { name: 'n1', port: 27017 },
    { name: 'n2', port: 27018 },
    { name: 'n3', port: 27019 }
];

function isPortListening(port) {
    return new Promise(resolve => {
        const sock = net.createConnection(port, '127.0.0.1');
        sock.once('connect', () => { sock.end(); resolve(true); });
        sock.once('error', () => { sock.destroy(); resolve(false); });
    });
}

function waitForPort(port, timeoutMs = 30000) {
    const deadline = Date.now() + timeoutMs;
    return new Promise((resolve, reject) => {
        const tryConnect = () => {
            const sock = net.createConnection(port, '127.0.0.1');
            sock.once('connect', () => { sock.end(); resolve(); });
            sock.once('error', () => {
                sock.destroy();
                if (Date.now() > deadline) return reject(new Error(`port ${port} not ready`));
                setTimeout(tryConnect, 250);
            });
        };
        tryConnect();
    });
}

async function getRealPid(port) {
    const conn = await mongoose.createConnection(`mongodb://localhost:${port}/?directConnection=true`).asPromise();
    const status = await conn.db.admin().command({ serverStatus: 1 });
    await conn.close();
    return status.pid;
}

(async () => {
    if (!fs.existsSync(MONGOD)) {
        console.error(`mongod not found at ${MONGOD} — set MONGOD env var to override`);
        process.exit(1);
    }
    fs.mkdirSync(DATA_ROOT, { recursive: true });
    const pids = {};
    for (const node of NODES) {
        const dbpath = path.join(DATA_ROOT, node.name);
        fs.mkdirSync(dbpath, { recursive: true });
        if (await isPortListening(node.port)) {
            console.log(`${node.name} already listening on :${node.port} — reusing`);
            continue;
        }
        const logpath = path.join(dbpath, 'mongod.log');
        const args = [
            '--replSet', 'rs0',
            '--port', String(node.port),
            '--bind_ip', '127.0.0.1',
            '--dbpath', dbpath,
            '--logpath', logpath,
            '--logappend'
        ];
        const child = spawn(MONGOD, args, { detached: true, stdio: 'ignore' });
        child.unref();
        console.log(`started ${node.name} on :${node.port} — dbpath=${dbpath}`);
    }
    for (const node of NODES) {
        await waitForPort(node.port);
        const pid = await getRealPid(node.port);
        pids[node.name] = { pid, port: node.port };
        console.log(`${node.name} accepting connections on :${node.port} (pid ${pid})`);
    }
    fs.writeFileSync(PIDS_FILE, JSON.stringify(pids, null, 2));
    console.log('\nAll 3 mongods up. Run `npm run rs:init` next.');
})().catch(err => { console.error(err); process.exit(1); });
