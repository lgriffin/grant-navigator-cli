// src/cli.js
const yargs = require('yargs');
const db = require('./db');

yargs
  .command('list', 'List all grants', {}, () => {
    const rows = db.prepare('SELECT * FROM grants').all();
    console.table(rows);
  })
  .command('search [term]', 'Search grant titles', {}, argv => {
    const rows = db.prepare('SELECT * FROM grants WHERE title LIKE ?').all(`%${argv.term}%`);
    console.table(rows);
  })
  .command('bookmark <id>', 'Bookmark a grant by ID', {}, argv => {
    db.prepare('INSERT INTO bookmarks (grant_id) VALUES (?)').run(argv.id);
    console.log(`Bookmarked grant ID ${argv.id}`);
  })
  .command('bookmarks', 'List bookmarks', {}, () => {
    const rows = db.prepare(`
      SELECT b.id, g.title, g.deadline, b.bookmarked_at
      FROM bookmarks b
      JOIN grants g ON b.grant_id = g.id
    `).all();
    console.table(rows);
  })
  .demandCommand()
  .help()
  .argv;
