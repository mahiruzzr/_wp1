const characters = [
  { name: "Hina", club: "Prefect Team" },
  { name: "Shiroko", club: "Foreclosure Task Force" }
];

function printCharacters(charArray) {
  for (let i = 0; i < charArray.length; i++) {
    console.log(`名字: ${charArray[i].name}, 社團: ${charArray[i].club}`);
  }
}

printCharacters(characters);
