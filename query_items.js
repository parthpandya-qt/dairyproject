const mysql = require('mysql2/promise');
async function main() {
  const connection = await mysql.createConnection("mysql://root:Parth%407566@localhost:3306/dairy_db");
  const [items] = await connection.query("SELECT * FROM dairy_items");
  console.log("--- dairy_items ---");
  console.log(items);
  await connection.end();
}
main().catch(console.error);
