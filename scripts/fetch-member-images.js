/**
 * 成员图片抓取脚本 - 服务器版本
 * 从坂道官网抓取成员图片URL
 * 
 * 用法: node fetch-member-images.js
 * 输出: ../sakamichi-blog-frontend/data/member-images.json
 */

import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 抓取樱坂46成员（官网API）
async function fetchSakurazakaMembers() {
    console.log('📸 抓取樱坂46成员...');

    try {
        const response = await fetch('https://sakurazaka46.com/s/s46/api/json/artist?ima=0000', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
            }
        });

        const data = await response.json();
        const members = [];

        if (data.artist) {
            data.artist.forEach(member => {
                if (member.image && member.name) {
                    members.push({
                        name: member.name,
                        imageUrl: member.image,
                        group: '樱坂46'
                    });
                }
            });
        }

        console.log(`  找到 ${members.length} 位成员`);
        return members;
    } catch (error) {
        console.error('  抓取失败:', error.message);
        return [];
    }
}

// 抓取日向坂46成员（官网API）
async function fetchHinatazakaMembers() {
    console.log('📸 抓取日向坂46成员...');

    try {
        const response = await fetch('https://www.hinatazaka46.com/s/official/api/json/artist?ima=0000', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
            }
        });

        const data = await response.json();
        const members = [];

        if (data.artist) {
            data.artist.forEach(member => {
                if (member.image && member.name) {
                    members.push({
                        name: member.name,
                        imageUrl: member.image,
                        group: '日向坂46'
                    });
                }
            });
        }

        console.log(`  找到 ${members.length} 位成员`);
        return members;
    } catch (error) {
        console.error('  抓取失败:', error.message);
        return [];
    }
}

// 抓取乃木坂46成员（HTML解析，因为没有公开API）
async function fetchNogizakaMembers() {
    console.log('📸 抓取乃木坂46成员...');
    console.log('  ⚠️ 乃木坂46暂不支持自动抓取，保留现有数据');

    // 乃木坂官网没有公开的成员API，且图片URL格式复杂
    // 建议手动维护或使用其他数据源
    return [];
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

    const [sakurazaka, hinatazaka] = await Promise.all([
        fetchSakurazakaMembers(),
        fetchHinatazakaMembers()
    ]);

    const newMembers = [...sakurazaka, ...hinatazaka];

    if (newMembers.length === 0) {
        console.log('\n❌ 未能抓取到成员数据');
        return;
    }

    // 合并数据：更新樱坂/日向坂，保留乃木坂
    const imageMap = { ...existingData.images };

    newMembers.forEach(m => {
        // 更新或添加
        imageMap[m.name] = {
            imageUrl: m.imageUrl,
            group: m.group
        };

        // 同时添加无空格版本（兼容性）
        const nameNoSpace = m.name.replace(/\s+/g, '');
        if (nameNoSpace !== m.name) {
            imageMap[nameNoSpace] = {
                imageUrl: m.imageUrl,
                group: m.group
            };
        }
    });

    const output = {
        lastUpdate: new Date().toISOString(),
        note: `成员真实图片 - 樱坂46、日向坂46为官网API自动更新，乃木坂46保留手动维护`,
        source: '官网API + 手动维护',
        images: imageMap
    };

    // 保存
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

    console.log(`\n✅ 成功更新 ${newMembers.length} 位成员`);
    console.log(`📁 保存到: ${outputPath}`);
    console.log(`📊 总计: ${Object.keys(imageMap).length} 条记录`);

    // 统计
    const stats = { '樱坂46': 0, '日向坂46': 0, '乃木坂46': 0 };
    Object.values(imageMap).forEach(m => {
        if (m.group && stats[m.group] !== undefined) {
            stats[m.group]++;
        }
    });

    console.log('\n📊 各团体统计：');
    Object.entries(stats).forEach(([group, count]) => {
        console.log(`  ${group}: ${count} 条`);
    });
}

main().catch(console.error);
