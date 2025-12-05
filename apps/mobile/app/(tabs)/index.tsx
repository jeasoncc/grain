import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProjectsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>项目</Text>
          <Text style={styles.subtitle}>欢迎使用 Novel Editor Mobile</Text>
          <Text style={styles.description}>
            功能开发中，敬请期待...
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#9CA3AF',
    lineHeight: 24,
  },
});



