// src/horizonImporter.js
const db = require('./db');

const sampleGrants = [
  {
    title: 'Horizon Europe – Digital Resilience Call',
    source: 'Horizon Europe',
    url: 'https://ec.europa.eu/.../digital-resilience',
    sector: 'Digital',
    deadline: '2025-06-01',
    eligibility: 'SMEs, research institutions, public bodies',
  },
  {
    title: 'Horizon Europe – Green Deal Cluster',
    source: 'Horizon Europe',
    url: 'https://ec.europa.eu/.../green-deal',
    sector: 'Sustainability',
    deadline: '2025-05-15',
    eligibility: 'Nonprofits, climate tech firms',
  },
];

function importGrants() {
  const stmt = db.prepare(`
    INSERT INTO grants (title, source, url, sector, deadline, eligibility)
    VALUES (@title, @source, @url, @sector, @deadline, @eligibility)
  `);

  sampleGrants.forEach(grant => stmt.run(grant));
  console.log('Sample Horizon Europe grants imported.');
}

if (require.main === module) importGrants();
