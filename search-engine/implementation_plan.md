# Search Engine Implementation Plan

> 專案類型：搜尋引擎  
> 預計技術棧：Rust (backend) + Next.js (frontend) + PostgreSQL + Tantivy (全文檢索)

---

## 目錄

1. [專案概述](#1-專案概述)
2. [技術選擇與理由](#2-技術選擇與理由)
3. [系統架構](#3-系統架構)
4. [資料模型](#4-資料模型)
5. [API 設計](#5-api-設計)
6. [實作階段規劃](#6-實作階段規劃)
7. [目錄結構](#7-目錄結構)
8. [資料庫 Schema](#8-資料庫-schema)
9. [部署與運維](#9-部署與運維)
10. [附錄：核心演算法說明](#10-附錄核心演算法說明)

---

## 1. 專案概述

### 1.1 目標

建立一個具備以下功能的搜尋引擎：

- **網頁爬蟲（Crawler）**：從指定種子 URL 開始，遞迴抓取網頁內容
- **全文檢索（Full-text Search）**：對抓取內容建立倒排索引（Inverted Index），支援關鍵字搜尋
- **排名演算法（Ranking）**：實作 TF-IDF 與 BM25 評分機制
- **搜尋 API**：RESTful API 提供查詢介面
- **前端介面**：類似 Google 風格的搜尋頁面，含搜尋結果展示、分頁、高亮關鍵字

### 1.2 非目標

- 不處理 JavaScript 渲染（不實作 Headless Browser）
- 不支援圖片/影片搜尋
- 不支援即時索引更新（索引為批次重建）
- 不處理 HTTPS 證書驗證問題（接受自簽證書）

### 1.3 適用場景

- 個人/團隊內部知識庫搜尋
- 特定領域的垂直搜尋（如技術文件、學術論文）
- 教育用途：理解搜尋引擎運作原理

---

## 2. 技術選擇與理由

| 元件 | 技術 | 理由 |
|------|------|------|
| 後端語言 | **Rust** | 效能接近 C/C++，記憶體安全，適合高併發 I/O 與文字處理 |
| Web 框架 | **Actix-web** | Rust 生態系最成熟的非同步 HTTP 框架，benchmark 表現頂尖 |
| 全文檢索 | **Tantivy** | Rust 原生全文檢索庫，Lucene 等級的索引能力，無需 JVM |
| 資料庫 | **PostgreSQL** | 儲存網頁原始資料、爬蟲佇列、使用者資料 |
| 前端框架 | **Next.js 14 (App Router)** | SSR 提升 SEO，React Server Component 減少 client JS |
| UI 元件 | **Tailwind CSS + shadcn/ui** | 快速建構類似 Google 的簡潔介面 |
| 容器化 | **Docker + docker-compose** | 統一開發與部署環境 |
| 反向代理 | **Nginx / Caddy** | TLS 終止、靜態檔案服務 |

### 2.1 為什麼選 Rust 而不是 Python/Node.js？

- 搜尋引擎的核心操作是**大量文字處理 + 併發 IO**（網路請求、磁碟讀寫）
- Rust 的 `async`/`await` 生態（Tokio）提供與 Node.js 相當的並發能力，但無 GC 暫停
- Tantivy 是 Rust 生態中唯一的成熟全文檢索庫，效能接近 Elasticsearch 底層的 Lucene
- Python 的 GIL 在高吞吐場景下需要額外進程管理，Node.js 的單線程對 CPU 密集的 ranking 計算不利

---

## 3. 系統架構

```
┌─────────────────────────────────────────────────────────────┐
│                       使用者瀏覽器                           │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP/HTTPS
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Nginx / Caddy (反向代理)                  │
│          靜態檔案服務 + TLS 終止 + 請求路由                   │
└──────────┬──────────────────────────────┬──────────────────┘
           │ /api/*                       │ /*
           ▼                              ▼
┌──────────────────────┐   ┌──────────────────────────────┐
│  Rust API Server     │   │  Next.js Server (SSR)        │
│  (Actix-web)         │   │  - Server Components         │
│  - POST /api/search  │   │  - API Route Handlers        │
│  - POST /api/crawl   │   │  - Static Generation         │
│  - GET  /api/status  │   └──────────┬───────────────────┘
│  - GET  /api/index   │              │
└──────┬───────────────┘              │
       │                              │
       ▼                              ▼
┌──────────────┐   ┌──────────────────────────────────────┐
│  PostgreSQL   │   │  Tantivy Index (磁碟檔案)             │
│  - pages      │   │  - inverted_index/                   │
│  - crawl_queue│   │  - doc_store/                        │
│  - domains    │   │  - metadata                          │
│  - users      │   └──────────────────────────────────────┘
└──────────────┘
       ▲
       │ HTTP (非同步爬取)
┌──────┴──────────────┐
│  Crawler Worker      │
│  (Rust, 獨立進程)    │
│  - URL Frontier      │
│  - HTML Parser       │
│  - Link Extractor    │
│  - Robots.txt 解析   │
│  - Polite Delay      │
└─────────────────────┘
```

### 3.1 核心模組說明

#### 3.1.1 Crawler（爬蟲模組）

```rust
// 簡化架構
pub struct Crawler {
    frontier: UrlFrontier,       // URL 佇列（優先權佇列）
    http_client: Client,         // reqwest 非同步 HTTP 客戶端
    parser: HtmlParser,          // HTML 解析器（提取文字與連結）
    robots_cache: RobotsCache,   // robots.txt 快取
    politeness: PolitenessPolicy,// 禮貌延遲策略
}

impl Crawler {
    async fn crawl_loop(&self) -> Result<()> {
        loop {
            let url = self.frontier.dequeue().await?;
            if !self.robots_cache.allowed(&url).await? {
                continue;
            }
            let html = self.http_client.fetch(&url).await?;
            let (text, links) = self.parser.extract(&html);
            self.store_page(&url, &text).await?;
            for link in self.filter_links(&links) {
                self.frontier.enqueue(link).await?;
            }
            tokio::time::sleep(self.politeness.delay(&url)).await;
        }
    }
}
```

**關鍵設計決策：**
- 非同步 IO（Tokio + reqwest）處理大量並發請求
- URL Frontier 使用優先權佇列：同一 domain 的請求間加入延遲（Polite Crawling）
- Robots.txt 快取避免重複請求
- 連結過濾：去除重複 URL、限制 domain 範圍、忽略非 HTML 資源

#### 3.1.2 Indexer（索引模組）

```rust
use tantivy::{Index, Document};
use tantivy::schema::*;

pub struct Indexer {
    index: Index,
    schema: Schema,
}

impl Indexer {
    pub fn build_schema() -> Schema {
        let mut schema_builder = Schema::builder();
        schema_builder.add_text_field("title", TEXT | STORED);
        schema_builder.add_text_field("body", TEXT);
        schema_builder.add_text_field("url", STRING | STORED);
        schema_builder.add_text_field("domain", STRING);
        schema_builder.add_u64_field("crawl_time", STORED);
        schema_builder.build()
    }

    pub fn index_page(&self, page: &Page) -> Result<()> {
        let mut doc = Document::new();
        doc.add_text(self.schema.get_field("title"), &page.title);
        doc.add_text(self.schema.get_field("body"), &page.body);
        doc.add_text(self.schema.get_field("url"), &page.url);
        doc.add_text(self.schema.get_field("domain"), &page.domain);
        self.index.writer()?.add_document(doc)?;
        Ok(())
    }
}
```

#### 3.1.3 Searcher（搜尋模組）

```rust
use tantivy::query::{QueryParser, BooleanQuery, Occur};
use tantivy::collector::TopDocs;
use tantivy::tokenizer::TextAnalyzer;

pub struct Searcher {
    index: Index,
    searcher: IndexReader,
    schema: Schema,
}

impl Searcher {
    pub fn search(&self, query_str: &str, page: usize, size: usize) -> Result<SearchResult> {
        let query_parser = QueryParser::for_index(&self.index, vec![
            self.schema.get_field("title"),
            self.schema.get_field("body"),
        ]);
        
        // 支援布林查詢：+必須 -排除 一般選用
        let query = query_parser.parse_query(query_str)?;
        let top_docs = self.searcher.searcher().search(
            &query,
            &TopDocs::with_limit(size).and_offset(page * size),
        )?;

        // 計算總結果數（近似值）
        let total = self.approx_count(&query)?;

        Ok(SearchResult {
            hits: top_docs.into_iter().map(|(score, doc_addr)| {
                let doc = self.searcher.searcher().doc(doc_addr)?;
                Hit {
                    title: doc.get_first(self.schema.get_field("title")),
                    url: doc.get_first(self.schema.get_field("url")),
                    snippet: self.generate_snippet(doc, query_str),
                    score,
                }
            }).collect(),
            total,
            page,
        })
    }

    // 生成文字片段並高亮關鍵字
    fn generate_snippet(&self, doc: Document, query: &str) -> String { ... }
}
```

#### 3.1.4 Ranking（排名模組）

實作 BM25 演算法，這也是 Elasticsearch/Lucene 使用的預設排名演算法：

```
BM25 公式：

score(D, Q) = Σ(q_i in Q) IDF(q_i) × TF_BM25(q_i, D)

其中：
TF_BM25(q, D) = f(q, D) × (k1 + 1) / (f(q, D) + k1 × (1 - b + b × |D| / avgdl))
IDF(q) = log((N - n(q) + 0.5) / (n(q) + 0.5) + 1)

f(q, D)  = term q 在文件 D 中的出現次數
|D|      = 文件 D 的長度
avgdl    = 平均文件長度
N        = 總文件數
n(q)     = 包含 term q 的文件數
k1       = 飽和參數（預設 1.2）
b        = 長度正規化參數（預設 0.75）
```

Tantivy 內建 BM25 實作，可直接使用。若需自訂評分：
```rust
use tantivy::score::ScoreComputer;

pub struct CustomScorer {
    page_rank: HashMap<Url, f64>,
    recency_weight: f64,
}

impl CustomScorer {
    fn score(&self, bm25_score: f32, url: &Url, age_hours: f64) -> f32 {
        let pr = self.page_rank.get(url).copied().unwrap_or(0.0) as f32;
        let recency = (-age_hours / 24.0).exp() as f32;
        bm25_score * (1.0 + 0.2 * pr) * (1.0 + 0.1 * recency)
    }
}
```

---

## 4. 資料模型

### 4.1 PostgreSQL Schema

```sql
-- 網域白名單/黑名單
CREATE TABLE domains (
    id          SERIAL PRIMARY KEY,
    domain      VARCHAR(255) UNIQUE NOT NULL,
    allowed     BOOLEAN DEFAULT true,
    robots_txt  TEXT,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- 已抓取的網頁
CREATE TABLE pages (
    id          SERIAL PRIMARY KEY,
    url         TEXT UNIQUE NOT NULL,
    domain_id   INTEGER REFERENCES domains(id),
    title       TEXT,
    body        TEXT,                     -- 純文字內容（去除 HTML 標籤）
    html        TEXT,                     -- 原始 HTML（可選）
    http_status INTEGER,
    content_type VARCHAR(128),
    crawl_time  TIMESTAMP DEFAULT NOW(),
    last_fetch  TIMESTAMP,
    fetch_count INTEGER DEFAULT 0,
    checksum    VARCHAR(64)              -- 內容雜湊，用於偵測變更
);

-- 爬蟲佇列
CREATE TABLE crawl_queue (
    id          SERIAL PRIMARY KEY,
    url         TEXT NOT NULL,
    domain_id   INTEGER REFERENCES domains(id),
    depth       INTEGER DEFAULT 0,        -- 爬取深度
    priority    INTEGER DEFAULT 0,        -- 優先權（越高越先）
    status      VARCHAR(16) DEFAULT 'pending',  -- pending, processing, done, error
    enqueued_at TIMESTAMP DEFAULT NOW(),
    started_at  TIMESTAMP,
    finished_at TIMESTAMP,
    error_msg   TEXT
);

-- 超連結關係（用於 PageRank 計算）
CREATE TABLE links (
    id          SERIAL PRIMARY KEY,
    source_url  TEXT NOT NULL,            -- 來源頁面 URL
    target_url  TEXT NOT NULL,            -- 目標頁面 URL
    anchor_text TEXT,                     -- 連結錨點文字
    UNIQUE(source_url, target_url)
);

-- 索引批次紀錄
CREATE TABLE index_batches (
    id          SERIAL PRIMARY KEY,
    started_at  TIMESTAMP DEFAULT NOW(),
    finished_at TIMESTAMP,
    pages_count INTEGER DEFAULT 0,
    status      VARCHAR(16) DEFAULT 'building'  -- building, ready, failed
);
```

### 4.2 Tantivy Index Schema

```rust
use tantivy::schema::*;

fn build_search_schema() -> (Schema, SearchFields) {
    let mut sb = Schema::builder();

    let title = sb.add_text_field("title", TEXT | STORED);
    let body  = sb.add_text_field("body",  TEXT);
    let url   = sb.add_text_field("url",   STRING | STORED);
    let domain = sb.add_text_field("domain", STRING | STORED);
    let score_weight = sb.add_f64_field("score_weight", STORED);  // 外部權重（PageRank 等）

    let schema = sb.build();
    let fields = SearchFields { title, body, url, domain, score_weight };

    (schema, fields)
}
```

---

## 5. API 設計

### 5.1 搜尋 API

```
POST /api/v1/search
Content-Type: application/json

Request:
{
    "q": "rust async programming",       // 查詢字串
    "page": 0,                           // 頁碼（從 0 開始）
    "size": 10,                          // 每頁筆數（預設 10，最大 50）
    "domain": "example.com",             // 可選：限定特定網域
    "sort": "relevance"                  // relevance | date
}

Response:
{
    "query": "rust async programming",
    "total": 1423,                        // 總結果數（近似值）
    "page": 0,
    "size": 10,
    "time_ms": 45,                        // 查詢耗時（毫秒）
    "results": [
        {
            "title": "Async Programming in Rust",
            "url": "https://example.com/async-rust",
            "domain": "example.com",
            "snippet": "...<b>async</b> <b>programming</b> in <b>Rust</b> using Tokio...",
            "score": 12.45,
            "crawled_at": "2026-06-01T12:00:00Z"
        }
    ],
    "suggestions": ["rust async", "rust tokio tutorial"],  // 拼寫建議（可選）
    "facets": {
        "domains": {
            "example.com": 45,
            "rust-lang.org": 120
        }
    }
}
```

### 5.2 爬蟲 API

```
POST /api/v1/crawl/start
Content-Type: application/json

Request:
{
    "seed_urls": ["https://example.com"],
    "max_pages": 1000,
    "max_depth": 3,
    "domain_whitelist": ["example.com"],
    "politeness_ms": 500
}

Response:
{
    "job_id": "crawl-20260601-001",
    "status": "started",
    "seed_count": 1
}
```

```
GET /api/v1/crawl/status/{job_id}

Response:
{
    "job_id": "crawl-20260601-001",
    "status": "running",           // running | completed | failed
    "pages_crawled": 342,
    "pages_queued": 158,
    "errors": 2,
    "started_at": "...",
    "estimated_remaining_sec": 120
}
```

### 5.3 索引 API

```
POST /api/v1/index/build

Response:
{
    "batch_id": "idx-20260601-001",
    "status": "building"
}

GET /api/v1/index/status

Response:
{
    "total_documents": 15532,
    "last_build": "2026-06-01T12:00:00Z",
    "index_size_mb": 128.5,
    "status": "ready"
}
```

### 5.4 管理 API

```
GET /api/v1/stats

Response:
{
    "total_pages": 15532,
    "total_domains": 85,
    "index_size_mb": 128.5,
    "avg_crawl_time_ms": 342,
    "uptime_hours": 72.5
}
```

---

## 6. 實作階段規劃

### Phase 1：基礎架構（Week 1-2）

**目標**：可運行的搜尋引擎雛形，支援對本地文件的全文檢索

- [ ] 初始化 Rust 專案（Cargo workspace）
- [ ] 建立 PostgreSQL schema 與 migration 工具
- [ ] 實作 Tantivy 索引模組（Indexer）
- [ ] 實作基本搜尋 API（`POST /api/v1/search`）
- [ ] 初始化 Next.js 專案，建立基本搜尋頁面
- [ ] Docker 化開發環境

**驗收標準**：能從命令列將本地文字檔建立索引，並透過網頁搜尋

### Phase 2：爬蟲模組（Week 3-4）

**目標**：能從網際網路抓取網頁內容

- [ ] 實作 URL Frontier（基於 PostgreSQL 的持久化佇列）
- [ ] 實作非同步 HTTP 客戶端（reqwest）
- [ ] 實作 HTML 解析器與連結提取器
- [ ] 實作 robots.txt 解析與 Polite Crawling
- [ ] 實作連結正規化（去除 fragment、正規化路徑）
- [ ] 實作重複內容偵測（checksum 比對）

**驗收標準**：能從給定的種子 URL 爬取 1000 個頁面並存入資料庫

### Phase 3：索引與搜尋（Week 5-6）

**目標**：完整的搜尋體驗，含排名與片段生成

- [ ] 批次索引 pipeline（從資料庫讀取 → 建立 Tantivy index）
- [ ] 實作搜尋結果片段生成（關鍵字周圍文字截取）
- [ ] 實作搜尋結果高亮（HTML `<b>` 標籤）
- [ ] 實作分頁與排序
- [ ] 實作近似結果計數（不掃描全部文件）
- [ ] 加入 Domain Facet

**驗收標準**：搜尋 API 回傳合理的結果，含高亮片段與分頁

### Phase 4：排名優化（Week 7）

**目標**：提升搜尋結果品質

- [ ] 實作 PageRank 演算法（基於 `links` 表格）
- [ ] 將 PageRank 分數納入 ranking 權重
- [ ] 實作 recency boost（近期內容權重較高）
- [ ] 實作 title field boost（標題匹配權重較高）
- [ ] 調整 BM25 參數（k1, b）

**驗收標準**：與純 BM25 相比，前 10 筆結果的相關性明顯提升

### Phase 5：前端完善（Week 8）

**目標**：接近 Google 風格的使用者體驗

- [ ] 搜尋首頁（簡潔中央搜尋框 + Logo）
- [ ] 搜尋結果頁（含結果列表、分頁、高亮）
- [ ] 搜尋建議（搜尋框 autocomplete）
- [ ] 拼寫糾正（「您是不是要找...」）
- [ ] 深色模式
- [ ] 響應式設計（行動裝置支援）

**驗收標準**：完整的搜尋體驗流程

### Phase 6：部署與監控（Week 9-10）

**目標**：生產環境就緒

- [ ] 撰寫 docker-compose.yml（API + Next.js + PostgreSQL + Caddy）
- [ ] 實作 Prometheus metrics（請求數、延遲、錯誤率）
- [ ] 實作 health check endpoint
- [ ] 日誌集中管理（structured logging）
- [ ] 壓力測試與效能調校
- [ ] 撰寫部署文件

**驗收標準**：能在單台伺服器上以 docker-compose 一鍵部署

---

## 7. 目錄結構

```
search-engine/
├── Cargo.toml                    # Rust workspace root
├── Cargo.lock
├── docker-compose.yml
├── Dockerfile.api
├── Dockerfile.crawler
├── .env.example
├── README.md
│
├── crates/
│   ├── api/                      # Actix-web API server
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── main.rs
│   │       ├── routes/
│   │       │   ├── mod.rs
│   │       │   ├── search.rs
│   │       │   ├── crawl.rs
│   │       │   ├── index.rs
│   │       │   └── admin.rs
│   │       ├── models/           # Request/Response structs
│   │       ├── middleware/        # Auth, logging, CORS
│   │       └── errors.rs
│   │
│   ├── crawler/                  # 爬蟲 worker（獨立進程）
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── main.rs
│   │       ├── frontier.rs       # URL Frontier
│   │       ├── fetcher.rs        # HTTP 請求
│   │       ├── parser.rs         # HTML 解析
│   │       ├── robots.rs         # robots.txt 處理
│   │       ├── politeness.rs     # 禮貌延遲策略
│   │       └── dedup.rs          # 重複偵測
│   │
│   ├── indexer/                  # 索引建置工具
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── main.rs
│   │       ├── schema.rs         # Tantivy schema 定義
│   │       ├── builder.rs        # 批次索引建置
│   │       └── analyzer.rs       # 分詞器設定
│   │
│   └── common/                   # 共用型別與工具
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs
│           ├── types.rs          # Page, CrawlJob, SearchResult
│           ├── db.rs             # PostgreSQL 連線池
│           └── config.rs         # 設定檔載入
│
├── frontend/                     # Next.js 應用
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # 搜尋首頁
│   │   ├── search/
│   │   │   └── page.tsx          # 搜尋結果頁
│   │   └── globals.css
│   ├── components/
│   │   ├── SearchBar.tsx
│   │   ├── SearchResult.tsx
│   │   ├── Pagination.tsx
│   │   ├── FacetFilter.tsx
│   │   └── DarkModeToggle.tsx
│   └── lib/
│       ├── api.ts                # API 客戶端
│       └── utils.ts
│
├── migrations/                   # PostgreSQL migrations
│   ├── 001_create_domains.sql
│   ├── 002_create_pages.sql
│   ├── 003_create_crawl_queue.sql
│   └── 004_create_links.sql
│
├── scripts/
│   ├── reset_db.sh
│   ├── rebuild_index.sh
│   └── seed_test_data.sh
│
└── docs/
    ├── architecture.md
    ├── api.md
    └── deployment.md
```

---

## 8. 資料庫 Schema

### 8.1 完整建立腳本

```sql
-- migrations/001_create_domains.sql
CREATE TABLE IF NOT EXISTS domains (
    id          SERIAL PRIMARY KEY,
    domain      VARCHAR(255) UNIQUE NOT NULL,
    allowed     BOOLEAN DEFAULT true,
    robots_txt  TEXT,
    crawl_delay INTEGER DEFAULT 0,          -- 從 robots.txt 讀取的延遲秒數
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_domains_domain ON domains(domain);

-- migrations/002_create_pages.sql
CREATE TABLE IF NOT EXISTS pages (
    id          SERIAL PRIMARY KEY,
    url         TEXT UNIQUE NOT NULL,
    domain_id   INTEGER REFERENCES domains(id),
    title       TEXT,
    body        TEXT,                       -- 純文字（去 HTML）
    html        TEXT,                       -- 原始 HTML
    http_status INTEGER,
    content_type VARCHAR(128),
    content_length INTEGER,
    crawl_time  TIMESTAMP DEFAULT NOW(),
    last_modified TIMESTAMP,                -- HTTP Last-Modified header
    etag        VARCHAR(128),               -- HTTP ETag header
    checksum    VARCHAR(64),                -- SHA256 of body
    fetch_count INTEGER DEFAULT 0
);

CREATE INDEX idx_pages_domain_id ON pages(domain_id);
CREATE INDEX idx_pages_crawl_time ON pages(crawl_time DESC);
CREATE INDEX idx_pages_checksum ON pages(checksum);

-- migrations/003_create_crawl_queue.sql
CREATE TABLE IF NOT EXISTS crawl_queue (
    id          SERIAL PRIMARY KEY,
    url         TEXT NOT NULL,
    domain_id   INTEGER REFERENCES domains(id),
    depth       INTEGER DEFAULT 0,
    priority    INTEGER DEFAULT 0,
    status      VARCHAR(16) DEFAULT 'pending'
                CHECK (status IN ('pending', 'processing', 'done', 'error')),
    retries     INTEGER DEFAULT 0,
    error_msg   TEXT,
    enqueued_at TIMESTAMP DEFAULT NOW(),
    started_at  TIMESTAMP,
    finished_at TIMESTAMP
);

CREATE INDEX idx_crawl_queue_status ON crawl_queue(status);
CREATE INDEX idx_crawl_queue_priority ON crawl_queue(priority DESC, enqueued_at ASC);
CREATE UNIQUE INDEX idx_crawl_queue_url ON crawl_queue(url) WHERE status != 'done';

-- migrations/004_create_links.sql
CREATE TABLE IF NOT EXISTS links (
    id          SERIAL PRIMARY KEY,
    source_url  TEXT NOT NULL,
    target_url  TEXT NOT NULL,
    anchor_text TEXT,
    source_page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_links_target ON links(target_url);
CREATE INDEX idx_links_source ON links(source_url);

-- migrations/005_create_index_batches.sql
CREATE TABLE IF NOT EXISTS index_batches (
    id          SERIAL PRIMARY KEY,
    started_at  TIMESTAMP DEFAULT NOW(),
    finished_at TIMESTAMP,
    pages_count INTEGER DEFAULT 0,
    status      VARCHAR(16) DEFAULT 'building'
                CHECK (status IN ('building', 'ready', 'failed'))
);
```

---

## 9. 部署與運維

### 9.1 Docker Compose

```yaml
# docker-compose.yml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: searchengine
      POSTGRES_USER: search
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U search"]
      interval: 5s

  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    environment:
      DATABASE_URL: postgres://search:${DB_PASSWORD}@postgres/searchengine
      INDEX_PATH: /data/index
      RUST_LOG: info
    volumes:
      - index_data:/data/index
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy

  crawler:
    build:
      context: .
      dockerfile: Dockerfile.crawler
    environment:
      DATABASE_URL: postgres://search:${DB_PASSWORD}@postgres/searchengine
      API_URL: http://api:8080
    depends_on:
      - api

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      NEXT_PUBLIC_API_URL: https://search.example.com/api/v1
    ports:
      - "3000:3000"
    depends_on:
      - api

  caddy:
    image: caddy:alpine
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - api
      - frontend

volumes:
  pgdata:
  index_data:
  caddy_data:
```

### 9.2 環境變數

```bash
# .env.example
DB_PASSWORD=change_me_in_production
RUST_LOG=info
INDEX_PATH=/data/index
CRAWL_USER_AGENT=MySearchBot/1.0
CRAWL_POLITENESS_MS=500
MAX_CRAWL_PAGES=50000
MAX_CRAWL_DEPTH=5
```

### 9.3 效能預估

以單台 4 vCPU / 16 GB RAM 伺服器為基準：

| 操作 | 預估吞吐量 |
|------|-----------|
| 爬蟲（單 worker） | ~10-50 pages/sec（取決於網路延遲與目標伺服器回應速度）|
| 索引建置 | ~1000 pages/sec |
| 搜尋查詢 | ~500 QPS（1M documents）|
| 搜尋延遲（P50） | < 50ms |
| 索引儲存空間 | ~10-20% of 原始文字大小 |

---

## 10. 附錄：核心演算法說明

### 10.1 BM25 排名演算法

BM25 是目前業界最廣泛使用的文字檢索排名函數（Elasticsearch、Lucene 都使用它作為預設）。

```
BM25 的直覺理解：
- 關鍵字在文件中出現越多次 → 分數越高（但邊際遞減）
- 關鍵字在越少文件中出現 → 分數越高（IDF，稀有詞更重要）
- 文件越短 → 分數越高（短文件更容易命中）
```

Tantivy 內建 BM25 實作，使用方式：
```rust
use tantivy::query::QueryParser;
use tantivy::schema::TEXT;

let query = query_parser.parse_query("rust async")?;
// Tantivy 自動使用 BM25 評分
```

### 10.2 PageRank 演算法

PageRank 模擬「隨機上網者」的行為：

```
PR(A) = (1 - d) + d × Σ  PR(T) / C(T)

PR(A)  = 頁面 A 的 PageRank 值
d      = 阻尼係數（通常 0.85）
PR(T)  = 連結到 A 的頁面 T 的 PageRank
C(T)   = 頁面 T 的對外連結數
```

實作方式（迭代收斂）：
```rust
pub fn compute_pagerank(links: &HashMap<String, Vec<String>>, iterations: usize) -> HashMap<String, f64> {
    let damping = 0.85;
    let n = links.len() as f64;
    let mut pr: HashMap<String, f64> = links.keys().map(|k| (k.clone(), 1.0 / n)).collect();

    for _ in 0..iterations {
        let mut new_pr = HashMap::new();
        for (page, incoming) in links {
            let sum: f64 = incoming.iter()
                .filter_map(|src| {
                    let out_degree = links.get(src).map(|v| v.len()).unwrap_or(0);
                    if out_degree > 0 {
                        Some(pr.get(src).unwrap_or(&0.0) / out_degree as f64)
                    } else {
                        None
                    }
                })
                .sum();
            new_pr.insert(page.clone(), (1.0 - damping) / n + damping * sum);
        }
        pr = new_pr;
    }
    pr
}
```

### 10.3 片段生成（Snippet Generation）

搜尋結果中顯示關鍵字周圍的文字片段：

```rust
fn generate_snippet(body: &str, query_terms: &[&str], window: usize) -> String {
    let words: Vec<&str> = body.split_whitespace().collect();
    let mut best_pos = 0;
    let mut best_count = 0;

    // 滑動視窗找包含最多關鍵字的區域
    for start in 0..words.len().saturating_sub(window) {
        let end = (start + window).min(words.len());
        let count = query_terms.iter()
            .filter(|t| words[start..end].iter().any(|w| w.eq_ignore_ascii_case(t)))
            .count();
        if count > best_count {
            best_count = count;
            best_pos = start;
        }
    }

    let snippet_words = &words[best_pos..(best_pos + window).min(words.len())];
    let mut result = String::new();
    for w in snippet_words {
        if query_terms.iter().any(|t| w.eq_ignore_ascii_case(t)) {
            result.push_str(&format!("<b>{}</b> ", w));
        } else {
            result.push_str(&format!("{} ", w));
        }
    }
    result.trim().to_string()
}
```

---

## 總結

本專案使用 Rust + Next.js 技術棧，從零開始實作一個具備爬蟲、索引、排名、搜尋介面的完整搜尋引擎。核心亮點：

1. **高效能後端**：Rust + Actix-web + Tantivy，單機可達 500 QPS
2. **業界標準排名**：BM25 + PageRank + Recency boost
3. **完整 DevOps**：Docker 化部署，一鍵啟動
4. **優質 UX**：Next.js SSR + Tailwind CSS，接近 Google 的搜尋體驗
5. **教育價值**：從底層實作理解搜尋引擎運作原理

---

*最後更新：2026-06-09*
