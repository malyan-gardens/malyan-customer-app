import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AddTransactionModal from './AddTransactionModal';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  month: number;
  year: number;
  payment_method: string;
  notes: string;
  finance_categories: { name_ar: string; icon: string; color: string } | null;
}

const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'نقدي',
  qnb_transfer: 'QNB تحويل',
  qnb_card: 'QNB بطاقة',
  check: 'شيك',
};

function formatQAR(n: number) {
  return new Intl.NumberFormat('ar-QA', { style: 'decimal', minimumFractionDigits: 0 }).format(n) + ' QAR';
}

export default function Finance() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function fetchTransactions() {
    setLoading(true);
    const { data } = await supabase
      .from('finance_transactions')
      .select('*, finance_categories(name_ar, icon, color)')
      .eq('month', selectedMonth)
      .eq('year', selectedYear)
      .order('date', { ascending: false });
    setTransactions((data as Transaction[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchTransactions();
  }, [selectedMonth, selectedYear]);

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const netProfit = totalIncome - totalExpense;

  const kpiCards = [
    { label: 'إجمالي الدخل', value: formatQAR(totalIncome), color: '#4cdf80' },
    { label: 'إجمالي المصاريف', value: formatQAR(totalExpense), color: '#e05252' },
    { label: 'صافي الربح', value: formatQAR(netProfit), color: netProfit >= 0 ? '#4cdf80' : '#e05252' },
    { label: 'عدد المعاملات', value: String(transactions.length), color: '#4a9fd4' },
  ];

  const boxStyle = {
    background: '#0f1a12',
    border: '1px solid #2a3d2e',
    borderRadius: '14px',
  };

  return (
    <div style={{ padding: '28px', direction: 'rtl', fontFamily: 'Cairo, Tajawal, sans-serif' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#e8f0ea' }}>💰 المالية</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            style={{
              background: '#0f1a12',
              border: '1px solid #2a3d2e',
              borderRadius: '8px',
              padding: '8px 14px',
              color: '#e8f0ea',
              fontFamily: 'inherit',
              fontSize: '13px',
            }}
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{
              background: '#0f1a12',
              border: '1px solid #2a3d2e',
              borderRadius: '8px',
              padding: '8px 14px',
              color: '#e8f0ea',
              fontFamily: 'inherit',
              fontSize: '13px',
            }}
          >
            {[2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={() => setShowModal(true)}
            style={{
              background: 'linear-gradient(135deg, #1a7a3c, #22a84f)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 18px',
              color: 'white',
              fontFamily: 'inherit',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            + إضافة حركة
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {kpiCards.map((card, i) => (
          <div
            key={i}
            style={{
              ...boxStyle,
              padding: '20px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: card.color,
              }}
            />
            <div style={{ fontSize: '12px', color: '#7a9480', marginBottom: '8px' }}>{card.label}</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ ...boxStyle, overflow: 'hidden' }}>
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #2a3d2e',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#e8f0ea' }}>
            معاملات {MONTHS[selectedMonth - 1]} {selectedYear}
          </h3>
          <span
            style={{
              background: 'rgba(26,122,60,0.2)',
              color: '#4cdf80',
              padding: '3px 10px',
              borderRadius: '20px',
              fontSize: '11px',
            }}
          >
            {transactions.length} معاملة
          </span>
        </div>

        {loading && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#4a6450' }}>⏳ جاري التحميل...</div>
        )}

        {!loading && transactions.length === 0 && (
          <div style={{ padding: '60px', textAlign: 'center', color: '#4a6450' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
            <div>لا توجد معاملات هذا الشهر</div>
            <button
              onClick={() => setShowModal(true)}
              style={{
                marginTop: '16px',
                background: '#1a7a3c',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                color: 'white',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              + أضف أول حركة
            </button>
          </div>
        )}

        {!loading && transactions.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead>
                <tr>
                  {['التاريخ', 'الوصف', 'الفئة', 'طريقة الدفع', 'النوع', 'المبلغ'].map((h) => (
                    <th
                      key={h}
                      style={{
                        background: '#162019',
                        padding: '12px 16px',
                        textAlign: 'right',
                        fontSize: '12px',
                        color: '#7a9480',
                        fontWeight: 600,
                        borderBottom: '1px solid #2a3d2e',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid rgba(42,61,46,0.4)' }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#7a9480' }}>
                      {new Date(t.date).toLocaleDateString('ar')}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#e8f0ea', fontWeight: 500 }}>
                      {t.description}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                      {t.finance_categories?.icon} {t.finance_categories?.name_ar}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#7a9480' }}>
                      {PAYMENT_LABELS[t.payment_method] ?? t.payment_method}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          background: t.type === 'income' ? 'rgba(26,122,60,0.2)' : 'rgba(224,82,82,0.15)',
                          color: t.type === 'income' ? '#4cdf80' : '#e05252',
                          padding: '3px 10px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        {t.type === 'income' ? 'دخل' : 'مصروف'}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        fontSize: '14px',
                        fontWeight: 700,
                        color: t.type === 'income' ? '#4cdf80' : '#e05252',
                      }}
                    >
                      {t.type === 'income' ? '+' : '-'}{formatQAR(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <AddTransactionModal
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            fetchTransactions();
          }}
        />
      )}
    </div>
  );
}
