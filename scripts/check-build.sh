#!/bin/bash

# GitHub Actions 构建状态检查脚本
# 循环检查直到构建完成或失败

# 代理设置
export http_proxy="http://fuck.gfw:1080"
export https_proxy="http://fuck.gfw:1080"
export HTTP_PROXY="http://fuck.gfw:1080"
export HTTPS_PROXY="http://fuck.gfw:1080"

# GitHub 仓库（可通过环境变量 GITHUB_REPO 或第一个参数指定）
REPO="${GITHUB_REPO:-${1:-ooeooo/webapp-hub}}"
INTERVAL=${2:-15}  # 检查间隔（秒），可通过第二个参数自定义

# 自动获取最新构建 ID
RUN_ID=$(gh run list -R "$REPO" --limit 1 --json databaseId -q '.[0].databaseId')

if [ -z "$RUN_ID" ]; then
    echo "❌ 无法获取最新构建 ID"
    exit 1
fi

echo "🔍 监控 GitHub Actions 构建: $REPO (ID: $RUN_ID)"
echo "⏱️  检查间隔: ${INTERVAL}s"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

while true; do
    # 获取运行状态
    STATUS=$(gh run view -R "$REPO" "$RUN_ID" --json status,conclusion -q '.status')
    CONCLUSION=$(gh run view -R "$REPO" "$RUN_ID" --json status,conclusion -q '.conclusion')
    
    # 获取当前时间
    TIMESTAMP=$(date '+%H:%M:%S')
    
    if [ "$STATUS" = "completed" ]; then
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        
        if [ "$CONCLUSION" = "success" ]; then
            echo "✅ [$TIMESTAMP] 构建成功!"
            echo ""
            gh run view -R "$REPO" "$RUN_ID"
            exit 0
        else
            echo "❌ [$TIMESTAMP] 构建失败! (结论: $CONCLUSION)"
            echo ""
            gh run view -R "$REPO" "$RUN_ID"
            echo ""
            echo "📋 失败日志:"
            gh run view -R "$REPO" "$RUN_ID" --log-failed 2>&1 | tail -50
            exit 1
        fi
    else
        # 获取各任务状态
        JOBS_STATUS=$(gh run view -R "$REPO" "$RUN_ID" --json jobs -q '.jobs[] | "\(.name): \(.status) \(if .conclusion then "(\(.conclusion))" else "" end)"')
        
        echo -ne "\r\033[K⏳ [$TIMESTAMP] 状态: $STATUS"
        
        # 每分钟显示详细进度
        if [ $(($(date +%s) % 60)) -lt $INTERVAL ]; then
            echo ""
            echo "$JOBS_STATUS" | while read -r line; do
                case "$line" in
                    *completed*success*) echo "  ✅ $line" ;;
                    *completed*failure*) echo "  ❌ $line" ;;
                    *in_progress*) echo "  🔄 $line" ;;
                    *queued*) echo "  ⏸️  $line" ;;
                    *) echo "  ⚪ $line" ;;
                esac
            done
        fi
    fi
    
    sleep "$INTERVAL"
done

