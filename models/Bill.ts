import { query } from '@/lib/db';

export interface IBill {
  _id?: string;
  id?: number;
  userId: number;
  customerId: number;
  customerName?: string;
  billingMonth: string;
  openingBalance: number;
  deliveriesTotal: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const Bill = {
  async find(userId: number): Promise<IBill[]> {
    const rows = await query(`
      SELECT b.*, c.name AS customerName
      FROM bills b
      LEFT JOIN customers c ON b.customerId = c.id
      WHERE b.userId = ?
      ORDER BY b.billingMonth DESC, b.id DESC
    `, [userId]);

    if (!rows) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return rows.map((row: any) => ({
      ...row,
      _id: row.id.toString(),
      openingBalance: Number(row.openingBalance || 0),
      deliveriesTotal: Number(row.deliveriesTotal || 0),
      totalAmount: Number(row.totalAmount || 0),
      paidAmount: Number(row.paidAmount || 0),
    }));
  },

  async create(data: {
    customerId: number;
    billingMonth: string;
    openingBalance: number;
    deliveriesTotal: number;
    totalAmount: number;
    paidAmount?: number;
    status?: string;
  }, userId: number): Promise<IBill> {
    const paidAmount = data.paidAmount !== undefined ? data.paidAmount : 0;
    const status = data.status || 'Unpaid';

    const result = await query(`
      INSERT INTO bills (userId, customerId, billingMonth, openingBalance, deliveriesTotal, totalAmount, paidAmount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      data.customerId,
      data.billingMonth,
      data.openingBalance,
      data.deliveriesTotal,
      data.totalAmount,
      paidAmount,
      status
    ]);

    const insertId = result.insertId;
    return {
      _id: insertId.toString(),
      id: insertId,
      userId,
      customerId: data.customerId,
      billingMonth: data.billingMonth,
      openingBalance: data.openingBalance,
      deliveriesTotal: data.deliveriesTotal,
      totalAmount: data.totalAmount,
      paidAmount,
      status
    };
  },

  async findByIdAndUpdate(
    id: string | number,
    data: { paidAmount: number; status: string },
    userId: number
  ): Promise<boolean> {
    const result = await query(`
      UPDATE bills
      SET paidAmount = ?, status = ?
      WHERE id = ? AND userId = ?
    `, [data.paidAmount, data.status, id, userId]);

    return result.affectedRows > 0;
  },

  async delete(id: string | number, userId: number): Promise<boolean> {
    const result = await query(`
      DELETE FROM bills
      WHERE id = ? AND userId = ?
    `, [id, userId]);

    return result.affectedRows > 0;
  }
};
