function greet(name, hour) {
  if (hour >= 5 && hour < 12) {
    return `早安, ${name}!`;
  } else if (hour >= 12 && hour < 18) {
    return `午安, ${name}!`;
  } else {
    return `晚安, ${name}!`;
  }
}

console.log(greet("Kiyotaka", 14)); // 輸出: 午安, Kiyotaka!
