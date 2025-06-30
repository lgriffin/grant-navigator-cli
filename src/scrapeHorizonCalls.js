const { chromium } = require('playwright');
const db = require('./db');

async function scrapeCalls() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  const detailPage = await browser.newPage();

  db.exec('DELETE FROM grants;');
  console.log('🧹 Cleared previous grants from the database.');

  const allCalls = [];
  let currentPage = 1;

  await page.goto('https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/calls-for-proposals', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  while (true) {
    await page.waitForTimeout(5000);

    const pageCalls = await page.$$eval('eui-card', (cards) => {
      return cards.map(card => {
        const text = card.innerText;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

        const title = lines[0];
        const deadlineLine = lines.find(l => l.toLowerCase().includes('deadline'));
        const openingLine = lines.find(l => l.toLowerCase().includes('opening'));
        const programmeLine = lines.find(l => l.toLowerCase().includes('programme'));
        const statusLine = lines.find(l => l.match(/forthcoming|open/i));
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

    const filtered = pageCalls
      .filter(c =>
        c.topicId &&
        c.programme.toLowerCase().includes('horizon') &&
        (c.status?.toLowerCase().includes('forthcoming') || c.status?.toLowerCase().includes('open'))
      )
      .map(c => ({ ...c, page: currentPage }));

    console.log(`📄 Page ${currentPage}: Total ${pageCalls.length}, Kept ${filtered.length}`);
    filtered.forEach(call => {
      console.log(`  📌 ${call.title} [page ${call.page}]`);
    });

    allCalls.push(...filtered);

    const nextButton = await page.$('button[aria-label="Go to next page"]');
    const isDisabled = await nextButton?.getAttribute('aria-disabled') === 'true';

    if (!nextButton || isDisabled) {
      console.log('🛑 Reached last page.');
      break;
    }

    const firstTitle = pageCalls[0]?.title || '';
    console.log(`➡️ Navigating to page ${currentPage + 1}...`);
    await nextButton.click();

    console.log('⏳ Waiting for page content to change...');
    await page.waitForFunction(
      (oldTitle) => {
        const card = document.querySelector('eui-card');
        return card && !card.innerText.includes(oldTitle);
      },
      firstTitle,
      { timeout: 15000 }
    );

    currentPage++;
  }

  const stmt = db.prepare(`
    INSERT INTO grants (
      title, source, url, sector, deadline, eligibility,
      topic_id, opening_date, description, budget,
      partner_search_url, source_page
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const call of allCalls) {
    const topicUrl = `https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/${call.topicId}`;
    console.log(`🔍 Visiting: ${call.topicId}`);

    try {
      await detailPage.goto(topicUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
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
        partnerSearchUrl || '',
        call.page
      );

      console.log(`✅ Inserted: ${call.title} [page ${call.page}]`);
    } catch (err) {
      console.warn(`⚠️ Failed to scrape details for: ${call.title}`);
      console.error(err.message);
    }
  }

  await browser.close();
  console.log(`🎉 Done. Inserted ${allCalls.length} filtered Horizon Europe calls.`);
}

scrapeCalls().catch(err => {
  console.error('❌ Fatal error:', err);
});
