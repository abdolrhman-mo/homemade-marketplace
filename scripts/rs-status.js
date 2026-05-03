const mongoose = require('mongoose');

const URI = process.env.MONGO_URI || 'mongodb://localhost:27017,localhost:27018,localhost:27019/?replicaSet=rs0';

async function pidFor(host) {
    try {
        const conn = await mongoose.createConnection(`mongodb://${host}/?directConnection=true`, { serverSelectionTimeoutMS: 1500 }).asPromise();
        const status = await conn.db.admin().command({ serverStatus: 1 });
        await conn.close();
        return status.pid;
    } catch {
        return null;
    }
}

(async () => {
    await mongoose.connect(URI);
    const status = await mongoose.connection.db.admin().command({ replSetGetStatus: 1 });
    console.log(`set: ${status.set}    myState: ${status.myState}    date: ${status.date.toISOString()}`);
    console.log('-'.repeat(80));
    for (const m of status.members) {
        const pid = await pidFor(m.name);
        const state = m.stateStr.padEnd(10);
        const health = m.health === 1 ? 'OK  ' : 'DOWN';
        const uptime = `${m.uptime}s`.padStart(7);
        const pidStr = pid ? `pid=${pid}`.padEnd(11) : 'pid=?      ';
        console.log(`  [${m._id}] ${m.name.padEnd(22)} ${state} health=${health} ${pidStr} uptime=${uptime}`);
    }
    console.log('\nTo kill the PRIMARY (failover demo):  taskkill /PID <pid> /F');
    await mongoose.disconnect();
})().catch(err => { console.error(err); process.exit(1); });
