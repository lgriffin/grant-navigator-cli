// src/listGrants.js
const db = require('./db');

const rows = db.prepare('SELECT id, title, topic_id, deadline, opening_date FROM grants').all();

console.log('\n📊 Horizon Europe Grants:\n');
rows.forEach(row => {
  console.log(`[${row.id}] ${row.title}`);
  console.log(`     Topic ID: ${row.topic_id}`);
  console.log(`     Opening:  ${row.opening_date}`);
  console.log(`     Deadline: ${row.deadline}`);
  console.log('');
});
