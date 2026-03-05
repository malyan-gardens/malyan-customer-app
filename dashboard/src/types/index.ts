export type FinanceTransactionType = 'income' | 'expense';
export type PaymentMethod = 'cash' | 'qnb_transfer' | 'qnb_card' | 'check';

export interface FinanceCategory {
  id: string;
  name_ar: string;
  type: FinanceTransactionType;
  icon: string | null;
  color: string | null;
}

export interface FinanceTransaction {
  id: string;
  type: FinanceTransactionType;
  category_id: string;
  amount: number;
  description: string;
  date: string;
  month: number;
  year: number;
  payment_method: PaymentMethod;
  notes: string | null;
  finance_categories?: { name_ar: string; icon: string; color: string };
}
