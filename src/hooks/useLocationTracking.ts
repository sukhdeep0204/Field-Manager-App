import { useEffect, useRef } from 'react';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { API_BASE_URL } from '../config';

// Tell the library we handle permissions ourselves — required or it may
// block / re-request internally and return no position.
Geolocation.setRNConfiguration({
  skipPermissionRequests: true,
  authorizationLevel: 'whenInUse',
});

const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes between pings

async function requestPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  const already = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  if (already) return true;

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'Location Permission',
      message:
        'Field Manager records your location during field visits to track ' +
        'staff activity. Your location is only collected while the app is open.',
      buttonNeutral: 'Ask Me Later',
      buttonNegative: 'Deny',
      buttonPositive: 'Allow',
    },
  );

  if (
    result === PermissionsAndroid.RESULTS.DENIED ||
    result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
  ) {
    Alert.alert(
      'Location Disabled',
      'Location permission was denied. Staff location tracing will not be active. ' +
        'You can enable it anytime in Settings → Apps → Field Manager → Permissions.',
      [{ text: 'OK' }],
    );
    return false;
  }

  return result === PermissionsAndroid.RESULTS.GRANTED;
}

async function postLocation(staffId: string, lat: number, lng: number) {
  try {
    await fetch(`${API_BASE_URL}/append_staff_location_tracing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: staffId,
        latitude: lat,
        longitude: lng,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    // silent — never interrupt the user for a background ping
  }
}

export function useLocationTracking(staffId: string | null) {
  const mountedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!staffId) return;

    mountedRef.current = true;

    // Self-scheduling: next ping only queues after the current one resolves,
    // so slow GPS fixes never cause overlapping requests.
    const scheduleNext = () => {
      if (!mountedRef.current) return;
      timerRef.current = setTimeout(ping, INTERVAL_MS);
    };

    const ping = () => {
      if (!mountedRef.current) return;
      Geolocation.getCurrentPosition(
        pos => {
          postLocation(staffId, pos.coords.latitude, pos.coords.longitude)
            .finally(scheduleNext);
        },
        _err => scheduleNext(),
        {
          // Network-based location — fast, works indoors and on emulators.
          // Accurate to ~100 m which is sufficient for staff tracing.
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 120000,
        },
      );
    };

    const start = async () => {
      const granted = await requestPermission();
      if (!granted || !mountedRef.current) return;
      ping(); // immediate first ping, then self-schedules every 5 min
    };

    start();

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [staffId]);
}
