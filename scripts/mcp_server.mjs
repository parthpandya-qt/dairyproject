import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";

// Load Environment Variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, quiet: true });
} else {
  dotenv.config({ quiet: true });
}

// Authorization check to allow ONLY the internal chatbot to connect
const SHARED_SECRET = process.env.MCP_SHARED_SECRET;
const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN;

if (!SHARED_SECRET || !AUTH_TOKEN || AUTH_TOKEN !== SHARED_SECRET) {
  console.error("Access Denied: Unauthorized connection. This MCP server is configured for internal chatbot use only.");
  process.exit(1);
}

// Configurable User ID context
const USER_ID = process.env.DAIRY_USER_ID ? parseInt(process.env.DAIRY_USER_ID, 10) : 1;

// Database Connection Pool
let pool;
async function getDb() {
  if (pool) return pool;
  const dbUrl = process.env.DATABASE_URL || "mysql://root:Parth%407566@localhost:3306/dairy_db";
  pool = mysql.createPool(dbUrl);
  return pool;
}

async function executeQuery(sql, params) {
  const db = await getDb();
  const [results] = await db.execute(sql, params);
  return results;
}

// Instantiate the MCP Server
const server = new McpServer({
  name: "dairy-mcp-server",
  version: "1.0.0",
});

// ----------------------------------------------------
// 1. Tool Registrations
// ----------------------------------------------------

