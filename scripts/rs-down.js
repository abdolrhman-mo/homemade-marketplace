const fs = require('fs');
const path = require('path');

const PIDS_FILE = path.resolve(__dirname, '..', '.mongo-data', 'pids.json');

if (!fs.existsSync(PIDS_FILE)) {
    console.log('no pids.json — nothing to stop');
    process.exit(0);
}
const pids = JSON.parse(fs.readFileSync(PIDS_FILE, 'utf-8'));
for (const [name, info] of Object.entries(pids)) {
    try {
        process.kill(info.pid);
        console.log(`stopped ${name} (pid ${info.pid})`);
    } catch (e) {
        console.log(`${name} (pid ${info.pid}) already gone`);
    }
}
fs.unlinkSync(PIDS_FILE);
