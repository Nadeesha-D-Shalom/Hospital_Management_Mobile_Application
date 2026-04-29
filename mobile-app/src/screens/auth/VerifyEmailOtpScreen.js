import React, { useContext, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import CustomButton from '../../components/CustomButton';
import CustomInput from '../../components/CustomInput';
import LoadingSpinner from '../../components/LoadingSpinner';
import { COLORS, FONTS } from '../../theme';

const VerifyEmailOtpScreen = ({ route, navigation }) => {
  const { name, email } = route.params || {};
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, verifyEmailOtp } = useContext(AuthContext);

  const handleVerifyOtp = async () => {
    if (!email) {
      Alert.alert('Missing Email', 'Please start registration again.');
      return;
    }
    if (!otp) {
      Alert.alert('Missing OTP', 'Please enter the OTP sent to your email.');
      return;
    }
    setLoading(true);
    try {
      await verifyEmailOtp(email, otp);
      navigation.navigate('CreatePassword', { email });
    } catch (error) {
      Alert.alert('Verification Failed', error.response?.data?.message || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!name || !email) {
      Alert.alert('Missing Details', 'Please start registration again.');
      return;
    }
    setLoading(true);
    try {
      await register(name, email);
      Alert.alert('OTP Sent', 'We sent a new OTP to your email. It is valid for 2 minutes.');
    } catch (error) {
      Alert.alert('Failed', error.response?.data?.message || 'Could not resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner message="Verifying OTP..." />;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navyDeep} />
      <View style={styles.header}>
        <Text style={styles.est}>OLYMPUS LANKA HOSPITAL</Text>
        <Text style={styles.headerTitle}>Verify Email</Text>
        <View style={styles.accentBar} />
        <Text style={styles.headerSub}>Enter the OTP sent to {email}</Text>
      </View>

      <View style={styles.formPanel}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionLabel}>EMAIL OTP</Text>
          <CustomInput label="Email Address" value={email || ''} editable={false} />
          <CustomInput
            label="OTP"
            value={otp}
            onChangeText={(v) => setOtp(v.replace(/[^0-9]/g, ''))}
            placeholder="Enter 6-digit OTP"
            keyboardType="number-pad"
            maxLength={6}
          />
          <CustomButton title="Verify OTP" onPress={handleVerifyOtp} style={styles.btn} />
          <TouchableOpacity onPress={handleResendOtp} activeOpacity={0.7}>
            <Text style={styles.link}>Resend OTP</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.navyMid },
  header: {
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'ios' ? 64 : 48,
    paddingBottom: 36,
  },
  est: { fontSize: 9, letterSpacing: 2.4, color: 'rgba(255,255,255,0.5)', marginBottom: 8 },
  headerTitle: { fontSize: 30, fontWeight: FONTS.bold, color: COLORS.white, lineHeight: 36 },
  accentBar: { width: 40, height: 3, backgroundColor: COLORS.tealLight, borderRadius: 2, marginVertical: 12 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 19 },
  formPanel: {
    flex: 1,
    backgroundColor: COLORS.bgPage,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 30,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: FONTS.bold,
    color: COLORS.tealBright,
    letterSpacing: 2,
    marginBottom: 16,
  },
  btn: { marginTop: 8, marginBottom: 12 },
  link: { textAlign: 'center', fontSize: 13, fontWeight: FONTS.bold, color: COLORS.link },
});

export default VerifyEmailOtpScreen;
