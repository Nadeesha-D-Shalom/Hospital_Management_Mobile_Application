import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from '../api/axios';
import { completeRegistrationApi, verifyEmailOtpApi } from '../api/authApi';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = async (email, password) => {
    try {
      const response = await axios.post('/auth/login', { email, password });
      const { token, ...user } = response.data;
      setUserToken(token);
      setUserInfo(user);
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userInfo', JSON.stringify(user));
    } catch (error) {
      throw error;
    }
  };

  const register = async (name, email) => {
    try {
      const response = await axios.post('/auth/register', { name, email });
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const verifyEmailOtp = async (email, otp) => {
    try {
      const response = await verifyEmailOtpApi(email, otp);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const completeRegistration = async (email, password, confirmPassword) => {
    try {
      const response = await completeRegistrationApi(email, password, confirmPassword);
      const { token, ...user } = response.data;
      setUserToken(token);
      setUserInfo(user);
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userInfo', JSON.stringify(user));
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    setUserToken(null);
    setUserInfo(null);
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userInfo');
  };

  const updateStoredUserInfo = async (nextUserInfo) => {
    setUserInfo(nextUserInfo);
    await AsyncStorage.setItem('userInfo', JSON.stringify(nextUserInfo));
  };

  const isLoggedIn = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const user = await AsyncStorage.getItem('userInfo');
      if (token && user) {
        setUserToken(token);
        setUserInfo(JSON.parse(user));
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    isLoggedIn();
  }, []);

  return (
    <AuthContext.Provider value={{
      login,
      register,
      verifyEmailOtp,
      completeRegistration,
      updateStoredUserInfo,
      logout,
      userToken,
      userInfo,
      isLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
