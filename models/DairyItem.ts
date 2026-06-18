import { query } from '@/lib/db';

export interface IDairyItem {
  _id?: string;
  name: string;
  pricePerUnit: number;
  unit: string;
  userId?: number;
  isDefaultItem?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export function parseItemRef(itemRef: string | number | null | undefined): { itemId: number | null, isDefaultItem: number } {
  if (itemRef === null || itemRef === undefined || itemRef === '') {
    return { itemId: null, isDefaultItem: 0 };
  }
  const refStr = String(itemRef).trim();
  if (refStr.startsWith('d-') || refStr.startsWith('default-')) {
    const id = parseInt(refStr.replace(/^(d-|default-)/, ''), 10);
    return { itemId: isNaN(id) ? null : id, isDefaultItem: 1 };
  } else if (refStr.startsWith('a-') || refStr.startsWith('admin-')) {
    const id = parseInt(refStr.replace(/^(a-|admin-)/, ''), 10);
    return { itemId: isNaN(id) ? null : id, isDefaultItem: 0 };
  } else {
    const id = parseInt(refStr, 10);
    return { itemId: isNaN(id) ? null : id, isDefaultItem: 0 };
  }
}

export const DairyItem = {
  async find(userId: number) {
    const defaultRows = await query('SELECT * FROM default_dairy_items WHERE deletedAt IS NULL ORDER BY name ASC');
    const adminRows = await query('SELECT * FROM dairy_items WHERE deletedAt IS NULL AND userId = ? ORDER BY name ASC', [userId]);

    const defaults = (defaultRows || []).map((row: any) => ({
      ...row,
      _id: `d-${row.id}`,
      pricePerUnit: Number(row.pricePerUnit),
      isDefaultItem: 1
    }));

    const admins = (adminRows || []).map((row: any) => ({
      ...row,
      _id: `a-${row.id}`,
      pricePerUnit: Number(row.pricePerUnit),
      isDefaultItem: 0
    }));

    return [...defaults, ...admins];
  },

  async findOne(filter: { name?: string }, userId: number) {
    if (filter.name) {
      // 1. Check default items first
      const defaultRows = await query('SELECT * FROM default_dairy_items WHERE name = ? AND deletedAt IS NULL LIMIT 1', [filter.name]);
      if (defaultRows && defaultRows.length > 0) {
        return {
          ...defaultRows[0],
          _id: `d-${defaultRows[0].id}`,
          pricePerUnit: Number(defaultRows[0].pricePerUnit),
          isDefaultItem: 1
        };
      }

      // 2. Check admin items next
      const adminRows = await query('SELECT * FROM dairy_items WHERE name = ? AND userId = ? AND deletedAt IS NULL LIMIT 1', [filter.name, userId]);
      if (adminRows && adminRows.length > 0) {
        return {
          ...adminRows[0],
          _id: `a-${adminRows[0].id}`,
          pricePerUnit: Number(adminRows[0].pricePerUnit),
          isDefaultItem: 0
        };
      }
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
      _id: `a-${insertId}`,
      name: data.name,
      pricePerUnit: data.pricePerUnit,
      unit: data.unit,
      userId,
      isDefaultItem: 0
    };
  },

  async findByIdAndDelete(id: string, userId: number) {
    const parsed = parseItemRef(id);
    const realId = parsed.itemId;
    if (!realId) return null;

    if (parsed.isDefaultItem) {
      const rows = await query('SELECT * FROM default_dairy_items WHERE id = ? AND deletedAt IS NULL', [realId]);
      if (!rows || rows.length === 0) return null;
      
      await query('UPDATE default_dairy_items SET deletedAt = CURRENT_TIMESTAMP WHERE id = ?', [realId]);
      return {
        ...rows[0],
        _id: `d-${rows[0].id}`,
        pricePerUnit: Number(rows[0].pricePerUnit),
        isDefaultItem: 1
      };
    } else {
      const rows = await query('SELECT * FROM dairy_items WHERE id = ? AND userId = ? AND deletedAt IS NULL', [realId, userId]);
      if (!rows || rows.length === 0) return null;
      
      await query('UPDATE dairy_items SET deletedAt = CURRENT_TIMESTAMP WHERE id = ? AND userId = ?', [realId, userId]);
      return {
        ...rows[0],
        _id: `a-${rows[0].id}`,
        pricePerUnit: Number(rows[0].pricePerUnit),
        isDefaultItem: 0
      };
    }
  },

  async findByIdAndUpdate(id: string, data: { name: string; pricePerUnit: number; unit: string }, userId: number) {
    const parsed = parseItemRef(id);
    const realId = parsed.itemId;
    if (!realId) return null;

    if (parsed.isDefaultItem) {
      await query(
        'UPDATE default_dairy_items SET name = ?, pricePerUnit = ?, unit = ? WHERE id = ? AND deletedAt IS NULL',
        [data.name, data.pricePerUnit, data.unit, realId]
      );
      const rows = await query('SELECT * FROM default_dairy_items WHERE id = ? AND deletedAt IS NULL', [realId]);
      if (!rows || rows.length === 0) return null;
      return {
        ...rows[0],
        _id: `d-${rows[0].id}`,
        pricePerUnit: Number(rows[0].pricePerUnit),
        isDefaultItem: 1
      };
    } else {
      await query(
        'UPDATE dairy_items SET name = ?, pricePerUnit = ?, unit = ? WHERE id = ? AND userId = ? AND deletedAt IS NULL',
        [data.name, data.pricePerUnit, data.unit, realId, userId]
      );
      const rows = await query('SELECT * FROM dairy_items WHERE id = ? AND userId = ? AND deletedAt IS NULL', [realId, userId]);
      if (!rows || rows.length === 0) return null;
      return {
        ...rows[0],
        _id: `a-${rows[0].id}`,
        pricePerUnit: Number(rows[0].pricePerUnit),
        isDefaultItem: 0
      };
    }
  }
};

export default DairyItem;