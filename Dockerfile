# ===== Backend =====
FROM python:3.13-slim AS backend

WORKDIR /app/backend
COPY backend/requirements.txt .

# pip mirror 加速
RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple && \
    pip install --no-cache-dir -r requirements.txt

# 中文字体 (wenquanyi ~8MB)
RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-wqy-zenhei \
    && rm -rf /var/lib/apt/lists/*
COPY backend/ .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]


# ===== Frontend build =====
FROM node:20-alpine AS frontend-build

# 接收构建参数，Next.js 在 build 时将 NEXT_PUBLIC_* 内联到 JS
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ .
RUN npm run build


# ===== Frontend runtime =====
FROM node:20-alpine AS frontend

WORKDIR /app/frontend
COPY --from=frontend-build /app/frontend/.next ./.next
COPY --from=frontend-build /app/frontend/public ./public
COPY --from=frontend-build /app/frontend/package.json ./package.json
COPY --from=frontend-build /app/frontend/node_modules ./node_modules
COPY --from=frontend-build /app/frontend/next.config.mjs ./next.config.mjs

EXPOSE 3000
CMD ["npm", "run", "start"]
