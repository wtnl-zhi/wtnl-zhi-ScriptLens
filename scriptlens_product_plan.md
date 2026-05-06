# ScriptLens — 导演分镜智能拆解平台 · 产品计划书

> 版本：v1.1 · 日期：2026-05-06 · 状态：待 OpenCode 实现

---

## 一、产品概述

### 一句话
导演/编剧的文字脚本 → 大模型智能拆解 → 在线可编辑分镜头表格 → 导出交付。

### 目标用户
影视导演、编剧、广告创意人员。

### 核心价值
将传统分镜工作中繁琐的手动拆解环节交给AI，导演只需专注创意修改。

---

## 二、功能模块

### 2.1 输入接入

| 方式 | 说明 |
|------|------|
| **文本粘贴** | 提供富文本编辑器/纯文本编辑区，导演直接粘贴脚本 |
| **文档上传** | 支持 PDF / Word (.docx) / Excel (.xlsx) / TXT → 后端解析 |

**解析策略**：
- PDF → PyMuPDF 直接提取纯文本
- Word → python-docx 直接提取
- Excel → openpyxl 提取单元格文字
- TXT → 直接读取
- LLM 清洗作为**可选增强**（用户可选"智能清洗"开关），非必经路径

### 2.2 智能分镜（核心）

用户点击「开始拆解」后：
1. 前端发送脚本文本到后端
2. 后端调 DeepSeek API（支持 flash / pro），Prompt 设计见下文
3. 返回结构化 JSON，包含每个镜头的字段
4. 前端渲染为可编辑表格

**分镜输出字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| 镜号 | int | 顺序编号（显示用，由 sort_order 派生） |
| 景别 | string | 远景/全景/中景/近景/特写/POV/过肩镜头等 |
| 时长 | float | 估算秒数 |
| 画面内容 | text | 角色动作、画面元素、镜头运动描述 |
| 场景氛围 | string | 情绪/色调/灯光风格关键词 |
| AI生图提示词 | text | 完整中文提示词，可直接喂给生图工具 |

### 2.3 在线分镜编辑（核心交互）

- **在线表格**：类 Airtable/飞书多维表格 体验，每行一个镜头
- 字段可**双击编辑**
- **拖拽调整镜头顺序**（集成 `@dnd-kit` + 排序状态异步保存）
- **添加/删除镜头行**
- 每行可**上传参考图**（预览+替换+删除）
- 选中镜头可**批量操作**（删除/复制/移动）

### 2.4 导出

| 格式 | 说明 |
|------|------|
| Excel (.xlsx) | 完整分镜表，含所有字段 |
| CSV | 通用数据交换格式 |
| PDF | 打印/交付版本 |
| 图片批量导出 | 所有镜头的参考图打包下载 |

### 2.5 账号系统

- 用户注册 / 登录（邮箱+密码）
- JWT 鉴权
- 每个用户拥有独立的 **项目列表** 和 **看板**

### 2.6 项目看板与历史存储

- 每个项目：名称 / 创建时间 / 最后编辑时间 / 状态（草稿/进行中/已完成）
- 过往项目可查看详情、复制、继续编辑
- 删除项目进回收站（软删除，保留30天后物理删除）

### 2.7 多人协作（v2 阶段）

- 项目分享链接（可设查看/编辑权限）
- 协作者实时在线编辑
- 修改记录 / 版本历史
- 评论（在特定镜头下留言）

---

## 三、AI 层设计

### 3.1 模型
- **DeepSeek Flash**（默认，速度快、成本低）
- **DeepSeek Pro**（可选，质量更高）
- BaseURL：`https://api.deepseek.com`（写死）
- API Key：用户自行填写，加密存储在后端

### 3.2 Prompt 设计

#### Prompt 1：文档智能清洗（可选环节）
```
Role: 你是一个文档解析助手。
Task: 从以下文档内容中提取所有纯文本文字。
Rules:
- 保留段落结构，每段用空行隔开
- 去除页眉、页脚、页码、目录、水印等无关信息
- 去除表格边框格式，只保留单元格文字内容（按原顺序拼接）
- 只输出纯文本，不要添加任何解释、评论或额外文字

文档内容：
{uploaded_content}
```