server.tool(
  "list_customers",
  "Get details, active milk allocations, and opening balances of all registered customers.",
  {},
  async () => {
    try {
      const rows = await executeQuery(`
        SELECT c.*, 
               COALESCE(di.name, ai.name) AS itemName, 
               COALESCE(di.pricePerUnit, ai.pricePerUnit) AS itemPrice, 
               COALESCE(di.unit, ai.unit) AS itemUnit
        FROM customers c
        LEFT JOIN default_dairy_items di ON c.itemId = di.id AND c.isDefaultItem = 1
        LEFT JOIN dairy_items ai ON c.itemId = ai.id AND (c.isDefaultItem IS NULL OR c.isDefaultItem = 0)
        WHERE c.userId = ? AND c.deletedAt IS NULL
      `, [USER_ID]);
      return { content: [{ type: "text", text: JSON.stringify(rows || [], null, 2) }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error listing customers: ${e.message}` }], isError: true };
    }
  }
);

server.tool(
  "add_customer",
  "Create and register a new customer with their default product allocation details.",
  {
    name: z.string().describe("Name of the customer."),
    phone: z.string().optional().describe("Contact number."),
    address: z.string().optional().describe("Residential delivery address."),
    morningQuantity: z.number().optional().describe("Default morning allocation quantity."),
    eveningQuantity: z.number().optional().describe("Default evening allocation quantity."),
    openingBalance: z.number().optional().describe("Initial opening balance amount."),
    itemName: z.string().describe("Default allocated product name, e.g. 'Cow Milk' or 'Buffalo Milk'.")
  },
  async (args) => {
    try {
      let items = await executeQuery(
        "SELECT id, name FROM dairy_items WHERE name LIKE ? AND userId = ? AND deletedAt IS NULL LIMIT 1",
        [`%${args.itemName}%`, USER_ID]
      );
      let isDefaultItem = 0;
      if (!items || items.length === 0) {
        items = await executeQuery(
          "SELECT id, name FROM default_dairy_items WHERE name LIKE ? LIMIT 1",
          [`%${args.itemName}%`]
        );
        if (items && items.length > 0) {
          isDefaultItem = 1;
        }
      }
      const itemId = items && items.length > 0 ? items[0].id : null;
      const result = await executeQuery(`
        INSERT INTO customers (userId, name, phone, address, morningQuantity, eveningQuantity, openingBalance, itemId, isDefaultItem)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        USER_ID,
        args.name,
        args.phone || "",
        args.address || "",
        args.morningQuantity || 0,
        args.eveningQuantity || 0,
        args.openingBalance || 0,
        itemId,
        isDefaultItem
      ]);
      return { content: [{ type: "text", text: `Customer ${args.name} added successfully with ID: ${result.insertId}` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error adding customer: ${e.message}` }], isError: true };
    }
  }
);

server.tool(
  "add_transaction",
  "Record or overwrite a daily default allocation delivery (milk quantity) for a customer on a specific date.",
  {
    customerName: z.string().describe("Name of the customer (e.g. Rohan Sharma)."),
    date: z.string().optional().describe("Delivery date in YYYY-MM-DD format (leave empty for today)."),
    morningQuantity: z.number().describe("Morning milk quantity in Liters."),
    eveningQuantity: z.number().describe("Evening milk quantity in Liters.")
  },
  async (args) => {
    try {
      const custs = await executeQuery(
        "SELECT id, itemId, isDefaultItem, name FROM customers WHERE name LIKE ? AND userId = ? AND deletedAt IS NULL LIMIT 1",
        [`%${args.customerName}%`, USER_ID]
      );
      if (!custs || custs.length === 0) {
        throw new Error(`Customer matching name "${args.customerName}" not found.`);
      }
      const cust = custs[0];
      let pricePerUnit = 0;
      if (cust.itemId) {
        const queryStr = cust.isDefaultItem 
          ? "SELECT pricePerUnit FROM default_dairy_items WHERE id = ? LIMIT 1"
          : "SELECT pricePerUnit FROM dairy_items WHERE id = ? AND userId = ? LIMIT 1";
        const params = cust.isDefaultItem ? [cust.itemId] : [cust.itemId, USER_ID];
        const items = await executeQuery(queryStr, params);
        if (items && items.length > 0) {
          pricePerUnit = Number(items[0].pricePerUnit);
        }
      }
      const totalQty = args.morningQuantity + args.eveningQuantity;
      const totalCost = totalQty * pricePerUnit;
      const targetDate = args.date || new Date().toISOString().split('T')[0];

      // Check if delivery already exists for date
      const existing = await executeQuery(
        "SELECT id FROM transactions WHERE customerId = ? AND date = ? LIMIT 1",
        [cust.id, targetDate]
      );
      if (existing && existing.length > 0) {
        await executeQuery(
          "UPDATE transactions SET morningQuantity = ?, eveningQuantity = ?, totalPrice = ?, pricePerUnit = ? WHERE id = ?",
          [args.morningQuantity, args.eveningQuantity, totalCost, pricePerUnit, existing[0].id]
        );
      } else {
        await executeQuery(`
          INSERT INTO transactions (userId, customerId, itemId, isDefaultItem, date, morningQuantity, eveningQuantity, totalPrice, pricePerUnit)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          USER_ID,
          cust.id,
          cust.itemId,
          cust.isDefaultItem,
          targetDate,
          args.morningQuantity,
          args.eveningQuantity,
          totalCost,
          pricePerUnit
        ]);
      }
      return { content: [{ type: "text", text: `Logged daily delivery for ${cust.name} on ${targetDate}.` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error adding transaction: ${e.message}` }], isError: true };
    }
  }
);

server.tool(
  "add_extra_item",
  "Log an extra product delivery (like Fresh Paneer, Pure Ghee, Curd, Buttermilk) for a customer.",
  {
    customerName: z.string().describe("Name of the customer (e.g. Rohan Sharma)."),
    date: z.string().optional().describe("Delivery date in YYYY-MM-DD format (leave empty for today)."),
    extraProductName: z.string().describe("Name of the extra product (e.g. Fresh Paneer, Pure Ghee, Curd)."),
    quantity: z.number().describe("Delivered product quantity (e.g. 0.5 for half kg, 1.0, 2.0)."),
    pricePerUnit: z.number().optional().describe("Optional custom price override per unit.")
  },
  async (args) => {
    try {
      const custs = await executeQuery(
        "SELECT id, name FROM customers WHERE name LIKE ? AND userId = ? AND deletedAt IS NULL LIMIT 1",
        [`%${args.customerName}%`, USER_ID]
      );
      if (!custs || custs.length === 0) {
        throw new Error(`Customer matching name "${args.customerName}" not found.`);
      }
      const cust = custs[0];
      const targetDate = args.date || new Date().toISOString().split('T')[0];

      // Resolve product price
      let rate = args.pricePerUnit || 0;
      let itemId = null;
      let finalItemName = args.extraProductName;

      if (!args.pricePerUnit) {
        const items = await executeQuery(
          "SELECT id, pricePerUnit, name FROM dairy_items WHERE name LIKE ? AND userId = ? LIMIT 1",
          [`%${args.extraProductName}%`, USER_ID]
        );
        if (items && items.length > 0) {
          rate = Number(items[0].pricePerUnit);
          itemId = items[0].id;
          finalItemName = items[0].name;
        } else {
          const globalItems = await executeQuery(
            "SELECT id, pricePerUnit, name FROM default_dairy_items WHERE name LIKE ? LIMIT 1",
            [`%${args.extraProductName}%`]
          );
          if (globalItems && globalItems.length > 0) {
            rate = Number(globalItems[0].pricePerUnit);
            itemId = globalItems[0].id;
            finalItemName = globalItems[0].name;
          }
         }
      }

      const totalPrice = args.quantity * rate;
      await executeQuery(`
        INSERT INTO extra_item (userId, customerId, itemId, isDefaultItem, date, quantity, totalPrice, pricePerUnit, itemName)
        VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?)
      `, [
        USER_ID,
        cust.id,
        itemId,
        targetDate,
        args.quantity,
        totalPrice,
        rate,
        finalItemName
      ]);
      return { content: [{ type: "text", text: `Recorded extra delivery of ${args.quantity}x ${finalItemName} (₹${rate}/unit) for ${cust.name} on ${targetDate}.` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error adding extra item: ${e.message}` }], isError: true };
    }
  }
);

