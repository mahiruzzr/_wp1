const cart = [
  { item: "Keyboard", price: 2500, quantity: 1 },
  { item: "Mouse", price: 1200, quantity: 2 }
];

function calculateTotal(cartArray) {
  let total = 0;
  for (let i = 0; i < cartArray.length; i++) {
    total += cartArray[i].price * cartArray[i].quantity;
  }
  return total;
}

console.log(calculateTotal(cart)); // 輸出: 4900