#### Prompt 2：分镜拆解（含 few-shot 示例）
```
Role: 你是资深电影分镜师，擅长将文字剧本拆解为专业分镜头。

Task: 分析以下剧本，将其拆解为连续的镜头序列。
每个镜头用 JSON 格式输出，最终返回 JSON 数组。

Output JSON fields:
{
  "shot_number": 1,
  "shot_type": "中景",
  "duration_sec": 3.0,
  "content": "主角推开窗户，晨光涌入房间，窗帘飘动",
  "atmosphere": "温暖、宁静、充满希望",
  "ai_prompt": "一只手推开木质窗户，温暖的金色晨光涌入房间，薄纱窗帘轻轻飘动，电影级布光，写实风格，4K画质，暖色调，景深柔焦，镜头光晕"
}

Example 1:
Input: "林深走进咖啡厅，环顾四周，在靠窗位置坐下。窗外下着雨。他点了杯美式，盯着雨发呆。"
Output:
[
  {
    "shot_number": 1,
    "shot_type": "全景",
    "duration_sec": 3.0,
    "content": "林深推开咖啡厅玻璃门，门铃轻响，雨水顺着伞尖滴落",
    "atmosphere": "潮湿、安静、略带忧郁",
    "ai_prompt": "咖啡厅玻璃门被推开，门铃轻响，雨水顺着黑色雨伞尖滴落在木地板上，暖黄灯光从店内透出，窗外灰暗雨天，电影质感，4K，浅景深"
  },
  {
    "shot_number": 2,
    "shot_type": "中景",
    "duration_sec": 2.5,
    "content": "林深环顾四周，目光扫过空位，走向靠窗座位",
    "atmosphere": "日常、安静",
    "ai_prompt": "年轻男性环顾咖啡厅内部，暖黄灯光照亮侧脸，身后雾气朦胧的玻璃窗，中景构图，自然表情，电影布光，写实风格"
  },
  {
    "shot_number": 3,
    "shot_type": "近景",
    "duration_sec": 4.0,
    "content": "林深坐下，视线穿过雨幕看向窗外，神情放空",
    "atmosphere": "孤独、沉思、静谧",
    "ai_prompt": "年轻男性坐在窗边，视线穿过布满雨滴的玻璃望向远处，咖啡杯在桌面冒着热气，侧脸剪影，蓝色冷调，玻璃上雨滴清晰可见，电影级构图，景深虚化背景"
  }
]

Example 2:
Input: "老师在黑板上写公式。学生们低头做笔记。突然下课铃响了。"
Output:
[
  {
    "shot_number": 1,
    "shot_type": "中景",
    "duration_sec": 5.0,
    "content": "老师背对镜头，在白板前快速书写数学公式，笔尖划过白板发出声音",
    "atmosphere": "专注、学术、安静",
    "ai_prompt": "教室白板前，老师背影书写数学公式，白色马克笔划过白板，日光灯照明，干净明亮的教室，写实纪录片风格，高清画质"
  },
  {
    "shot_number": 2,
    "shot_type": "俯拍",
    "duration_sec": 3.0,
    "content": "学生们低头在笔记本上奋笔疾书，笔尖在纸面移动",
    "atmosphere": "专注、紧张",
    "ai_prompt": "俯拍学生桌面，多本摊开的笔记本，圆珠笔在纸面快速书写，手指握笔，纸张纹理清晰，自然顶光，写实风格，浅景深焦点在笔尖"
  },
  {
    "shot_number": 3,
    "shot_type": "特写",
    "duration_sec": 1.5,
    "content": "墙上的扩音器突然响起刺耳的下课铃声，震动从喇叭传出",
    "atmosphere": "突然、打破宁静",
    "ai_prompt": "教室墙壁上的老式扩音器特写，喇叭网格纹路清晰，红色指示灯亮起，侧面光突出金属质感，电影级细节，4K画质"
  }
]

Rules:
1. 一个镜头只表达一个动作或一个画面变化
2. 当角色动作/场景/时间发生明显变化时切换镜头
3. 对白简短时与所在镜头合并，不单独成镜
4. AI提示词要完整、可直接用于生图，包含：主体描述 + 光线 + 色彩 + 氛围 + 画质参数
5. 只输出 JSON 数组，不要添加 markdown 代码块标记或其他文字

剧本内容：
{script_text}
```

