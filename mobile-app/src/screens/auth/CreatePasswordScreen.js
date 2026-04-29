import React, { useContext, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import CustomButton from '../../components/CustomButton';
import CustomInput from '../../components/CustomInput';
import LoadingSpinner from '../../components/LoadingSpinner';
import { COLORS, FONTS } from '../../theme';
import { validatePassword } from '../../utils/validators';

const CreatePasswordScreen = ({ route }) => {
  const { email } = route.params || {};
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { completeRegistration } = useContext(AuthContext);

  const handleCreatePassword = async () => {
    if (!email) {
      Alert.alert('Missing Email', 'Please start registration again.');
      return;
    }
    if (!validatePassword(password)) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await completeRegistration(email, password, confirmPassword);
      Alert.alert('Success', 'Your account is created successfully.');
    } catch (error) {
      Alert.alert('Failed', error.response?.data?.message || 'Could not create password.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner message="Creating account..." />;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navyDeep} />
      <View style={styles.header}>
        <Text style={styles.est}>OLYMPUS LANKA HOSPITAL</Text>
        <Text style={styles.headerTitle}>Create Password</Text>
        <View style={styles.accentBar} />
        <Text style={styles.headerSub}>Your email is verified. Set your password to finish.</Text>
      </View>

      <View style={styles.formPanel}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionLabel}>PASSWORD</Text>
          <CustomInput label="Password" value={password} onChangeText={setPassword} placeholder="Create a strong password" secureTextEntry />
          <CustomInput label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Re-enter your password" secureTextEntry />
          <CustomButton title="Create Account" onPress={handleCreatePassword} style={styles.btn} />
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
  btn: { marginTop: 8 },
});

export default CreatePasswordScreen;
