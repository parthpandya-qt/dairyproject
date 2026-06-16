import { query } from '@/lib/db';

export interface IDairyItem {
  _id?: string;
  name: string;
  pricePerUnit: number;
  unit: string;
  userId?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export const DairyItem = {
  async find(userId: number) {
    const rows = await query('SELECT * FROM dairy_items WHERE deletedAt IS NULL AND userId = ? ORDER BY name ASC', [userId]);
    if (!rows) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return rows.map((row: any) => ({
      ...row,
      _id: row.id.toString(),
      pricePerUnit: Number(row.pricePerUnit)
    }));
  },

  async findOne(filter: { name?: string }, userId: number) {
    if (filter.name) {
      const rows = await query('SELECT * FROM dairy_items WHERE name = ? AND userId = ? AND deletedAt IS NULL LIMIT 1', [filter.name, userId]);
      if (!rows || rows.length === 0) return null;
      return {
        ...rows[0],
        _id: rows[0].id.toString(),
        pricePerUnit: Number(rows[0].pricePerUnit)
      };
    }
    return null;
  },

  async create(data: { name: string; pricePerUnit: number; unit: string }, userId: number) {
    const result = await query(
      'INSERT INTO dairy_items (name, pricePerUnit, unit, userId) VALUES (?, ?, ?, ?)',
      [data.name.trim(), data.pricePerUnit, data.unit, userId]
    );
    const insertId = result.insertId;
    return {
      _id: insertId.toString(),
      name: data.name,
      pricePerUnit: data.pricePerUnit,
      unit: data.unit,
      userId
    };
  },

  async findByIdAndDelete(id: string, userId: number) {
    const rows = await query('SELECT * FROM dairy_items WHERE id = ? AND userId = ? AND deletedAt IS NULL', [id, userId]);
    if (!rows || rows.length === 0) return null;
    
    await query('UPDATE dairy_items SET deletedAt = CURRENT_TIMESTAMP WHERE id = ? AND userId = ?', [id, userId]);
    return {
      ...rows[0],
      _id: rows[0].id.toString(),
      pricePerUnit: Number(rows[0].pricePerUnit)
    };
  },

  async findByIdAndUpdate(id: string, data: { name: string; pricePerUnit: number; unit: string }, userId: number) {
    await query(
      'UPDATE dairy_items SET name = ?, pricePerUnit = ?, unit = ? WHERE id = ? AND userId = ? AND deletedAt IS NULL',
      [data.name, data.pricePerUnit, data.unit, id, userId]
    );
    const rows = await query('SELECT * FROM dairy_items WHERE id = ? AND userId = ? AND deletedAt IS NULL', [id, userId]);
    if (!rows || rows.length === 0) return null;
    return {
      ...rows[0],
      _id: rows[0].id.toString(),
      pricePerUnit: Number(rows[0].pricePerUnit)
    };
  }
};

export default DairyItem;