server.tool(
  "get_customer_ledger",
  "Retrieve a customer's detailed monthly deliveries ledger (default transactions and extra items).",
  {
    customerName: z.string().describe("Name of the customer."),
    monthKey: z.string().describe("Billing month in YYYY-MM format, e.g. '2026-06'.")
  },
  async (args) => {
    try {
      const custs = await executeQuery(
        "SELECT id, name, phone, address, openingBalance FROM customers WHERE name LIKE ? AND userId = ? AND deletedAt IS NULL LIMIT 1",
        [`%${args.customerName}%`, USER_ID]
      );
      if (!custs || custs.length === 0) {
        throw new Error(`Customer matching name "${args.customerName}" not found.`);
      }
      const cust = custs[0];
      const txs = await executeQuery(`
        SELECT t.*, 
               COALESCE(di.name, ai.name) AS itemName, 
               COALESCE(di.unit, ai.unit) AS itemUnit
        FROM transactions t
        LEFT JOIN default_dairy_items di ON t.itemId = di.id AND t.isDefaultItem = 1
        LEFT JOIN dairy_items ai ON t.itemId = ai.id AND (t.isDefaultItem IS NULL OR t.isDefaultItem = 0)
        WHERE t.customerId = ? AND t.userId = ? AND t.date LIKE ?
      `, [cust.id, USER_ID, `${args.monthKey}%`]);

      const extras = await executeQuery(`
        SELECT e.*
        FROM extra_item e
        WHERE e.customerId = ? AND e.userId = ? AND e.date LIKE ?
      `, [cust.id, USER_ID, `${args.monthKey}%`]);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            customer: cust,
            monthKey: args.monthKey,
            transactions: txs || [],
            extraItems: extras || []
          }, null, 2)
        }]
      };
    } catch (e) {
      return { content: [{ type: "text", text: `Error fetching ledger: ${e.message}` }], isError: true };
    }
  }
);

server.tool(
  "list_bills",
  "Retrieve all saved/locked billing records, total amounts due, and payment status reports.",
  {},
  async () => {
    try {
      const list = await executeQuery(`
        SELECT b.*, c.name AS customerName
        FROM bills b
        LEFT JOIN customers c ON b.customerId = c.id
        WHERE b.userId = ?
        ORDER BY b.billingMonth DESC, b.id DESC
      `, [USER_ID]);
      return { content: [{ type: "text", text: JSON.stringify(list || [], null, 2) }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error listing bills: ${e.message}` }], isError: true };
    }
  }
);

server.tool(
  "createUser",
  "Create and register a new user in the dairy database.",
  {
    userName: z.string().describe("The username for the account (must be unique)."),
    email: z.string().email().describe("The email address (must be unique)."),
    password: z.string().describe("The plain-text password (will be hashed automatically).")
  },
  async (args) => {
    try {
      const hashedPassword = await bcrypt.hash(args.password, 12);
      const result = await executeQuery(
        "INSERT INTO users (userName, email, password) VALUES (?, ?, ?)",
        [args.userName, args.email, hashedPassword]
      );
      return { content: [{ type: "text", text: `Successfully created user "${args.userName}" with ID: ${result.insertId}` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error creating user: ${e.message}` }], isError: true };
    }
  }
);

