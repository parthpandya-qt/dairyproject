import { query } from '@/lib/db';

export interface ITransaction {
  _id?: string;
  userId: number;
  customerId: number;
  itemId: number;
  date: string;
  morningQuantity: number;
  eveningQuantity: number;
  totalPrice: number;
  customerName?: string;
  itemName?: string;
  itemPrice?: number;
  itemUnit?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const Transaction = {
  async find(userId: number) {
    const rows = await query(`
      SELECT t.*, c.name AS customerName, i.name AS itemName, i.pricePerUnit AS itemPrice, i.unit AS itemUnit
      FROM transactions t
      LEFT JOIN customers c ON t.customerId = c.id
      LEFT JOIN dairy_items i ON t.itemId = i.id
      WHERE t.userId = ?
      ORDER BY t.date DESC, t.id DESC
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
        morningQuantity: Number(row.morningQuantity),
        eveningQuantity: Number(row.eveningQuantity),
        totalPrice: Number(row.totalPrice)
      };
    });
  },

  async create(data: { customerId: number; itemId: number; date: string; morningQuantity: number; eveningQuantity: number; totalPrice: number }, userId: number) {
    const result = await query(`
      INSERT INTO transactions (userId, customerId, itemId, date, morningQuantity, eveningQuantity, totalPrice)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [userId, data.customerId, data.itemId, data.date, data.morningQuantity, data.eveningQuantity, data.totalPrice]);
    
    const insertId = result.insertId;
    return {
      _id: insertId.toString(),
      userId,
      ...data
    };
  },

  async findByIdAndUpdate(id: string, data: { customerId: number; itemId: number; date: string; morningQuantity: number; eveningQuantity: number; totalPrice: number }, userId: number) {
    await query(`
      UPDATE transactions 
      SET customerId = ?, itemId = ?, date = ?, morningQuantity = ?, eveningQuantity = ?, totalPrice = ?
      WHERE id = ? AND userId = ?
    `, [data.customerId, data.itemId, data.date, data.morningQuantity, data.eveningQuantity, data.totalPrice, id, userId]);
    
    const rows = await query('SELECT * FROM transactions WHERE id = ? AND userId = ?', [id, userId]);
    if (!rows || rows.length === 0) return null;
    return {
      ...rows[0],
      _id: rows[0].id.toString(),
      morningQuantity: Number(rows[0].morningQuantity),
      eveningQuantity: Number(rows[0].eveningQuantity),
      totalPrice: Number(rows[0].totalPrice)
    };
  },

  async findByIdAndDelete(id: string, userId: number) {
    const rows = await query('SELECT * FROM transactions WHERE id = ? AND userId = ?', [id, userId]);
    if (!rows || rows.length === 0) return null;
    
    await query('DELETE FROM transactions WHERE id = ? AND userId = ?', [id, userId]);
    return {
      ...rows[0],
      _id: rows[0].id.toString()
    };
  }
};

export default Transaction;
