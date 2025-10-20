#!/bin/bash

# 🚀 Lighthouse 自动化测试脚本
# 使用方法: ./lighthouse-test.sh [url] [preset]

# 默认配置
URL="${1:-http://localhost:8000}"
DEVICE="${2:-mobile}"  # mobile 或 desktop
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_DIR="./lighthouse-reports"

# 创建报告目录
mkdir -p "$REPORT_DIR"

echo "🚀 开始 Lighthouse 测试..."
echo "📍 URL: $URL"
echo "📱 设备: $DEVICE"
echo ""

# 检查 URL 是否可访问
if curl -s --head "$URL" | head -n 1 | grep "HTTP" > /dev/null; then
    echo "✅ 网站可访问"
else
    echo "❌ 错误: 无法访问 $URL"
    echo "💡 提示: 请先启动本地服务器: python3 -m http.server 8000"
    exit 1
fi

echo ""
echo "⏳ 正在运行测试（这可能需要1-2分钟）..."
echo ""

# 运行 Lighthouse
if [ "$DEVICE" = "mobile" ]; then
    lighthouse "$URL" \
        --screenEmulation.mobile \
        --output html \
        --output json \
        --output-path "$REPORT_DIR/lighthouse-${DEVICE}-${TIMESTAMP}" \
        --chrome-flags="--headless" \
        --quiet
else
    lighthouse "$URL" \
        --preset=desktop \
        --output html \
        --output json \
        --output-path "$REPORT_DIR/lighthouse-${DEVICE}-${TIMESTAMP}" \
        --chrome-flags="--headless" \
        --quiet
fi

# 检查是否成功
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 测试完成！"
    echo "📊 报告已保存到: $REPORT_DIR/"
    echo "📄 HTML 报告: lighthouse-${DEVICE}-${TIMESTAMP}.report.html"
    echo "📄 JSON 数据: lighthouse-${DEVICE}-${TIMESTAMP}.report.json"
    echo ""
    echo "💡 打开 HTML 报告查看详细结果"
    
    # macOS 自动打开报告
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "$REPORT_DIR/lighthouse-${DEVICE}-${TIMESTAMP}.report.html"
    fi
else
    echo ""
    echo "❌ 测试失败"
    exit 1
fi