server.tool(
  "getUser",
  "Retrieve a user's details (excluding password) by ID or username.",
  {
    id: z.number().optional().describe("User ID."),
    userName: z.string().optional().describe("Username.")
  },
  async (args) => {
    try {
      if (args.id === undefined && args.userName === undefined) {
        throw new Error("You must provide either 'id' or 'userName'.");
      }
      let sql = "SELECT id, userName, email, createdAt, updatedAt FROM users WHERE ";
      const params = [];
      if (args.id !== undefined) {
        sql += "id = ?";
        params.push(args.id);
      } else {
        sql += "userName = ?";
        params.push(args.userName);
      }
      const rows = await executeQuery(sql, params);
      if (!rows || rows.length === 0) {
        throw new Error("User not found.");
      }
      return { content: [{ type: "text", text: JSON.stringify(rows[0], null, 2) }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error retrieving user: ${e.message}` }], isError: true };
    }
  }
);


server.tool(
  "edit_customer",
  "Edit/update an existing customer's details (such as address, phone, default morning/evening milk quantities, opening balance, and allocation product).",
  {
    customerId: z.number().describe("The database ID of the customer to edit."),
    name: z.string().optional().describe("Updated name of the customer."),
    phone: z.string().optional().describe("Updated contact phone number."),
    address: z.string().optional().describe("Updated delivery address."),
    morningQuantity: z.number().optional().describe("Updated default morning delivery quantity in Liters."),
    eveningQuantity: z.number().optional().describe("Updated default evening delivery quantity in Liters."),
    openingBalance: z.number().optional().describe("Updated customer opening balance."),
    itemName: z.string().optional().describe("Updated default allocated product name, e.g. 'Cow Milk' or 'Buffalo Milk'.")
  },
  async (args) => {
    try {
      // Resolve itemId if itemName is provided
      let itemId = undefined;
      let isDefaultItem = undefined;
      if (args.itemName) {
        const items = await executeQuery(
          "SELECT id FROM dairy_items WHERE name LIKE ? AND userId = ? AND deletedAt IS NULL LIMIT 1",
          [`%${args.itemName}%`, USER_ID]
        );
        if (items && items.length > 0) {
          itemId = items[0].id;
          isDefaultItem = 0;
        } else {
          const defItems = await executeQuery(
            "SELECT id FROM default_dairy_items WHERE name LIKE ? LIMIT 1",
            [`%${args.itemName}%`]
          );
          if (defItems && defItems.length > 0) {
            itemId = defItems[0].id;
            isDefaultItem = 1;
          }
        }
      }

      // Fetch current customer record to get fallbacks
      const current = await executeQuery(
        "SELECT * FROM customers WHERE id = ? AND userId = ? AND deletedAt IS NULL LIMIT 1",
        [args.customerId, USER_ID]
      );
      if (!current || current.length === 0) {
        throw new Error(`Customer with ID ${args.customerId} not found.`);
      }
      const cust = current[0];

      const finalName = args.name !== undefined ? args.name : cust.name;
      const finalPhone = args.phone !== undefined ? args.phone : cust.phone;
      const finalAddress = args.address !== undefined ? args.address : cust.address;
      const finalMorningQty = args.morningQuantity !== undefined ? args.morningQuantity : Number(cust.morningQuantity);
      const finalEveningQty = args.eveningQuantity !== undefined ? args.eveningQuantity : Number(cust.eveningQuantity);
      const finalOpeningBal = args.openingBalance !== undefined ? args.openingBalance : Number(cust.openingBalance);
      const finalItemId = itemId !== undefined ? itemId : cust.itemId;
      const finalIsDefaultItem = isDefaultItem !== undefined ? isDefaultItem : cust.isDefaultItem;

      await executeQuery(`
        UPDATE customers 
        SET name = ?, phone = ?, address = ?, morningQuantity = ?, eveningQuantity = ?, openingBalance = ?, itemId = ?, isDefaultItem = ?
        WHERE id = ? AND userId = ?
      `, [
        finalName,
        finalPhone,
        finalAddress,
        finalMorningQty,
        finalEveningQty,
        finalOpeningBal,
        finalItemId,
        finalIsDefaultItem,
        args.customerId,
        USER_ID
      ]);

      return { content: [{ type: "text", text: `Customer ${finalName} (ID: ${args.customerId}) updated successfully.` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error updating customer: ${e.message}` }], isError: true };
    }
  }
);

