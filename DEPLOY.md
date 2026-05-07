# 部署指南

## 前置要求
- Docker & Docker Compose
- 域名（可选，用于 Nginx 反向代理）

## 快速部署

### 1. 克隆并构建
```bash
git clone <repo-url> scriptlens
cd scriptlens
docker compose build
```

### 2. 启动
```bash
# 设置 JWT 密钥（生产环境必须修改）
export JWT_SECRET=your-strong-random-secret-here

docker compose up -d
```

### 3. 访问
- 前端: http://localhost:3000
- API:  http://localhost:8000

### 4. 配置 Nginx（如有域名）
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /uploads/ {
        proxy_pass http://localhost:8000;
    }
}
```

### 5. 升级
```bash
git pull
docker compose build
docker compose up -d
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| JWT_SECRET | JWT 签名密钥（必改） | change-me-in-production |
| NEXT_PUBLIC_API_URL | 前端引用的 API 地址 | http://localhost:8000 |

## 数据持久化
- SQLite 数据库和上传文件存储在 Docker volume `appdata` 中
- 备份: `docker run --rm -v appdata:/data -v $(pwd):/backup alpine tar czf /backup/scriptlens-backup.tar.gz /data/`
