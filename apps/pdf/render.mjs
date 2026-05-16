// Real Puppeteer HTML->PDF renderer. Isolated so the server can be unit
// tested with an injected stub (no Chromium needed in CI).

export async function renderPdf(html) {
  const { default: puppeteer } = await import('puppeteer');
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' },
    });
  } finally {
    await browser.close();
  }
}
