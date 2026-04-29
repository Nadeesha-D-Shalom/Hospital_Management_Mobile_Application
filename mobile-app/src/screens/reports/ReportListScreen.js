import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { getReportsApi } from '../../api/reportApi';
import ReportCard from '../../components/ReportCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import ScreenHeader from '../../components/ScreenHeader';
import { COLORS, FONTS, RADIUS } from '../../theme';

const ReportListScreen = ({ navigation }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      const res = await getReportsApi();
      setReports(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchReports);
    fetchReports();
    return unsubscribe;
  }, [navigation]);

  if (loading) return <LoadingSpinner message="Loading reports..." />;

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Reports"
        subtitle={`${reports.length} reports generated`}
        rightAction={
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('ReportGenerate')}>
            <Text style={styles.addBtnText}>+ Generate</Text>
          </TouchableOpacity>
        }
      />
      <FlatList
        data={reports}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState message="No reports yet" subtitle="Generate your first report from the admin dashboard" />
        }
        renderItem={({ item }) => (
          <ReportCard report={item} onPress={() => navigation.navigate('ReportDetails', { report: item })} />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgPage },
  list: { paddingTop: 12, paddingBottom: 30 },
  addBtn: {
    backgroundColor: COLORS.tealBright,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
  },
  addBtnText: { color: COLORS.white, fontSize: 13, fontWeight: FONTS.bold },
});

export default ReportListScreen;
