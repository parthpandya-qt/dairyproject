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
  itemId?: string | number | null;
  itemName?: string;
  itemUnit?: string;
  itemPrice?: number;
  openingBalance: number;
  isDefaultItem?: number | boolean;
  createdAt?: Date;
}

export interface IDairyItem {
  _id: string;
  name: string;
  pricePerUnit: number;
  unit: 'Liter' | 'Kg' | 'Packet' | string;
  isDefaultItem?: number | boolean;
  createdAt?: Date;
}

export interface ITransaction {
  _id?: string;
  userId: number;
  customerId: number;
  itemId: string | number;
  date: string;
  morningQuantity: number;
  eveningQuantity: number;
  totalPrice: number;
  customerName?: string;
  itemName?: string;
  itemPrice?: number;
  itemUnit?: string;
  isDefaultItem?: number | boolean;
  pricePerUnit?: number;
  createdAt?: Date;
}

export interface IExtraItem {
  _id?: string;
  userId: number;
  customerId: number;
  itemId: string | number;
  date: string;
  quantity: number;
  totalPrice: number;
  customerName?: string;
  itemName?: string;
  itemPrice?: number;
  itemUnit?: string;
  isDefaultItem?: number | boolean;
  pricePerUnit?: number;
  createdAt?: Date;
}

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