server.tool(
  "delete_customer",
  "Delete a customer from the database (soft delete).",
  {
    customerId: z.number().describe("The database ID of the customer to delete.")
  },
  async (args) => {
    try {
      const result = await executeQuery(
        "UPDATE customers SET deletedAt = CURRENT_TIMESTAMP WHERE id = ? AND userId = ?",
        [args.customerId, USER_ID]
      );
      if (result.affectedRows === 0) {
        throw new Error(`Customer with ID ${args.customerId} not found.`);
      }
      return { content: [{ type: "text", text: `Customer with ID ${args.customerId} soft-deleted successfully.` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error deleting customer: ${e.message}` }], isError: true };
    }
  }
);

server.tool(
  "edit_transaction",
  "Edit/update a transaction (daily delivery allocation) record.",
  {
    transactionId: z.number().describe("The ID of the transaction to edit."),
    morningQuantity: z.number().optional().describe("Updated morning quantity in Liters."),
    eveningQuantity: z.number().optional().describe("Updated evening quantity in Liters.")
  },
  async (args) => {
    try {
      const current = await executeQuery(
        "SELECT * FROM transactions WHERE id = ? AND userId = ? LIMIT 1",
        [args.transactionId, USER_ID]
      );
      if (!current || current.length === 0) {
        throw new Error(`Transaction with ID ${args.transactionId} not found.`);
      }
      const tx = current[0];
      const mQty = args.morningQuantity !== undefined ? args.morningQuantity : Number(tx.morningQuantity);
      const eQty = args.eveningQuantity !== undefined ? args.eveningQuantity : Number(tx.eveningQuantity);
      const totalQty = mQty + eQty;
      const rate = Number(tx.pricePerUnit);
      const totalCost = totalQty * rate;

      await executeQuery(`
        UPDATE transactions 
        SET morningQuantity = ?, eveningQuantity = ?, totalPrice = ?
        WHERE id = ? AND userId = ?
      `, [mQty, eQty, totalCost, args.transactionId, USER_ID]);

      return { content: [{ type: "text", text: `Transaction ID ${args.transactionId} updated successfully (Morning: ${mQty}L, Evening: ${eQty}L, Total Price: ₹${totalCost}).` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error editing transaction: ${e.message}` }], isError: true };
    }
  }
);

server.tool(
  "delete_transaction",
  "Delete a daily delivery transaction record by ID.",
  {
    transactionId: z.number().describe("The database ID of the transaction to delete.")
  },
  async (args) => {
    try {
      const result = await executeQuery(
        "DELETE FROM transactions WHERE id = ? AND userId = ?",
        [args.transactionId, USER_ID]
      );
      if (result.affectedRows === 0) {
        throw new Error(`Transaction with ID ${args.transactionId} not found.`);
      }
      return { content: [{ type: "text", text: `Transaction with ID ${args.transactionId} deleted successfully.` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error deleting transaction: ${e.message}` }], isError: true };
    }
  }
);

server.tool(
  "edit_extra_item",
  "Edit/update an extra product delivery record quantity.",
  {
    extraItemId: z.number().describe("The database ID of the extra item delivery record to edit."),
    quantity: z.number().describe("Updated delivered quantity (e.g. 0.5, 1.0, 2.0).")
  },
  async (args) => {
    try {
      const current = await executeQuery(
        "SELECT * FROM extra_item WHERE id = ? AND userId = ? LIMIT 1",
        [args.extraItemId, USER_ID]
      );
      if (!current || current.length === 0) {
        throw new Error(`Extra delivery record with ID ${args.extraItemId} not found.`);
      }
      const item = current[0];
      const rate = Number(item.pricePerUnit);
      const totalCost = args.quantity * rate;

      await executeQuery(`
        UPDATE extra_item 
        SET quantity = ?, totalPrice = ?
        WHERE id = ? AND userId = ?
      `, [args.quantity, totalCost, args.extraItemId, USER_ID]);

      return { content: [{ type: "text", text: `Extra item ID ${args.extraItemId} updated (Quantity: ${args.quantity}, Total: ₹${totalCost}).` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error editing extra item: ${e.message}` }], isError: true };
    }
  }
);

server.tool(
  "delete_extra_item",
  "Delete an extra product delivery record by ID.",
  {
    extraItemId: z.number().describe("The database ID of the extra item delivery record to delete.")
  },
  async (args) => {
    try {
      const result = await executeQuery(
        "DELETE FROM extra_item WHERE id = ? AND userId = ?",
        [args.extraItemId, USER_ID]
      );
      if (result.affectedRows === 0) {
        throw new Error(`Extra item delivery record with ID ${args.extraItemId} not found.`);
      }
      return { content: [{ type: "text", text: `Extra item delivery record with ID ${args.extraItemId} deleted successfully.` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error deleting extra item: ${e.message}` }], isError: true };
    }
  }
);

server.tool(
  "update_bill_payment",
  "Update a customer bill's paid amount and payment status (Paid/Unpaid), and automatically recalculate/update the customer's outstanding opening balance in their profile.",
  {
    billId: z.number().describe("The database ID of the bill to update."),
    paidAmount: z.number().describe("The total amount paid by the customer for this bill."),
    status: z.enum(["Paid", "Unpaid"]).describe("The updated payment status.")
  },
  async (args) => {
    try {
      const current = await executeQuery(
        "SELECT * FROM bills WHERE id = ? AND userId = ? LIMIT 1",
        [args.billId, USER_ID]
      );
      if (!current || current.length === 0) {
        throw new Error(`Bill with ID ${args.billId} not found.`);
      }
      const bill = current[0];

      // Update the bill
      await executeQuery(`
        UPDATE bills 
        SET paidAmount = ?, status = ?
        WHERE id = ? AND userId = ?
      `, [args.paidAmount, args.status, args.billId, USER_ID]);

      // Update the customer's openingBalance profile:
      // remaining balance = netAmount - paidAmount
      const remaining = Number(bill.netAmount) - args.paidAmount;
      await executeQuery(
        "UPDATE customers SET openingBalance = ? WHERE id = ? AND userId = ?",
        [remaining, bill.customerId, USER_ID]
      );

      return { content: [{ type: "text", text: `Bill ID ${args.billId} updated successfully (Paid Amount: ₹${args.paidAmount}, Status: ${args.status}). Customer ID ${bill.customerId} profile opening balance synced to ₹${remaining}.` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error updating bill payment: ${e.message}` }], isError: true };
    }
  }
);

