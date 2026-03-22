const serverData = {
  id: 101,
  status: "active"
};

// 物件轉 JSON 字串
const jsonString = JSON.stringify(serverData);
console.log("JSON 字串:", jsonString);

// JSON 字串轉回物件
const parsedData = JSON.parse(jsonString);
parsedData.status = "inactive";
console.log("修改後的物件:", parsedData);
