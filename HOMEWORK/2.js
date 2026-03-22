function sumUpTo(n) {
  let sum = 0;
  let i = 1;
  while (i <= n) {
    sum += i;
    i++;
  }
  return sum;
}

console.log(sumUpTo(10)); // 輸出: 55
