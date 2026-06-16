export interface IUser {
  _id?: string;
  userName: string;
  email: string;
  createdAt?: Date;
}

export interface ICustomer {
  _id: string;
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
  createdAt?: Date;
}

export interface IDailyLog {
  _id?: string;
  customerId: string;
  date: Date;
  quantity: number; 
  morningQuantity: number; // Amount in Liters (e.g., 1.5, 2.0, 0.5)
  eveningQuantity: number; // Amount in Liters (e.g., 1.5, 2.0, 0.5)
}

export interface IDairyItem {
  _id: string;
  name: string;
  pricePerUnit: number;
  unit: 'Liter' | 'Kg' | 'Packet';
  createdAt?: Date;
}

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
}