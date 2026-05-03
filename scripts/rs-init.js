const mongoose = require('mongoose');

const MEMBERS = [
    { _id: 0, host: 'localhost:27017' },
    { _id: 1, host: 'localhost:27018' },
    { _id: 2, host: 'localhost:27019' }
];

async function waitForPrimary(admin, timeoutMs = 60000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const status = await admin.command({ replSetGetStatus: 1 });
            const primary = status.members.find(m => m.stateStr === 'PRIMARY');
            if (primary) return primary;
        } catch (e) {
            // RS not ready yet
        }
        await new Promise(r => setTimeout(r, 500));
    }
    throw new Error('timed out waiting for PRIMARY election');
}

(async () => {
    await mongoose.connect('mongodb://localhost:27017/?directConnection=true');
    const admin = mongoose.connection.db.admin();
    try {
        await admin.command({ replSetInitiate: { _id: 'rs0', members: MEMBERS } });
        console.log('replSetInitiate OK — waiting for PRIMARY election...');
    } catch (err) {
        if (err.codeName === 'AlreadyInitialized' || err.code === 23) {
            console.log('replica set already initialized — checking status');
        } else {
            throw err;
        }
    }
    const primary = await waitForPrimary(admin);
    console.log(`PRIMARY elected: ${primary.name}`);
    await mongoose.disconnect();
})().catch(err => { console.error(err); process.exit(1); });
