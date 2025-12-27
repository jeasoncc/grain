/**
 * Puppeteer 测试脚本
 *
 * 运行方式: npx tsx apps/desktop/src/test/puppeteer-test.ts
 */

import puppeteer from "puppeteer";

async function testPuppeteer() {
	console.log("🚀 启动 Puppeteer 测试...");

	try {
		// 启动浏览器
		const browser = await puppeteer.launch({
			headless: true, // 无头模式
		});

		console.log("✅ 浏览器启动成功");

		// 创建新页面
		const page = await browser.newPage();
		console.log("✅ 新页面创建成功");

		// 访问一个简单的网页
		await page.goto("https://example.com");
		console.log("✅ 页面导航成功");

		// 获取页面标题
		const title = await page.title();
		console.log(`📄 页面标题: ${title}`);

		// 获取页面内容
		const content = await page.evaluate(() => {
			const h1 = document.querySelector("h1");
			return h1?.textContent || "No h1 found";
		});
		console.log(`📝 H1 内容: ${content}`);

		// 截图测试
		await page.screenshot({
			path: "apps/desktop/puppeteer-test-screenshot.png",
		});
		console.log("📸 截图已保存到 apps/desktop/puppeteer-test-screenshot.png");

		// 关闭浏览器
		await browser.close();
		console.log("✅ 浏览器已关闭");

		console.log("\n🎉 Puppeteer 测试完成！所有功能正常工作。");
	} catch (error) {
		console.error("❌ Puppeteer 测试失败:", error);
		process.exit(1);
	}
}

testPuppeteer();
