#!/bin/bash
set -e

echo "=== ScriptLens 一键部署 ==="

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "正在安装 Docker..."
    curl -fsSL https://get.docker.com | bash
fi

# 克隆代码
if [ ! -d "ScriptLens" ]; then
    git clone https://github.com/wtnl-zhi/wtnl-zhi-ScriptLens.git
fi
cd ScriptLens

# 生成 JWT 密钥
export JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "scriptlens-default-secret-change-me")

# 启动
echo "正在启动服务..."
docker compose up -d

echo ""
echo "✅ 部署完成！"
echo "   前端: http://$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}'):3000"
echo "   API:  http://localhost:8000"
echo ""
echo "首次使用请注册账号，然后在设置页配置 DeepSeek API Key"
