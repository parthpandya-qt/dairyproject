import { query } from '@/lib/db';

export interface IUser {
  _id?: string;
  userName: string;
  email: string;
  password?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const User = {
  async findOne(filter: { email?: string; $or?: Array<{ username?: string; userName?: string; email?: string }> }) {
    if (filter.email) {
      const rows = await query('SELECT * FROM users WHERE email = ? LIMIT 1', [filter.email]);
      if (!rows || rows.length === 0) return null;
      return {
        ...rows[0],
        _id: rows[0].id.toString()
      };
    }

    if (filter.$or) {
      let usernameCond = '';
      let emailCond = '';
      
      for (const cond of filter.$or) {
        if (cond.username !== undefined || cond.userName !== undefined) {
          usernameCond = (cond.username || cond.userName || '').trim();
        }
        if (cond.email !== undefined) {
          emailCond = (cond.email || '').trim();
        }
      }

      const rows = await query('SELECT * FROM users WHERE userName = ? OR email = ? LIMIT 1', [usernameCond, emailCond]);
      if (!rows || rows.length === 0) return null;
      return {
        ...rows[0],
        _id: rows[0].id.toString()
      };
    }

    return null;
  },

  async create(data: { userName: string; email: string; password?: string }) {
    const result = await query(
      'INSERT INTO users (userName, email, password) VALUES (?, ?, ?)',
      [data.userName, data.email, data.password || '']
    );
    const insertId = result.insertId;
    return {
      _id: insertId.toString(),
      userName: data.userName,
      email: data.email,
    };
  }
};

export default User;