server.tool(
  "update_delivery_by_date",
  "Update morning or evening delivery quantities for a customer on a specific date. If no entry exists for that date, a new one is created using the customer's default quantities as fallback.",
  {
    customerName: z.string().describe("Name of the customer (e.g. Rohan Sharma)."),
    date: z.string().describe("Delivery date in YYYY-MM-DD format."),
    morningQuantity: z.number().optional().describe("New morning quantity in Liters (optional)."),
    eveningQuantity: z.number().optional().describe("New evening quantity in Liters (optional).")
  },
  async (args) => {
    try {
      const custs = await executeQuery(
        "SELECT id, itemId, isDefaultItem, name, morningQuantity, eveningQuantity FROM customers WHERE name LIKE ? AND userId = ? AND deletedAt IS NULL LIMIT 1",
        [`%${args.customerName}%`, USER_ID]
      );
      if (!custs || custs.length === 0) {
        throw new Error(`Customer matching name "${args.customerName}" not found.`);
      }
      const cust = custs[0];
      let pricePerUnit = 0;
      if (cust.itemId) {
        const queryStr = cust.isDefaultItem 
          ? "SELECT pricePerUnit FROM default_dairy_items WHERE id = ? LIMIT 1"
          : "SELECT pricePerUnit FROM dairy_items WHERE id = ? AND userId = ? LIMIT 1";
        const params = cust.isDefaultItem ? [cust.itemId] : [cust.itemId, USER_ID];
        const items = await executeQuery(queryStr, params);
        if (items && items.length > 0) {
          pricePerUnit = Number(items[0].pricePerUnit);
        }
      }

      // Check if transaction already exists for this date
      const existing = await executeQuery(
        "SELECT id, morningQuantity, eveningQuantity FROM transactions WHERE customerId = ? AND date = ? LIMIT 1",
        [cust.id, args.date]
      );

      let finalMorning = 0;
      let finalEvening = 0;

      if (existing && existing.length > 0) {
        // Update existing record
        const record = existing[0];
        finalMorning = args.morningQuantity !== undefined ? args.morningQuantity : Number(record.morningQuantity);
        finalEvening = args.eveningQuantity !== undefined ? args.eveningQuantity : Number(record.eveningQuantity);
        const totalQty = finalMorning + finalEvening;
        const totalCost = totalQty * pricePerUnit;

        await executeQuery(
          "UPDATE transactions SET morningQuantity = ?, eveningQuantity = ?, totalPrice = ?, pricePerUnit = ? WHERE id = ?",
          [finalMorning, finalEvening, totalCost, pricePerUnit, record.id]
        );
      } else {
        // Create new record
        finalMorning = args.morningQuantity !== undefined ? args.morningQuantity : Number(cust.morningQuantity);
        finalEvening = args.eveningQuantity !== undefined ? args.eveningQuantity : Number(cust.eveningQuantity);
        const totalQty = finalMorning + finalEvening;
        const totalCost = totalQty * pricePerUnit;

        await executeQuery(`
          INSERT INTO transactions (userId, customerId, itemId, isDefaultItem, date, morningQuantity, eveningQuantity, totalPrice, pricePerUnit)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          USER_ID,
          cust.id,
          cust.itemId,
          cust.isDefaultItem,
          args.date,
          finalMorning,
          finalEvening,
          totalCost,
          pricePerUnit
        ]);
      }

      return { content: [{ type: "text", text: `Successfully updated delivery for ${cust.name} on ${args.date} to Morning: ${finalMorning}L, Evening: ${finalEvening}L.` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error updating delivery: ${e.message}` }], isError: true };
    }
  }
);

