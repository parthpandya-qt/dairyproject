import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;
let initialized = false;

export async function dbConnect() {
  if (pool) {
    if (!initialized) {
      await initializeDatabase(pool);
    }
    return pool;
  }

  // Parse connection settings
  const databaseUrl = process.env.DATABASE_URL;
  
  if (databaseUrl) {
    pool = mysql.createPool(databaseUrl);
  } else {
    // Fallback to individual connection settings
    const host = process.env.MYSQL_HOST || 'localhost';
    const user = process.env.MYSQL_USER || 'root';
    const password = process.env.MYSQL_PASSWORD || '';
    const database = process.env.MYSQL_DATABASE || 'dairy_db';
    const port = process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306;

    pool = mysql.createPool({
      host,
      user,
      password,
      database,
      port,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  if (!initialized) {
    await initializeDatabase(pool);
  }

  return pool;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function query(sql: string, params?: any[]) {
  const connectionPool = await dbConnect();
  const [results] = await connectionPool.execute(sql, params);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return results as any;
}

async function initializeDatabase(connectionPool: mysql.Pool) {
  try {
    // 1. Create users table
    await connectionPool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userName VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // 2. Create customers table
    await connectionPool.execute(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        morningQuantity DECIMAL(5,2) DEFAULT 0.00,
        eveningQuantity DECIMAL(5,2) DEFAULT 0.00,
        unit VARCHAR(50) DEFAULT 'Liter',
        openingBalance DECIMAL(10,2) DEFAULT 0.00,
        deletedAt TIMESTAMP NULL DEFAULT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // 3. Create daily_logs table
    await connectionPool.execute(`
      CREATE TABLE IF NOT EXISTS daily_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customerId INT NOT NULL,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        morningQuantity DECIMAL(5,2) DEFAULT 0.00,
        eveningQuantity DECIMAL(5,2) DEFAULT 0.00,
        FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 4. Create dairy_items table
    await connectionPool.execute(`
      CREATE TABLE IF NOT EXISTS dairy_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT,
        name VARCHAR(255) NOT NULL,
        pricePerUnit DECIMAL(10,2) NOT NULL,
        unit VARCHAR(50) NOT NULL DEFAULT 'Liter',
        deletedAt TIMESTAMP NULL DEFAULT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

   
    await connectionPool.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        customerId INT NOT NULL,
        itemId INT NOT NULL,
        date DATE NOT NULL,
        morningQuantity DECIMAL(5,2) DEFAULT 0.00,
        eveningQuantity DECIMAL(5,2) DEFAULT 0.00,
        totalPrice DECIMAL(10,2) DEFAULT 0.00,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (itemId) REFERENCES dairy_items(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // Run Alter Table migrations silently (will fail if already existing, which is fine)
    try {
      await connectionPool.execute("ALTER TABLE customers ADD COLUMN unit VARCHAR(50) DEFAULT 'Liter'");
    } catch {}
    try {
      await connectionPool.execute("ALTER TABLE customers ADD COLUMN deletedAt TIMESTAMP NULL DEFAULT NULL");
    } catch {}
    try {
      await connectionPool.execute("ALTER TABLE customers ADD COLUMN openingBalance DECIMAL(10,2) DEFAULT 0.00");
    } catch {}
    try {
      await connectionPool.execute("ALTER TABLE customers ADD COLUMN userId INT");
    } catch {}
    try {
      await connectionPool.execute("ALTER TABLE dairy_items ADD COLUMN deletedAt TIMESTAMP NULL DEFAULT NULL");
    } catch {}
    try {
      await connectionPool.execute("ALTER TABLE dairy_items ADD COLUMN userId INT");
    } catch {}
    try {
      await connectionPool.execute("ALTER TABLE dairy_items DROP INDEX name");
    } catch {}
    try {
      await connectionPool.execute("ALTER TABLE dairy_items DROP INDEX unique_user_item_name");
    } catch {}

    initialized = true;
    console.log("MySQL Database tables verified/created successfully.");
  } catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
  }
}

export default dbConnect;