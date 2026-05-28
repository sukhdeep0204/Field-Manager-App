/**
 * Field Manager - Agricultural Supervisor Portal
 * React Native CLI (No Expo)
 * @format
 */

import 'react-native-gesture-handler';
import React, {useEffect, useState} from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import MainTabs from './src/navigation/MainTabs';
import {ThemeProvider} from './src/context/ThemeContext';
import {LanguageProvider} from './src/context/LanguageContext';
import {clearSession, loadSession, type StaffProfile} from './src/auth/session';

const Stack = createNativeStackNavigator();

export default function App() {
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      const session = await loadSession();
      if (session) {
        setStaffProfile(session.profile);
        setAuthenticated(true);
      }
    };
    bootstrap();
  }, []);

  const handleLogin = (profile: StaffProfile) => {
    setStaffProfile(profile);
    setAuthenticated(true);
  };

  const handleLogout = async () => {
    await clearSession();
    setStaffProfile(null);
    setAuthenticated(false);
  };

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <ThemeProvider>
        <LanguageProvider>
          {!ready ? (
            <SplashScreen onDone={() => setReady(true)} />
          ) : (
            <NavigationContainer>
              {isAuthenticated ? (
                <MainTabs onLogout={handleLogout} staffProfile={staffProfile} />
              ) : (
                <Stack.Navigator screenOptions={{headerShown: false}}>
                  <Stack.Screen name="Login">
                    {() => <LoginScreen onLogin={handleLogin} />}
                  </Stack.Screen>
                </Stack.Navigator>
              )}
            </NavigationContainer>
          )}
        </LanguageProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

/* --- Demo data (mockTasks, mockRequests, mockProfile, mockHarvestOrders) --- */
// ...existing mock data...
