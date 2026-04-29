import React, { useState, useEffect, useContext } from 'react';
import { View, FlatList, StyleSheet, Alert, TouchableOpacity, Text } from 'react-native';
import { deleteServiceApi, getServicesApi } from '../../api/serviceApi';
import ServiceCard from '../../components/ServiceCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import ScreenHeader from '../../components/ScreenHeader';
import { AuthContext } from '../../context/AuthContext';
import { COLORS, FONTS, RADIUS } from '../../theme';

const ServiceListScreen = ({ navigation }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const { userInfo } = useContext(AuthContext);
  const isAdmin = userInfo?.role === 'admin';

  const fetchServices = async () => {
    try {
      const res = await getServicesApi();
      setServices(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleDelete = (service) => {
    Alert.alert(
      'Delete Service',
      `Delete ${service.serviceName}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteServiceApi(service._id);
              setServices((prev) => prev.filter((item) => item._id !== service._id));
              Alert.alert('Deleted', 'Service deleted successfully.');
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Unable to delete service.');
            }
          },
        },
      ]
    );
  };

  if (loading) return <LoadingSpinner message="Loading services..." />;

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Our Services"
        subtitle={`${services.length} services available`}
        rightAction={
          isAdmin ? (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => navigation.navigate('ServiceForm')}
              activeOpacity={0.8}
            >
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          ) : null
        }
      />
      <FlatList
        data={services}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState message="No services available" />}
        renderItem={({ item }) => (
          <View>
            <ServiceCard
              service={item}
              onPress={() => {
                if (isAdmin) {
                  navigation.navigate('ServiceForm', { service: item });
                } else {
                  Alert.alert(item.serviceName, `${item.description}\n\nPrice: $${item.price}\nDuration: ${item.duration} min`);
                }
              }}
            />
            {isAdmin ? (
              <View style={styles.adminActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.editBtn]}
                  onPress={() => navigation.navigate('ServiceForm', { service: item })}
                  activeOpacity={0.85}
                >
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteBtn]}
                  onPress={() => handleDelete(item)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.actionText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
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
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.full,
  },
  addBtnText: { color: COLORS.white, fontSize: 13, fontWeight: FONTS.bold },
  adminActions: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  editBtn: { backgroundColor: COLORS.tealStrong },
  deleteBtn: { backgroundColor: COLORS.danger },
  actionText: { color: COLORS.white, fontSize: 13, fontWeight: FONTS.bold },
});

export default ServiceListScreen;
