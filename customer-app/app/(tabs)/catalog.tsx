import { View, Text, ScrollView, StyleSheet } from 'react-native';

const GREEN_DEEP = '#0d3b2c';
const SAND = '#f5f0e6';

const products = [
  { name: 'نخلة صناعية', category: 'نباتات' },
  { name: 'شجرة سكاي بيرد', category: 'نباتات' },
  { name: 'فيكس', category: 'نباتات' },
  { name: 'نبات زينة 160سم', category: 'نباتات' },
];

export default function CatalogScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>مليان <Text style={styles.logoGold}>للحدائق</Text></Text>
        <Text style={styles.headerTitle}>معرض النباتات</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {products.map((p, i) => (
          <View key={i} style={styles.card}>
            <View style={styles.cardImage} />
            <Text style={styles.cardTitle}>{p.name}</Text>
            <Text style={styles.cardCategory}>{p.category}</Text>
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
  scrollContent: { padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '47%', backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', marginBottom: 4 },
  cardImage: { height: 120, backgroundColor: '#1a5c42' },
  cardTitle: { padding: 10, fontSize: 14, fontWeight: '700', color: GREEN_DEEP },
  cardCategory: { paddingHorizontal: 10, paddingBottom: 10, fontSize: 12, color: '#4a4a4a' },
});
