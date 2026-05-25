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

const Stack = createNativeStackNavigator();

export default function App() {
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    // placeholder for any global initialisation
  }, []);

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <ThemeProvider>
        <LanguageProvider>
          {!ready ? (
            <SplashScreen onDone={() => setReady(true)} />
          ) : (
            <NavigationContainer>
              {isAuthenticated ? (
                <MainTabs onLogout={() => setAuthenticated(false)} />
              ) : (
                <Stack.Navigator screenOptions={{headerShown: false}}>
                  <Stack.Screen name="Login">
                    {() => <LoginScreen onLogin={() => setAuthenticated(true)} />}
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
