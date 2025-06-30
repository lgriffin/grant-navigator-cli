// src/scrapeHorizonDetails.js
const { chromium } = require('playwright');
const db = require('./db');

async function scrapeCalls() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  const detailPage = await browser.newPage();

  const maxPages = 20;
  const allCalls = [];

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const listUrl = `https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/calls-for-proposals?pageNumber=${pageNum}`;
    console.log(`🌐 Scraping Page ${pageNum}: ${listUrl}`);
    await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(5000);

    const pageCalls = await page.$$eval('eui-card', cards => {
      return cards.map(card => {
        const text = card.innerText;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

        const title = lines[0];
        const deadlineLine = lines.find(l => l.toLowerCase().includes('deadline'));
        const openingLine = lines.find(l => l.toLowerCase().includes('opening'));
        const programmeLine = lines.find(l => l.toLowerCase().includes('programme'));
        const statusLine = lines.find(l => l.match(/Forthcoming|Open for submission/i));
        const topicId = lines.find(l => l.startsWith('HORIZON-'))?.split(' ')[0];

        return {
          title,
          deadline: deadlineLine?.split(':').pop().trim() || '',
          openingDate: openingLine?.split(':').pop().trim() || '',
          programme: programmeLine || 'Unknown',
          status: statusLine || '',
          topicId
        };
      });
    });

    const filtered = pageCalls.filter(c =>
      c.topicId &&
      c.programme.toLowerCase().includes('horizon') &&
      (c.status.includes('Forthcoming') || c.status.includes('Open for submission'))
    );

    console.log(`✅ Page ${pageNum}: Total ${pageCalls.length}, Kept ${filtered.length}`);
    if (filtered.length === 0) break;

    allCalls.push(...filtered);
  }

  const stmt = db.prepare(`
    INSERT INTO grants (title, source, url, sector, deadline, eligibility, topic_id, opening_date, description, budget, partner_search_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const call of allCalls) {
    const topicUrl = `https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/${call.topicId}`;
    console.log(`🔍 Visiting ${call.topicId}`);

    try {
      await detailPage.goto(topicUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await detailPage.waitForTimeout(3000);

      const description = await detailPage.$eval('div.topic-description', el => el.innerText).catch(() => '');
      const budget = await detailPage.textContent('text=Budget overview').catch(() => '');
      const partnerSearchUrl = await detailPage.$eval('a[href*="partner-search"]', a => a.href).catch(() => null);

      stmt.run(
        call.title,
        'Horizon Europe',
        topicUrl,
        call.programme || 'Unknown',
        call.deadline,
        'See portal for eligibility',
        call.topicId,
        call.openingDate,
        description,
        budget || '',
        partnerSearchUrl || ''
      );

      console.log(`✅ Inserted: ${call.title}`);
    } catch (err) {
      console.warn(`⚠️ Failed to process: ${call.title}`);
      console.error(err.message);
    }
  }

  await browser.close();
  console.log(`🎉 Done! Inserted ${allCalls.length} filtered Horizon Europe grants.`);
}

scrapeCalls().catch(err => {
  console.error('❌ Fatal Error:\n', err);
});
