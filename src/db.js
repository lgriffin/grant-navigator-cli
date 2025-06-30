// src/db.js
const Database = require('better-sqlite3');
const db = new Database('./db/grants.db');

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS grants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    source TEXT,
    url TEXT,
    sector TEXT,
    deadline TEXT,
    eligibility TEXT
  );

  CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grant_id INTEGER,
    note TEXT,
    bookmarked_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

module.exports = db;
