function findMax(numbers) {
  if (numbers.length === 0) return null;
  
  let max = numbers[0];
  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] > max) {
      max = numbers[i];
    }
  }
  return max;
}

console.log(findMax([15, 3, 27, 8])); // 輸出: 27
