import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { createComplaintApi, updateComplaintApi } from '../../api/complaintApi';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import LoadingSpinner from '../../components/LoadingSpinner';
import ScreenHeader from '../../components/ScreenHeader';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';

const ComplaintFormScreen = ({ navigation, route }) => {
  const complaint = route?.params?.complaint;
  const [subject, setSubject] = useState(complaint?.subject || '');
  const [message, setMessage] = useState(complaint?.message || '');
  const [loading, setLoading] = useState(false);
  const isEdit = Boolean(complaint);

  const handleSubmit = async () => {
    if (!subject || !message) {
      Alert.alert('Missing Fields', 'Please fill in both subject and message.');
      return;
    }
    setLoading(true);
    try {
      if (isEdit && complaint?._id) {
        await updateComplaintApi(complaint._id, { subject, message });
        Alert.alert('Updated', 'Your complaint has been updated successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await createComplaintApi({ subject, message });
        Alert.alert('Submitted', 'Your complaint has been received. We will get back to you shortly.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      Alert.alert('Submission Failed', error.response?.data?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner message="Submitting complaint..." />;

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={isEdit ? 'Edit Complaint' : 'Submit Complaint'}
        subtitle={isEdit ? 'Update your complaint before admin review' : 'We take all feedback seriously'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Info banner */}
        <View style={styles.infoBanner}>
          <View style={styles.infoIcon}>
            <Text style={styles.infoIconText}>i</Text>
          </View>
          <Text style={styles.infoText}>
            Your complaint will be reviewed by our admin team and you will receive a response within 24–48 hours.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>COMPLAINT DETAILS</Text>
        <View style={styles.formCard}>
          <CustomInput
            label="Subject"
            value={subject}
            onChangeText={setSubject}
            placeholder="Brief summary of your concern"
          />
          <CustomInput
            label="Message"
            value={message}
            onChangeText={setMessage}
            placeholder="Describe your complaint in detail..."
            multiline
            numberOfLines={6}
          />
        </View>

        <CustomButton title="Submit Complaint" onPress={handleSubmit} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: COLORS.bgPage },
  scroll:        { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 20, paddingBottom: 40 },
  sectionLabel:  { fontSize: 10, fontWeight: FONTS.bold, color: COLORS.tealBright, letterSpacing: 2, marginBottom: 10, marginLeft: 4, marginTop: 4 },

  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: COLORS.tealFaint, borderRadius: RADIUS.lg,
    padding: 14, marginBottom: 20,
    borderLeftWidth: 4, borderLeftColor: COLORS.tealBright,
  },
  infoIcon: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.tealBright, alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  infoIconText: { fontSize: 12, fontWeight: FONTS.bold, color: COLORS.white },
  infoText:     { flex: 1, fontSize: 12, color: COLORS.tealStrong, lineHeight: 18 },

  formCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: 16, marginBottom: 16, ...SHADOW.card,
  },
});

export default ComplaintFormScreen;