### 3.3 调用流程

```
用户触发拆解
  → 前端 POST /api/storyboard/generate  { model: "flash", script_text: "..." }
  → 后端同步调用 DeepSeek API（P0），异步任务队列（P1+）
  → 超时/异常时自动重试（指数退避，最多3次）
  → 返回 JSON 分镜数据
  → 前端渲染表格
```

**P0 策略**：同步调用，前端 loading 等待（典型耗时 5-15s），避免引入 Celery/Redis 复杂度。
**P1 策略**：引入 Celery + Redis，改为异步 + 轮询，支持更大并发和更优 UX。

**熔断与容错**：
- DeepSeek API 超时 → 重试 3 次，每次等待 2s/4s/8s
- 返回非 JSON → 用正则提取 JSON 数组部分
- 完全失败 → 返回友好错误提示，引导用户重试或联系支持
- 前端兜底 loading 超过 60s 自动提示

---

## 四、技术架构

```
┌──────────────────────────────────────────────────────┐
│                   Frontend (Web)                      │
│  Next.js 14 (App Router) + TypeScript                │
│  Tailwind CSS + shadcn/ui (组件库)                    │
│  TanStack Table (分镜表格编辑+列定制)                  │
│  @dnd-kit (拖拽排序，与 TanStack Table 集成)          │
│  react-dropzone (文件拖拽上传)                        │
│  Zustand (状态管理)                                   │
│  React-PDF / Mammoth.js (文档预览)                    │
│  Responsive: Desktop / Tablet / Mobile               │
└──────────────────────┬───────────────────────────────┘
                       │ REST API
┌──────────────────────┴───────────────────────────────┐
│                   Backend                             │
│  Python FastAPI (异步 + OpenAPI 自动文档)              │
│  SQLAlchemy 2.0 + Alembic (ORM + 迁移)                │
│  PostgreSQL (主数据库，JSONB 存储分镜数据)              │
│  P0: 本地文件存储 / P1: MinIO / 阿里云 OSS            │
│  JWT + bcrypt (用户认证)                              │
│  python-docx / PyMuPDF / openpyxl (文档解析)          │
│  httpx / openai SDK (DeepSeek API 调用)               │
│  cryptography (AES 加密用户 DeepSeek Key)             │
└──────────────────────┬───────────────────────────────┘
                       │
┌──────────────────────┴───────────────────────────────┐
│                   AI Layer                            │
│  DeepSeek API (https://api.deepseek.com)              │
│  模型: flash (默认) / pro (可选)                      │
│  使用场景: 文档清洗 (可选) + 分镜拆解                  │
│  用户自配 API Key                                     │
└──────────────────────────────────────────────────────┘
```

### P0 最小技术栈（MVP）

| 组件 | 选型 | 说明 |
|------|------|------|
| 前端 | Next.js 14 + shadcn/ui + TanStack Table + @dnd-kit | |
| 后端 | FastAPI | 同步调用 DeepSeek，不用 Celery |
| 数据库 | PostgreSQL | 本地 docker-compose 启动 |
| 文件存储 | 本地文件系统 | P1 切 MinIO/S3 |
| 任务队列 | 无 | P0 同步，P1 引入 Celery + Redis |

---

## 五、数据库设计

### 核心表

```sql
-- 用户表
CREATE TABLE users (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                   VARCHAR(255) UNIQUE NOT NULL,
  password_hash           VARCHAR(255) NOT NULL,
  name                    VARCHAR(100) NOT NULL,
  encrypted_deepseek_key  TEXT,               -- AES 加密存储，cryptography 库
  created_at              TIMESTAMP DEFAULT NOW(),
  updated_at              TIMESTAMP DEFAULT NOW()
);

-- 项目表
CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  title           VARCHAR(200) NOT NULL DEFAULT '未命名项目',
  description     TEXT,
  status          VARCHAR(20) DEFAULT 'draft',  -- draft / active / completed / archived
  source_text     TEXT,                          -- 原始脚本全文
  deleted_at      TIMESTAMP,                     -- 软删除字段，NULL = 未删除
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- 分镜表（每个镜头一行）
CREATE TABLE storyboard_shots (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  shot_number           INT NOT NULL,              -- 显示用编号，由 sort_order 顺序派生
  shot_type             VARCHAR(50),               -- 景别
  duration_sec          FLOAT,                     -- 时长
  content               TEXT,                      -- 画面内容
  atmosphere            VARCHAR(200),              -- 氛围
  ai_prompt             TEXT,                      -- AI生图提示词
  reference_image_url   VARCHAR(500),              -- 参考图URL
  notes                 TEXT,                      -- 备注
  sort_order            INT DEFAULT 0,             -- 拖拽排序用（唯一排序依据）
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);

-- 项目协作者表 (v2)
CREATE TABLE project_collaborators (
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  role        VARCHAR(20) DEFAULT 'editor',  -- owner / editor / viewer
  joined_at   TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

-- 索引
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_deleted ON projects(deleted_at);
CREATE INDEX idx_shots_project_order ON storyboard_shots(project_id, sort_order);
```

