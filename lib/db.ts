import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;
let initialized = false;
let initializingPromise: Promise<void> | null = null;

export async function dbConnect() {
  if (pool) {
    if (!initialized) {
      if (!initializingPromise) {
        initializingPromise = initializeDatabase(pool);
      }
      await initializingPromise;
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
    if (!initializingPromise) {
      initializingPromise = initializeDatabase(pool);
    }
    await initializingPromise;
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
        pricePerUnit DECIMAL(10,2) DEFAULT 0.00,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
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
      await connectionPool.execute("ALTER TABLE customers ADD COLUMN isDefaultItem TINYINT DEFAULT 0");
    } catch {}
    try {
      await connectionPool.execute("ALTER TABLE transactions ADD COLUMN isDefaultItem TINYINT DEFAULT 0");
    } catch {}
    try {
      await connectionPool.execute("ALTER TABLE transactions ADD COLUMN pricePerUnit DECIMAL(10,2) DEFAULT 0.00");
    } catch {}
    try {
      await connectionPool.execute("ALTER TABLE transactions DROP FOREIGN KEY transactions_ibfk_2");
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

    // Backfill historical unit prices for pre-existing transactions
    try {
      await connectionPool.execute(`
        UPDATE transactions t
        LEFT JOIN default_dairy_items di ON t.itemId = di.id AND t.isDefaultItem = 1
        LEFT JOIN dairy_items ai ON t.itemId = ai.id AND (t.isDefaultItem IS NULL OR t.isDefaultItem = 0)
        SET t.pricePerUnit = COALESCE(di.pricePerUnit, ai.pricePerUnit, 0.00)
        WHERE t.pricePerUnit = 0.00 OR t.pricePerUnit IS NULL
      `);
    } catch (migError) {
      console.error("Backfilling historical unit prices for transactions failed:", migError);
    }

    // Run data migration from dairy_items (userId IS NULL) to default_dairy_items
    try {
      const [nullUserItems] = await connectionPool.execute("SELECT * FROM dairy_items WHERE userId IS NULL");
      if (Array.isArray(nullUserItems) && nullUserItems.length > 0) {
        for (const item of nullUserItems as any[]) {
          // Check if already in default_dairy_items
          const [exists] = await connectionPool.execute("SELECT id FROM default_dairy_items WHERE id = ?", [item.id]);
          if (Array.isArray(exists) && exists.length === 0) {
            await connectionPool.execute(
              "INSERT INTO default_dairy_items (id, name, pricePerUnit, unit, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
              [item.id, item.name, item.pricePerUnit, item.unit, item.createdAt, item.updatedAt]
            );
          }
          // Set isDefaultItem = 1 for any customer / transaction pointing to this item
          await connectionPool.execute("UPDATE customers SET isDefaultItem = 1 WHERE itemId = ?", [item.id]);
          await connectionPool.execute("UPDATE transactions SET isDefaultItem = 1 WHERE itemId = ?", [item.id]);
        }
        // Delete null user items from dairy_items
        await connectionPool.execute("DELETE FROM dairy_items WHERE userId IS NULL");
      }
    } catch (migError) {
      console.error("Migration of default items failed:", migError);
    }



    initialized = true;
    console.log("MySQL Database tables verified/created successfully.");
  } catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
  }
}

export default dbConnect;