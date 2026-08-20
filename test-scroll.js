const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // 设置扁平窗口
  await page.setViewportSize({ width: 1400, height: 600 });

  await page.goto('http://localhost:8080');
  await page.waitForTimeout(1000);

  // 打开亲戚计算器
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.glass-card'));
    const kinCard = cards.find(c => c.textContent.includes('亲戚称呼'));
    if (kinCard) kinCard.click();
  });

  await page.waitForTimeout(800);

  // 连续点击"爸爸"构建长关系链
  for (let i = 0; i < 5; i++) {
    await page.click('.rk-rel-btn[data-word="爸爸"]');
    await page.waitForTimeout(150);
  }

  await page.waitForTimeout(500);

  // 检查样式
  const styles = await page.evaluate(() => {
    const wrap = document.querySelector('.rk-wrap');
    const result = document.querySelector('.rk-result');
    const card = document.querySelector('.rk-card');

    const wrapStyle = window.getComputedStyle(wrap);
    const resultStyle = window.getComputedStyle(result);
    const cardStyle = window.getComputedStyle(card);

    return {
      wrap: {
        overflow: wrapStyle.overflow,
        overflowY: wrapStyle.overflowY,
        maxHeight: wrapStyle.maxHeight,
        scrollHeight: wrap.scrollHeight,
        clientHeight: wrap.clientHeight
      },
      result: {
        overflow: resultStyle.overflow,
        overflowY: resultStyle.overflowY,
        maxHeight: resultStyle.maxHeight
      },
      card: {
        overflow: cardStyle.overflow,
        overflowY: cardStyle.overflowY,
        maxHeight: cardStyle.maxHeight,
        scrollHeight: card.scrollHeight,
        clientHeight: card.clientHeight
      }
    };
  });

  console.log('=== 样式检查 ===');
  console.log('rk-wrap:', styles.wrap);
  console.log('rk-result:', styles.result);
  console.log('rk-card:', styles.card);

  console.log('\n=== 问题诊断 ===');
  if (styles.wrap.overflowY !== 'visible') {
    console.log('❌ 问题: .rk-wrap 有 overflow-y:', styles.wrap.overflowY);
  } else {
    console.log('✅ .rk-wrap overflow-y 正确');
  }

  if (styles.card.overflowY === 'auto' && styles.card.maxHeight === '150px') {
    console.log('✅ .rk-card 滚动设置正确');
    if (styles.card.scrollHeight > styles.card.clientHeight) {
      console.log('✅ 卡片内容超出，应该有滚动条');
    }
  } else {
    console.log('❌ .rk-card 滚动设置有问题');
  }

  console.log('\n浏览器保持打开，请手动检查滚动条位置');
  console.log('按 Ctrl+C 关闭');

  await page.waitForTimeout(60000);
  await browser.close();
})();