### 设计说明

- **`storyboard_shots` 去掉了 `UNIQUE(project_id, shot_number)`**：拖拽排序时中间状态不会违反唯一约束
- **`shot_number` 仅为显示编号**：每次拖拽排序后，后端统一按 `sort_order` 顺序重算 `shot_number`
- **`deleted_at`** 支持软删除，后台定时任务清理 `deleted_at + 30 天` 的记录
- **`encrypted_deepseek_key`** 显式命名，说明是加密存储

---

## 六、API 路由设计

### 认证
```
POST   /api/auth/register             注册
POST   /api/auth/login                登录
POST   /api/auth/refresh              刷新 Token
GET    /api/auth/me                   当前用户信息
PUT    /api/auth/settings             更新设置（DeepSeek Key 等）
```

### 项目
```
GET    /api/projects?page=1&size=20   项目列表（分页）
POST   /api/projects                  创建项目
GET    /api/projects/{id}             项目详情（含分镜数据）
PUT    /api/projects/{id}             更新项目（标题/描述/状态）
DELETE /api/projects/{id}             删除项目（软删除）
```

### 分镜
```
POST   /api/storyboard/generate       触发 AI 拆解（P0 同步返回，P1 异步）
PUT    /api/storyboard/shots/{id}     更新单个镜头
POST   /api/storyboard/shots          新增镜头
DELETE /api/storyboard/shots/{id}     删除镜头
PUT    /api/storyboard/reorder        拖拽排序（批量更新 sort_order，重算 shot_number）
```

### 文件
```
POST   /api/upload/image              上传参考图（返回 URL）
POST   /api/upload/document           上传文档（PDF/Word/Excel）
DELETE /api/upload/image/{id}         删除图片
```

### 导出
```
GET    /api/export/{project_id}/excel     导出 Excel
GET    /api/export/{project_id}/csv       导出 CSV
GET    /api/export/{project_id}/pdf       导出 PDF
GET    /api/export/{project_id}/images    打包下载所有参考图
```

### 系统
```
GET    /api/health                    健康检查
```

### 设计说明

- **`GET /api/projects` 支持分页**：`page` 和 `size` 参数，默认 `page=1, size=20`
- **模型选择放 body**：`POST /api/storyboard/generate` body 包含 `{ model: "flash"|"pro", script_text: "..." }`，不用 query param
- **`GET /api/health`** 用于部署后验证数据库连接、服务状态

---

## 七、页面路由（前端）

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | 首页/登录 | 未登录进登录页，已登录进项目列表 |
| `/login` | 登录 | 邮箱+密码 |
| `/register` | 注册 | 邮箱+密码+昵称 |
| `/projects` | 项目列表/看板 | 卡片视图，含状态筛选 + 分页 |
| `/projects/new` | 新建项目 | 输入项目名+脚本输入页 |
| `/projects/{id}` | 分镜编辑 | 核心编辑器：脚本区+分镜表格+预览 |
| `/projects/{id}/settings` | 项目设置 | 改名/删除/协作者（v2） |
| `/settings` | 个人设置 | DeepSeek API Key / 修改密码 |

---

## 八、MVP 路线图

### P0 — 核心闭环（Week 1-3）

