import { query } from '@/lib/db';
import { parseItemRef } from './DairyItem';

export interface ICustomer {
  _id?: string;
  name: string;
  phone: string;
  address: string;
  morningQuantity: number;
  eveningQuantity: number;
  unit?: string;
  itemId?: string | number | null;
  itemName?: string;
  itemUnit?: string;
  openingBalance: number;
  isDefaultItem?: number;
  userId?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export const Customer = {
  async find(userId: number) {
    const rows = await query(`
      SELECT c.*, 
             COALESCE(di.name, ai.name) AS itemName, 
             COALESCE(di.unit, ai.unit) AS itemUnit
      FROM customers c
      LEFT JOIN default_dairy_items di ON c.itemId = di.id AND c.isDefaultItem = 1
      LEFT JOIN dairy_items ai ON c.itemId = ai.id AND (c.isDefaultItem IS NULL OR c.isDefaultItem = 0)
      WHERE c.deletedAt IS NULL AND c.userId = ?
      ORDER BY c.createdAt DESC
    `, [userId]);
    if (!rows) return [];
    
    return rows.map((row: any) => ({
      ...row,
      _id: row.id.toString(),
      morningQuantity: Number(row.morningQuantity),
      eveningQuantity: Number(row.eveningQuantity),
      itemId: row.itemId ? `${row.isDefaultItem ? 'd-' : 'a-'}${row.itemId}` : null,
      openingBalance: Number(row.openingBalance || 0)
    }));
  },

  async create(data: { name: string; phone: string; address: string; morningQuantity?: number; eveningQuantity?: number; itemId?: string | number | null; openingBalance?: number }, userId: number) {
    const morningQuantity = data.morningQuantity !== undefined ? data.morningQuantity : 0.0;
    const eveningQuantity = data.eveningQuantity !== undefined ? data.eveningQuantity : 0.0;
    const openingBalance = data.openingBalance !== undefined ? data.openingBalance : 0.0;
    
    const parsed = parseItemRef(data.itemId);
    const itemId = parsed.itemId;
    const isDefaultItem = parsed.isDefaultItem;
    
    const result = await query(
      'INSERT INTO customers (name, phone, address, morningQuantity, eveningQuantity, itemId, isDefaultItem, openingBalance, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [data.name, data.phone, data.address, morningQuantity, eveningQuantity, itemId, isDefaultItem, openingBalance, userId]
    );
    const insertId = result.insertId;
    return {
      _id: insertId.toString(),
      name: data.name,
      phone: data.phone,
      address: data.address,
      morningQuantity,
      eveningQuantity,
      itemId: data.itemId || null,
      isDefaultItem,
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
      itemId: rows[0].itemId ? `${rows[0].isDefaultItem ? 'd-' : 'a-'}${rows[0].itemId}` : null,
      openingBalance: Number(rows[0].openingBalance || 0)
    };
  },

  async findByIdAndUpdate(id: string, data: { name: string; phone: string; address: string; morningQuantity: number; eveningQuantity: number; itemId: string | number | null; openingBalance: number }, userId: number) {
    const parsed = parseItemRef(data.itemId);
    const itemId = parsed.itemId;
    const isDefaultItem = parsed.isDefaultItem;

    await query(
      'UPDATE customers SET name = ?, phone = ?, address = ?, morningQuantity = ?, eveningQuantity = ?, itemId = ?, isDefaultItem = ?, openingBalance = ? WHERE id = ? AND userId = ? AND deletedAt IS NULL',
      [data.name, data.phone, data.address, data.morningQuantity, data.eveningQuantity, itemId, isDefaultItem, data.openingBalance, id, userId]
    );
    
    const rows = await query(`
      SELECT c.*, 
             COALESCE(di.name, ai.name) AS itemName, 
             COALESCE(di.unit, ai.unit) AS itemUnit
      FROM customers c
      LEFT JOIN default_dairy_items di ON c.itemId = di.id AND c.isDefaultItem = 1
      LEFT JOIN dairy_items ai ON c.itemId = ai.id AND (c.isDefaultItem IS NULL OR c.isDefaultItem = 0)
      WHERE c.id = ? AND c.userId = ? AND c.deletedAt IS NULL
    `, [id, userId]);
    if (!rows || rows.length === 0) return null;
    return {
      ...rows[0],
      _id: rows[0].id.toString(),
      morningQuantity: Number(rows[0].morningQuantity),
      eveningQuantity: Number(rows[0].eveningQuantity),
      itemId: rows[0].itemId ? `${rows[0].isDefaultItem ? 'd-' : 'a-'}${rows[0].itemId}` : null,
      openingBalance: Number(rows[0].openingBalance || 0)
    };
  }
};