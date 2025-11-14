const puppeteer = require('puppeteer');

(async () => {
  const base = process.env.BASE_URL || 'http://localhost:5000';
  console.log('Running navigation test against', base);
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  try {
    await page.goto(base, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.nav-link');

    const links = await page.$$eval('.nav-link', nodes => nodes.map(n => ({ href: n.getAttribute('href'), text: n.textContent.trim() })));

    // We'll test these target hrefs in order if present
    const targets = ['index.html', 'pages/about.html', 'pages/services.html', 'pages/courses.html'];

    let allPass = true;

    for (const target of targets) {
      const link = links.find(l => l.href && l.href.includes(target));
      if (!link) {
        console.log(`SKIP target not found: ${target}`);
        allPass = false;
        continue;
      }

      // Click the link element by href selector
      await Promise.all([
        page.waitForTimeout(500), // small pause so SPA route flip can run
        page.evaluate((href) => {
          const a = Array.from(document.querySelectorAll('.nav-link')).find(x => x.getAttribute('href') && x.getAttribute('href').includes(href));
          if (a) a.click();
        }, target)
      ]);

      // Wait briefly and check active class
      await page.waitForTimeout(600);

      const activeHref = await page.$$eval('.nav-link', nodes => {
        const a = nodes.find(n => n.classList.contains('active'));
        return a ? a.getAttribute('href') : null;
      });

      const pass = activeHref && activeHref.includes(target.split('/').pop());
      console.log(`${pass ? 'PASS' : 'FAIL'} navigation -> ${target} (active: ${activeHref})`);
      if (!pass) allPass = false;
    }

    await browser.close();
    if (!allPass) process.exit(2);
    console.log('NAV TESTS PASSED');
    process.exit(0);
  } catch (err) {
    console.error('ERROR during navigation test:', err);
    try { await browser.close(); } catch(e){}
    process.exit(1);
  }
})();
