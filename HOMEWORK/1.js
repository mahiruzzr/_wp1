function filterEvens(numbers) {
  let evens = [];
  for (let i = 0; i < numbers.length; i++) {
    if (numbers[i] % 2 === 0) {
      evens.push(numbers[i]);
    }
  }
  return evens;
}

console.log(filterEvens([1, 2, 3, 4, 5, 6])); // 輸出: [2, 4, 6]