server.tool(
  "bulk_update_deliveries",
  "Update morning or evening delivery quantities for a customer across a range of dates (inclusive).",
  {
    customerName: z.string().describe("Name of the customer (e.g. Rohan Sharma)."),
    startDate: z.string().describe("Start date in YYYY-MM-DD format."),
    endDate: z.string().describe("End date in YYYY-MM-DD format."),
    morningQuantity: z.number().optional().describe("New morning quantity in Liters (optional)."),
    eveningQuantity: z.number().optional().describe("New evening quantity in Liters (optional).")
  },
  async (args) => {
    try {
      const custs = await executeQuery(
        "SELECT id, itemId, isDefaultItem, name, morningQuantity, eveningQuantity FROM customers WHERE name LIKE ? AND userId = ? AND deletedAt IS NULL LIMIT 1",
        [`%${args.customerName}%`, USER_ID]
      );
      if (!custs || custs.length === 0) {
        throw new Error(`Customer matching name "${args.customerName}" not found.`);
      }
      const cust = custs[0];
      let pricePerUnit = 0;
      if (cust.itemId) {
        const queryStr = cust.isDefaultItem 
          ? "SELECT pricePerUnit FROM default_dairy_items WHERE id = ? LIMIT 1"
          : "SELECT pricePerUnit FROM dairy_items WHERE id = ? AND userId = ? LIMIT 1";
        const params = cust.isDefaultItem ? [cust.itemId] : [cust.itemId, USER_ID];
        const items = await executeQuery(queryStr, params);
        if (items && items.length > 0) {
          pricePerUnit = Number(items[0].pricePerUnit);
        }
      }

      const start = new Date(args.startDate + "T00:00:00");
      const end = new Date(args.endDate + "T00:00:00");
      
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        throw new Error("Invalid date range specified.");
      }

      let current = new Date(start);
      let updatedCount = 0;

      while (current <= end) {
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const day = String(current.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        // Check existing
        const existing = await executeQuery(
          "SELECT id, morningQuantity, eveningQuantity FROM transactions WHERE customerId = ? AND date = ? LIMIT 1",
          [cust.id, dateStr]
        );

        let finalMorning = 0;
        let finalEvening = 0;

        if (existing && existing.length > 0) {
          const record = existing[0];
          finalMorning = args.morningQuantity !== undefined ? args.morningQuantity : Number(record.morningQuantity);
          finalEvening = args.eveningQuantity !== undefined ? args.eveningQuantity : Number(record.eveningQuantity);
          const totalQty = finalMorning + finalEvening;
          const totalCost = totalQty * pricePerUnit;

          await executeQuery(
            "UPDATE transactions SET morningQuantity = ?, eveningQuantity = ?, totalPrice = ?, pricePerUnit = ? WHERE id = ?",
            [finalMorning, finalEvening, totalCost, pricePerUnit, record.id]
          );
        } else {
          finalMorning = args.morningQuantity !== undefined ? args.morningQuantity : Number(cust.morningQuantity);
          finalEvening = args.eveningQuantity !== undefined ? args.eveningQuantity : Number(cust.eveningQuantity);
          const totalQty = finalMorning + finalEvening;
          const totalCost = totalQty * pricePerUnit;

          await executeQuery(`
            INSERT INTO transactions (userId, customerId, itemId, isDefaultItem, date, morningQuantity, eveningQuantity, totalPrice, pricePerUnit)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            USER_ID,
            cust.id,
            cust.itemId,
            cust.isDefaultItem,
            dateStr,
            finalMorning,
            finalEvening,
            totalCost,
            pricePerUnit
          ]);
        }

        updatedCount++;
        current.setDate(current.getDate() + 1);
      }

      return { content: [{ type: "text", text: `Successfully updated ${updatedCount} deliveries for ${cust.name} from ${args.startDate} to ${args.endDate}.` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error in bulk update: ${e.message}` }], isError: true };
    }
  }
);

// ----------------------------------------------------
// 2. Resource Registrations (All Database Entities)
// ----------------------------------------------------

server.resource(
  "users-all",
  "users://all",
  async () => {
    try {
      const rows = await executeQuery("SELECT id, userName, email, createdAt FROM users");
      return {
        contents: [{ uri: "users://all", text: JSON.stringify(rows || [], null, 2), mimeType: "application/json" }]
      };
    } catch (e) {
      throw new Error(`Failed to read users list: ${e.message}`);
    }
  }
);

server.resource(
  "users-detail",
  "users://user/{id}",
  async (uri) => {
    try {
      const parts = uri.href.split("users://user/");
      const id = parseInt(parts.length > 1 ? parts[1] : "", 10);
      if (isNaN(id)) throw new Error("Invalid user ID");
      const rows = await executeQuery("SELECT id, userName, email, createdAt, updatedAt FROM users WHERE id = ?", [id]);
      const responseData = rows.length > 0 ? rows[0] : { error: "User not found" };
      return {
        contents: [{ uri: uri.href, text: JSON.stringify(responseData, null, 2), mimeType: "application/json" }]
      };
    } catch (e) {
      throw new Error(`Failed to read user detail: ${e.message}`);
    }
  }
);

