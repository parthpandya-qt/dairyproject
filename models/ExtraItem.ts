import { query } from '@/lib/db';
import { parseItemRef } from './DairyItem';

export interface IExtraItem {
  _id?: string;
  userId: number;
  customerId: number;
  itemId: string | number;
  isDefaultItem?: number;
  date: string;
  quantity: number;
  totalPrice: number;
  pricePerUnit: number;
  customerName?: string;
  itemName?: string;
  itemPrice?: number;
  itemUnit?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const ExtraItem = {
  async find(userId: number) {
    const rows = await query(`
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
    
    if (!rows) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return rows.map((row: any) => {
      // Format date to YYYY-MM-DD
      let dateStr = "";
      if (row.date) {
        const d = new Date(row.date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dateStr = `${year}-${month}-${day}`;
      }
      return {
        ...row,
        _id: row.id.toString(),
        date: dateStr,
        quantity: Number(row.quantity),
        totalPrice: Number(row.totalPrice),
        pricePerUnit: Number(row.pricePerUnit || row.itemPrice || 0),
        itemId: row.itemId ? `${row.isDefaultItem ? 'd-' : 'a-'}${row.itemId}` : ""
      };
    });
  },

  async create(data: { customerId: number; itemId: string | number; date: string; quantity: number; totalPrice: number; pricePerUnit?: number }, userId: number) {
    const parsed = parseItemRef(data.itemId);
    const itemId = parsed.itemId;
    const isDefaultItem = parsed.isDefaultItem;

    let pricePerUnit = data.pricePerUnit;
    if (pricePerUnit === undefined || pricePerUnit === null) {
      if (isDefaultItem) {
        const rows = await query('SELECT pricePerUnit FROM default_dairy_items WHERE id = ?', [itemId]);
        pricePerUnit = rows && rows.length > 0 ? Number(rows[0].pricePerUnit) : 0;
      } else {
        const rows = await query('SELECT pricePerUnit FROM dairy_items WHERE id = ? AND userId = ?', [itemId, userId]);
        pricePerUnit = rows && rows.length > 0 ? Number(rows[0].pricePerUnit) : 0;
      }
    }

    const result = await query(`
      INSERT INTO extra_item (userId, customerId, itemId, isDefaultItem, date, quantity, totalPrice, pricePerUnit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [userId, data.customerId, itemId, isDefaultItem, data.date, data.quantity, data.totalPrice, pricePerUnit]);
    
    const insertId = result.insertId;
    return {
      _id: insertId.toString(),
      userId,
      ...data,
      pricePerUnit
    };
  },

  async findByIdAndUpdate(id: string, data: { customerId: number; itemId: string | number; date: string; quantity: number; totalPrice: number; pricePerUnit?: number }, userId: number) {
    const parsed = parseItemRef(data.itemId);
    const itemId = parsed.itemId;
    const isDefaultItem = parsed.isDefaultItem;

    let pricePerUnit = data.pricePerUnit;
    if (pricePerUnit === undefined || pricePerUnit === null) {
      const existing = await query('SELECT pricePerUnit FROM extra_item WHERE id = ? AND userId = ?', [id, userId]);
      if (existing && existing.length > 0 && Number(existing[0].pricePerUnit) > 0) {
        pricePerUnit = Number(existing[0].pricePerUnit);
      } else {
        if (isDefaultItem) {
          const rows = await query('SELECT pricePerUnit FROM default_dairy_items WHERE id = ?', [itemId]);
          pricePerUnit = rows && rows.length > 0 ? Number(rows[0].pricePerUnit) : 0;
        } else {
          const rows = await query('SELECT pricePerUnit FROM dairy_items WHERE id = ? AND userId = ?', [itemId, userId]);
          pricePerUnit = rows && rows.length > 0 ? Number(rows[0].pricePerUnit) : 0;
        }
      }
    }

    await query(`
      UPDATE extra_item 
      SET customerId = ?, itemId = ?, isDefaultItem = ?, date = ?, quantity = ?, totalPrice = ?, pricePerUnit = ?
      WHERE id = ? AND userId = ?
    `, [data.customerId, itemId, isDefaultItem, data.date, data.quantity, data.totalPrice, pricePerUnit, id, userId]);
    
    const rows = await query('SELECT * FROM extra_item WHERE id = ? AND userId = ?', [id, userId]);
    if (!rows || rows.length === 0) return null;
    return {
      ...rows[0],
      _id: rows[0].id.toString(),
      quantity: Number(rows[0].quantity),
      totalPrice: Number(rows[0].totalPrice),
      pricePerUnit: Number(rows[0].pricePerUnit || 0),
      itemId: rows[0].itemId ? `${rows[0].isDefaultItem ? 'd-' : 'a-'}${rows[0].itemId}` : ""
    };
  },

  async findByIdAndDelete(id: string, userId: number) {
    const rows = await query('SELECT * FROM extra_item WHERE id = ? AND userId = ?', [id, userId]);
    if (!rows || rows.length === 0) return null;
    
    await query('DELETE FROM extra_item WHERE id = ? AND userId = ?', [id, userId]);
    return {
      ...rows[0],
      _id: rows[0].id.toString()
    };
  }
};

export default ExtraItem;