| 功能 | 说明 |
|------|------|
| 用户注册/登录 | JWT 认证 |
| 创建项目 + 脚本输入 | 文本粘贴区 |
| 触发 AI 分镜拆解 | 调 DeepSeek flash，**同步调用**，前端 loading |
| 在线表格编辑 | 增删行、双击编辑、**@dnd-kit 拖拽排序** |
| DeepSeek Key 配置 | 用户在设置页填写，AES 加密存储 |
| 导出 Excel | 基础导出 |
| 参考图上传 | 本地文件存储，每行贴图 + 预览 |

### P1 — 增强功能（Week 4-5）

| 功能 | 说明 |
|------|------|
| 文档上传解析 | PDF/Word/Excel → 规则提取 + 可选 LLM 清洗 |
| DeepSeek 异步调用 | 引入 Celery + Redis，异步任务 + 轮询 |
| 项目看板 | 卡片视图、状态管理、筛选、分页 |
| 导出 PDF / CSV | |
| DeepSeek pro 可选 | 用户在拆解时选模型 |
| 重试与容错 | 指数退避重试、非法 JSON 兜底提取 |
| 回收站 | 软删除 + 30天自动清理 |

### P2 — 协作（Week 6-7）

| 功能 | 说明 |
|------|------|
| 项目分享 | 链接 + 权限控制 |
| 多人编辑 | 协作者在线编辑 |
| 版本历史 | 修改记录 |
| 评论 | 镜头级评论 |
| MinIO/S3 文件存储 | 从本地文件系统迁移 |

---

## 九、项目结构

```
scriptlens/
├── frontend/                  # Next.js 14 + TypeScript
│   ├── src/
│   │   ├── app/               # App Router 页面
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── projects/
│   │   │   ├── settings/
│   │   │   └── ...
│   │   ├── components/        # 通用组件
│   │   │   ├── storyboard-table/  # 分镜表格（核心，集成 @dnd-kit）
│   │   │   ├── script-input/     # 脚本输入区
│   │   │   ├── upload-dropzone/  # 文件上传
│   │   │   └── ...
│   │   ├── lib/               # 工具函数、API client
│   │   └── store/             # Zustand stores
│   ├── package.json
│   └── ...
├── backend/                   # FastAPI
│   ├── app/
│   │   ├── api/               # 路由
│   │   ├── models/            # SQLAlchemy 模型
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # 业务逻辑
│   │   │   ├── deepseek.py    # DeepSeek API 调用（含重试+容错）
│   │   │   ├── parser.py      # 文档解析（规则提取）
│   │   │   ├── export.py      # 导出服务
│   │   │   └── encryption.py  # AES 加密工具
│   │   └── core/              # 配置、DB
│   ├── prompts/               # Prompt 配置文件（JSON）
│   │   ├── scripts_clean.json
│   │   └── storyboard_split.json
│   ├── alembic/               # 数据库迁移
│   ├── requirements.txt
│   └── ...
├── docker-compose.yml         # PostgreSQL（+ P1 加 Redis/MinIO）
├── .env.example
└── README.md
```

---

## 十、P0 较 v1.0 的主要变更总结

| 变更项 | v1.0 | v1.1（当前） |
|--------|------|-------------|
| 任务队列 | Celery + Redis（P0 即引入） | P0 同步调用，P1 再引入异步 |
| 文档解析 | 必须经过 LLM 清洗 | 规则提取优先，LLM 清洗可选 |
| 拖拽排序 | 未提具体实现 | 明确集成 `@dnd-kit` |
| shot_number 约束 | `UNIQUE(project_id, shot_number)` | 去掉 UNIQUE，仅作显示编号 |
| 软删除 | 无对应字段 | 增加 `deleted_at` 字段 |
| API 重试/容错 | 未提及 | 增加重试机制 + 非法 JSON 兜底 |
| Prompt | 无示例 | 增加 2 组 few-shot 示例 |
| 模型选择 | query param | 改为 body 参数 |
| 项目列表分页 | 无 | 增加 page/size 参数 |
| 健康检查 | 无 | 增加 `GET /api/health` |
| 设备分类 | "PC/平板/Mac/iPad" | "Desktop / Tablet / Mobile" |
| DeepSeek Key 字段 | `deepseek_key` | `encrypted_deepseek_key` |
| 文件存储 | P0 即 MinIO/OSS | P0 本地文件，P1 迁移 |
