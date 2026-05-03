const mongoose = require('mongoose');

const URI = process.env.MONGO_URI || 'mongodb://localhost:27017,localhost:27018,localhost:27019/?replicaSet=rs0';

(async () => {
    await mongoose.connect(URI);
    const status = await mongoose.connection.db.admin().command({ replSetGetStatus: 1 });
    console.log(`set: ${status.set}    myState: ${status.myState}    date: ${status.date.toISOString()}`);
    console.log('-'.repeat(80));
    for (const m of status.members) {
        const uptime = `${m.uptime}s`.padStart(7);
        const state = m.stateStr.padEnd(10);
        const health = m.health === 1 ? 'OK' : 'DOWN';
        console.log(`  [${m._id}] ${m.name.padEnd(22)} ${state} health=${health}  uptime=${uptime}`);
    }
    await mongoose.disconnect();
})().catch(err => { console.error(err); process.exit(1); });
