import { View, Text, ScrollView, StyleSheet } from 'react-native';

const GREEN_DEEP = '#0d3b2c';
const SAND = '#f5f0e6';

export default function OrdersScreen() {
  const orders = [
    { id: '1', service: 'صيانة حديقة', date: '27 فبراير 2025', status: 'قيد التنفيذ' },
    { id: '2', service: 'نباتات صناعية', date: '25 فبراير 2025', status: 'مكتمل' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>مليان <Text style={styles.logoGold}>للحدائق</Text></Text>
        <Text style={styles.headerTitle}>طلباتي</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {orders.map((o) => (
          <View key={o.id} style={styles.card}>
            <Text style={styles.service}>{o.service}</Text>
            <Text style={styles.date}>{o.date}</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>{o.status}</Text></View>
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
  scrollContent: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  service: { fontSize: 16, fontWeight: '700', color: GREEN_DEEP },
  date: { fontSize: 14, color: '#4a4a4a', marginTop: 4 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#e8f5ef', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#1a5c42' },
});
