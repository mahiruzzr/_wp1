function findItem(arr, target) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) {
      return i;
    }
  }
  return -1;
}

const tools = ["C++", "JavaScript", "Python", "OpenGL"];
console.log(findItem(tools, "JavaScript")); // 輸出: 1
console.log(findItem(tools, "Ruby"));       // 輸出: -1
