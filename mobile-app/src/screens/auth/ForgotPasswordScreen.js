import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import {
  requestPasswordResetOtpApi,
  verifyPasswordResetOtpApi,
  resetPasswordWithOtpApi,
} from '../../api/authApi';

const COLORS = {
  navyDeep: '#0a2e40',
  navyMid: '#0a4a6e',
  tealStrong: '#0d6b99',
  tealLight: '#4fc3e8',
  white: '#ffffff',
  textPrimary: '#0a2e40',
  textSecondary: '#4a6170',
  textMuted: '#7a99a8',
  textPlaceholder: '#b0c8d4',
  inputBg: '#f7fbfd',
  inputBorder: '#d8e8f0',
  divider: '#eef4f8',
  link: '#0d6b99',
};

const StepIndicator = ({ step }) => (
  <View style={styles.stepWrap}>
    {[1, 2, 3].map((n) => (
      <View key={n} style={[styles.stepPill, n <= step && styles.stepPillActive]}>
        <Text style={[styles.stepPillText, n <= step && styles.stepPillTextActive]}>{n}</Text>
      </View>
    ))}
  </View>
);

const InputGroup = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  editable = true,
  maxLength,
  rightActionText,
  onRightActionPress,
}) => (
  <View style={styles.group}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.inputWrap, !editable && styles.inputWrapDisabled]}>
      <TextInput
        style={[styles.input, rightActionText && styles.inputWithAction]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textPlaceholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize="none"
        editable={editable}
        maxLength={maxLength}
      />
      {rightActionText ? (
        <TouchableOpacity onPress={onRightActionPress} style={styles.inputActionBtn} activeOpacity={0.75}>
          <Text style={styles.inputActionText}>{rightActionText}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  </View>
);

const ForgotPasswordScreen = ({ navigation }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (step !== 2 || otpSecondsLeft <= 0) return undefined;

    const timer = setInterval(() => {
      setOtpSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [step, otpSecondsLeft]);

  const otpCountdownText = useMemo(() => {
    const minutes = Math.floor(otpSecondsLeft / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (otpSecondsLeft % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, [otpSecondsLeft]);

  const subtitle = useMemo(() => {
    if (step === 1) return 'Enter your account email and we will send a 6-digit OTP.';
    if (step === 2) return 'Enter the OTP sent to your email. OTP is valid for 2 minutes.';
    return 'Set your new password and confirm it to complete reset.';
  }, [step]);

  const handleRequestOtp = async () => {
    if (!email) {
      Alert.alert('Missing Email', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      await requestPasswordResetOtpApi(email.trim().toLowerCase());
      setStep(2);
      setOtp('');
      setOtpSecondsLeft(120);
      Alert.alert('OTP Sent', 'Check your email for the 6-digit OTP.');
    } catch (error) {
      Alert.alert('Request Failed', error.response?.data?.message || 'Could not send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP.');
      return;
    }
    setLoading(true);
    try {
      await verifyPasswordResetOtpApi(email.trim().toLowerCase(), otp);
      setStep(3);
      setOtpSecondsLeft(0);
      Alert.alert('OTP Verified', 'Now set your new password.');
    } catch (error) {
      Alert.alert('Verification Failed', error.response?.data?.message || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Missing Fields', 'Enter new password and confirm password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Password Mismatch', 'New password and confirm password must match.');
      return;
    }
    setLoading(true);
    try {
      await resetPasswordWithOtpApi(email.trim().toLowerCase(), newPassword, confirmPassword);
      Alert.alert('Success', 'Password reset successful. Please log in with your new password.');
      navigation.navigate('Login');
    } catch (error) {
      Alert.alert('Reset Failed', error.response?.data?.message || 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navyDeep} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.headerOverline}>OLYMPUS LANKA HOSPITAL</Text>
          <Text style={styles.headerTitle}>Forgot Password</Text>
          <View style={styles.accentBar} />
          <Text style={styles.headerSub}>Secure account recovery in 3 quick steps.</Text>
        </View>

        <View style={styles.formPanel}>
          <StepIndicator step={step} />
          <Text style={styles.formTitle}>Password Recovery</Text>
          <Text style={styles.formSub}>{subtitle}</Text>

          <InputGroup
            label="EMAIL ADDRESS"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            editable={step === 1}
          />

          {step >= 2 && (
            <InputGroup
              label="6-DIGIT OTP"
              value={otp}
              onChangeText={(v) => setOtp(v.replace(/[^0-9]/g, ''))}
              placeholder="Enter OTP"
              keyboardType="number-pad"
              maxLength={6}
            />
          )}

          {step === 3 && (
            <>
              <InputGroup
                label="NEW PASSWORD"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                secureTextEntry={!showNewPassword}
                rightActionText={showNewPassword ? 'Hide' : 'Show'}
                onRightActionPress={() => setShowNewPassword((prev) => !prev)}
              />
              <InputGroup
                label="CONFIRM PASSWORD"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter new password"
                secureTextEntry={!showConfirmPassword}
                rightActionText={showConfirmPassword ? 'Hide' : 'Show'}
                onRightActionPress={() => setShowConfirmPassword((prev) => !prev)}
              />
            </>
          )}

          {step === 1 && (
            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={handleRequestOtp}
              activeOpacity={0.86}
              disabled={loading}
            >
              <Text style={styles.primaryBtnText}>{loading ? 'Sending OTP...' : 'Send OTP'}</Text>
            </TouchableOpacity>
          )}

          {step === 2 && (
            <>
              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                onPress={handleVerifyOtp}
                activeOpacity={0.86}
                disabled={loading}
              >
                <Text style={styles.primaryBtnText}>{loading ? 'Verifying...' : 'Verify OTP'}</Text>
              </TouchableOpacity>
              <View style={styles.otpMetaRow}>
                <Text style={styles.countdownText}>
                  {otpSecondsLeft > 0 ? `Resend available in ${otpCountdownText}` : 'OTP expired, request a new one'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleRequestOtp}
                disabled={loading || otpSecondsLeft > 0}
              >
                <Text style={[styles.secondaryBtnText, (loading || otpSecondsLeft > 0) && styles.secondaryBtnTextDisabled]}>
                  Resend OTP
                </Text>
              </TouchableOpacity>
            </>
          )}

          {step === 3 && (
            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={handleResetPassword}
              activeOpacity={0.86}
              disabled={loading}
            >
              <Text style={styles.primaryBtnText}>{loading ? 'Resetting...' : 'Reset Password'}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Remember your password? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Back to Login</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.noteRow}>
            <Text style={styles.noteText}>OTP validity: 2 minutes</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.navyDeep,
  },
  scroll: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: COLORS.navyMid,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'ios' ? 64 : 48,
    paddingBottom: 36,
  },
  headerOverline: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 2.2,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.white,
    lineHeight: 38,
  },
  accentBar: {
    width: 44,
    height: 3,
    backgroundColor: COLORS.tealLight,
    borderRadius: 2,
    marginVertical: 12,
  },
  headerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.66)',
    lineHeight: 20,
  },
  formPanel: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -14,
    paddingHorizontal: 28,
    paddingTop: 30,
    paddingBottom: 40,
  },
  stepWrap: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  stepPill: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#edf5f9',
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  stepPillActive: {
    backgroundColor: COLORS.tealStrong,
    borderColor: COLORS.tealStrong,
  },
  stepPillText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  stepPillTextActive: {
    color: COLORS.white,
  },
  formTitle: {
    fontSize: 27,
    fontWeight: '700',
    color: COLORS.navyDeep,
    marginBottom: 8,
  },
  formSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 22,
  },
  group: {
    marginBottom: 14,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 7,
  },
  inputWrap: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    backgroundColor: COLORS.inputBg,
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 14,
  },
  inputWrapDisabled: {
    opacity: 0.6,
  },
  input: {
    fontSize: 14,
    color: COLORS.textPrimary,
    flex: 1,
  },
  inputWithAction: {
    paddingRight: 8,
  },
  inputActionBtn: {
    paddingLeft: 10,
    paddingVertical: 8,
  },
  inputActionText: {
    fontSize: 12,
    color: COLORS.link,
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: COLORS.tealStrong,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: COLORS.tealStrong,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 7,
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  secondaryBtn: {
    marginTop: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 13,
    color: COLORS.link,
    fontWeight: '600',
  },
  secondaryBtnTextDisabled: {
    color: COLORS.textMuted,
  },
  otpMetaRow: {
    marginTop: 10,
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  footerRow: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  footerLink: {
    fontSize: 13,
    color: COLORS.link,
    fontWeight: '600',
  },
  noteRow: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    alignItems: 'center',
  },
  noteText: {
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 0.3,
  },
});

export default ForgotPasswordScreen;
