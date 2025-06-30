// src/resetDb.js
const db = require('./db');

db.exec(`
  DROP TABLE IF EXISTS grants;

  CREATE TABLE grants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    source TEXT,
    url TEXT,
    sector TEXT,
    deadline TEXT,
    eligibility TEXT,
    topic_id TEXT,
    opening_date TEXT,
    description TEXT,
    budget TEXT,
    partner_search_url TEXT,
    source_page INTEGER
  );
`);

console.log('✅ Database has been reset with the new schema.');
