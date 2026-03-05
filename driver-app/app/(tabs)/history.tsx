import { View, Text, ScrollView, StyleSheet } from 'react-native';

const GREEN_DEEP = '#0d3b2c';
const SAND = '#f5f0e6';

export default function HistoryScreen() {
  const history = [
    { id: '1', customer: 'أحمد محمد', service: 'توصيل نباتات', date: '26 فبراير 2025', status: 'تم' },
    { id: '2', customer: 'شركة النخبة', service: 'صيانة', date: '25 فبراير 2025', status: 'تم' },
    { id: '3', customer: 'فاطمة علي', service: 'زراعة', date: '24 فبراير 2025', status: 'تم' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>مليان <Text style={styles.logoGold}>سائق</Text></Text>
        <Text style={styles.headerTitle}>سجل التوصيلات</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {history.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.customer}>{item.customer}</Text>
            <Text style={styles.service}>{item.service}</Text>
            <Text style={styles.date}>{item.date}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          </View>
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
  logoGold: { color: '#c9a227' },
  headerTitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
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
  customer: { fontSize: 16, fontWeight: '700', color: GREEN_DEEP },
  service: { fontSize: 14, color: '#4a4a4a', marginTop: 4 },
  date: { fontSize: 13, color: '#4a4a4a', marginTop: 4 },
  statusBadge: { alignSelf: 'flex-start', backgroundColor: '#d1fae5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
  statusText: { fontSize: 12, fontWeight: '600', color: '#065f46' },
});
