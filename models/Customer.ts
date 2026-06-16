import { query } from '@/lib/db';

export interface ICustomer {
  _id?: string;
  name: string;
  phone: string;
  address: string;
  morningQuantity: number;
  eveningQuantity: number;
  unit?: string;
  itemId?: number | null;
  itemName?: string;
  itemUnit?: string;
  openingBalance: number;
  userId?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IDailyLog {
  _id?: string;
  customerId: string;
  date: Date;
  morningQuantity: number;
  eveningQuantity: number;
}

export const Customer = {
  async find(userId: number) {
    const rows = await query(`
      SELECT c.*, i.name AS itemName, i.unit AS itemUnit
      FROM customers c
      LEFT JOIN dairy_items i ON c.itemId = i.id
      WHERE c.deletedAt IS NULL AND c.userId = ?
      ORDER BY c.createdAt DESC
    `, [userId]);
    if (!rows) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return rows.map((row: any) => ({
      ...row,
      _id: row.id.toString(),
      morningQuantity: Number(row.morningQuantity),
      eveningQuantity: Number(row.eveningQuantity),
      itemId: row.itemId ? Number(row.itemId) : null,
      openingBalance: Number(row.openingBalance || 0)
    }));
  },

  async create(data: { name: string; phone: string; address: string; morningQuantity?: number; eveningQuantity?: number; itemId?: number | null; openingBalance?: number }, userId: number) {
    const morningQuantity = data.morningQuantity !== undefined ? data.morningQuantity : 0.0;
    const eveningQuantity = data.eveningQuantity !== undefined ? data.eveningQuantity : 0.0;
    const itemId = data.itemId !== undefined ? data.itemId : null;
    const openingBalance = data.openingBalance !== undefined ? data.openingBalance : 0.0;
    
    const result = await query(
      'INSERT INTO customers (name, phone, address, morningQuantity, eveningQuantity, itemId, openingBalance, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [data.name, data.phone, data.address, morningQuantity, eveningQuantity, itemId, openingBalance, userId]
    );
    const insertId = result.insertId;
    return {
      _id: insertId.toString(),
      name: data.name,
      phone: data.phone,
      address: data.address,
      morningQuantity,
      eveningQuantity,
      itemId,
      openingBalance,
      userId
    };
  },

  async findByIdAndDelete(id: string, userId: number) {
    const rows = await query('SELECT * FROM customers WHERE id = ? AND userId = ? AND deletedAt IS NULL', [id, userId]);
    if (!rows || rows.length === 0) return null;
    
    await query('UPDATE customers SET deletedAt = CURRENT_TIMESTAMP WHERE id = ? AND userId = ?', [id, userId]);
    return {
      ...rows[0],
      _id: rows[0].id.toString(),
      morningQuantity: Number(rows[0].morningQuantity),
      eveningQuantity: Number(rows[0].eveningQuantity),
      itemId: rows[0].itemId ? Number(rows[0].itemId) : null,
      openingBalance: Number(rows[0].openingBalance || 0)
    };
  },

  async findByIdAndUpdate(id: string, data: { name: string; phone: string; address: string; morningQuantity: number; eveningQuantity: number; itemId: number | null; openingBalance: number }, userId: number) {
    await query(
      'UPDATE customers SET name = ?, phone = ?, address = ?, morningQuantity = ?, eveningQuantity = ?, itemId = ?, openingBalance = ? WHERE id = ? AND userId = ? AND deletedAt IS NULL',
      [data.name, data.phone, data.address, data.morningQuantity, data.eveningQuantity, data.itemId, data.openingBalance, id, userId]
    );
    const rows = await query(`
      SELECT c.*, i.name AS itemName, i.unit AS itemUnit
      FROM customers c
      LEFT JOIN dairy_items i ON c.itemId = i.id
      WHERE c.id = ? AND c.userId = ? AND c.deletedAt IS NULL
    `, [id, userId]);
    if (!rows || rows.length === 0) return null;
    return {
      ...rows[0],
      _id: rows[0].id.toString(),
      morningQuantity: Number(rows[0].morningQuantity),
      eveningQuantity: Number(rows[0].eveningQuantity),
      itemId: rows[0].itemId ? Number(rows[0].itemId) : null,
      openingBalance: Number(rows[0].openingBalance || 0)
    };
  }
};

export const DailyLog = {
  async deleteMany(filter: { customerId: string }) {
    const result = await query('DELETE FROM daily_logs WHERE customerId = ?', [filter.customerId]);
    return { deletedCount: result.affectedRows || 0 };
  }
};