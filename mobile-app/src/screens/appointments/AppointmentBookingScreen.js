import React, { useContext, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Alert,
  TouchableOpacity, ScrollView,
} from 'react-native';
import { createAppointmentApi, getAppointmentAvailabilityApi, updateAppointmentApi } from '../../api/appointmentApi';
import { getServicesApi } from '../../api/serviceApi';
import { createReportApi, getReportsByAppointmentApi, updateReportApi } from '../../api/appointmentReportApi';
import { uploadAppointmentReportFileApi } from '../../api/uploadApi';
import { AuthContext } from '../../context/AuthContext';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import LoadingSpinner from '../../components/LoadingSpinner';
import ScreenHeader from '../../components/ScreenHeader';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';

const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const getUpcomingDates = (days = 14) => {
  const dates = [];
  const today = new Date();

  for (let i = 0; i < days; i += 1) {
    const current = new Date(today);
    current.setDate(today.getDate() + i);
    const dayName = current.toLocaleDateString('en-US', { weekday: 'short' });
    const monthName = current.toLocaleDateString('en-US', { month: 'short' });
    dates.push({
      value: current.toISOString().split('T')[0],
      day: dayName,
      dayNumber: current.getDate(),
      month: monthName,
    });
  }

  return dates;
};

const AppointmentBookingScreen = ({ route, navigation }) => {
  const { doctor, appointment } = route.params || {};
  const { userInfo } = useContext(AuthContext);
  const doctorData = doctor || appointment?.doctorId || {};
  const isEdit = Boolean(appointment);
  const isAdmin = userInfo?.role === 'admin';
  const canAddAppointmentReport = !isAdmin;

  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState(
    appointment?.serviceId?._id || appointment?.serviceId || ''
  );
  const [appointmentDate, setAppointmentDate] = useState(
    appointment?.appointmentDate
      ? new Date(appointment.appointmentDate).toISOString().split('T')[0]
      : getTodayDate()
  );
  const [appointmentTime, setAppointmentTime] = useState(appointment?.appointmentTime || '');
  const [notes, setNotes] = useState(appointment?.notes || '');
  const [paymentMethod, setPaymentMethod] = useState(appointment?.paymentMethod || 'cash');
  const [addReport, setAddReport] = useState(false);
  const [reportId, setReportId] = useState(null);
  const [reportType, setReportType] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [existingFileName, setExistingFileName] = useState('');
  const [reservedSlots, setReservedSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  const availableDates = getUpcomingDates(14);
  const selectedService = services.find((service) => service._id === selectedServiceId);
  const selectedDuration = Number(selectedService?.duration) || 30;

  const timeToMinutes = (time) => {
    const [hours, minutes] = String(time).split(':').map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
    const mins = (minutes % 60).toString().padStart(2, '0');
    return `${hours}:${mins}`;
  };

  const isPastSlot = (date, time) => {
    const today = getTodayDate();
    if (date !== today) return false;
    const now = new Date();
    return timeToMinutes(time) <= now.getHours() * 60 + now.getMinutes();
  };

  const slotsOverlap = (slotStart, slotDuration, bookedStart, bookedDuration) =>
    slotStart < bookedStart + bookedDuration && bookedStart < slotStart + slotDuration;

  const getSlotReservation = (slot) => {
    const slotStart = timeToMinutes(slot);
    const approved = reservedSlots.find((reserved) =>
      reserved.status === 'approved' &&
      slotsOverlap(slotStart, selectedDuration, timeToMinutes(reserved.appointmentTime), Number(reserved.duration) || 30)
    );
    if (approved) return approved;
    return reservedSlots.find((reserved) =>
      reserved.status === 'pending' &&
      slotsOverlap(slotStart, selectedDuration, timeToMinutes(reserved.appointmentTime), Number(reserved.duration) || 30)
    );
  };

  const availableTimeSlots = (() => {
    const slots = [];
    const start = 9 * 60;
    const end = 18 * 60;
    for (let current = start; current + selectedDuration <= end; current += selectedDuration) {
      slots.push(minutesToTime(current));
    }
    return slots;
  })();

  useEffect(() => {
    (async () => {
      try {
        const res = await getServicesApi();
        setServices(Array.isArray(res.data) ? res.data : []);
      } catch (e) { console.error(e); }
    })();
  }, []);

  useEffect(() => {
    if (!doctorData?._id || !appointmentDate) return;
    (async () => {
      try {
        const res = await getAppointmentAvailabilityApi(doctorData._id, appointmentDate);
        const slots = Array.isArray(res.data) ? res.data : [];
        setReservedSlots(slots.filter((slot) => slot._id !== appointment?._id));
      } catch (e) {
        console.error(e);
        setReservedSlots([]);
      }
    })();
  }, [appointment?._id, appointmentDate, doctorData?._id]);

  useEffect(() => {
    if (!isEdit || !appointment?._id || appointment.status !== 'pending') return;
    (async () => {
      try {
        const res = await getReportsByAppointmentApi(appointment._id);
        const firstReport = Array.isArray(res.data) ? res.data[0] : null;
        if (firstReport) {
          setAddReport(true);
          setReportId(firstReport._id);
          setReportType(firstReport.reportType || '');
          setReportDescription(firstReport.description || '');
          setExistingFileName(firstReport.fileName || '');
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, [appointment?._id, appointment?.status, isEdit]);

  const isValidDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d));
  const isValidTime = (t) => /^\d{2}:\d{2}$/.test(String(t));

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

  const saveAppointmentReport = async (appointmentId) => {
    if (!addReport) return;
    if (!reportType.trim() || !reportDescription.trim()) {
      throw new Error('Please enter report type and description.');
    }
    if (!selectedFile && !existingFileName) {
      throw new Error('Please upload the report as an image or PDF.');
    }

    const uploaded = await uploadSelectedReportFile();
    const payload = {
      appointmentId,
      reportType: reportType.trim(),
      description: reportDescription.trim(),
      fileUrl: uploaded.fileUrl,
      fileName: uploaded.fileName,
      fileType: uploaded.fileType,
    };

    if (reportId) {
      await updateReportApi(reportId, payload);
    } else {
      await createReportApi(payload);
    }
  };

  const handleBook = async () => {
    if (!doctorData?._id) { Alert.alert('Error', 'Doctor info missing'); return; }
    if (!selectedServiceId || !appointmentDate || !appointmentTime) { Alert.alert('Error', 'Please fill all required fields'); return; }
    if (!isValidDate(appointmentDate)) { Alert.alert('Error', 'Date must be YYYY-MM-DD'); return; }
    if (!isValidTime(appointmentTime)) { Alert.alert('Error', 'Time must be HH:MM'); return; }
    if (isPastSlot(appointmentDate, appointmentTime)) {
      Alert.alert('Invalid Time', 'Please select an upcoming time slot.');
      return;
    }
    if (getSlotReservation(appointmentTime)) {
      Alert.alert('Slot Unavailable', 'Please select another time slot.');
      return;
    }
    if (canAddAppointmentReport && addReport && (!reportType.trim() || !reportDescription.trim())) {
      Alert.alert('Missing Report Details', 'Please enter report type and details.');
      return;
    }
    if (canAddAppointmentReport && addReport && !selectedFile && !existingFileName) {
      Alert.alert('Missing Report File', 'Please upload the report as an image or PDF.');
      return;
    }

    setLoading(true);
    try {
      if (isEdit && appointment?._id) {
        await updateAppointmentApi(appointment._id, {
          doctorId: doctorData._id,
          serviceId: selectedServiceId,
          appointmentDate,
          appointmentTime,
          notes,
          paymentMethod,
        });
        if (canAddAppointmentReport) await saveAppointmentReport(appointment._id);
        Alert.alert('Appointment Updated', 'Your appointment has been updated successfully.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        const res = await createAppointmentApi({
          doctorId: doctorData._id,
          serviceId: selectedServiceId,
          appointmentDate,
          appointmentTime,
          notes,
          paymentMethod,
        });
        if (canAddAppointmentReport) await saveAppointmentReport(res.data._id);
        Alert.alert('Appointment Booked', 'Your appointment has been successfully scheduled.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch (error) {
      Alert.alert('Booking Failed', error.response?.data?.message || error.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner message="Booking appointment..." />;

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={isEdit ? 'Edit Appointment' : 'Book Appointment'}
        subtitle={`with ${doctorData.name || 'Doctor'}`}
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Doctor summary */}
        <View style={styles.doctorCard}>
          <View style={styles.doctorAvatar}>
            <Text style={styles.doctorAvatarText}>{doctorData.name?.charAt(0)?.toUpperCase()}</Text>
          </View>
          <View style={styles.doctorText}>
            <Text style={styles.doctorName}>{doctorData.name}</Text>
            <Text style={styles.doctorSpec}>{doctorData.specialization}</Text>
            <Text style={styles.doctorFee}>${doctorData.consultationFee} consultation</Text>
          </View>
        </View>

        {/* Service selection */}
        <Text style={styles.sectionLabel}>SELECT SERVICE</Text>
        {services.length === 0 ? (
          <Text style={styles.noServices}>No services available</Text>
        ) : (
          services.map((item) => (
            <TouchableOpacity
              key={item._id}
              style={[styles.serviceItem, selectedServiceId === item._id && styles.serviceItemSelected]}
              onPress={() => setSelectedServiceId(item._id)}
              activeOpacity={0.8}
            >
              <View style={styles.serviceLeft}>
                <View style={[styles.radio, selectedServiceId === item._id && styles.radioSelected]}>
                  {selectedServiceId === item._id ? <View style={styles.radioDot} /> : null}
                </View>
                <View style={styles.serviceRadioRight}>
                  <Text style={[styles.serviceName, selectedServiceId === item._id && styles.serviceNameSelected]}>
                    {item.serviceName}
                  </Text>
                  <Text style={styles.serviceMeta}>{item.duration} min</Text>
                </View>
              </View>
              <Text style={[styles.servicePrice, selectedServiceId === item._id && styles.servicePriceSelected]}>
                ${item.price}
              </Text>
            </TouchableOpacity>
          ))
        )}

        <Text style={styles.sectionLabel}>CHOOSE DATE</Text>
        <View style={styles.calendarCard}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarRow}>
            {availableDates.map((date) => {
              const selected = date.value === appointmentDate;
              return (
                <TouchableOpacity
                  key={date.value}
                  style={[styles.dateItem, selected && styles.dateItemSelected]}
                  onPress={() => setAppointmentDate(date.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dateDay, selected && styles.dateDaySelected]}>{date.day}</Text>
                  <Text style={[styles.dateNumber, selected && styles.dateNumberSelected]}>{date.dayNumber}</Text>
                  <Text style={[styles.dateMonth, selected && styles.dateMonthSelected]}>{date.month}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <Text style={styles.sectionLabel}>SELECT TIME SLOT</Text>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLORS.tealStrong }]} /><Text style={styles.legendText}>Available</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} /><Text style={styles.legendText}>Pending</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLORS.danger }]} /><Text style={styles.legendText}>Approved</Text></View>
        </View>
        <View style={styles.slotCard}>
          {availableTimeSlots.map((slot) => {
            const selected = slot === appointmentTime;
            const reservation = getSlotReservation(slot);
            const past = isPastSlot(appointmentDate, slot);
            const disabled = Boolean(reservation) || past;
            const approved = reservation?.status === 'approved';
            const pending = reservation?.status === 'pending';
            return (
              <TouchableOpacity
                key={slot}
                style={[
                  styles.slotItem,
                  selected && styles.slotItemSelected,
                  pending && styles.slotItemPending,
                  approved && styles.slotItemApproved,
                  past && styles.slotItemPast,
                ]}
                onPress={() => {
                  if (!disabled) setAppointmentTime(slot);
                }}
                disabled={disabled}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.slotText,
                  selected && styles.slotTextSelected,
                  (pending || approved) && styles.slotTextBlocked,
                  past && styles.slotTextPast,
                ]}>{slot}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.formCard}>
          <CustomInput label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Any special instructions..." multiline numberOfLines={3} />
        </View>

        {canAddAppointmentReport ? (
          <>
            <Text style={styles.sectionLabel}>REPORTS (OPTIONAL)</Text>
            <View style={styles.reportCard}>
              <TouchableOpacity
                style={[styles.methodItem, addReport && styles.methodItemSelected]}
                onPress={() => setAddReport((prev) => !prev)}
                activeOpacity={0.85}
              >
                <Text style={[styles.methodTitle, addReport && styles.methodTitleSelected]}>Add Report</Text>
                <View style={[styles.radio, addReport && styles.radioSelected]}>
                  {addReport ? <View style={styles.radioDot} /> : null}
                </View>
              </TouchableOpacity>

              {addReport ? (
                <View style={styles.reportForm}>
                  <CustomInput
                    label="Report Type"
                    value={reportType}
                    onChangeText={setReportType}
                    placeholder="e.g. ECG, blood, scan, other"
                  />
                  <CustomInput
                    label="Report Details"
                    value={reportDescription}
                    onChangeText={setReportDescription}
                    placeholder="Describe what the report is about"
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
                  {selectedFile ? (
                    <Text style={styles.fileInfo}>Selected: {selectedFile.name}</Text>
                  ) : existingFileName ? (
                    <Text style={styles.fileInfo}>Current file: {existingFileName}</Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          </>
        ) : null}

        {/* Payment method selection (stored with appointment; actual payment only after approval) */}
        <Text style={styles.sectionLabel}>SELECT PAYMENT METHOD</Text>
        <View style={styles.methodsCard}>
          <TouchableOpacity
            style={[styles.methodItem, paymentMethod === 'cash' && styles.methodItemSelected]}
            onPress={() => setPaymentMethod('cash')}
            activeOpacity={0.85}
          >
            <Text style={[styles.methodTitle, paymentMethod === 'cash' && styles.methodTitleSelected]}>Cash Payment</Text>
            <View style={[styles.radio, paymentMethod === 'cash' && styles.radioSelected]}>
              {paymentMethod === 'cash' ? <View style={styles.radioDot} /> : null}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodItem, paymentMethod === 'card' && styles.methodItemSelected]}
            onPress={() => setPaymentMethod('card')}
            activeOpacity={0.85}
          >
            <Text style={[styles.methodTitle, paymentMethod === 'card' && styles.methodTitleSelected]}>Card Payment</Text>
            <View style={[styles.radio, paymentMethod === 'card' && styles.radioSelected]}>
              {paymentMethod === 'card' ? <View style={styles.radioDot} /> : null}
            </View>
          </TouchableOpacity>
        </View>

        {paymentMethod === 'card' ? (
          <View style={styles.cardInfoBox}>
            <Text style={styles.cardInfoText}>
              Card payment facility will be available soon. Please make payment when you visit the hospital.
            </Text>
          </View>
        ) : null}

        <CustomButton title="Confirm Booking" onPress={handleBook} style={styles.bookBtn} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgPage },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 20, paddingBottom: 40 },
  sectionLabel: { fontSize: 10, fontWeight: FONTS.bold, color: COLORS.tealBright, letterSpacing: 2, marginBottom: 10, marginLeft: 4, marginTop: 8 },

  doctorCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: 16, marginBottom: 20, ...SHADOW.card,
  },
  doctorText: { marginLeft: 14 },
  doctorAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.tealBright, alignItems: 'center', justifyContent: 'center',
  },
  doctorAvatarText: { fontSize: 20, fontWeight: FONTS.bold, color: COLORS.white },
  doctorName: { fontSize: 15, fontWeight: FONTS.bold, color: COLORS.navyDeep },
  doctorSpec: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  doctorFee: { fontSize: 12, color: COLORS.tealStrong, marginTop: 2, fontWeight: FONTS.semibold },

  serviceItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    borderWidth: 1.5, borderColor: COLORS.divider,
    padding: 14, marginVertical: 4, ...SHADOW.card,
  },
  serviceItemSelected: { borderColor: COLORS.tealStrong, backgroundColor: COLORS.tealFaint },
  serviceLeft: { flexDirection: 'row', alignItems: 'center' },
  serviceRadioRight: { marginLeft: 12 },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: COLORS.tealPale,
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: COLORS.tealStrong },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.tealStrong },
  serviceName: { fontSize: 14, fontWeight: FONTS.semibold, color: COLORS.navyDeep },
  serviceNameSelected: { color: COLORS.tealStrong },
  serviceMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  servicePrice: { fontSize: 14, fontWeight: FONTS.bold, color: COLORS.textMuted },
  servicePriceSelected: { color: COLORS.tealStrong },
  noServices: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingVertical: 16 },

  calendarCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginBottom: 16,
    ...SHADOW.card,
  },
  calendarRow: { paddingVertical: 2 },
  dateItem: {
    width: 80,
    minHeight: 100,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bgMuted,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  dateItemSelected: {
    backgroundColor: COLORS.tealStrong,
  },
  dateDay: { fontSize: 11, fontWeight: FONTS.bold, color: COLORS.textSecondary, textTransform: 'uppercase' },
  dateDaySelected: { color: COLORS.white },
  dateNumber: { fontSize: 18, fontWeight: FONTS.bold, color: COLORS.navyDeep, marginTop: 6 },
  dateNumberSelected: { color: COLORS.white },
  dateMonth: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  dateMonthSelected: { color: COLORS.white },

  slotCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    ...SHADOW.card,
  },
  slotItem: {
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgMuted,
    paddingVertical: 10,
    paddingHorizontal: 14,
    margin: 4,
  },
  slotItemSelected: {
    backgroundColor: COLORS.tealStrong,
  },
  slotItemPending: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  slotItemApproved: {
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  slotItemPast: {
    opacity: 0.45,
  },
  slotText: { color: COLORS.textPrimary, fontWeight: FONTS.medium },
  slotTextSelected: { color: COLORS.white },
  slotTextBlocked: { color: COLORS.navyDeep },
  slotTextPast: { color: COLORS.textMuted },
  legendRow: {
    flexDirection: 'row',
    gap: 10,
    marginLeft: 4,
    marginBottom: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: COLORS.textMuted, fontWeight: FONTS.medium },

  formCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: 16, marginBottom: 16, ...SHADOW.card,
  },
  reportCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: 16,
    ...SHADOW.card,
  },
  reportForm: {
    padding: 16,
  },
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
  fileInfo: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 4 },
  bookBtn: { marginTop: 8 },

  methodsCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: 10,
    ...SHADOW.card,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  methodItemSelected: {
    backgroundColor: COLORS.tealFaint,
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: FONTS.semibold,
    color: COLORS.textSecondary,
  },
  methodTitleSelected: {
    color: COLORS.tealStrong,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.tealPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: COLORS.tealStrong,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.tealStrong,
  },

  cardInfoBox: {
    backgroundColor: COLORS.tealFaint,
    borderRadius: RADIUS.lg,
    padding: 12,
    marginBottom: 14,
    ...SHADOW.card,
  },
  cardInfoText: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.tealStrong,
    fontWeight: FONTS.medium,
  },
});

export default AppointmentBookingScreen;
