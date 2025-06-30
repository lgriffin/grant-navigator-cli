// src/exportToCsv.js
const fs = require('fs');
const path = require('path');
const db = require('./db');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const rows = db.prepare('SELECT * FROM grants ORDER BY deadline').all();

const csvWriter = createCsvWriter({
  path: path.join(__dirname, '../output/grants.csv'),
  header: [
    { id: 'id', title: 'ID' },
    { id: 'title', title: 'Title' },
    { id: 'topic_id', title: 'Topic ID' },
    { id: 'opening_date', title: 'Opening Date' },
    { id: 'deadline', title: 'Deadline' },
    { id: 'sector', title: 'Programme' },
    { id: 'budget', title: 'Budget' },
    { id: 'url', title: 'Detail Page' },
    { id: 'partner_search_url', title: 'Partner Search' },
    { id: 'description', title: 'Description' }
  ]
});

(async () => {
  await csvWriter.writeRecords(rows);
  console.log('📁 CSV export complete: output/grants.csv');
})();
