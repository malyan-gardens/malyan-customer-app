import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';

const GREEN_DEEP = '#0d3b2c';
const GOLD = '#c9a227';
const SAND = '#f5f0e6';

export default function ProfileScreen() {
  const contact = () => Linking.openURL('mailto:zaher@malyangardens.com');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>مليان <Text style={styles.logoGold}>للحدائق</Text></Text>
        <Text style={styles.headerTitle}>الملف الشخصي</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.avatar} />
        <Text style={styles.name}>العميل</Text>
        <TouchableOpacity style={styles.btn} onPress={contact}>
          <Text style={styles.btnText}>تواصل معنا — zaher@malyangardens.com</Text>
        </TouchableOpacity>
      </View>
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
  headerTitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  content: { flex: 1, alignItems: 'center', paddingTop: 32 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1a5c42', marginBottom: 16 },
  name: { fontSize: 20, fontWeight: '700', color: GREEN_DEEP },
  btn: { marginTop: 24, paddingVertical: 14, paddingHorizontal: 24, backgroundColor: GOLD, borderRadius: 12 },
  btnText: { color: GREEN_DEEP, fontWeight: '700', fontSize: 14 },
});
