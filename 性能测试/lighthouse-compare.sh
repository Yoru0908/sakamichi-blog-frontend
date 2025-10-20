#!/bin/bash

# 🔄 Lighthouse 对比测试脚本
# 同时测试移动端和桌面端，生成对比报告

URL="${1:-http://localhost:8000}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_DIR="./lighthouse-reports"

mkdir -p "$REPORT_DIR"

echo "🔄 开始完整性能测试（移动端 + 桌面端）"
echo "📍 URL: $URL"
echo ""

# 检查网站
if ! curl -s --head "$URL" | head -n 1 | grep "HTTP" > /dev/null; then
    echo "❌ 错误: 无法访问 $URL"
    echo "💡 提示: python3 -m http.server 8000"
    exit 1
fi

echo "⏳ 测试移动端性能..."
lighthouse "$URL" \
    --screenEmulation.mobile \
    --output html \
    --output json \
    --output-path "$REPORT_DIR/${TIMESTAMP}-mobile" \
    --chrome-flags="--headless" \
    --quiet

echo ""
echo "⏳ 测试桌面端性能..."
lighthouse "$URL" \
    --preset=desktop \
    --output html \
    --output json \
    --output-path "$REPORT_DIR/${TIMESTAMP}-desktop" \
    --chrome-flags="--headless" \
    --quiet

echo ""
echo "✅ 测试完成！"
echo ""
echo "📊 报告目录: $REPORT_DIR/"
echo "   📱 移动端: ${TIMESTAMP}-mobile.report.html"
echo "   💻 桌面端: ${TIMESTAMP}-desktop.report.html"
echo ""

# 提取分数（如果安装了 jq）
if command -v jq &> /dev/null; then
    echo "📈 性能评分:"
    echo ""
    
    MOBILE_PERF=$(jq '.categories.performance.score * 100' "$REPORT_DIR/${TIMESTAMP}-mobile.report.json" 2>/dev/null)
    DESKTOP_PERF=$(jq '.categories.performance.score * 100' "$REPORT_DIR/${TIMESTAMP}-desktop.report.json" 2>/dev/null)
    
    echo "   📱 移动端性能: ${MOBILE_PERF}分"
    echo "   💻 桌面端性能: ${DESKTOP_PERF}分"
    echo ""
fi

# macOS 自动打开报告
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "$REPORT_DIR/${TIMESTAMP}-mobile.report.html"
    open "$REPORT_DIR/${TIMESTAMP}-desktop.report.html"
fi

echo "💡 提示: 安装 jq 可查看更详细的分数对比"
echo "   brew install jq"
