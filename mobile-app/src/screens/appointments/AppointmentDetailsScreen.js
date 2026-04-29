import React, { useContext, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Platform, StatusBar, TouchableOpacity, Alert,
} from 'react-native';
import CustomButton from '../../components/CustomButton';
import { AuthContext } from '../../context/AuthContext';
import { deleteAppointmentApi } from '../../api/appointmentApi';
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

  const isPatient = userInfo?.role === 'patient';
  const isOwner = appointment.userId?._id?.toString() === userInfo?._id?.toString();
  const canModify = isPatient && isOwner && appointment.status === 'pending';
  const sc = statusColor(appointment.status);

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
  loadingText: {
    color: COLORS.navyDeep,
    fontSize: 14,
    fontWeight: FONTS.semibold,
  },
});

export default AppointmentDetailsScreen;