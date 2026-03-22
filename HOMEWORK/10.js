const students = [];

function addStudent(name, department) {
  const newStudent = {
    name: name,
    department: department
  };
  students.push(newStudent);
}

addStudent("Kiyotaka", "CSIE");
addStudent("Alice", "Design");

console.log(JSON.stringify(students, null, 2));
// 輸出格式化的 JSON 字串表示當前陣列狀態
