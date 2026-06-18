const mysql = require('mysql2/promise');
async function main() {
  const connection = await mysql.createConnection("mysql://root:Parth%407566@localhost:3306/dairy_db");
  
  const [items] = await connection.query("SELECT * FROM dairy_items");
  console.log("--- dairy_items ---");
  console.log(items);

  const [customers] = await connection.query("SELECT * FROM customers");
  console.log("--- customers ---");
  console.log(customers);

  const [transactions] = await connection.query("SELECT * FROM transactions");
  console.log("--- transactions ---");
  console.log(transactions);

  await connection.end();
}
main().catch(console.error);
