# JavaScript 基礎程式練習

本專案收錄了 10 個基礎的 JavaScript 程式碼練習，結合了變數、迴圈 (`for`, `while`)、條件判斷 (`if`)、函式 (`function`)、陣列 (`array`)、物件 (`object`) 與 JSON 格式的綜合應用。這份紀錄非常適合用來對照資工系課程中常見的基礎程式邏輯與語法轉換。

## 程式邏輯解析

### 1. 偶數篩選器 (Array, For, If, Function)
- **邏輯**：建立一個空陣列 `evens`。利用 `for` 迴圈遍歷傳入的數字陣列，透過 `numbers[i] % 2 === 0` 判斷餘數是否為 0（偶數），條件成立則利用 `push()` 方法將其加入新陣列，最後回傳結果。

### 2. 數字累加器 (While, Function)
- **邏輯**：宣告累加器 `sum = 0` 與控制變數 `i = 1`。當 `while (i <= n)` 條件成立時，不斷執行 `sum += i`，並在每次迴圈結尾將 `i` 遞增，直到算出 1 到 n 的總和。

### 3. 角色清單格式化 (Array, Object, For, Function)
- **邏輯**：資料結構採用「包含多個物件的陣列」。利用 `for` 迴圈搭配陣列長度 (`length`)，透過點記號讀取每個物件的屬性，並使用樣板字面值 (Template Literals) 輸出格式化字串。

### 4. 購物車總額計算 (Array, Object, For, Function)
- **邏輯**：透過遍歷購物車陣列，將每一個商品物件的「單價 (`price`)」乘上「數量 (`quantity`)」，並累加至 `total` 變數中，最後回傳總金額。

### 5. 倒數計時器 (While, Function)
- **邏輯**：將傳入的起始值賦予給 `current`，只要 `current >= 0`，就印出當前數字，並利用 `current--` 將數值遞減，直到條件不成立結束迴圈。

### 6. 找出陣列最大值 (Array, For, If, Function)
- **邏輯**：先進行防呆機制，若陣列為空則回傳 `null`。假設索引值 0 的元素為當前最大值 `max`，接著從索引值 1 開始遍歷，只要發現大於 `max` 的元素，就立刻更新 `max` 的值。

### 7. JSON 轉換練習 (Object, JSON)
- **邏輯**：
  - 使用 `JSON.stringify()` 將 JavaScript 記憶體中的物件序列化為字串格式，通常用於資料傳輸或儲存。
  - 使用 `JSON.parse()` 將 JSON 字串反序列化回 JavaScript 物件，以便後續用程式碼修改屬性。

### 8. 動態打招呼機器人 (Date, If, Function)
- **邏輯**：利用 `new Date().getHours()` 動態獲取系統當前真實的小時 (0-23)。搭配 `if...else if...else` 結構，將一天劃分為三個區段，系統會自動根據當下時間回傳早安、午安或晚安，解決參數寫死導致時間不符的問題。

### 9. 陣列元素搜尋 (Array, For, If, Function)
- **邏輯**：實作基礎的線性搜尋 (Linear Search)。從頭到尾掃描陣列，若找到目標立刻提早 `return i` 結束函式；若整個迴圈跑完都沒觸發 `return`，代表找不到，則在最後回傳 `-1`。

### 10. 資料庫模擬 (Array, Object, Function, JSON)
- **邏輯**：宣告一個全域陣列作為模擬資料庫。撰寫函式將傳入的參數組合為一個新的物件結構，並 `push` 至陣列中。最後運用 `JSON.stringify(..., null, 2)` 來排版輸出結果，方便在主控台檢視。
