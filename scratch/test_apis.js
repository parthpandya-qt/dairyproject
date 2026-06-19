const mysql = require("mysql2/promise");

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  let pool;
  if (databaseUrl) {
    pool = mysql.createPool(databaseUrl);
  } else {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'dairy_db',
      port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306
    });
  }

  try {
    console.log("DB connected successfully.");

    const userId = 1; // Test userId

    console.log("Testing Customer.find query...");
    const [customers] = await pool.execute(`
      SELECT c.*, 
             COALESCE(di.name, ai.name) AS itemName, 
             COALESCE(di.unit, ai.unit) AS itemUnit,
             COALESCE(di.pricePerUnit, ai.pricePerUnit) AS itemPrice
      FROM customers c
      LEFT JOIN default_dairy_items di ON c.itemId = di.id AND c.isDefaultItem = 1
      LEFT JOIN dairy_items ai ON c.itemId = ai.id AND (c.isDefaultItem IS NULL OR c.isDefaultItem = 0)
      WHERE c.deletedAt IS NULL AND c.userId = ?
      ORDER BY c.createdAt DESC
    `, [userId]);
    console.log(`Customer query success. Count: ${customers.length}`);

    console.log("Testing Transaction.find query...");
    const [transactions] = await pool.execute(`
      SELECT t.*, c.name AS customerName, 
             COALESCE(di.name, ai.name) AS itemName, 
             COALESCE(t.pricePerUnit, di.pricePerUnit, ai.pricePerUnit) AS itemPrice, 
             COALESCE(di.unit, ai.unit) AS itemUnit
      FROM transactions t
      LEFT JOIN customers c ON t.customerId = c.id
      LEFT JOIN default_dairy_items di ON t.itemId = di.id AND t.isDefaultItem = 1
      LEFT JOIN dairy_items ai ON t.itemId = ai.id AND (t.isDefaultItem IS NULL OR t.isDefaultItem = 0)
      WHERE t.userId = ?
      ORDER BY t.date DESC, t.id DESC
    `, [userId]);
    console.log(`Transaction query success. Count: ${transactions.length}`);

    console.log("Testing ExtraItem.find query...");
    const [extraItems] = await pool.execute(`
      SELECT ei.*, c.name AS customerName, 
             COALESCE(di.name, ai.name) AS itemName, 
             COALESCE(ei.pricePerUnit, di.pricePerUnit, ai.pricePerUnit) AS itemPrice, 
             COALESCE(di.unit, ai.unit) AS itemUnit
      FROM extra_item ei
      LEFT JOIN customers c ON ei.customerId = c.id
      LEFT JOIN default_dairy_items di ON ei.itemId = di.id AND ei.isDefaultItem = 1
      LEFT JOIN dairy_items ai ON ei.itemId = ai.id AND (ei.isDefaultItem IS NULL OR ei.isDefaultItem = 0)
      WHERE ei.userId = ?
      ORDER BY ei.date DESC, ei.id DESC
    `, [userId]);
    console.log(`ExtraItem query success. Count: ${extraItems.length}`);

  } catch (err) {
    console.error("Error running test:", err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

run();
