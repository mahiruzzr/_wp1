// ==========================================
// 1. 物件屬性存取 (Object Property Access)
// ==========================================
const post = {
    id: 1,
    title: "Hello World",
    content: "Markdown content"
};
console.log("Q1 點符號 (Dot notation):", post.title);
console.log("Q1 中括號 (Bracket notation):", post["title"]);

// ==========================================
// 2. 物件解構賦值 (Object Destructuring)
// ==========================================
const req = { body: { title: "JS教學", content: "內容在此", author: "Gemini" } };
const { title, content } = req.body;
console.log("Q2 解構賦值:", title, content);

// ==========================================
// 3. 陣列的遍歷與字串拼接 (Array forEach & Template Literals)
// ==========================================
const posts = [{ id: 1, t: "A" }, { id: 2, t: "B" }];
let html = "";
posts.forEach(p => {
    html += `<div>${p.t}</div>`;
});
console.log("Q3 字串拼接:\n" + html);

// ==========================================
// 4. 字典與動態參數 (URL Params / Dictionary)
// ==========================================
let params = {};
params["id"] = 99; // 動態新增屬性
console.log("Q4 動態參數:", params);

// ==========================================
// 5. Callback 函數傳參 (Passing Data via Callbacks)
// ==========================================
function fetchData(id, callback) {
    const fakeData = {
        id: id,
        status: "success"
    };
    // 錯誤優先：第一個參數傳入 null 代表沒錯誤，第二個傳入資料
    callback(null, fakeData);
}

fetchData(101, (err, data) => {
    if (err) {
        console.log("發生錯誤：" + err);
    } else {
        console.log("Q5 成功取得資料：", data);
    }
});

// ==========================================
// 6. JSON 處理 (Parsing JSON)
// ==========================================
const jsonStr = '{"title": "Post 1", "tags": ["js", "node"]}';
let obj = JSON.parse(jsonStr);
console.log("Q6 JSON第二個標籤:", obj.tags[1]);

// ==========================================
// 7. 模擬資料庫查詢 (Simulating DB Queries)
// ==========================================
function fakeGet(sql, params, callback) {
    const fakeRow = {
        id: 1,
        title: "掌握 JavaScript 函數",
        content: "這是一篇關於 Callback 的文章..."
    };
    callback(null, fakeRow);
}

const query = "SELECT * FROM posts WHERE id = ?";
const inputParams = [1];
fakeGet(query, inputParams, (err, row) => {
    if (err) {
        console.error("查詢失敗");
    } else {
        console.log("Q7 抓到的文章標題是：", row.title);
    }
});

// ==========================================
// 8. 樣板字串中的邏輯運算 (Template Literals with Logic)
// ==========================================
let user = "Guest"; // 可以改成空字串測試
let welcomeHtml = `<h1>Welcome, ${user ? user : "Stranger"}</h1>`;
console.log("Q8 樣板邏輯:", welcomeHtml);

// ==========================================
// 9. 陣列物件的排序與切片 (Sort & Substring)
// ==========================================
const longStrings = ["Very long content here", "Another Very long content here", "3rd Very long content here"];
// 使用 map 遍歷陣列，並對每個字串使用 substring 切片
const truncatedStrings = longStrings.map(str => str.substring(0, 10) + "...");
console.log("Q9 字串切片:", truncatedStrings);

// ==========================================
// 10. 錯誤優先回呼模式 (Error-First Callback Pattern)
// ==========================================
function checkAdmin(role, callback) {
    if (role !== "admin") {
        return callback("Access Denied");
    }
    callback(null, "Welcome");
}

checkAdmin("user", (err, msg) => {
    console.log("Q10 測試一般用戶:", err ? `錯誤: ${err}` : msg);
});

checkAdmin("admin", (err, msg) => {
    console.log("Q10 測試管理員:", err ? `錯誤: ${err}` : msg);
});
