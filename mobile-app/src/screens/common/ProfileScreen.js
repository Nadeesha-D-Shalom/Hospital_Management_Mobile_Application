import React, { useState, useContext } from 'react';
import {
  View, Text, StyleSheet, Alert, ScrollView,
  TouchableOpacity, Platform, StatusBar,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { updateUserApi, deleteMyAccountApi } from '../../api/userApi';
import { requestPasswordResetOtpApi } from '../../api/authApi';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import LoadingSpinner from '../../components/LoadingSpinner';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';

const ProfileScreen = () => {
  const { userInfo, logout, updateStoredUserInfo } = useContext(AuthContext);
  const [name,    setName]    = useState(userInfo?.name    || '');
  const [email,   setEmail]   = useState(userInfo?.email   || '');
  const [phone,   setPhone]   = useState(userInfo?.phone   || '');
  const [address, setAddress] = useState(userInfo?.address || '');
  const [loading, setLoading] = useState(false);
  const [deleteMode, setDeleteMode] = useState('password'); // password | otp
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteOtp, setDeleteOtp] = useState('');
  const [showDangerZone, setShowDangerZone] = useState(false);

  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const res = await updateUserApi(userInfo._id, { name, email, phone, address });
      await updateStoredUserInfo({ ...userInfo, ...res.data });
      Alert.alert('Profile Updated', 'Your information has been saved successfully.');
    } catch (error) {
      Alert.alert('Update Failed', error.response?.data?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendDeleteOtp = async () => {
    setLoading(true);
    try {
      await requestPasswordResetOtpApi(email || userInfo?.email);
      Alert.alert('OTP Sent', 'A 6-digit OTP was sent to your email.');
    } catch (error) {
      Alert.alert('Failed', error.response?.data?.message || 'Could not send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteMode === 'password' && !deletePassword) {
      Alert.alert('Required', 'Please enter your password to delete account.');
      return;
    }
    if (deleteMode === 'otp' && !deleteOtp) {
      Alert.alert('Required', 'Please enter OTP to delete account.');
      return;
    }

    Alert.alert(
      'Delete Account',
      'This action is permanent. Your account data will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              if (deleteMode === 'password') {
                await deleteMyAccountApi({ password: deletePassword });
              } else {
                await deleteMyAccountApi({ otp: deleteOtp });
              }
              Alert.alert('Deleted', 'Your account has been deleted.');
              await logout();
            } catch (error) {
              Alert.alert('Delete Failed', error.response?.data?.message || 'Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) return <LoadingSpinner message="Please wait..." />;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navyDeep} />

      <View style={styles.hero}>
        <View style={styles.circle1} /><View style={styles.circle2} />
        <Text style={styles.heroEst}>OLYMPUS LANKA HOSPITAL</Text>
        <Text style={styles.heroTitle}>My Profile</Text>
        <View style={styles.accentBar} />
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{userInfo?.role || 'Patient'}</Text>
          </View>
        </View>
        <Text style={styles.heroName}>{name}</Text>
        <Text style={styles.heroEmail}>{email}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>ACCOUNT INFORMATION</Text>

        <View style={styles.formCard}>
          <CustomInput label="Full Name"     value={name}    onChangeText={setName}    placeholder="Your name"    />
          <CustomInput label="Email Address" value={email}   onChangeText={setEmail}   placeholder="Your email"   keyboardType="email-address" />
          <CustomInput label="Phone Number"  value={phone}   onChangeText={setPhone}   placeholder="Your phone"   keyboardType="phone-pad" />
          <CustomInput label="Address"       value={address} onChangeText={setAddress} placeholder="Your address" />
        </View>

        <CustomButton title="Save Changes" onPress={handleUpdate} style={styles.saveBtn} />

        <TouchableOpacity
          style={styles.showDangerBtn}
          onPress={() => setShowDangerZone((prev) => !prev)}
          activeOpacity={0.85}
        >
          <Text style={styles.showDangerText}>{showDangerZone ? 'Hide Danger Zone' : 'Delete Account'}</Text>
        </TouchableOpacity>

        {showDangerZone ? (
          <>
            <Text style={styles.sectionLabel}>DANGER ZONE</Text>
            <View style={styles.deleteCard}>
              <Text style={styles.deleteTitle}>Delete Account</Text>
              <Text style={styles.deleteSub}>
                This action is permanent. Confirm with your password, or use OTP if you forgot it.
              </Text>

              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, deleteMode === 'password' && styles.toggleBtnActive]}
                  onPress={() => setDeleteMode('password')}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.toggleText, deleteMode === 'password' && styles.toggleTextActive]}>Use Password</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, deleteMode === 'otp' && styles.toggleBtnActive]}
                  onPress={() => setDeleteMode('otp')}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.toggleText, deleteMode === 'otp' && styles.toggleTextActive]}>Use OTP</Text>
                </TouchableOpacity>
              </View>

              {deleteMode === 'password' ? (
                <CustomInput
                  label="Password"
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  placeholder="Enter your current password"
                  secureTextEntry
                />
              ) : (
                <>
                  <CustomInput
                    label="OTP"
                    value={deleteOtp}
                    onChangeText={(v) => setDeleteOtp(v.replace(/[^0-9]/g, ''))}
                    placeholder="Enter 6-digit OTP"
                    keyboardType="number-pad"
                  />
                  <TouchableOpacity style={styles.otpBtn} onPress={handleSendDeleteOtp} activeOpacity={0.85}>
                    <Text style={styles.otpBtnText}>Send OTP to Email</Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount} activeOpacity={0.85}>
                <Text style={styles.deleteBtnText}>Delete My Account</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
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
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  circle1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.04)', top: -50, right: -60 },
  circle2: { position: 'absolute', width: 120, height: 120, borderRadius: 60,  backgroundColor: 'rgba(255,255,255,0.05)', bottom: -20, left: -30 },
  heroEst:    { fontSize: 9, letterSpacing: 2.2, color: 'rgba(255,255,255,0.45)', marginBottom: 6 },
  heroTitle:  { fontSize: 20, fontWeight: FONTS.bold, color: COLORS.white, marginBottom: 10 },
  accentBar:  { width: 36, height: 3, backgroundColor: COLORS.tealLight, borderRadius: 2, marginBottom: 20 },
  avatarWrap: { alignItems: 'center', marginBottom: 10 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.tealBright,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: { fontSize: 24, fontWeight: FONTS.bold, color: COLORS.white },
  roleBadge: {
    marginTop: 8, backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14, paddingVertical: 4, borderRadius: RADIUS.full,
  },
  roleText:   { fontSize: 11, color: COLORS.white, fontWeight: FONTS.semibold, letterSpacing: 1, textTransform: 'uppercase' },
  heroName:   { fontSize: 18, fontWeight: FONTS.bold,    color: COLORS.white, marginTop: 8 },
  heroEmail:  { fontSize: 13, fontWeight: FONTS.regular, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 20, paddingBottom: 40 },
  sectionLabel:  { fontSize: 10, fontWeight: FONTS.bold, color: COLORS.tealBright, letterSpacing: 2, marginBottom: 12, marginLeft: 4 },

  formCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: 16, marginBottom: 16, ...SHADOW.card,
  },
  saveBtn:    { marginBottom: 10 },
  showDangerBtn: {
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    alignItems: 'center',
    marginBottom: 18,
    backgroundColor: COLORS.white,
  },
  showDangerText: { fontSize: 14, fontWeight: FONTS.bold, color: COLORS.danger },
  deleteCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 16,
    ...SHADOW.card,
    borderWidth: 1,
    borderColor: COLORS.dangerBg,
  },
  deleteTitle: { fontSize: 14, fontWeight: FONTS.bold, color: COLORS.danger, marginBottom: 4 },
  deleteSub: { fontSize: 12, color: COLORS.textMuted, lineHeight: 18, marginBottom: 12 },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.divider,
    alignItems: 'center',
    backgroundColor: COLORS.bgMuted,
  },
  toggleBtnActive: {
    borderColor: COLORS.tealStrong,
    backgroundColor: COLORS.tealFaint,
  },
  toggleText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  toggleTextActive: { color: COLORS.tealStrong, fontWeight: FONTS.bold },
  otpBtn: {
    borderRadius: RADIUS.md,
    borderWidth: 1.2,
    borderColor: COLORS.tealStrong,
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 10,
  },
  otpBtnText: { color: COLORS.tealStrong, fontSize: 12, fontWeight: FONTS.semibold },
  deleteBtn: {
    backgroundColor: COLORS.danger,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteBtnText: { color: COLORS.white, fontSize: 13, fontWeight: FONTS.bold },
  logoutBtn: {
    paddingVertical: 14, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.danger, alignItems: 'center', marginTop: 6,
  },
  logoutText: { fontSize: 14, fontWeight: FONTS.semibold, color: COLORS.danger },
});

export default ProfileScreen;
