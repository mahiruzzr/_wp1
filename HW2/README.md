# 全方位 JavaScript 實作挑戰：從基礎到後端邏輯

這份練習旨在協助開發者跨越「前端基礎 JavaScript」與「後端 Node.js/Express 實務」之間的認知鴻溝。以下是每一題的解題步驟、核心觀念與實務應用訣竅。

## 1. 物件屬性存取 (Object Property Access)
* **解題步驟**：宣告物件後，分別使用 `post.title` 與 `post["title"]` 取值。
* **實務訣竅**：在後端開發中（如 Express），我們經常處理 JSON 轉化來的物件。點符號寫法最直覺；但在處理「動態鍵名」（例如變數代表的屬性）時，就必須使用中括號寫法。

## 2. 物件解構賦值 (Object Destructuring)
* **解題步驟**：使用 `const { title, content } = req.body;` 一行程式碼提取資料。
* **實務訣竅**：這是 Express 接收 POST 請求表單資料時最標準的寫法。它能讓程式碼變得非常簡潔，不用反覆寫 `req.body.title`、`req.body.content`。

## 3. 陣列的遍歷與字串拼接 (Array forEach & Template Literals)
* **解題步驟**：建立空字串 `html`，使用 `forEach` 迴圈搭配反引號 (Template Literals) 動態組合 HTML 標籤。
* **實務訣竅**：在沒有使用前端框架（如 React/Vue）或模板引擎（如 EJS）時，後端常常需要自己拼裝 HTML 字串（Server-Side Rendering 的最底層邏輯）。這題示範了部落格首頁如何將資料庫撈出來的陣列轉化為網頁 DOM 結構。

## 4. 字典與動態參數 (URL Params / Dictionary)
* **解題步驟**：宣告 `let params = {}`，然後用 `params["id"] = 99` 寫入資料。
* **實務訣竅**：在 Express 中，當使用者造訪 `/post/99`，Express 路由（如 `/post/:id`）底層就是把 URL 解析並動態塞入 `req.params` 這個字典物件中，讓開發者透過 `req.params.id` 拿到 `99`。

## 5. Callback 函數傳參 (Passing Data via Callbacks)
* **解題步驟**：在函數內建立物件，然後執行 `callback(null, fakeData)`，將物件當作參數傳出去。
* **實務訣竅**：這是理解 Node.js 非同步程式設計的關鍵！在呼叫 API 或讀取檔案時，資料無法立刻產生，因此必須透過 Callback 傳回。`getPost(id, (err, post) => {...})` 外層能抓到 `post`，就是因為底層函數把查到的資料作為第二個參數塞進去了。

## 6. JSON 處理 (Parsing JSON)
* **解題步驟**：使用 `JSON.parse(jsonStr)` 將字串還原為 JS 物件，接著就能像平常一樣操作陣列。
* **實務訣竅**：前後端溝通的唯一語言就是字串（JSON 格式）。Express 中的 `app.use(express.json())` 就是在背景幫我們自動執行這個 `JSON.parse()` 動作，讓我們在 `req.body` 直接拿到物件。

## 7. 模擬資料庫查詢 (Simulating DB Queries)
* **解題步驟**：宣告 `fakeGet` 函數，內部直接呼叫 `callback(null, fakeRow)`。外部呼叫時，在傳入的匿名函數參數中接收 `row` 並印出 `row.title`。
* **實務訣竅**：這題直接還原了 `sqlite3` 套件中 `db.get()` 的運作機制。資料庫查詢需要時間，所以我們把「查詢成功後要做的事」寫成一個函數傳進去，等資料庫查好後，它就會把資料（row）餵給我們的函數。

## 8. 樣板字串中的邏輯運算 (Template Literals with Logic)
* **解題步驟**：在 `${}` 中使用三元運算子 `user ? user : "Stranger"` 或邏輯或 `user || "Stranger"`。
* **實務訣竅**：生成 HTML 時經常遇到變數為空的情況。學會在 `${}` 裡面寫簡短的條件判斷，是動態網頁渲染的重要技巧。

## 9. 陣列物件的排序與切片 (Sort & Substring)
* **解題步驟**：使用 `map()` 遍歷陣列，結合字串方法 `.substring(0, 10)` 截斷文字並加上 `...`。
* **實務訣竅**：部落格的「文章摘要」功能就是這樣實作的。雖然可以用 SQL 的 `SUBSTR()` 處理，但在 JS 端處理可以減輕資料庫的運算負擔，也是前端 UI 呈現常做的事。

## 10. 錯誤優先回呼模式 (Error-First Callback Pattern)
* **解題步驟**：判斷如果不合邏輯（發生錯誤），就 `return callback("錯誤訊息")`；如果成功，就 `callback(null, "成功訊息")`。
* **實務訣竅**：Node.js 世界最著名的標準就是「Error-First Callback」。第一個參數永遠保留給 Error 訊息。你在 Express 路由裡常常看到的 `if (err) return res.status(500).send("Error");` 就是為了承接這種底層設計。
