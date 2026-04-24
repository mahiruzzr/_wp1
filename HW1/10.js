// ==========================================
// 1. Callback 基礎實作
// ==========================================
function mathTool(num1, num2, action) {
  return action(num1, num2);
}

console.log("Q1 相加:", mathTool(10, 5, function(a, b) { return a + b; })); // 15
console.log("Q1 相減:", mathTool(10, 5, function(a, b) { return a - b; })); // 5


// ==========================================
// 2. 匿名函數與立即執行 (IIFE)
// ==========================================
(function() {
  let count = 100;
  console.log(`Q2: Count is: ${count}`);
})();
// 若在外部嘗試 console.log(count); 會拋出 ReferenceError，證明變數已被成功封裝


// ==========================================
// 3. 箭頭函數與陣列轉換
// ==========================================
const prices = [100, 200, 300, 400];
const discountedPrices = prices.map(price => price * 0.8);
console.log("Q3:", discountedPrices); // [80, 160, 240, 320]


// ==========================================
// 4. 陣列參數的「破壞性修改」
// ==========================================
function cleanData(arr) {
  arr.pop();           // 移除最後一個元素
  arr.unshift("Start"); // 在最前面加上 "Start"
}

let myData = [1, 2, 3];
cleanData(myData);
console.log("Q4:", myData); // ["Start", 1, 2]


// ==========================================
// 5. 函數回傳函數 (Higher-Order Function)
// ==========================================
function multiplier(factor) {
  return (n) => n * factor;
}

const double = multiplier(2);
console.log("Q5:", double(10)); // 20


// ==========================================
// 6. Callback 篩選器
// ==========================================
function myFilter(arr, callback) {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    if (callback(arr[i])) {
      result.push(arr[i]);
    }
  }
  return result;
}

console.log("Q6:", myFilter([1, 5, 8, 12], num => num > 7)); // [8, 12]


// ==========================================
// 7. 箭頭函數處理物件
// ==========================================
const users = [{name: "Alice", age: 25}, {name: "Bob", age: 17}];
const adults = users.filter(user => user.age >= 18);
console.log("Q7:", adults); // [{name: "Alice", age: 25}]


// ==========================================
// 8. 參數傳址陷阱：重新賦值 vs 修改
// ==========================================
let listA = [1, 2];
let listB = [3, 4];

function process(a, b) {
  a.push(99);   // 這是修改原本記憶體位置上的陣列
  b = [100];    // 這是將區域變數 b 指向一個全新的陣列，不影響外部的 listB
}

process(listA, listB);
console.log("Q8 listA:", listA); // [1, 2, 99]
console.log("Q8 listB:", listB); // [3, 4]


// ==========================================
// 9. 延遲執行的 Callback
// ==========================================
setTimeout(() => {
  const arr = ["Task", "Completed"];
  console.log("Q9:", arr.join(" ")); // 2秒後印出: Task Completed
}, 2000);


// ==========================================
// 10. 綜合應用：計算總價
// ==========================================
function calculateTotal(cart, discountFunc) {
  // 先將 cart 內所有數字相加
  const sum = cart.reduce((total, current) => total + current, 0);
  // 再將總和傳入 discountFunc 處理後回傳
  return discountFunc(sum);
}

console.log("Q10:", calculateTotal([100, 200, 300], total => total - 50)); // 550
