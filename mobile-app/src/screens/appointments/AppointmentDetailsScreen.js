import React, { useContext, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Platform, StatusBar, TouchableOpacity, Alert,
} from 'react-native';
import CustomButton from '../../components/CustomButton';
import { AuthContext } from '../../context/AuthContext';
import { deleteAppointmentApi } from '../../api/appointmentApi';
import { createReportApi, deleteReportApi, getReportsByAppointmentApi, updateReportApi } from '../../api/appointmentReportApi';
import { uploadAppointmentReportFileApi } from '../../api/uploadApi';
import CustomInput from '../../components/CustomInput';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS, FONTS, RADIUS, SHADOW, statusColor } from '../../theme';

const DetailRow = ({ label, value, valueStyle }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={[styles.rowValue, valueStyle]}>{value}</Text>
  </View>
);

const AppointmentDetailsScreen = ({ route, navigation }) => {
  const { appointment } = route.params;
  const { userInfo } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [reportType, setReportType] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [editingReportId, setEditingReportId] = useState(null);

  const isPatient = userInfo?.role === 'patient';
  const isAdmin = userInfo?.role === 'admin';
  const isOwner = appointment.userId?._id?.toString() === userInfo?._id?.toString();
  const canModify = isPatient && isOwner && appointment.status === 'pending';
  const canManageReports = canModify;
  const sc = statusColor(appointment.status);

  const loadReports = async () => {
    try {
      const res = await getReportsByAppointmentApi(appointment._id);
      setReports(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment._id]);

  const pickImageFile = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
    });
    if (!result.canceled && result.assets?.[0]) {
      const f = result.assets[0];
      setSelectedFile({
        uri: f.uri,
        name: f.fileName || `report-${Date.now()}.jpg`,
        type: f.mimeType || 'image/jpeg',
      });
    }
  };

  const pickPdfFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const f = result.assets[0];
      setSelectedFile({
        uri: f.uri,
        name: f.name || `report-${Date.now()}.pdf`,
        type: f.mimeType || 'application/pdf',
      });
    }
  };

  const uploadSelectedReportFile = async () => {
    if (!selectedFile) return {};
    const formData = new FormData();
    formData.append('reportFile', selectedFile);
    const res = await uploadAppointmentReportFileApi(formData);
    return res.data;
  };

  const resetReportForm = () => {
    setEditingReportId(null);
    setReportType('');
    setReportDescription('');
    setSelectedFile(null);
  };

  const handleSaveReport = async () => {
    if (!reportType.trim() || !reportDescription.trim()) {
      Alert.alert('Missing Fields', 'Please enter report type and description.');
      return;
    }
    setReportBusy(true);
    try {
      const uploaded = await uploadSelectedReportFile();
      const payload = {
        appointmentId: appointment._id,
        reportType: reportType.trim(),
        description: reportDescription.trim(),
        fileUrl: uploaded.fileUrl,
        fileName: uploaded.fileName,
        fileType: uploaded.fileType,
      };
      if (editingReportId) {
        await updateReportApi(editingReportId, payload);
      } else {
        await createReportApi(payload);
      }
      resetReportForm();
      await loadReports();
    } catch (error) {
      Alert.alert('Report Failed', error.response?.data?.message || 'Unable to save report.');
    } finally {
      setReportBusy(false);
    }
  };

  const handleDeleteReport = async (id) => {
    try {
      await deleteReportApi(id);
      await loadReports();
    } catch (error) {
      Alert.alert('Delete Failed', error.response?.data?.message || 'Unable to delete report.');
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to delete this appointment? This cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await deleteAppointmentApi(appointment._id);
              Alert.alert('Deleted', 'Appointment deleted successfully.');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Could not delete appointment.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    navigation.navigate('AppointmentBooking', { appointment });
  };

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.loadingText}>Processing request...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navyDeep} />

      {/* Header */}
      <View style={styles.hero}>
        <View style={styles.circle1} /><View style={styles.circle2} />
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <View style={styles.backArrow} />
        </TouchableOpacity>
        <Text style={styles.heroEst}>OLYMPUS LANKA HOSPITAL</Text>
        <Text style={styles.heroTitle}>Appointment Details</Text>
        <View style={styles.accentBar} />
        <View style={[styles.statusBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <View style={[styles.statusDot, { backgroundColor: sc.text }]} />
          <Text style={styles.statusBadgeText}>
            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Main info card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Booking Information</Text>
          <View style={styles.divider} />
          <DetailRow label="Patient" value={appointment.userId?.name || appointment.patientId?.name || 'Unknown'} />
          <View style={styles.divider} />
          <DetailRow label="Doctor" value={appointment.doctorId?.name || 'Unknown'} />
          <View style={styles.divider} />
          <DetailRow label="Service" value={appointment.serviceId?.serviceName || 'Unknown service'} />
          {appointment.serviceId?.price !== undefined ? (
            <>
              <View style={styles.divider} />
              <DetailRow label="Price" value={`$${appointment.serviceId.price}`} />
            </>
          ) : null}
          {appointment.serviceId?.duration ? (
            <>
              <View style={styles.divider} />
              <DetailRow label="Duration" value={`${appointment.serviceId.duration} min`} />
            </>
          ) : null}
          <View style={styles.divider} />
          <DetailRow
            label="Date"
            value={appointment.appointmentDate ? new Date(appointment.appointmentDate).toLocaleDateString('en-GB', {
              day: '2-digit', month: 'long', year: 'numeric',
            }) : 'N/A'}
          />
          <View style={styles.divider} />
          <DetailRow label="Time" value={appointment.appointmentTime || 'N/A'} />
          {appointment.createdAt ? (
            <>
              <View style={styles.divider} />
              <DetailRow
                label="Booked on"
                value={new Date(appointment.createdAt).toLocaleDateString('en-GB', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              />
            </>
          ) : null}
          <View style={styles.divider} />
          <DetailRow
            label="Status"
            value={(appointment.status || 'pending').charAt(0).toUpperCase() + (appointment.status || 'pending').slice(1)}
            valueStyle={{ color: sc.text, fontWeight: FONTS.bold }}
          />
        </View>

        {/* Notes card */}
        {appointment.notes ? (
          <View style={styles.notesCard}>
            <Text style={styles.notesLabel}>PATIENT NOTES</Text>
            <Text style={styles.notesText}>{appointment.notes}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reports</Text>
          {canManageReports ? (
            <>
              <CustomInput
                label="Report Type"
                value={reportType}
                onChangeText={setReportType}
                placeholder="e.g. ECG, Blood, X-Ray, Other"
              />
              <CustomInput
                label="Description"
                value={reportDescription}
                onChangeText={setReportDescription}
                placeholder="Enter report details"
                multiline
                numberOfLines={3}
              />
              <View style={styles.fileRow}>
                <TouchableOpacity style={styles.fileBtn} onPress={pickImageFile}>
                  <Text style={styles.fileBtnText}>Upload Image</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.fileBtn} onPress={pickPdfFile}>
                  <Text style={styles.fileBtnText}>Upload PDF</Text>
                </TouchableOpacity>
              </View>
              {selectedFile ? <Text style={styles.fileInfo}>Selected: {selectedFile.name}</Text> : null}
              <CustomButton
                title={reportBusy ? 'Saving...' : editingReportId ? 'Update Report' : 'Add Report'}
                onPress={handleSaveReport}
                disabled={reportBusy}
              />
            </>
          ) : null}

          {reports.length === 0 ? (
            <Text style={styles.emptyReports}>No reports added.</Text>
          ) : (
            reports.map((r) => (
              <View key={r._id} style={styles.reportItem}>
                <Text style={styles.reportType}>{r.reportType}</Text>
                <Text style={styles.reportDesc}>{r.description}</Text>
                {r.fileName ? <Text style={styles.reportMeta}>File: {r.fileName}</Text> : null}
                {(canManageReports || isAdmin) ? (
                  <View style={styles.reportActions}>
                    {canManageReports ? (
                      <TouchableOpacity
                        style={styles.reportActionBtn}
                        onPress={() => {
                          setEditingReportId(r._id);
                          setReportType(r.reportType || '');
                          setReportDescription(r.description || '');
                          setSelectedFile(null);
                        }}
                      >
                        <Text style={styles.reportActionText}>Edit</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      style={[styles.reportActionBtn, styles.reportDeleteBtn]}
                      onPress={() => handleDeleteReport(r._id)}
                    >
                      <Text style={[styles.reportActionText, styles.reportDeleteText]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </View>

        {/* Action buttons for patient before approval */}
        {canModify ? (
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={handleEdit} activeOpacity={0.85}>
              <Text style={styles.actionBtnText}>Edit Appointment</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={handleDelete} activeOpacity={0.85}>
              <Text style={styles.actionBtnText}>Delete Appointment</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Payment action */}
        {isPatient && appointment.status === 'approved' ? (
          <View style={styles.paymentBanner}>
            <View style={{ flex: 1 }}>
              {appointment.paymentMethod === 'card' ? (
                <View>
                  <Text style={styles.paymentBannerTitle}>Card Payment Coming Soon</Text>
                  <Text style={styles.paymentBannerSub}>
                    Card payment facility will be available soon. Please make payment when you visit the hospital.
                  </Text>
                </View>
              ) : (
                <>
                  <View>
                    <Text style={styles.paymentBannerTitle}>Payment Required</Text>
                    <Text style={styles.paymentBannerSub}>Your appointment has been approved</Text>
                    {appointment.serviceId?.price !== undefined ? (
                      <Text style={styles.paymentBannerSub}>Amount to pay: LKR {appointment.serviceId.price}</Text>
                    ) : null}
                  </View>
                  <CustomButton
                    title="Pay Now"
                    onPress={() =>
                      navigation.navigate('PaymentForm', {
                        appointmentId: appointment._id,
                        amount: appointment.serviceId?.price,
                        paymentMethod: 'cash',
                      })
                    }
                    style={styles.payBtn}
                  />
                </>
              )}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgPage },

  hero: {
    backgroundColor: COLORS.navyMid,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 64 : 48,
    paddingBottom: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  circle1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.04)', top: -50, right: -60 },
  circle2: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.05)', bottom: -20, left: -30 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  backArrow: { width: 10, height: 10, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: COLORS.white, transform: [{ rotate: '45deg' }], marginLeft: 3 },
  heroEst: { fontSize: 9, letterSpacing: 2.2, color: 'rgba(255,255,255,0.45)', marginBottom: 6 },
  heroTitle: { fontSize: 22, fontWeight: FONTS.bold, color: COLORS.white },
  accentBar: { width: 36, height: 3, backgroundColor: COLORS.tealLight, borderRadius: 2, marginVertical: 10 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 7 },
  statusBadgeText: { fontSize: 12, fontWeight: FONTS.semibold, color: COLORS.white },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 20, paddingBottom: 40 },

  card: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: 16, marginBottom: 14, ...SHADOW.card,
  },
  cardTitle: { fontSize: 13, fontWeight: FONTS.bold, color: COLORS.navyDeep, letterSpacing: 0.3, marginBottom: 12 },
  divider: { height: 1, backgroundColor: COLORS.divider, marginVertical: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: FONTS.medium },
  rowValue: { fontSize: 13, color: COLORS.navyDeep, fontWeight: FONTS.semibold },

  notesCard: {
    backgroundColor: COLORS.tealFaint, borderRadius: RADIUS.lg,
    padding: 16, marginBottom: 14,
    borderLeftWidth: 4, borderLeftColor: COLORS.tealBright,
  },
  notesLabel: { fontSize: 10, fontWeight: FONTS.bold, color: COLORS.tealStrong, letterSpacing: 1.5, marginBottom: 6 },
  notesText: { fontSize: 13, color: COLORS.navyDeep, lineHeight: 20 },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: COLORS.tealStrong,
    marginRight: 8,
  },
  deleteBtn: {
    backgroundColor: COLORS.danger,
  },
  actionBtnText: {
    color: COLORS.white,
    fontWeight: FONTS.bold,
  },
  paymentBanner: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: 16, ...SHADOW.card,
    borderLeftWidth: 4, borderLeftColor: COLORS.tealStrong,
  },
  paymentBannerTitle: { fontSize: 15, fontWeight: FONTS.bold, color: COLORS.navyDeep },
  paymentBannerSub: { fontSize: 12, fontWeight: FONTS.regular, color: COLORS.textMuted, marginTop: 2, marginBottom: 12 },
  payBtn: { marginTop: 0, marginVertical: 0 },
  fileRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  fileBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.tealStrong,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  fileBtnText: { color: COLORS.tealStrong, fontSize: 12, fontWeight: FONTS.semibold },
  fileInfo: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 10 },
  emptyReports: { fontSize: 12, color: COLORS.textMuted, marginTop: 8 },
  reportItem: {
    marginTop: 10,
    backgroundColor: COLORS.bgMuted,
    borderRadius: RADIUS.md,
    padding: 10,
  },
  reportType: { fontSize: 12, fontWeight: FONTS.bold, color: COLORS.tealStrong },
  reportDesc: { fontSize: 13, color: COLORS.navyDeep, marginTop: 2 },
  reportMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  reportActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  reportActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.tealFaint,
  },
  reportActionText: { color: COLORS.tealStrong, fontSize: 11, fontWeight: FONTS.bold },
  reportDeleteBtn: { backgroundColor: COLORS.dangerBg },
  reportDeleteText: { color: COLORS.danger },
  loadingText: {
    color: COLORS.navyDeep,
    fontSize: 14,
    fontWeight: FONTS.semibold,
  },
});

export default AppointmentDetailsScreen;