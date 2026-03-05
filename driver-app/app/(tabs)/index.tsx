import { View, Text, ScrollView, TouchableOpacity, Linking, StyleSheet } from 'react-native';

const GREEN_DEEP = '#0d3b2c';
const GREEN_MID = '#1a5c42';
const GOLD = '#c9a227';
const SAND = '#f5f0e6';
const GREEN_SOFT = '#e8f5ef';

const deliveries = [
  {
    id: '1',
    customer: 'أحمد محمد',
    address: 'الدوحة — برج المطار، الطابق 3',
    meta: 'صيانة حديقة · 10:00 ص',
    status: 'on_way',
    phone: '+97412345678',
    statusLabel: 'في الطريق',
  },
  {
    id: '2',
    customer: 'فاطمة علي',
    address: 'الريان — الحي السكني، فيلا 12',
    meta: 'توصيل نباتات · 2:00 م',
    status: 'assigned',
    phone: '+97487654321',
    statusLabel: 'مُسند',
  },
  {
    id: '3',
    customer: 'خالد الدوسري',
    address: 'الخور — مشروع الحدائق الجديدة',
    meta: 'زراعة · 4:00 م',
    status: 'assigned',
    phone: '+97411223344',
    statusLabel: 'مُسند',
  },
];

function DeliveryCard({ item }: { item: (typeof deliveries)[0] }) {
  const openMap = () => Linking.openURL('https://www.google.com/maps/search/?api=1&query=25.2854,51.5310');
  const call = () => Linking.openURL(`tel:${item.phone}`);

  return (
    <View style={styles.card}>
      <Text style={styles.customer}>{item.customer}</Text>
      <Text style={styles.address}>{item.address}</Text>
      <Text style={styles.meta}>{item.meta}</Text>
      <View style={[styles.badge, item.status === 'on_way' ? styles.badgeOnWay : styles.badgeAssigned]}>
        <Text style={styles.badgeText}>{item.statusLabel}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnOutline} onPress={call}>
          <Text style={styles.btnOutlineText}>اتصال</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnOutline} onPress={openMap}>
          <Text style={styles.btnOutlineText}>الخريطة</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnPrimary}>
          <Text style={styles.btnPrimaryText}>{item.status === 'on_way' ? 'تم التنفيذ' : 'بدء التوصيل'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TodayScreen() {
  const today = new Date().toLocaleDateString('ar-QA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>مليان <Text style={styles.logoGold}>سائق</Text></Text>
        <Text style={styles.today}>{today}</Text>
      </View>
      <Text style={styles.pageTitle}>طلبات اليوم</Text>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {deliveries.map((item) => (
          <DeliveryCard key={item.id} item={item} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SAND },
  header: {
    backgroundColor: GREEN_DEEP,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 48,
  },
  logo: { fontSize: 22, fontWeight: '800', color: '#fff' },
  logoGold: { color: GOLD },
  today: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  pageTitle: { fontSize: 20, fontWeight: '700', color: GREEN_DEEP, padding: 16 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  customer: { fontSize: 16, fontWeight: '700', color: GREEN_DEEP, marginBottom: 4 },
  address: { fontSize: 14, color: '#4a4a4a', marginBottom: 4 },
  meta: { fontSize: 13, color: '#4a4a4a', marginBottom: 8 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  badgeOnWay: { backgroundColor: GREEN_SOFT },
  badgeAssigned: { backgroundColor: '#dbeafe' },
  badgeText: { fontSize: 12, fontWeight: '600', color: GREEN_MID },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  btnOutline: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: GREEN_MID,
  },
  btnOutlineText: { color: GREEN_MID, fontWeight: '600', fontSize: 14 },
  btnPrimary: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: GOLD },
  btnPrimaryText: { color: GREEN_DEEP, fontWeight: '700', fontSize: 14 },
});