server.resource(
  "customers-all",
  "customers://all",
  async () => {
    try {
      const rows = await executeQuery("SELECT id, name, phone, address, morningQuantity, eveningQuantity, openingBalance FROM customers WHERE userId = ? AND deletedAt IS NULL", [USER_ID]);
      return {
        contents: [{ uri: "customers://all", text: JSON.stringify(rows || [], null, 2), mimeType: "application/json" }]
      };
    } catch (e) {
      throw new Error(`Failed to read customers list: ${e.message}`);
    }
  }
);

server.resource(
  "customers-detail",
  "customers://customer/{id}",
  async (uri) => {
    try {
      const parts = uri.href.split("customers://customer/");
      const id = parseInt(parts.length > 1 ? parts[1] : "", 10);
      if (isNaN(id)) throw new Error("Invalid customer ID");
      const rows = await executeQuery("SELECT * FROM customers WHERE id = ? AND userId = ? AND deletedAt IS NULL", [id, USER_ID]);
      const responseData = rows.length > 0 ? rows[0] : { error: "Customer not found" };
      return {
        contents: [{ uri: uri.href, text: JSON.stringify(responseData, null, 2), mimeType: "application/json" }]
      };
    } catch (e) {
      throw new Error(`Failed to read customer details: ${e.message}`);
    }
  }
);

server.resource(
  "bills-all",
  "bills://all",
  async () => {
    try {
      const rows = await executeQuery("SELECT * FROM bills WHERE userId = ?", [USER_ID]);
      return {
        contents: [{ uri: "bills://all", text: JSON.stringify(rows || [], null, 2), mimeType: "application/json" }]
      };
    } catch (e) {
      throw new Error(`Failed to read bills: ${e.message}`);
    }
  }
);

server.resource(
  "bills-detail",
  "bills://bill/{id}",
  async (uri) => {
    try {
      const parts = uri.href.split("bills://bill/");
      const id = parseInt(parts.length > 1 ? parts[1] : "", 10);
      if (isNaN(id)) throw new Error("Invalid bill ID");
      const rows = await executeQuery("SELECT * FROM bills WHERE id = ? AND userId = ?", [id, USER_ID]);
      const responseData = rows.length > 0 ? rows[0] : { error: "Bill not found" };
      return {
        contents: [{ uri: uri.href, text: JSON.stringify(responseData, null, 2), mimeType: "application/json" }]
      };
    } catch (e) {
      throw new Error(`Failed to read bill details: ${e.message}`);
    }
  }
);

server.resource(
  "items-all",
  "items://all",
  async () => {
    try {
      const rows = await executeQuery("SELECT * FROM default_dairy_items WHERE deletedAt IS NULL");
      return {
        contents: [{ uri: "items://all", text: JSON.stringify(rows || [], null, 2), mimeType: "application/json" }]
      };
    } catch (e) {
      throw new Error(`Failed to read dairy items: ${e.message}`);
    }
  }
);

// ----------------------------------------------------
// 3. Prompt Template Registrations
// ----------------------------------------------------

server.prompt(
  "assistant",
  "Prepare a default assistant system prompt or greeting template for the administrator",
  {
    userName: z.string().optional().describe("Name of the admin/user")
  },
  (args) => {
    const name = args.userName || "Admin";
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Hello, I am your Dairy Flow Pro AI Copilot. Welcome back, ${name}! How can I assist you with managing your database users or customers today?`
          }
        }
      ]
    };
  }
);

server.prompt(
  "customer_history",
  "Template to request historical statements/ledgers for a customer",
  {
    customerName: z.string().describe("Name of the customer"),
    monthKey: z.string().describe("Month in YYYY-MM format")
  },
  (args) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please retrieve and show me the delivery ledger for ${args.customerName} for ${args.monthKey}.`
          }
        }
      ]
    };
  }
);

server.prompt(
  "record_payment",
  "Template to record a customer payment receipt",
  {
    customerName: z.string().describe("Name of the customer"),
    amount: z.number().describe("Amount paid in ₹")
  },
  (args) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please record a payment of ₹${args.amount} for customer ${args.customerName}.`
          }
        }
      ]
    };
  }
);

// ----------------------------------------------------
// 4. Server Transport Connection Bootstrap
// ----------------------------------------------------

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Dairy Rich MCP Server running on stdio");
}

run().catch((error) => {
  console.error("Fatal error running MCP Server:", error);
  process.exit(1);
});
