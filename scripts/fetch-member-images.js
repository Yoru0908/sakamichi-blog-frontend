/**
 * 成员图片抓取脚本 - Playwright 版本
 * 使用真实浏览器绕过反爬，从坂道官网抓取成员图片URL
 * 
 * 用法: node scripts/fetch-member-images.js
 * 输出: data/member-images.json
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchWithBrowser(browser, apiUrl, refererUrl, groupName) {
    console.log(`📸 抓取${groupName}成员...`);
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        locale: 'ja-JP',
    });
    const page = await context.newPage();

    try {
        // 1. 先访问成员列表页，让浏览器获取必要的 Cookie
        console.log(`  访问首页获取 Cookie: ${refererUrl}`);
        await page.goto(refererUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // 2. 用浏览器内置 fetch（带 Cookie）调用 API
        console.log(`  调用 API: ${apiUrl}`);
        const data = await page.evaluate(async (url) => {
            const res = await fetch(url, {
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        }, apiUrl);

        const members = [];
        if (data.artist) {
            data.artist.forEach(member => {
                if (member.image && member.name) {
                    members.push({
                        name: member.name,
                        imageUrl: member.image,
                        group: groupName
                    });
                }
            });
        }

        console.log(`  找到 ${members.length} 位成员`);
        return members;
    } catch (error) {
        console.error(`  抓取失败: ${error.message}`);
        return [];
    } finally {
        await context.close();
    }
}

async function main() {
    console.log('🚀 开始抓取成员图片...\n');

    // 读取现有数据（保留乃木坂）
    const outputPath = path.join(__dirname, '../data/member-images.json');
    let existingData = { images: {} };

    if (fs.existsSync(outputPath)) {
        try {
            existingData = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
            console.log(`📂 读取现有数据: ${Object.keys(existingData.images || {}).length} 位成员\n`);
        } catch (e) {
            console.warn('⚠️ 无法读取现有数据，将创建新文件');
        }
    }

    const browser = await chromium.launch({ headless: true });

    try {
        const [sakurazaka, hinatazaka] = await Promise.all([
            fetchWithBrowser(
                browser,
                'https://sakurazaka46.com/s/s46/api/json/artist?ima=0000',
                'https://sakurazaka46.com/s/s46/artist/list',
                '樱坂46'
            ),
            fetchWithBrowser(
                browser,
                'https://www.hinatazaka46.com/s/official/api/json/artist?ima=0000',
                'https://www.hinatazaka46.com/s/official/artist/list',
                '日向坂46'
            ),
        ]);

        const newMembers = [...sakurazaka, ...hinatazaka];

        if (newMembers.length === 0) {
            console.log('\n❌ 未能抓取到成员数据，保留现有数据不变');
            process.exit(0);
        }

        // 合并数据：更新樱坂/日向坂，保留乃木坂
        const imageMap = { ...existingData.images };

        newMembers.forEach(m => {
            imageMap[m.name] = { imageUrl: m.imageUrl, group: m.group };
            // 同时添加无空格版本（兼容性）
            const nameNoSpace = m.name.replace(/\s+/g, '');
            if (nameNoSpace !== m.name) {
                imageMap[nameNoSpace] = { imageUrl: m.imageUrl, group: m.group };
            }
        });

        const output = {
            lastUpdate: new Date().toISOString(),
            note: '成员真实图片 - 樱坂46、日向坂46为官网API自动更新，乃木坂46保留手动维护',
            source: '官网API + 手动维护',
            images: imageMap
        };

        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

        console.log(`\n✅ 成功更新 ${newMembers.length} 位成员`);
        console.log(`📁 保存到: ${outputPath}`);
        console.log(`📊 总计: ${Object.keys(imageMap).length} 条记录`);

        const stats = { '樱坂46': 0, '日向坂46': 0, '乃木坂46': 0 };
        Object.values(imageMap).forEach(m => {
            if (m.group && stats[m.group] !== undefined) stats[m.group]++;
        });
        console.log('\n📊 各团体统计：');
        Object.entries(stats).forEach(([group, count]) => {
            console.log(`  ${group}: ${count} 条`);
        });
    } finally {
        await browser.close();
    }
}

main().catch(console.error);
