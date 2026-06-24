const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const connectionString = "mysql://root:Parth%407566@localhost:3306/dairy_db";

async function main() {
  const connection = await mysql.createConnection(connectionString);
  console.log("Connected to database successfully!");

  console.log("Disabling foreign key checks...");
  await connection.query("SET FOREIGN_KEY_CHECKS = 0");

  console.log("Ensuring default_dairy_items exists...");
  await connection.query(`
    CREATE TABLE IF NOT EXISTS default_dairy_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      pricePerUnit DECIMAL(10,2) NOT NULL,
      unit VARCHAR(50) NOT NULL DEFAULT 'Liter',
      deletedAt TIMESTAMP NULL DEFAULT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  console.log("Ensuring extra_item table exists...");
  await connection.query(`
    CREATE TABLE IF NOT EXISTS extra_item (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL,
      customerId INT NOT NULL,
      itemId INT NOT NULL,
      isDefaultItem TINYINT DEFAULT 0,
      date DATE NOT NULL,
      quantity DECIMAL(5,2) DEFAULT 0.00,
      totalPrice DECIMAL(10,2) DEFAULT 0.00,
      pricePerUnit DECIMAL(10,2) DEFAULT 0.00,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  console.log("Clearing transactions...");
  await connection.query("TRUNCATE TABLE transactions");

  console.log("Clearing extra_item...");
  await connection.query("TRUNCATE TABLE extra_item");

  console.log("Clearing bills...");
  await connection.query("TRUNCATE TABLE bills");

  console.log("Clearing customers...");
  await connection.query("TRUNCATE TABLE customers");

  console.log("Clearing dairy_items...");
  await connection.query("TRUNCATE TABLE dairy_items");

  console.log("Clearing default_dairy_items...");
  await connection.query("TRUNCATE TABLE default_dairy_items");

  console.log("Re-enabling foreign key checks...");
  await connection.query("SET FOREIGN_KEY_CHECKS = 1");

  console.log("Database cleared successfully!");

  // Find or create test user
  console.log("Checking for existing users...");
  const [users] = await connection.query("SELECT id FROM users LIMIT 1");
  let userId;
  if (users.length > 0) {
    userId = users[0].id;
    console.log(`Using existing user ID: ${userId}`);
  } else {
    console.log("Creating test user...");
    const hashedPassword = await bcrypt.hash("admin123", 12);
    const [userRes] = await connection.query(
      "INSERT INTO users (userName, email, password) VALUES (?, ?, ?)",
      ["admin", "admin@example.com", hashedPassword]
    );
    userId = userRes.insertId;
    console.log(`Created test user ID: ${userId}`);
  }

  // Insert user-specific dairy items (userId specific)
  console.log("Inserting user-specific dairy items...");
  const [cowMilkRes] = await connection.query(
    "INSERT INTO dairy_items (userId, name, pricePerUnit, unit) VALUES (?, ?, ?, ?)",
    [userId, "Cow Milk", 60.00, "Liter"]
  );
  const cowMilkId = cowMilkRes.insertId;

  const [bufMilkRes] = await connection.query(
    "INSERT INTO dairy_items (userId, name, pricePerUnit, unit) VALUES (?, ?, ?, ?)",
    [userId, "Buffalo Milk", 70.00, "Liter"]
  );
  const bufMilkId = bufMilkRes.insertId;

  const [bmRes] = await connection.query(
    "INSERT INTO dairy_items (userId, name, pricePerUnit, unit) VALUES (?, ?, ?, ?)",
    [userId, "Buttermilk", 30.00, "Packet"]
  );
  const buttermilkId = bmRes.insertId;

  const [paneerRes] = await connection.query(
    "INSERT INTO dairy_items (userId, name, pricePerUnit, unit) VALUES (?, ?, ?, ?)",
    [userId, "Fresh Paneer", 360.00, "Kg"]
  );
  const paneerId = paneerRes.insertId;

  const [gheeRes] = await connection.query(
    "INSERT INTO dairy_items (userId, name, pricePerUnit, unit) VALUES (?, ?, ?, ?)",
    [userId, "Pure Ghee", 680.00, "Kg"]
  );
  const gheeId = gheeRes.insertId;

  const [curdRes] = await connection.query(
    "INSERT INTO dairy_items (userId, name, pricePerUnit, unit) VALUES (?, ?, ?, ?)",
    [userId, "Fresh Curd", 90.00, "Kg"]
  );
  const curdId = curdRes.insertId;

  // Insert customers
  console.log("Inserting dummy customers...");
  const [cust1Res] = await connection.query(
    "INSERT INTO customers (userId, name, phone, address, morningQuantity, eveningQuantity, openingBalance, itemId, isDefaultItem, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [userId, "Rohan Sharma", "9876543210", "Flat 101, Sun City, Indore", 1.5, 0.0, 150.00, cowMilkId, 0, "2026-04-01 00:00:00"]
  );
  const cust1Id = cust1Res.insertId;

  const [cust2Res] = await connection.query(
    "INSERT INTO customers (userId, name, phone, address, morningQuantity, eveningQuantity, openingBalance, itemId, isDefaultItem, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [userId, "Priya Patel", "9898989898", "House 12, Vijay Nagar, Indore", 1.0, 1.0, 0.00, bufMilkId, 0, "2026-04-01 00:00:00"]
  );
  const cust2Id = cust2Res.insertId;

  const [cust3Res] = await connection.query(
    "INSERT INTO customers (userId, name, phone, address, morningQuantity, eveningQuantity, openingBalance, itemId, isDefaultItem, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [userId, "Amit Verma", "9123456789", "Sector C, Scheme 54, Indore", 0.0, 2.0, 500.00, cowMilkId, 0, "2026-04-01 00:00:00"]
  );
  const cust3Id = cust3Res.insertId;

  // Seed default allocation transactions from April 1st, 2026 to June 22nd, 2026 (Three Months)
  console.log("Inserting historical transactions for April, May and June 2026...");
  
  const startDate = new Date("2026-04-01");
  const endDate = new Date("2026-06-22");
  
  const customersList = [
    { id: cust1Id, morningQuantity: 1.5, eveningQuantity: 0.0, itemId: cowMilkId, isDefaultItem: 0, rate: 60.00 },
    { id: cust2Id, morningQuantity: 1.0, eveningQuantity: 1.0, itemId: bufMilkId, isDefaultItem: 0, rate: 70.00 },
    { id: cust3Id, morningQuantity: 0.0, eveningQuantity: 2.0, itemId: cowMilkId, isDefaultItem: 0, rate: 60.00 }
  ];

  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    for (const cust of customersList) {
      const morningQty = cust.morningQuantity;
      const eveningQty = cust.eveningQuantity;
      const totalQty = morningQty + eveningQty;
      if (totalQty > 0) {
        const totalCost = totalQty * cust.rate;
        await connection.query(
          "INSERT INTO transactions (userId, customerId, itemId, isDefaultItem, date, morningQuantity, eveningQuantity, totalPrice, pricePerUnit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [userId, cust.id, cust.itemId, cust.isDefaultItem, dateStr, morningQty, eveningQty, totalCost, cust.rate]
        );
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Seed extra item transactions
  console.log("Inserting extra product deliveries for April, May and June...");

  // Rohan Sharma (cust1) fresh paneer
  const paneerDates = ["2026-04-12", "2026-04-26", "2026-05-10", "2026-05-24", "2026-06-05", "2026-06-17"];
  for (const pDate of paneerDates) {
    await connection.query(
      "INSERT INTO extra_item (userId, customerId, itemId, isDefaultItem, date, quantity, totalPrice, pricePerUnit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, cust1Id, paneerId, 0, pDate, 0.5, 180.00, 360.00]
    );
  }

  // Priya Patel (cust2) ghee
  const gheeDates = ["2026-04-15", "2026-05-15", "2026-06-01", "2026-06-16"];
  for (const gDate of gheeDates) {
    await connection.query(
      "INSERT INTO extra_item (userId, customerId, itemId, isDefaultItem, date, quantity, totalPrice, pricePerUnit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, cust2Id, gheeId, 0, gDate, 1.0, 680.00, 680.00]
    );
  }

  // Amit Verma (cust3) buttermilk
  const buttermilkDates = ["2026-04-08", "2026-04-20", "2026-05-08", "2026-05-20", "2026-06-02", "2026-06-14"];
  for (const bmDate of buttermilkDates) {
    await connection.query(
      "INSERT INTO extra_item (userId, customerId, itemId, isDefaultItem, date, quantity, totalPrice, pricePerUnit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, cust3Id, buttermilkId, 0, bmDate, 2.0, 60.00, 30.00]
    );
  }

  console.log("Seed operations complete! Testing dummy data successfully populated.");
  await connection.end();
}

main().catch((err) => {
  console.error("Error seeding database:", err);
});
