import { View, Text, ScrollView, TouchableOpacity, Linking, StyleSheet } from 'react-native';

const GREEN_DEEP = '#0d3b2c';
const GOLD = '#c9a227';
const SAND = '#f5f0e6';
const GREEN_SOFT = '#e8f5ef';

const services = [
  { icon: '🌿', title: 'نباتات صناعية', desc: 'تشكيلة واسعة عالية الجودة' },
  { icon: '🪴', title: 'لاندسكيب', desc: 'تصميم وتنفيذ حدائق' },
  { icon: '🌱', title: 'زراعة', desc: 'زراعة ونقل أشجار ونباتات' },
  { icon: '✂️', title: 'صيانة', desc: 'صيانة دورية للحدائق' },
];

export default function HomeScreen() {
  const openContact = () => Linking.openURL('mailto:zaher@malyangardens.com');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>مليان <Text style={styles.logoGold}>للحدائق</Text></Text>
        <Text style={styles.tagline}>حديقتك مع مليان أجمل</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>خدماتنا</Text>
        {services.map((s, i) => (
          <View key={i} style={styles.serviceCard}>
            <Text style={styles.serviceIcon}>{s.icon}</Text>
            <View style={styles.serviceText}>
              <Text style={styles.serviceTitle}>{s.title}</Text>
              <Text style={styles.serviceDesc}>{s.desc}</Text>
            </View>
          </View>
        ))}
        <TouchableOpacity style={styles.ctaBtn} onPress={openContact}>
          <Text style={styles.ctaBtnText}>اطلب استشارة — zaher@malyangardens.com</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SAND },
  header: {
    backgroundColor: GREEN_DEEP,
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 48,
  },
  logo: { fontSize: 24, fontWeight: '800', color: '#fff' },
  logoGold: { color: GOLD },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 6 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: GREEN_DEEP, marginBottom: 12 },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  serviceIcon: { fontSize: 32, marginLeft: 12 },
  serviceText: { flex: 1 },
  serviceTitle: { fontSize: 16, fontWeight: '700', color: GREEN_DEEP },
  serviceDesc: { fontSize: 13, color: '#4a4a4a', marginTop: 2 },
  ctaBtn: { backgroundColor: GOLD, paddingVertical: 16, borderRadius: 12, marginTop: 16 },
  ctaBtnText: { color: GREEN_DEEP, fontWeight: '700', fontSize: 15, textAlign: 'center' },
});
