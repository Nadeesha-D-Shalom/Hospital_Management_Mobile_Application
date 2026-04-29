import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, FlatList, StyleSheet, Alert, TouchableOpacity, Text } from 'react-native';
import { getComplaintsApi, updateComplaintStatusApi, deleteComplaintApi } from '../../api/complaintApi';
import ComplaintCard from '../../components/ComplaintCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import ScreenHeader from '../../components/ScreenHeader';
import CustomInput from '../../components/CustomInput';
import { AuthContext } from '../../context/AuthContext';
import { COLORS, FONTS, RADIUS } from '../../theme';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';

const ComplaintListScreen = ({ navigation, route }) => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminReply, setAdminReply] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const { userInfo } = useContext(AuthContext);
  const isAdmin = userInfo?.role === 'admin';
  const isFocused = useIsFocused();

  // ---------------- FETCH ----------------
  const fetchComplaints = async () => {
    try {
      const res = await getComplaintsApi();
      setComplaints(res.data);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  // ---------------- REFRESH ON SCREEN BACK ----------------
  useFocusEffect(
    useCallback(() => {
      fetchComplaints();
    }, [])
  );

  // ---------------- INSTANT ADD AFTER CREATE ----------------
  useEffect(() => {
    if (route?.params?.newComplaint) {
      setComplaints((prev) => [route.params.newComplaint, ...prev]);
    }
  }, [route?.params?.newComplaint]);

  // ---------------- POLLING ----------------
  useEffect(() => {
    if (!isFocused) return;

    const interval = setInterval(fetchComplaints, 10000);
    return () => clearInterval(interval);
  }, [isFocused]);

  // ---------------- STATUS UPDATE ----------------
  const handleStatusUpdate = async (id, nextStatus) => {
    setActionLoadingId(id);
    try {
      await updateComplaintStatusApi(id, nextStatus, adminReply || undefined);

      setComplaints((prev) =>
        prev.map((c) =>
          c._id === id ? { ...c, status: nextStatus } : c
        )
      );

      Alert.alert('Updated', `Marked as ${nextStatus}`);
    } catch (error) {
      Alert.alert('Error', 'Update failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id) => {
    Alert.alert(
      'Delete Complaint',
      'Are you sure you want to delete this complaint? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(id);
            try {
              await deleteComplaintApi(id);
              setComplaints((prev) => prev.filter((c) => c._id !== id));
              Alert.alert('Deleted', 'Complaint deleted successfully.');
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Unable to delete complaint.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  if (loading) return <LoadingSpinner message="Loading complaints..." />;

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Complaints"
        subtitle={`${complaints.length} submissions`}
        rightAction={
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => navigation.navigate('ComplaintForm')}
          >
            <Text style={styles.newBtnText}>+ New</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={complaints}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState message="No complaints found" />
        }
        renderItem={({ item }) => {
          const isOwner = item.userId?._id?.toString() === userInfo?._id?.toString();
          const canEditOwn = !isAdmin && isOwner && item.status === 'open';

          return (
            <View>
              <ComplaintCard complaint={item} />

              {canEditOwn ? (
                <View style={styles.userActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.editBtn]}
                    onPress={() => navigation.navigate('ComplaintForm', { complaint: item })}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.actionBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => handleDelete(item._id)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.actionBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {isAdmin && (
                <View style={styles.adminActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.progressBtn]}
                    onPress={() => handleStatusUpdate(item._id, 'in_progress')}
                  >
                    <Text style={styles.actionBtnText}>In Progress</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.resolvedBtn]}
                    onPress={() => handleStatusUpdate(item._id, 'resolved')}
                  >
                    <Text style={styles.actionBtnText}>Resolved</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    disabled={deletingId === item._id}
                    onPress={() => handleDelete(item._id)}
                  >
                    <Text style={styles.actionBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgPage },
  list: { padding: 12 },

  newBtn: {
    backgroundColor: COLORS.tealBright,
    padding: 10,
    borderRadius: 20,
  },

  newBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  userActions: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 10,
  },

  actionBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },

  editBtn: {
    backgroundColor: COLORS.tealStrong,
  },

  deleteBtn: {
    backgroundColor: COLORS.danger,
  },

  adminActions: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 10,
  },

  actionBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },

  progressBtn: { backgroundColor: 'orange' },
  resolvedBtn: { backgroundColor: 'green' },

  actionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ComplaintListScreen;
