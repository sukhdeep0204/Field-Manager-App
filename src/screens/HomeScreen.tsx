import {
  Alert,
  Animated,
  Image,
  Modal,
  PermissionsAndroid,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
let Geolocation: any = null;
try {
  Geolocation = require('@react-native-community/geolocation').default;
} catch {
  console.log('[tracking] @react-native-community/geolocation not linked — GPS unavailable');
}
import {useEffect, useRef, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import {useLanguage} from '../context/LanguageContext';
import {type StaffProfile} from '../auth/session';
import {API_BASE_URL} from '../config';

const AVATAR = require('../assets/rahul-sharma-avatar.png');
const LOGO_3F = require('../assets/logo-3f.png');

const INK = '#070B1A';
const MUTED = '#43506F';
const GREEN = '#0B8F39';
const GREEN_SOFT = '#EFFAF2';
const GREEN_BORDER = '#CDEBD6';
const ORANGE = '#F97316';
const ORANGE_SOFT = '#FFF4E9';
const ORANGE_BORDER = '#F9DDBF';
const BLUE = '#186BE8';
const BLUE_SOFT = '#EAF2FF';
const PURPLE = '#8B35E8';
const PURPLE_SOFT = '#F3E9FF';
const PURPLE_BORDER = '#D8B4FE';
const CARD_BORDER = '#E7EDF0';
const TRACE_CACHE_KEY = '@staff_location_trace_buffer';
const MIN_POINT_DISTANCE_METERS = 2;
const MIN_POINT_TIME_MS = 30000;
const TRACKING_UNAVAILABLE_TEXT = 'Location tracking unavailable';

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

export default function HomeScreen({staffProfile}: {staffProfile: StaffProfile | null}) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const {t} = useLanguage();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [currentLocation, setCurrentLocation] = useState('Bori, Durg, Chhattisgarh');
  const [attendanceCalendarOpen, setAttendanceCalendarOpen] = useState(false);
  const [vehicleLogOpen, setVehicleLogOpen] = useState(false);
  const [reimbursementOpen, setReimbursementOpen] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const [issuedItems, setIssuedItems] = useState<ApiIssuedItem[]>([]);
  const [issuedLoading, setIssuedLoading] = useState(false);

  const showToast = () => {
    setToastVisible(true);
    Animated.sequence([
      Animated.timing(toastAnim, {toValue: 1, duration: 300, useNativeDriver: true}),
      Animated.delay(2500),
      Animated.timing(toastAnim, {toValue: 0, duration: 300, useNativeDriver: true}),
    ]).start(() => setToastVisible(false));
  };

  const fetchIssuedItems = async (staffId: string) => {
    if (!staffId) { return; }
    try {
      setIssuedLoading(true);
      const res = await fetch(`${API_BASE_URL}/inventory/get_my_issued_items/${encodeURIComponent(staffId)}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data?.issued_items)) {
        setIssuedItems(data.issued_items as ApiIssuedItem[]);
      }
    } catch {
      // keep previous list
    } finally {
      setIssuedLoading(false);
    }
  };

  useEffect(() => {
    if (staffProfile?.staff_id) {
      fetchIssuedItems(staffProfile.staff_id);
    }
  }, [staffProfile?.staff_id]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (staffProfile?.staff_id) {
      await fetchIssuedItems(staffProfile.staff_id);
    }
    setRefreshing(false);
  };
  const collectTraceTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const uploadTraceTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const calendarCells = [
    ...Array(4).fill(null),
    ...Array.from({length: 31}, (_, index) => index + 1),
  ];
  const calendarWeeks = Array.from({length: 5}, (_, weekIndex) =>
    calendarCells.slice(weekIndex * 7, weekIndex * 7 + 7),
  );

  const navigateTo = (routeName: string) => {
    navigation.navigate(routeName);
  };

  const handleCheckout = () => {
    setIsCheckedIn(current => !current);
    Alert.alert(
      t('attendance'),
      isCheckedIn
        ? t('checkedOutSuccess')
        : t('checkedInSuccess'),
    );
  };

  const getCurrentCoordinates = () =>
    new Promise<{lat: number; long: number} | null>(resolve => {
      if (!Geolocation?.getCurrentPosition) {
        console.log('[tracking] getCurrentCoordinates — module not linked, skipping');
        resolve(null);
        return;
      }
      console.log('[tracking] getCurrentCoordinates → requesting fix');
      Geolocation.getCurrentPosition(
        position => {
          const lat = Number(position?.coords?.latitude);
          const long = Number(position?.coords?.longitude);
          const accuracy = position?.coords?.accuracy ?? -1;
          console.log(
            `[tracking] fix ok  lat=${lat.toFixed(6)}  long=${long.toFixed(6)}  accuracy=${accuracy.toFixed(1)}m`,
          );
          if (!Number.isFinite(lat) || !Number.isFinite(long)) {
            console.log('[tracking] fix has non-finite coords, skipping');
            resolve(null);
            return;
          }
          if (accuracy > 15) {
            console.log(`[tracking] fix rejected — accuracy ${accuracy.toFixed(1)}m exceeds 15m threshold`);
            resolve(null);
            return;
          }
          resolve({lat, long});
        },
        error => {
          console.log(
            `[tracking] fix failed  code=${error.code}  msg=${error.message}`,
          );
          resolve(null);
        },
        {enableHighAccuracy: true, timeout: 15000, maximumAge: 0},
      );
    });

  const appendTracePointToCache = async (point: {lat: number; long: number}) => {
    const raw = await AsyncStorage.getItem(TRACE_CACHE_KEY);
    const tracerData = raw ? (JSON.parse(raw) as Record<string, {lat: number; long: number}>) : {};
    const sortedKeys = Object.keys(tracerData).sort();
    const latestTimestamp = sortedKeys.pop();

    if (latestTimestamp) {
      const previous = tracerData[latestTimestamp];
      const distanceM = haversineMeters(previous.lat, previous.long, point.lat, point.long);
      const timeDeltaMs = Date.now() - new Date(latestTimestamp).getTime();

      if (distanceM < MIN_POINT_DISTANCE_METERS && timeDeltaMs < MIN_POINT_TIME_MS) {
        console.log(
          `[tracking] de-dup skip  dist=${distanceM.toFixed(1)}m  age=${(timeDeltaMs / 1000).toFixed(0)}s  (threshold ${MIN_POINT_DISTANCE_METERS}m / ${MIN_POINT_TIME_MS / 1000}s)`,
        );
        return;
      }
      console.log(
        `[tracking] append point  dist=${distanceM.toFixed(1)}m  age=${(timeDeltaMs / 1000).toFixed(0)}s`,
      );
    } else {
      console.log('[tracking] append first point (cache was empty)');
    }

    const now = new Date().toISOString();
    tracerData[now] = point;
    await AsyncStorage.setItem(TRACE_CACHE_KEY, JSON.stringify(tracerData));
    console.log(
      `[tracking] cache size=${Object.keys(tracerData).length}  latest=${now}`,
    );
  };

  const uploadTraceBatch = async () => {
    if (!staffProfile?.staff_id) {
      console.log('[tracking] upload skip — no staff_id');
      return;
    }
    const raw = await AsyncStorage.getItem(TRACE_CACHE_KEY);
    const tracerData = raw ? (JSON.parse(raw) as Record<string, {lat: number; long: number}>) : {};
    const pointCount = Object.keys(tracerData).length;
    if (!pointCount) {
      console.log('[tracking] upload skip — cache empty');
      return;
    }
    console.log(`[tracking] upload start  staff=${staffProfile.staff_id}  points=${pointCount}`);
    try {
      const response = await fetch(`${API_BASE_URL}/admin_staff/append_staff_location_tracing`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          staff_id: staffProfile.staff_id,
          tracer_data: tracerData,
        }),
      });
      const data = await response.json();
      console.log(
        `[tracking] upload response  status=${response.status}  success=${data?.success}`,
      );
      if (response.ok && data?.success !== false) {
        await AsyncStorage.removeItem(TRACE_CACHE_KEY);
        console.log(`[tracking] upload done  ${pointCount} points sent, cache cleared`);
      } else {
        console.log('[tracking] upload rejected by server, keeping cache for retry');
      }
    } catch (error) {
      console.log('[tracking] upload error (will retry next interval)', error);
    }
  };

  const startLocationTracking = async () => {
    console.log('[tracking] ── start requested ──');
    try {
      if (Platform.OS === 'android') {
        const already = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (!already) {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Permission',
              message: 'Field Manager needs your location to track field visits.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Deny',
              buttonPositive: 'Allow',
            },
          );
          if (result !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log('[tracking] permission denied — stopping');
            return;
          }
        }
      }
      console.log('[tracking] permission ok');

      const collect = async () => {
        console.log('[tracking] collect tick');
        const point = await getCurrentCoordinates();
        if (!point) {
          console.log('[tracking] collect tick — no fix, skipping append');
          setCurrentLocation(TRACKING_UNAVAILABLE_TEXT);
          return;
        }
        setCurrentLocation(`${point.lat.toFixed(6)}, ${point.long.toFixed(6)}`);
        await appendTracePointToCache(point);
      };

      console.log('[tracking] initial collect');
      await collect();

      collectTraceTimer.current = setInterval(() => {
        collect();
      }, 2000);
      uploadTraceTimer.current = setInterval(() => {
        uploadTraceBatch();
      }, 10000);

      console.log('[tracking] timers started  collect=2s  upload=10s');
    } catch (err) {
      console.log('[tracking] startLocationTracking error:', err);
    }
  };

  const stopLocationTracking = async () => {
    console.log('[tracking] ── stop requested ──');
    if (collectTraceTimer.current) {
      clearInterval(collectTraceTimer.current);
      collectTraceTimer.current = null;
      console.log('[tracking] collect timer cleared');
    }
    if (uploadTraceTimer.current) {
      clearInterval(uploadTraceTimer.current);
      uploadTraceTimer.current = null;
      console.log('[tracking] upload timer cleared');
    }
    console.log('[tracking] final upload on stop');
    await uploadTraceBatch();
  };

  useEffect(() => {
    if (isCheckedIn) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }
    return () => {
      if (collectTraceTimer.current) {
        clearInterval(collectTraceTimer.current);
        collectTraceTimer.current = null;
      }
      if (uploadTraceTimer.current) {
        clearInterval(uploadTraceTimer.current);
        uploadTraceTimer.current = null;
      }
    };
  }, [isCheckedIn, staffProfile?.staff_id]);


  if (vehicleLogOpen) {
    return (
      <VehicleLogBookScreen
        bottomInset={insets.bottom}
        topInset={insets.top}
        onBack={() => setVehicleLogOpen(false)}
      />
    );
  }

  if (reimbursementOpen) {
    return (
      <ReimbursementScreen
        bottomInset={insets.bottom}
        topInset={insets.top}
        onBack={() => setReimbursementOpen(false)}
      />
    );
  }

  if (ticketOpen) {
    return (
      <RaiseRequestScreen
        bottomInset={insets.bottom}
        topInset={insets.top}
        initialRequestType={t('repair')}
        onBack={() => setTicketOpen(false)}
      />
    );
  }

  if (leaveOpen) {
    return (
      <ApplyLeaveScreen
        bottomInset={insets.bottom}
        topInset={insets.top}
        onBack={() => setLeaveOpen(false)}
      />
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {paddingTop: insets.top + 18, paddingBottom: insets.bottom + 104},
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={GREEN}
            colors={[GREEN]}
          />
        }>
        <View style={styles.header}>
          <Image source={AVATAR} style={styles.avatar} />
          <View style={styles.headerCopy}>
            <Text style={styles.greeting}>{t('goodMorning')}</Text>
            <Text style={styles.name}>{staffProfile?.staff_name ?? 'Staff User'}</Text>
            <View style={styles.roleRow}>
              <Text style={styles.role}>
                {staffProfile
                  ? `${staffProfile.staff_designation} • ${staffProfile.staff_department}`
                  : t('fieldManager')}
              </Text>
              <View style={styles.verifiedBadge}>
                <Icon name="BadgeCheck" size={16} color={GREEN} />
              </View>
            </View>
          </View>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => Alert.alert(t('notifications'), t('notificationMessage'))}
            style={styles.bellButton}>
            <Icon name="Bell" size={24} color={INK} />
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.attendanceCard}>
          <View pointerEvents="none" style={styles.attendanceCloudOne} />
          <View pointerEvents="none" style={styles.attendanceCloudTwo} />
          <View pointerEvents="none" style={styles.attendanceHillBack} />
          <View pointerEvents="none" style={styles.attendanceHillFront} />
          <View pointerEvents="none" style={styles.attendanceFarmScene}>
            <View style={styles.farmTree} />
            <View style={styles.farmHouse}>
              <View style={styles.farmRoof} />
            </View>
            <View style={styles.farmSilo} />
          </View>
          <View style={styles.attendanceHeader}>
            <Text style={styles.attendanceLabel}>{t('selfAttendance').toUpperCase()}</Text>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setAttendanceCalendarOpen(true)}
              style={styles.calendarButton}>
              <Icon name="CalendarDays" size={18} color={GREEN} />
            </TouchableOpacity>
          </View>
          <View style={styles.attendanceMain}>
            <View style={styles.statusColumn}>
              <View style={styles.statusContent}>
                <View style={styles.checkHalo}>
                  <View style={styles.checkRing}>
                    <View
                      style={[
                        styles.checkCircle,
                        !isCheckedIn && styles.checkedOutCircle,
                      ]}>
                      {isCheckedIn ? (
                        <Image
                          source={LOGO_3F}
                          resizeMode="contain"
                          style={styles.attendanceLogo}
                        />
                      ) : (
                        <Icon name="X" size={24} color="#FFFFFF" />
                      )}
                    </View>
                  </View>
                </View>
                <View style={styles.statusTextBlock}>
                  <Text style={[styles.checkedIn, !isCheckedIn && styles.checkedOut]}>
                    {isCheckedIn ? t('checkedIn') : t('checkedOut')}
                  </Text>
                  <View style={styles.locationRow}>
                    <Icon name="MapPin" size={15} color={MUTED} />
                    <Text style={styles.locationText}>{currentLocation}</Text>
                  </View>
                  <View style={styles.dateRow}>
                    <Icon name="CalendarDays" size={15} color={MUTED} />
                    <Text style={styles.dateText}>{t('todayDate')}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.timeColumn}>
              <Text style={styles.timeLabel}>
                {isCheckedIn ? t('checkInTime') : t('checkOutTime')}
              </Text>
              <View style={styles.timeRow}>
                <Text style={styles.time}>09:15</Text>
                <Text style={styles.ampm}>AM</Text>
              </View>
              <Text style={styles.durationLabel}>
                {isCheckedIn ? t('workingDuration') : t('totalDuration')}
              </Text>
              <View style={styles.durationPill}>
                <Icon name="Clock3" size={15} color={GREEN} />
                <Text style={styles.durationText}>04h 12m</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity activeOpacity={0.85} onPress={handleCheckout}>
            <LinearGradient
              colors={['#00A93A', '#009C35', '#007D2C']}
              start={{x: 0, y: 0.5}}
              end={{x: 1, y: 0.5}}
              style={styles.checkoutButton}>
              <Icon name={isCheckedIn ? 'LogOut' : 'LogIn'} size={21} color="#FFFFFF" />
              <Text style={styles.checkoutText}>
                {isCheckedIn ? t('checkOut') : t('checkIn')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Issued Items */}
        <View style={styles.issuedHeader}>
          <View>
            <Text style={styles.issuedTitle}>Issued Items</Text>
            <Text style={styles.issuedSubtitle}>{issuedItems.length} items currently issued</Text>
          </View>
          <TouchableOpacity activeOpacity={0.82} onPress={() => setIssueModalOpen(true)} style={styles.issueItemButton}>
            <Icon name="Plus" size={16} color="#FFFFFF" />
            <Text style={styles.issueItemButtonText}>Issue Item</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.issuedTable}>
          {/* Column headers */}
          <View style={styles.issuedTableHead}>
            <View style={styles.issuedColImage} />
            <Text style={[styles.issuedHeadCell, styles.issuedColName]}>Item</Text>
            <Text style={[styles.issuedHeadCell, styles.issuedColTimeline]}>Timeline</Text>
            <Text style={[styles.issuedHeadCell, styles.issuedColTask]}>Qty</Text>
          </View>

          {issuedLoading ? (
            <View style={styles.issuedEmptyBox}>
              <Text style={styles.issuedEmptyText}>Loading issued items...</Text>
            </View>
          ) : issuedItems.length === 0 ? (
            <View style={styles.issuedEmptyBox}>
              <Icon name="PackageOpen" size={28} color={MUTED} />
              <Text style={styles.issuedEmptyText}>No items currently issued</Text>
            </View>
          ) : issuedItems.map((item, index) => {
            const {daysUsed, totalDays} = computeIssuedDays(item.issue_start_date, item.issue_end_date);
            const progress = totalDays > 0 ? daysUsed / totalDays : 0;
            const barColor = progress >= 0.8 ? '#E60000' : progress >= 0.5 ? ORANGE : GREEN;
            const palette = ITEM_COLORS[index % ITEM_COLORS.length];
            const isLast = index === issuedItems.length - 1;
            return (
              <View key={item.issue_id} style={[styles.issuedRow, !isLast && styles.issuedRowBorder]}>
                {/* Icon */}
                <View style={[styles.issuedColImage, styles.issuedImageBox, {backgroundColor: palette.bg}]}>
                  <Icon name="Package" size={20} color={palette.color} />
                </View>
                {/* Name */}
                <View style={styles.issuedColName}>
                  <Text style={styles.issuedItemName} numberOfLines={1}>{item.item_name}</Text>
                  <Text style={styles.issuedItemCategory}>{item.status}</Text>
                </View>
                {/* Timeline */}
                <View style={styles.issuedColTimeline}>
                  <View style={styles.issuedProgressTrack}>
                    <View style={[styles.issuedProgressFill, {width: `${Math.min(progress * 100, 100)}%` as any, backgroundColor: barColor}]} />
                  </View>
                  <Text style={[styles.issuedProgressLabel, {color: barColor}]}>
                    {daysUsed}d / {totalDays}d
                  </Text>
                </View>
                {/* Quantity */}
                <View style={styles.issuedColTask}>
                  <Text style={styles.issuedItemName}>{item.quantity}</Text>
                  <Text style={styles.issuedItemCategory}>units</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <Modal
        animationType="fade"
        transparent
        visible={attendanceCalendarOpen}
        onRequestClose={() => setAttendanceCalendarOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.calendarModal}>
            <View style={styles.calendarModalHeader}>
              <View>
                <Text style={styles.calendarTitle}>{t('monthlyAttendance')}</Text>
                <Text style={styles.calendarMonth}>{t('may2025')}</Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => setAttendanceCalendarOpen(false)}
                style={styles.calendarClose}>
                <Icon name="X" size={20} color={INK} />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarStats}>
              <View style={styles.calendarStat}>
                <Text style={styles.calendarStatValue}>18</Text>
                <Text style={styles.calendarStatLabel}>{t('present')}</Text>
              </View>
              <View style={styles.calendarStat}>
                <Text style={[styles.calendarStatValue, styles.absentText]}>2</Text>
                <Text style={styles.calendarStatLabel}>{t('absent')}</Text>
              </View>
              <View style={styles.calendarStat}>
                <Text style={[styles.calendarStatValue, styles.offText]}>4</Text>
                <Text style={styles.calendarStatLabel}>{t('off')}</Text>
              </View>
            </View>

            <View style={styles.weekRow}>
              {WEEK_DAYS.map(day => (
                <Text key={day} style={styles.weekDay}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarWeeks.map((week, weekIndex) => (
                <View key={`week-${weekIndex}`} style={styles.calendarWeek}>
                  {week.map((day, dayIndex) => {
                    const status = getAttendanceStatus(day);

                    return (
                      <View
                        key={`${day ?? 'blank'}-${weekIndex}-${dayIndex}`}
                        style={styles.calendarDaySlot}>
                        <View
                          style={[
                            styles.calendarDay,
                            status === 'present' && styles.presentDay,
                            status === 'absent' && styles.absentDay,
                            status === 'off' && styles.offDay,
                            status === 'today' && styles.todayDay,
                          ]}>
                          {day ? (
                            <Text
                              style={[
                                styles.calendarDayText,
                                status === 'present' && styles.presentDayText,
                                status === 'absent' && styles.absentDayText,
                                status === 'today' && styles.todayDayText,
                              ]}>
                              {day}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>

            <View style={styles.calendarLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, {backgroundColor: GREEN}]} />
                <Text style={styles.legendText}>{t('present')}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, {backgroundColor: '#DC2626'}]} />
                <Text style={styles.legendText}>{t('absent')}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, {backgroundColor: '#E5E7EB'}]} />
                <Text style={styles.legendText}>{t('off')}</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <IssueItemModal
        visible={issueModalOpen}
        staffId={staffProfile?.staff_id ?? ''}
        onClose={() => setIssueModalOpen(false)}
        onSubmit={() => {
          setIssueModalOpen(false);
          showToast();
          if (staffProfile?.staff_id) { fetchIssuedItems(staffProfile.staff_id); }
        }}
      />

      {toastVisible ? (
        <Animated.View
          style={[
            styles.toast,
            {
              opacity: toastAnim,
              transform: [{translateY: toastAnim.interpolate({inputRange: [0, 1], outputRange: [20, 0]})}],
            },
          ]}>
          <Icon name="CheckCircle2" size={18} color="#FFFFFF" />
          <Text style={styles.toastText}>On approval, issued item will be shown on homescreen</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

type ApiIssuedItem = {
  issue_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  issue_start_date: string;
  issue_end_date: string;
  status: string;
  created_at: string;
};

const ITEM_COLORS = [
  {color: BLUE, bg: '#EAF2FF'},
  {color: ORANGE, bg: '#FFF4E9'},
  {color: GREEN, bg: '#EFFAF2'},
  {color: '#8B35E8', bg: '#F3E9FF'},
  {color: '#E60000', bg: '#FFF0F0'},
];

function computeIssuedDays(start: string, end: string) {
  const startMs = new Date(start).setHours(0, 0, 0, 0);
  const endMs = new Date(end).setHours(0, 0, 0, 0);
  const todayMs = new Date().setHours(0, 0, 0, 0);
  const totalDays = Math.max(1, Math.round((endMs - startMs) / 86400000));
  const daysUsed = Math.min(totalDays, Math.max(0, Math.round((todayMs - startMs) / 86400000)));
  return {daysUsed, totalDays};
}

const ISSUED_ITEMS = [
  {
    id: '1',
    name: 'Sprayer Pump',
    category: 'Equipment',
    icon: 'Droplets',
    color: BLUE,
    bg: '#EAF2FF',
    daysUsed: 3,
    totalDays: 7,
    task: 'Insecticide Spray',
    quantity: 2,
    issuedOn: '28 May',
    dueOn: '4 Jun',
  },
  {
    id: '2',
    name: 'Tractor Unit',
    category: 'Vehicle',
    icon: 'Tractor',
    color: ORANGE,
    bg: '#FFF4E9',
    daysUsed: 5,
    totalDays: 7,
    task: 'Land Preparation',
    quantity: 1,
    issuedOn: '26 May',
    dueOn: '2 Jun',
  },
  {
    id: '3',
    name: 'Drip Pipes (Set)',
    category: 'Irrigation',
    icon: 'Waves',
    color: GREEN,
    bg: '#EFFAF2',
    daysUsed: 1,
    totalDays: 10,
    task: 'Drip System Setup',
    quantity: 10,
    issuedOn: '30 May',
    dueOn: '9 Jun',
  },
  {
    id: '4',
    name: 'Seed Drill',
    category: 'Equipment',
    icon: 'Sprout',
    color: '#8B35E8',
    bg: '#F3E9FF',
    daysUsed: 6,
    totalDays: 7,
    task: 'Wheat Sowing - FM-10040',
    quantity: 1,
    issuedOn: '25 May',
    dueOn: '1 Jun',
  },
  {
    id: '5',
    name: 'Pump Set',
    category: 'Equipment',
    icon: 'Gauge',
    color: '#E60000',
    bg: '#FFF0F0',
    daysUsed: 8,
    totalDays: 8,
    task: 'Irrigation Run',
    quantity: 3,
    issuedOn: '23 May',
    dueOn: '31 May',
  },
];

const PENDING_ISSUE_TASKS = [
  {id: 'T001', label: 'Land Verification', detail: 'FM-10024 • Bori, Durg'},
  {id: 'T002', label: 'Insecticide Spray', detail: 'FM-10035 • Bhilai, Durg'},
  {id: 'T003', label: 'Soil Testing', detail: 'FM-10028 • Jamgaon, Durg'},
  {id: 'T004', label: 'Irrigation Check', detail: 'FM-10040 • Koni, Durg'},
  {id: 'T005', label: 'Crop Monitoring', detail: 'FM-10045 • Bhilai, Durg'},
];

type InventoryItem = {
  Invent_id: string;
  item_name: string;
  new_item_code: string;
  category: string;
  unit: string;
  stock: number;
  item_image_url: string;
  location: string;
};

function parseDateToISO(ddmmyyyy: string): string {
  const parts = ddmmyyyy.trim().split('/');
  if (parts.length !== 3) { return ddmmyyyy; }
  const [dd, mm, yyyy] = parts;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

function formatDateISO(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const DP_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDateDisplay(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')} ${DP_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

const DP_WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function DatePickerModal({
  visible,
  value,
  minDate,
  onClose,
  onSelect,
}: {
  visible: boolean;
  value: Date | null;
  minDate: Date;
  onClose: () => void;
  onSelect: (d: Date) => void;
}) {
  const today = new Date(minDate);
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(() => (value ?? today).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => (value ?? today).getMonth());
  const [pending, setPending] = useState<Date | null>(value);

  useEffect(() => {
    if (visible) {
      const d = value ?? today;
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setPending(value);
    }
  }, [visible]);

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({length: daysInMonth}, (_, i) => i + 1),
  ];
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    const slice = cells.slice(i, i + 7);
    while (slice.length < 7) { slice.push(null); }
    weeks.push(slice);
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else { setViewMonth(m => m - 1); }
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else { setViewMonth(m => m + 1); }
  };

  const isBefore = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    d.setHours(0, 0, 0, 0);
    return d < today;
  };
  const isSelected = (day: number) =>
    pending !== null &&
    pending.getFullYear() === viewYear &&
    pending.getMonth() === viewMonth &&
    pending.getDate() === day;
  const isToday = (day: number) => {
    const t = new Date();
    return t.getFullYear() === viewYear && t.getMonth() === viewMonth && t.getDate() === day;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.dpOverlay}>
        <TouchableOpacity activeOpacity={1} style={styles.dpBackdrop} onPress={onClose} />
        <View style={styles.dpSheet}>
          <View style={styles.dpHandle} />
          <View style={styles.dpHeader}>
            <TouchableOpacity onPress={prevMonth} style={styles.dpNavBtn}>
              <Icon name="ChevronLeft" size={22} color={INK} />
            </TouchableOpacity>
            <Text style={styles.dpMonthYear}>{DP_MONTHS[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={nextMonth} style={styles.dpNavBtn}>
              <Icon name="ChevronRight" size={22} color={INK} />
            </TouchableOpacity>
          </View>
          <View style={styles.dpDayRow}>
            {DP_WEEK_DAYS.map((d, i) => (
              <Text key={i} style={styles.dpDayLabel}>{d}</Text>
            ))}
          </View>
          <View style={styles.dpGrid}>
            {weeks.map((week, wi) => (
              <View key={wi} style={styles.dpWeekRow}>
                {week.map((day, di) => {
                  if (!day) { return <View key={di} style={styles.dpCell} />; }
                  const disabled = isBefore(day);
                  const sel = isSelected(day);
                  const tod = isToday(day);
                  return (
                    <TouchableOpacity
                      key={di}
                      disabled={disabled}
                      activeOpacity={0.78}
                      onPress={() => setPending(new Date(viewYear, viewMonth, day))}
                      style={styles.dpCell}>
                      <View style={[
                        styles.dpDayCircle,
                        sel && styles.dpDaySelected,
                        !sel && tod && styles.dpDayToday,
                      ]}>
                        <Text style={[
                          styles.dpDayText,
                          sel && styles.dpDayTextSelected,
                          !sel && tod && styles.dpDayTextToday,
                          disabled && styles.dpDayTextDisabled,
                        ]}>{day}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
          <View style={styles.dpActions}>
            <TouchableOpacity onPress={onClose} style={styles.dpCancelBtn}>
              <Text style={styles.dpCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { if (pending) { onSelect(pending); onClose(); } }}
              disabled={!pending}
              style={[styles.dpConfirmBtn, !pending && {opacity: 0.5}]}>
              <Text style={styles.dpConfirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function IssueItemModal({
  visible,
  staffId,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  staffId: string;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [itemSearch, setItemSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [itemDropOpen, setItemDropOpen] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [fromDateObj, setFromDateObj] = useState<Date | null>(null);
  const [toDateObj, setToDateObj] = useState<Date | null>(null);
  const [fromPickerOpen, setFromPickerOpen] = useState(false);
  const [toPickerOpen, setToPickerOpen] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [selectedTask, setSelectedTask] = useState<typeof PENDING_ISSUE_TASKS[number] | null>(null);
  const [taskDropOpen, setTaskDropOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) { return; }
    const fetchItems = async () => {
      try {
        setLoadingItems(true);
        const res = await fetch(`${API_BASE_URL}/inventory/get_all_item`);
        const data = await res.json();
        if (res.ok && Array.isArray(data?.items)) {
          setInventoryItems(data.items as InventoryItem[]);
        }
      } catch {
        // keep empty list
      } finally {
        setLoadingItems(false);
      }
    };
    fetchItems();
  }, [visible]);

  const filteredItems = itemSearch.trim()
    ? inventoryItems.filter(i =>
        i.item_name.toLowerCase().includes(itemSearch.toLowerCase()) ||
        i.category.toLowerCase().includes(itemSearch.toLowerCase()) ||
        i.new_item_code.toLowerCase().includes(itemSearch.toLowerCase()),
      )
    : inventoryItems;

  const reset = () => {
    setItemSearch('');
    setSelectedItem(null);
    setItemDropOpen(false);
    setFromDateObj(null);
    setToDateObj(null);
    setFromPickerOpen(false);
    setToPickerOpen(false);
    setQuantity('');
    setSelectedTask(null);
    setTaskDropOpen(false);
    setSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!selectedItem) {
      Alert.alert('Required', 'Please select an item.');
      return;
    }
    if (!fromDateObj || !toDateObj) {
      Alert.alert('Required', 'Please select the issue timeline.');
      return;
    }
    if (toDateObj < fromDateObj) {
      Alert.alert('Invalid', 'End date cannot be before start date.');
      return;
    }
    if (!quantity.trim() || isNaN(Number(quantity))) {
      Alert.alert('Required', 'Please enter a valid quantity.');
      return;
    }
    if (!selectedTask) {
      Alert.alert('Required', 'Please select a task.');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/inventory/make_issue_request`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          item_id: selectedItem.Invent_id,
          quantity: Number(quantity),
          issue_start_date: formatDateISO(fromDateObj),
          issue_end_date: formatDateISO(toDateObj),
          staff_id: staffId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        Alert.alert('Error', 'Failed to raise request. Please try again.');
        return;
      }
      reset();
      onSubmit();
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { reset(); onClose(); }}>
      <View style={styles.issueOverlay}>
        <TouchableOpacity activeOpacity={1} style={styles.issueBackdrop} onPress={() => { reset(); onClose(); }} />
        <View style={styles.issueSheet}>
          <View style={styles.issueHandle} />

          <View style={styles.issueSheetHeader}>
            <View style={styles.issueSheetIconWrap}>
              <Icon name="PackagePlus" size={22} color={GREEN} />
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.issueSheetTitle}>Issue Item Request</Text>
              <Text style={styles.issueSheetSubtitle}>Fill details to raise a request</Text>
            </View>
            <TouchableOpacity activeOpacity={0.75} onPress={() => { reset(); onClose(); }} style={styles.issueSheetClose}>
              <Icon name="X" size={20} color={INK} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.issueForm} keyboardShouldPersistTaps="handled">

            {/* Item Search + Dropdown */}
            <Text style={styles.issueFieldLabel}>Item *</Text>

            {selectedItem ? (
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={() => { setSelectedItem(null); setItemSearch(''); setItemDropOpen(true); }}
                style={styles.selectedItemRow}>
                <Image
                  source={{uri: selectedItem.item_image_url}}
                  style={styles.selectedItemImage}
                  resizeMode="cover"
                />
                <View style={{flex: 1}}>
                  <Text style={styles.selectedItemName} numberOfLines={1}>{selectedItem.item_name}</Text>
                  <Text style={styles.selectedItemMeta}>{selectedItem.new_item_code} • {selectedItem.category}</Text>
                </View>
                <View style={[styles.stockBadge, {backgroundColor: selectedItem.stock > 0 ? '#EFFAF2' : '#FFF0F0'}]}>
                  <Text style={[styles.stockBadgeText, {color: selectedItem.stock > 0 ? GREEN : '#E60000'}]}>
                    {selectedItem.stock} {selectedItem.unit}
                  </Text>
                </View>
                <Icon name="X" size={14} color={MUTED} />
              </TouchableOpacity>
            ) : (
              <View style={styles.issueInputWrap}>
                <Icon name="Search" size={16} color={GREEN} />
                <TextInput
                  value={itemSearch}
                  onChangeText={text => { setItemSearch(text); setItemDropOpen(true); }}
                  onFocus={() => setItemDropOpen(true)}
                  placeholder="Search item by name or category..."
                  placeholderTextColor="#94A3B8"
                  style={styles.issueInput}
                />
                {itemSearch.length > 0 ? (
                  <TouchableOpacity onPress={() => { setItemSearch(''); }} activeOpacity={0.7}>
                    <Icon name="X" size={15} color={MUTED} />
                  </TouchableOpacity>
                ) : null}
              </View>
            )}

            {itemDropOpen && !selectedItem ? (
              <View style={styles.issueDropdown}>
                {loadingItems ? (
                  <View style={styles.issueDropdownLoading}>
                    <Text style={styles.issueDropdownLoadingText}>Loading items...</Text>
                  </View>
                ) : filteredItems.length === 0 ? (
                  <View style={styles.issueDropdownLoading}>
                    <Text style={styles.issueDropdownLoadingText}>No items found</Text>
                  </View>
                ) : filteredItems.map((item, index) => (
                  <TouchableOpacity
                    key={item.Invent_id}
                    activeOpacity={0.78}
                    onPress={() => { setSelectedItem(item); setItemDropOpen(false); setItemSearch(''); }}
                    style={[styles.issueItemRow, index === filteredItems.length - 1 && {borderBottomWidth: 0}]}>
                    <Image
                      source={{uri: item.item_image_url}}
                      style={styles.itemThumb}
                      resizeMode="cover"
                    />
                    <View style={{flex: 1}}>
                      <Text style={styles.issueDropdownLabel} numberOfLines={1}>{item.item_name}</Text>
                      <Text style={styles.issueDropdownDetail}>{item.new_item_code} • {item.category}</Text>
                    </View>
                    <View style={[styles.stockBadge, {backgroundColor: item.stock > 0 ? '#EFFAF2' : '#FFF0F0'}]}>
                      <Text style={[styles.stockBadgeText, {color: item.stock > 0 ? GREEN : '#E60000'}]}>
                        {item.stock > 0 ? `${item.stock} ${item.unit}` : 'Out of stock'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {/* Issue Timeline */}
            <Text style={styles.issueFieldLabel}>Issue Timeline *</Text>
            <View style={styles.issueTwoCol}>
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={() => setFromPickerOpen(true)}
                style={[styles.issueInputWrap, {flex: 1, marginRight: 8}]}>
                <Icon name="CalendarDays" size={16} color={GREEN} />
                <Text style={[styles.issueInput, !fromDateObj && {color: '#94A3B8'}]}>
                  {fromDateObj ? formatDateDisplay(fromDateObj) : 'From date'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={() => setToPickerOpen(true)}
                style={[styles.issueInputWrap, {flex: 1}]}>
                <Icon name="CalendarDays" size={16} color={ORANGE} />
                <Text style={[styles.issueInput, !toDateObj && {color: '#94A3B8'}]}>
                  {toDateObj ? formatDateDisplay(toDateObj) : 'To date'}
                </Text>
              </TouchableOpacity>
            </View>

            <DatePickerModal
              visible={fromPickerOpen}
              value={fromDateObj}
              minDate={new Date()}
              onClose={() => setFromPickerOpen(false)}
              onSelect={(d: Date) => { setFromDateObj(d); if (toDateObj && toDateObj < d) { setToDateObj(null); } }}
            />
            <DatePickerModal
              visible={toPickerOpen}
              value={toDateObj}
              minDate={fromDateObj ?? new Date()}
              onClose={() => setToPickerOpen(false)}
              onSelect={(d: Date) => setToDateObj(d)}
            />

            {/* Quantity */}
            <Text style={styles.issueFieldLabel}>Quantity *</Text>
            <View style={styles.issueInputWrap}>
              <Icon name="Hash" size={16} color={GREEN} />
              <TextInput
                value={quantity}
                onChangeText={setQuantity}
                placeholder="Enter quantity"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                style={styles.issueInput}
              />
              {selectedItem ? <Text style={styles.unitLabel}>{selectedItem.unit}</Text> : null}
            </View>

            {/* Task */}
            <Text style={styles.issueFieldLabel}>Task *</Text>
            <TouchableOpacity
              activeOpacity={0.78}
              onPress={() => setTaskDropOpen(o => !o)}
              style={styles.issueInputWrap}>
              <Icon name="ClipboardList" size={16} color={GREEN} />
              <Text style={[styles.issueInput, !selectedTask && {color: '#94A3B8'}]} numberOfLines={1}>
                {selectedTask ? selectedTask.label : 'Select pending task'}
              </Text>
              <Icon name={taskDropOpen ? 'ChevronUp' : 'ChevronDown'} size={16} color={MUTED} />
            </TouchableOpacity>
            {taskDropOpen ? (
              <View style={styles.issueDropdown}>
                {PENDING_ISSUE_TASKS.map((task, index) => (
                  <TouchableOpacity
                    key={task.id}
                    activeOpacity={0.78}
                    onPress={() => { setSelectedTask(task); setTaskDropOpen(false); }}
                    style={[styles.issueDropdownItem, index === PENDING_ISSUE_TASKS.length - 1 && {borderBottomWidth: 0}]}>
                    <View style={{flex: 1}}>
                      <Text style={styles.issueDropdownLabel}>{task.label}</Text>
                      <Text style={styles.issueDropdownDetail}>{task.detail}</Text>
                    </View>
                    {selectedTask?.id === task.id ? <Icon name="Check" size={15} color={GREEN} /> : null}
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

          </ScrollView>

          <View style={styles.issueActions}>
            <TouchableOpacity activeOpacity={0.76} onPress={() => { reset(); onClose(); }} style={styles.issueCancelBtn}>
              <Text style={styles.issueCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSubmit}
              disabled={submitting}
              style={[styles.issueMakeBtn, submitting && {opacity: 0.6}]}>
              <Icon name="SendHorizonal" size={16} color="#FFFFFF" />
              <Text style={styles.issueMakeBtnText}>{submitting ? 'Submitting...' : 'Make Request'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const ABSENT_DAYS = [7, 16];
const OFF_DAYS = [4, 11, 18, 25];

function getAttendanceStatus(day: number | null) {
  if (!day) {
    return 'blank';
  }
  if (day === 21) {
    return 'today';
  }
  if (ABSENT_DAYS.includes(day)) {
    return 'absent';
  }
  if (OFF_DAYS.includes(day)) {
    return 'off';
  }
  if (day < 22) {
    return 'present';
  }
  return 'future';
}

function VehicleLogBookScreen({
  bottomInset,
  topInset,
  onBack,
}: {
  bottomInset: number;
  topInset: number;
  onBack: () => void;
}) {
  const {t} = useLanguage();
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [fuelModalOpen, setFuelModalOpen] = useState(false);
  const [selectedVehicleIndex, setSelectedVehicleIndex] = useState(0);
  const [vehicleSelectorOpen, setVehicleSelectorOpen] = useState(false);
  const selectedVehicle = VEHICLES[selectedVehicleIndex];

  return (
    <View style={styles.vehicleRoot}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.vehicleContent,
          {paddingBottom: bottomInset + 112, paddingTop: topInset + 30},
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.vehicleHeader}>
          <TouchableOpacity activeOpacity={0.72} onPress={onBack} style={styles.vehicleBack}>
            <Icon name="ArrowLeft" size={24} color="#062C29" />
          </TouchableOpacity>
          <Text style={styles.vehicleTitle}>{t('vehicleLogBook')}</Text>
          <View style={styles.vehicleActionGroup}>
            <TouchableOpacity
              activeOpacity={0.78}
              onPress={() => setEntryModalOpen(true)}
              style={styles.vehicleAddButton}>
              <Icon name="Plus" size={20} color={GREEN} />
              <Text style={styles.vehicleAddText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.78}
              onPress={() => setFuelModalOpen(true)}
              style={styles.vehicleFuelButton}>
              <Icon name="Fuel" size={20} color={ORANGE} />
              <Text style={styles.vehicleFuelText}>{t('fuelEntry')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.vehicleSummaryCard}>
          <View style={styles.vehicleSummaryTop}>
            <View style={styles.vehicleIconHalo}>
              <View style={styles.vehicleIconCircle}>
                <Icon name="Truck" size={27} color="#FFFFFF" />
              </View>
            </View>
            <View style={styles.vehicleSummaryInfo}>
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={() => setVehicleSelectorOpen(true)}
                style={styles.vehicleNameRow}>
                <Text style={styles.vehicleNumber}>{selectedVehicle.number}</Text>
                <Icon name="ChevronDown" size={18} color={GREEN} />
              </TouchableOpacity>
              <Text style={styles.vehicleModel}>{selectedVehicle.model}</Text>
              <View style={styles.vehicleStatusPill}>
                <Text style={styles.vehicleStatusText}>{t('active')}</Text>
              </View>
            </View>
            <View style={styles.vehicleKmBlock}>
              <Text style={styles.vehicleKmValue}>{selectedVehicle.totalKm}</Text>
              <Text style={styles.vehicleKmLabel}>{t('totalKm')}</Text>
            </View>
          </View>

          <View style={styles.vehicleMetricRow}>
            <VehicleMetric icon="Gauge" value={selectedVehicle.monthKm} label={t('thisMonth')} />
            <VehicleMetric icon="Fuel" value={selectedVehicle.monthFuel} label={t('fuelThisMonth')} />
            <VehicleMetric icon="Gauge" value={selectedVehicle.mileage} label={t('mileage')} />
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.8} style={styles.vehicleMonthSummary}>
          <View style={styles.vehicleMonthIcon}>
            <Icon name="ChartColumn" size={24} color={GREEN} />
          </View>
          <View style={styles.vehicleMonthCopy}>
            <Text style={styles.vehicleMonthTitle}>{t('vehicleSummary')}</Text>
            <Text style={styles.vehicleMonthText}>{t('previousMonthData')}</Text>
          </View>
          <Icon name="ChevronRight" size={23} color={MUTED} />
        </TouchableOpacity>

        <View style={styles.vehicleSectionHeader}>
          <Text style={styles.vehicleSectionTitle}>{t('logEntries')}</Text>
          <TouchableOpacity activeOpacity={0.76} style={styles.vehicleFilterButton}>
            <Icon name="ListFilter" size={17} color={MUTED} />
            <Text style={styles.vehicleFilterText}>{t('filter')}</Text>
          </TouchableOpacity>
        </View>

        {VEHICLE_LOGS.map(log => (
          <VehicleLogCard key={`${log.day}-${log.from}-${log.to}`} log={log} fieldVisitLabel={t('fieldVisit')} />
        ))}

      </ScrollView>

      <VehicleEntryModal
        visible={entryModalOpen}
        openingKm={selectedVehicle.totalKm}
        onClose={() => setEntryModalOpen(false)}
        onSave={() => {
          setEntryModalOpen(false);
          Alert.alert(t('vehicleLogBook'), t('entrySaved'));
        }}
      />
      <FuelEntryModal
        visible={fuelModalOpen}
        onClose={() => setFuelModalOpen(false)}
        onSave={() => {
          setFuelModalOpen(false);
          Alert.alert(t('fuelEntry'), t('fuelEntrySaved'));
        }}
      />
      <VehicleSelectorModal
        visible={vehicleSelectorOpen}
        selectedIndex={selectedVehicleIndex}
        onClose={() => setVehicleSelectorOpen(false)}
        onSelect={index => {
          setSelectedVehicleIndex(index);
          setVehicleSelectorOpen(false);
        }}
      />
    </View>
  );
}

function VehicleEntryModal({
  visible,
  openingKm,
  onClose,
  onSave,
}: {
  visible: boolean;
  openingKm: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const {t} = useLanguage();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.entryModalOverlay}>
        <TouchableOpacity activeOpacity={1} style={styles.entryBackdrop} onPress={onClose} />
        <View style={styles.entrySheet}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryTitle}>{t('addEntry')}</Text>
            <TouchableOpacity activeOpacity={0.76} onPress={onClose} style={styles.entryClose}>
              <Icon name="X" size={21} color={INK} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.entryForm}>
            <EntryField label="Date" value="25 May 2026" icon="CalendarDays" />
            <EntryField label="From Location" value="Bhilai, Durg" icon="MapPin" />
            <EntryField label="To Location" value="Jamgaon, Durg" icon="MapPin" />
            <View style={styles.entryTwoColumn}>
              <EntryField label="Start Time" value="09:15 AM" icon="Clock3" compact />
              <EntryField label="End Time" value="01:30 PM" icon="Clock3" compact />
            </View>
            <View style={styles.entryTwoColumn}>
              <EntryField label="Opening KM" value={openingKm} icon="Gauge" compact readOnly />
              <EntryField label="Closing KM" value="" icon="Gauge" compact />
            </View>
            <UploadBox label={t('odometerImage')} icon="Camera" />
            <EntryField label="Purpose" value={t('fieldVisit')} icon="ClipboardList" multiline />
          </ScrollView>

          <View style={styles.entryActions}>
            <TouchableOpacity activeOpacity={0.76} onPress={onClose} style={styles.entryCancelButton}>
              <Text style={styles.entryCancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.82} onPress={onSave} style={styles.entrySaveButton}>
              <Text style={styles.entrySaveText}>{t('saveEntry')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function FuelEntryModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const {t} = useLanguage();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.entryModalOverlay}>
        <TouchableOpacity activeOpacity={1} style={styles.entryBackdrop} onPress={onClose} />
        <View style={styles.entrySheet}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryTitle}>{t('fuelEntry')}</Text>
            <TouchableOpacity activeOpacity={0.76} onPress={onClose} style={styles.entryClose}>
              <Icon name="X" size={21} color={INK} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.entryForm}>
            <EntryField label="Date" value="25 May 2026" icon="CalendarDays" />
            <EntryField label={t('fuelStation')} value="" icon="MapPin" />
            <View style={styles.entryTwoColumn}>
              <EntryField label={t('fuelQuantity')} value="" icon="Fuel" compact />
              <EntryField label={t('billAmount')} value="" icon="IndianRupee" compact />
            </View>
            <UploadBox label={t('uploadBillLabel')} icon="FileUp" />
          </ScrollView>

          <View style={styles.entryActions}>
            <TouchableOpacity activeOpacity={0.76} onPress={onClose} style={styles.entryCancelButton}>
              <Text style={styles.entryCancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.82} onPress={onSave} style={styles.entrySaveButton}>
              <Text style={styles.entrySaveText}>{t('saveFuelEntry')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function VehicleSelectorModal({
  visible,
  selectedIndex,
  onClose,
  onSelect,
}: {
  visible: boolean;
  selectedIndex: number;
  onClose: () => void;
  onSelect: (index: number) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.entryModalOverlay}>
        <TouchableOpacity activeOpacity={1} style={styles.entryBackdrop} onPress={onClose} />
        <View style={styles.vehicleSelectorSheet}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryTitle}>Choose Vehicle</Text>
            <TouchableOpacity activeOpacity={0.76} onPress={onClose} style={styles.entryClose}>
              <Icon name="X" size={21} color={INK} />
            </TouchableOpacity>
          </View>

          <View style={styles.vehicleSelectorList}>
            {VEHICLES.map((vehicle, index) => (
              <TouchableOpacity
                key={vehicle.number}
                activeOpacity={0.78}
                onPress={() => onSelect(index)}
                style={[
                  styles.vehicleSelectorItem,
                  selectedIndex === index && styles.vehicleSelectorItemActive,
                ]}>
                <View style={styles.vehicleSelectorIcon}>
                  <Icon name="Truck" size={23} color={GREEN} />
                </View>
                <View style={styles.vehicleSelectorCopy}>
                  <Text style={styles.vehicleSelectorNumber}>{vehicle.number}</Text>
                  <Text style={styles.vehicleSelectorMeta}>
                    {vehicle.model} • {vehicle.totalKm} KM
                  </Text>
                </View>
                {selectedIndex === index ? (
                  <Icon name="CheckCircle2" size={22} color={GREEN} />
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function UploadBox({label, icon}: {label: string; icon: string}) {
  const {t} = useLanguage();

  return (
    <TouchableOpacity activeOpacity={0.78} style={styles.uploadBox}>
      <View style={styles.uploadIconWrap}>
        <Icon name={icon} size={22} color={GREEN} />
      </View>
      <View style={styles.uploadCopy}>
        <Text style={styles.uploadLabel}>{label}</Text>
        <Text style={styles.uploadHint}>{t('tapToUpload')}</Text>
      </View>
      <Icon name="Upload" size={20} color={MUTED} />
    </TouchableOpacity>
  );
}

function EntryField({
  label,
  value,
  icon,
  compact,
  multiline,
  readOnly,
}: {
  label: string;
  value: string;
  icon: string;
  compact?: boolean;
  multiline?: boolean;
  readOnly?: boolean;
}) {
  return (
    <View style={[styles.entryFieldWrap, compact && styles.entryFieldCompact]}>
      <Text style={styles.entryFieldLabel}>{label}</Text>
      <View style={[styles.entryInputWrap, multiline && styles.entryInputMultiline]}>
        <Icon name={icon} size={17} color={GREEN} />
        <TextInput
          editable={!readOnly}
          defaultValue={value}
          multiline={multiline}
          style={[
            styles.entryInput,
            multiline && styles.entryInputTextArea,
            readOnly && styles.entryInputReadOnly,
          ]}
          placeholderTextColor="#8B97AA"
        />
      </View>
    </View>
  );
}

function VehicleMetric({icon, value, label}: {icon: string; value: string; label: string}) {
  return (
    <View style={styles.vehicleMetricCard}>
      <View style={styles.vehicleMetricIcon}>
        <Icon name={icon} size={23} color={GREEN} />
      </View>
      <Text style={styles.vehicleMetricValue}>{value}</Text>
      <Text style={styles.vehicleMetricLabel}>{label}</Text>
    </View>
  );
}

function VehicleLogCard({
  log,
  fieldVisitLabel,
}: {
  log: {
    day: string;
    from: string;
    to: string;
    time: string;
    distance: string;
    fuel: string;
    cost: string;
  };
  fieldVisitLabel: string;
}) {
  return (
    <TouchableOpacity activeOpacity={0.82} style={styles.vehicleLogCard}>
      <View style={styles.vehicleDateBlock}>
        <Text style={styles.vehicleDateDay}>{log.day}</Text>
        <Text style={styles.vehicleDateMonth}>May</Text>
        <Text style={styles.vehicleDateYear}>2025</Text>
      </View>

      <View style={styles.vehicleRouteBlock}>
        <View style={styles.vehicleRouteRow}>
          <View style={styles.vehicleGreenDot} />
          <Text style={styles.vehicleRouteText}>{log.from}</Text>
        </View>
        <View style={styles.vehicleRouteLine} />
        <View style={styles.vehicleRouteRow}>
          <View style={styles.vehicleRedDot} />
          <Text style={styles.vehicleRouteText}>{log.to}</Text>
        </View>
        <View style={styles.vehicleTimeRow}>
          <Icon name="Clock3" size={14} color="#74829A" />
          <Text style={styles.vehicleTimeText}>{log.time}</Text>
        </View>
      </View>

      <View style={styles.vehicleDistanceBlock}>
        <Text style={styles.vehicleDistance}>{log.distance}</Text>
        <Icon name="ChevronRight" size={23} color={MUTED} />
      </View>

      <View style={styles.vehicleLogFooter}>
        <View style={styles.vehicleFooterItem}>
          <Icon name="Fuel" size={17} color={GREEN} />
          <Text style={styles.vehicleFooterText}>{log.fuel}</Text>
        </View>
        <View style={styles.vehicleFooterItem}>
          <Icon name="IndianRupee" size={17} color={GREEN} />
          <Text style={styles.vehicleFooterText}>{log.cost}</Text>
        </View>
        <View style={styles.vehicleFooterItem}>
          <Icon name="ClipboardList" size={17} color={GREEN} />
          <Text style={styles.vehicleFooterText}>{fieldVisitLabel}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const VEHICLE_LOGS = [
  {
    day: '21',
    from: 'Bhilai, Durg',
    to: 'Jamgaon, Durg',
    time: '09:15 AM - 01:30 PM',
    distance: '128 km',
    fuel: '12.5 L',
    cost: '₹ 625',
  },
  {
    day: '20',
    from: 'Jamgaon, Durg',
    to: 'Bori, Durg',
    time: '10:00 AM - 12:45 PM',
    distance: '95 km',
    fuel: '9.0 L',
    cost: '₹ 450',
  },
  {
    day: '19',
    from: 'Bori, Durg',
    to: 'Bhilai, Durg',
    time: '04:30 PM - 07:15 PM',
    distance: '110 km',
    fuel: '10.5 L',
    cost: '₹ 525',
  },
  {
    day: '18',
    from: 'Bhilai, Durg',
    to: 'Koni, Durg',
    time: '09:20 AM - 01:10 PM',
    distance: '130 km',
    fuel: '13.0 L',
    cost: '₹ 650',
  },
  {
    day: '17',
    from: 'Koni, Durg',
    to: 'Bhilai, Durg',
    time: '02:00 PM - 04:45 PM',
    distance: '105 km',
    fuel: '10.0 L',
    cost: '₹ 500',
  },
];

const VEHICLES = [
  {
    number: 'MH 07 AB 1234',
    model: 'Tata Sumo Gold',
    totalKm: '56,230',
    monthKm: '1,250 km',
    monthFuel: '125 L',
    mileage: '10.0 km/L',
  },
  {
    number: 'CG 07 CD 7788',
    model: 'Mahindra Bolero',
    totalKm: '42,810',
    monthKm: '980 km',
    monthFuel: '96 L',
    mileage: '10.2 km/L',
  },
  {
    number: 'CG 04 EF 9012',
    model: 'Tata Yodha',
    totalKm: '31,455',
    monthKm: '742 km',
    monthFuel: '72 L',
    mileage: '10.3 km/L',
  },
];

function ReimbursementScreen({
  bottomInset,
  topInset,
  onBack,
}: {
  bottomInset: number;
  topInset: number;
  onBack: () => void;
}) {
  const {t} = useLanguage();
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const tabs = [
    {key: 'all' as const, label: t('all')},
    {key: 'pending' as const, label: t('pending')},
    {key: 'approved' as const, label: t('approvedClaims')},
    {key: 'rejected' as const, label: t('rejected')},
  ];
  const visibleClaims = REIMBURSEMENT_CLAIMS.filter(claim => {
    if (activeTab === 'all') {
      return true;
    }
    return claim.status.toLowerCase() === activeTab;
  });

  return (
    <View style={styles.reimburseRoot}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.reimburseContent,
          {paddingBottom: bottomInset + 112, paddingTop: topInset + 30},
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.reimburseHeader}>
          <TouchableOpacity activeOpacity={0.72} onPress={onBack} style={styles.reimburseBack}>
            <Icon name="ArrowLeft" size={24} color={INK} />
          </TouchableOpacity>
          <Text style={styles.reimburseTitle}>{t('uploadBill')}</Text>
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => setClaimModalOpen(true)}
            style={styles.newClaimButton}>
            <Icon name="Plus" size={18} color={PURPLE} />
            <Text style={styles.newClaimText}>{t('newClaim')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.claimSummaryCard}>
          <View style={styles.claimSummaryIconWrap}>
            <View style={styles.claimSummaryIcon}>
              <Icon name="Clipboard" size={25} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.claimSummaryMain}>
            <Text style={styles.claimSummaryTitle}>May 2025 Summary</Text>
            <View style={styles.claimSummaryStats}>
              <ClaimStat value="₹ 8,450" label={t('totalClaims')} />
              <View style={styles.claimSummaryDivider} />
              <ClaimStat value="₹ 6,200" label={t('approvedClaims')} />
              <View style={styles.claimSummaryDivider} />
              <ClaimStat value="₹ 2,250" label={t('pendingClaims')} />
            </View>
          </View>
        </View>

        <View style={styles.claimTabs}>
          {tabs.map(tab => {
            const selected = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.75}
                onPress={() => setActiveTab(tab.key)}
                style={styles.claimTabButton}>
                <Text style={[styles.claimTabText, selected && styles.claimTabTextActive]}>
                  {tab.label}
                </Text>
                {selected ? <View style={styles.claimTabIndicator} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {visibleClaims.map(claim => (
          <ClaimCard key={claim.id} claim={claim} />
        ))}
      </ScrollView>
      <NewClaimModal
        visible={claimModalOpen}
        onClose={() => setClaimModalOpen(false)}
        onSave={() => {
          setClaimModalOpen(false);
          Alert.alert(t('newClaim'), t('claimSaved'));
        }}
      />
    </View>
  );
}

function NewClaimModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const {t} = useLanguage();
  const [claimTypeOpen, setClaimTypeOpen] = useState(false);
  const [claimType, setClaimType] = useState(t('fuel'));
  const claimTypes = [t('food'), t('fuel'), t('travel'), t('other')];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.entryModalOverlay}>
        <TouchableOpacity activeOpacity={1} style={styles.entryBackdrop} onPress={onClose} />
        <View style={styles.entrySheet}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryTitle}>{t('newClaim')}</Text>
            <TouchableOpacity activeOpacity={0.76} onPress={onClose} style={styles.entryClose}>
              <Icon name="X" size={21} color={INK} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.entryForm}>
            <View style={styles.entryFieldWrap}>
              <Text style={styles.entryFieldLabel}>{t('claimType')}</Text>
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={() => setClaimTypeOpen(open => !open)}
                style={styles.dropdownInputWrap}>
                <View style={styles.dropdownInputLeft}>
                  <Icon name="ClipboardList" size={17} color={GREEN} />
                  <Text style={styles.dropdownInputText}>{claimType}</Text>
                </View>
                <Icon name={claimTypeOpen ? 'ChevronUp' : 'ChevronDown'} size={19} color={MUTED} />
              </TouchableOpacity>
              {claimTypeOpen ? (
                <View style={styles.claimTypeList}>
                  {claimTypes.map(type => (
                    <TouchableOpacity
                      key={type}
                      activeOpacity={0.78}
                      onPress={() => {
                        setClaimType(type);
                        setClaimTypeOpen(false);
                      }}
                      style={styles.claimTypeItem}>
                      <Text style={styles.claimTypeItemText}>{type}</Text>
                      {claimType === type ? <Icon name="Check" size={17} color={GREEN} /> : null}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>
            <View style={styles.entryTwoColumn}>
              <EntryField label={t('amount')} value="" icon="IndianRupee" compact />
              <EntryField label="Date" value="25 May 2026" icon="CalendarDays" compact />
            </View>
            <EntryField label={t('purpose')} value="" icon="FileText" multiline />
            <UploadBox label={t('documents')} icon="FileUp" />
          </ScrollView>

          <View style={styles.entryActions}>
            <TouchableOpacity activeOpacity={0.76} onPress={onClose} style={styles.entryCancelButton}>
              <Text style={styles.entryCancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.82} onPress={onSave} style={styles.entrySaveButton}>
              <Text style={styles.entrySaveText}>{t('saveEntry')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ClaimStat({value, label}: {value: string; label: string}) {
  return (
    <View style={styles.claimStat}>
      <Text style={styles.claimStatValue}>{value}</Text>
      <Text style={styles.claimStatLabel}>{label}</Text>
    </View>
  );
}

function ClaimCard({
  claim,
}: {
  claim: {
    id: string;
    type: string;
    date: string;
    purpose: string;
    submitted: string;
    documents: string;
    amount: string;
    status: 'Pending' | 'Approved' | 'Rejected';
  };
}) {
  const {t} = useLanguage();
  const statusStyle =
    claim.status === 'Approved'
      ? styles.claimStatusApproved
      : claim.status === 'Rejected'
        ? styles.claimStatusRejected
        : styles.claimStatusPending;
  const statusTextStyle =
    claim.status === 'Approved'
      ? styles.claimStatusApprovedText
      : claim.status === 'Rejected'
        ? styles.claimStatusRejectedText
        : styles.claimStatusPendingText;

  return (
    <TouchableOpacity activeOpacity={0.82} style={styles.claimCard}>
      <View style={styles.claimCardTop}>
        <Text style={styles.claimIdText}>{t('claimId')}: {claim.id}</Text>
        <View style={[styles.claimStatusBadge, statusStyle]}>
          <Text style={[styles.claimStatusText, statusTextStyle]}>
            {translateClaimStatus(claim.status, t)}
          </Text>
        </View>
      </View>

      <View style={styles.claimTitleRow}>
        <Text style={styles.claimType}>{translateClaimType(claim.type, t)}</Text>
        <Text style={styles.claimAmount}>{claim.amount}</Text>
      </View>

      <View style={styles.claimDateRow}>
        <Icon name="CalendarDays" size={15} color={MUTED} />
        <Text style={styles.claimDateText}>{claim.date}</Text>
      </View>

      <Text style={styles.claimSmallLabel}>{t('purpose')}</Text>
      <Text style={styles.claimPurpose}>{claim.purpose}</Text>

      <View style={styles.claimMetaRow}>
        <View>
          <Text style={styles.claimSmallLabel}>{t('submittedOn')}</Text>
          <Text style={styles.claimMetaValue}>{claim.submitted}</Text>
        </View>
        <View style={styles.claimDocBlock}>
          <Text style={styles.claimSmallLabel}>{t('documents')}</Text>
          <View style={styles.claimDocRow}>
            <Icon name="FileText" size={15} color="#3B9C7A" />
            <Text style={styles.claimMetaValue}>{claim.documents}</Text>
          </View>
        </View>
      </View>

      <View style={styles.claimFooter}>
        <Text style={styles.claimViewDetails}>{t('viewDetails')}</Text>
        <Icon name="ChevronRight" size={20} color={PURPLE} />
      </View>
    </TouchableOpacity>
  );
}

function translateClaimType(type: string, t: ReturnType<typeof useLanguage>['t']) {
  if (type === 'Fuel Reimbursement') {
    return t('fuelReimbursement');
  }
  if (type === 'Travel Allowance') {
    return t('travelAllowance');
  }
  if (type === 'Other Expenses') {
    return t('otherExpenses');
  }
  return type;
}

function translateClaimStatus(status: string, t: ReturnType<typeof useLanguage>['t']) {
  if (status === 'Approved') {
    return t('approvedClaims');
  }
  if (status === 'Rejected') {
    return t('rejected');
  }
  return t('pending');
}

const REIMBURSEMENT_CLAIMS = [
  {
    id: 'CLM-2025-0052',
    type: 'Fuel Reimbursement',
    date: '21 May 2025',
    purpose: 'Field visit to Jamgaon and Bori villages',
    submitted: '21 May 2025',
    documents: '2',
    amount: '₹ 1,250',
    status: 'Pending' as const,
  },
  {
    id: 'CLM-2025-0051',
    type: 'Travel Allowance',
    date: '19 May 2025',
    purpose: 'Visit to farmers for crop inspection',
    submitted: '19 May 2025',
    documents: '1',
    amount: '₹ 850',
    status: 'Approved' as const,
  },
  {
    id: 'CLM-2025-0050',
    type: 'Fuel Reimbursement',
    date: '18 May 2025',
    purpose: 'Field visit to Koni and Bhilai',
    submitted: '18 May 2025',
    documents: '2',
    amount: '₹ 1,400',
    status: 'Approved' as const,
  },
  {
    id: 'CLM-2025-0049',
    type: 'Other Expenses',
    date: '17 May 2025',
    purpose: 'Refreshments during field meeting',
    submitted: '17 May 2025',
    documents: '1',
    amount: '₹ 450',
    status: 'Rejected' as const,
  },
  {
    id: 'CLM-2025-0048',
    type: 'Travel Allowance',
    date: '16 May 2025',
    purpose: 'Travel between assigned farms',
    submitted: '16 May 2025',
    documents: '1',
    amount: '₹ 1,100',
    status: 'Pending' as const,
  },
];

function RaiseRequestScreen({
  bottomInset,
  initialRequestType,
  topInset,
  onBack,
}: {
  bottomInset: number;
  initialRequestType?: string;
  topInset: number;
  onBack: () => void;
}) {
  const {t} = useLanguage();
  const [requestTypeOpen, setRequestTypeOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(initialRequestType ?? t('repair'));
  const [landOpen, setLandOpen] = useState(false);
  const [selectedLand, setSelectedLand] = useState('FM-10024 - Bori, Durg');
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState(t('normal'));
  const [showMyRequests, setShowMyRequests] = useState(false);
  const requestTypes = [
    t('repair'),
    t('equipmentMaterial'),
    t('mishappening'),
    t('insectAttack'),
    t('fungusBacteriaInfection'),
    t('landDispute'),
    t('other'),
  ];
  const lands = [
    'FM-10024 - Bori, Durg',
    'FM-10028 - Jamgaon, Durg',
    'FM-10035 - Bhilai, Durg',
    'FM-10040 - Koni, Durg',
  ];
  const priorities = [t('low'), t('normal'), t('high'), t('urgent')];

  return (
    <View style={styles.requestRoot}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.requestContent,
          {paddingTop: topInset + 54, paddingBottom: bottomInset + 112},
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.requestHeader}>
          <TouchableOpacity activeOpacity={0.72} onPress={onBack} style={styles.requestBack}>
            <Icon name="ArrowLeft" size={24} color={INK} />
          </TouchableOpacity>
          <Text style={styles.requestTitle}>{t('raiseRequest')}</Text>
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => setShowMyRequests(current => !current)}
            style={styles.myRequestsButton}>
            <Icon name="ClipboardList" size={21} color={GREEN} />
            <Text style={styles.myRequestsText}>
              {showMyRequests ? t('newRequest') : t('myRequests')}
            </Text>
          </TouchableOpacity>
        </View>

        {showMyRequests ? (
          <View style={styles.previousRequestsList}>
            {PREVIOUS_REQUESTS.map(request => (
              <PreviousRequestCard key={request.id} request={request} />
            ))}
          </View>
        ) : (
          <>

        <Text style={styles.requestDetailsTitle}>{t('requestDetails')}</Text>

        <FormLabel text={`${t('requestType')} *`} />
        <TouchableOpacity
          activeOpacity={0.78}
          onPress={() => setRequestTypeOpen(open => !open)}
          style={styles.requestSelect}>
          <Text style={styles.requestSelectText}>{selectedType}</Text>
          <Icon name={requestTypeOpen ? 'ChevronUp' : 'ChevronDown'} size={21} color={MUTED} />
        </TouchableOpacity>
        {requestTypeOpen ? (
          <View style={styles.requestDropdownList}>
            {requestTypes.map(type => (
              <TouchableOpacity
                key={type}
                activeOpacity={0.78}
                onPress={() => {
                  setSelectedType(type);
                  setRequestTypeOpen(false);
                }}
                style={styles.requestDropdownItem}>
                <Text style={styles.requestDropdownText}>{type}</Text>
                {selectedType === type ? <Icon name="Check" size={17} color={GREEN} /> : null}
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <FormLabel text={t('selectLand')} />
        <TouchableOpacity
          activeOpacity={0.78}
          onPress={() => setLandOpen(open => !open)}
          style={styles.requestSelect}>
          <Text style={styles.requestSelectText}>{selectedLand}</Text>
          <Icon name={landOpen ? 'ChevronUp' : 'ChevronDown'} size={21} color={MUTED} />
        </TouchableOpacity>
        {landOpen ? (
          <View style={styles.requestDropdownList}>
            {lands.map(land => (
              <TouchableOpacity
                key={land}
                activeOpacity={0.78}
                onPress={() => {
                  setSelectedLand(land);
                  setLandOpen(false);
                }}
                style={styles.requestDropdownItem}>
                <Text style={styles.requestDropdownText}>{land}</Text>
                {selectedLand === land ? <Icon name="Check" size={17} color={GREEN} /> : null}
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <FormLabel text={`${t('subject')} *`} />
        <TextInput
          placeholder="Enter short subject"
          placeholderTextColor="#7A879E"
          style={styles.requestInput}
        />

        <FormLabel text={`${t('description')} *`} />
        <TextInput
          multiline
          placeholder="Provide detailed description of your request"
          placeholderTextColor="#7A879E"
          style={styles.requestTextArea}
        />

        <FormLabel text={t('priority')} />
        <TouchableOpacity
          activeOpacity={0.78}
          onPress={() => setPriorityOpen(open => !open)}
          style={styles.requestSelect}>
          <View style={styles.priorityValue}>
            <View style={styles.priorityDot} />
            <Text style={styles.requestSelectText}>{selectedPriority}</Text>
          </View>
          <Icon name={priorityOpen ? 'ChevronUp' : 'ChevronDown'} size={21} color={MUTED} />
        </TouchableOpacity>
        {priorityOpen ? (
          <View style={styles.requestDropdownList}>
            {priorities.map(priority => (
              <TouchableOpacity
                key={priority}
                activeOpacity={0.78}
                onPress={() => {
                  setSelectedPriority(priority);
                  setPriorityOpen(false);
                }}
                style={styles.requestDropdownItem}>
                <Text style={styles.requestDropdownText}>{priority}</Text>
                {selectedPriority === priority ? <Icon name="Check" size={17} color={GREEN} /> : null}
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <FormLabel text={t('attachmentOptional')} />
        <View style={styles.requestUploadGrid}>
          <RequestUploadTile label={t('uploadImageOne')} icon="Image" />
          <RequestUploadTile label={t('uploadImageTwo')} icon="Image" />
          <RequestUploadTile label={t('uploadVideo')} icon="Video" />
        </View>

        <TouchableOpacity
          activeOpacity={0.82}
          onPress={() => Alert.alert(t('raiseRequest'), t('requestSubmitted'))}
          style={styles.submitRequestButton}>
          <Text style={styles.submitRequestText}>{t('submitRequest')}</Text>
        </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function FormLabel({text}: {text: string}) {
  return <Text style={styles.formLabel}>{text}</Text>;
}

function PreviousRequestCard({
  request,
}: {
  request: {
    id: string;
    type: string;
    land: string;
    date: string;
    status: 'Completed' | 'In Progress' | 'Pending';
  };
}) {
  const {t} = useLanguage();
  const statusLabel =
    request.status === 'Completed'
      ? t('completed')
      : request.status === 'In Progress'
        ? t('inProgress')
        : t('pending');
  const statusStyle =
    request.status === 'Completed'
      ? styles.previousStatusCompleted
      : request.status === 'In Progress'
        ? styles.previousStatusProgress
        : styles.previousStatusPending;
  const statusTextStyle =
    request.status === 'Completed'
      ? styles.previousStatusCompletedText
      : request.status === 'In Progress'
        ? styles.previousStatusProgressText
        : styles.previousStatusPendingText;

  return (
    <View style={styles.previousRequestCard}>
      <View style={styles.previousRequestTop}>
        <Text style={styles.previousRequestId}>{request.id}</Text>
        <View style={[styles.previousStatusBadge, statusStyle]}>
          <Text style={[styles.previousStatusText, statusTextStyle]}>{statusLabel}</Text>
        </View>
      </View>
      <Text style={styles.previousRequestType}>{request.type}</Text>
      <View style={styles.previousRequestMeta}>
        <Icon name="MapPinned" size={16} color={MUTED} />
        <Text style={styles.previousRequestMetaText}>{request.land}</Text>
      </View>
      <View style={styles.previousRequestMeta}>
        <Icon name="CalendarDays" size={16} color={MUTED} />
        <Text style={styles.previousRequestMetaText}>{request.date}</Text>
      </View>
    </View>
  );
}

function RequestUploadTile({label, icon}: {label: string; icon: string}) {
  const {t} = useLanguage();

  return (
    <TouchableOpacity activeOpacity={0.78} style={styles.requestUploadTile}>
      <Icon name={icon} size={24} color={GREEN} />
      <Text style={styles.requestUploadText}>{label}</Text>
      <Text style={styles.requestUploadHint}>{t('tapToUpload')}</Text>
    </TouchableOpacity>
  );
}

const PREVIOUS_REQUESTS = [
  {
    id: 'REQ-2026-014',
    type: 'Insect Attack',
    land: 'FM-10024 - Bori, Durg',
    date: '24 May 2026',
    status: 'In Progress' as const,
  },
  {
    id: 'REQ-2026-013',
    type: 'Repair',
    land: 'FM-10040 - Koni, Durg',
    date: '22 May 2026',
    status: 'Completed' as const,
  },
  {
    id: 'REQ-2026-012',
    type: 'Land Dispute',
    land: 'FM-10035 - Bhilai, Durg',
    date: '19 May 2026',
    status: 'Pending' as const,
  },
];

function ApplyLeaveScreen({
  bottomInset,
  topInset,
  onBack,
}: {
  bottomInset: number;
  topInset: number;
  onBack: () => void;
}) {
  const {t} = useLanguage();
  const [halfDay, setHalfDay] = useState(false);
  const [myLeavesOpen, setMyLeavesOpen] = useState(false);
  const [leaveTypeOpen, setLeaveTypeOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [calendarTarget, setCalendarTarget] = useState<'from' | 'to' | null>(null);

  const LEAVE_TYPES = ['Health Issue', 'Family Related', 'Travel', 'Other'];

  function formatDate(date: Date) {
    return date.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'});
  }

  return (
    <View style={styles.leaveRoot}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.leaveContent,
          {paddingTop: topInset + 18, paddingBottom: bottomInset + 80},
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.leaveHeader}>
          <TouchableOpacity activeOpacity={0.72} onPress={onBack} style={styles.leaveBack}>
            <Icon name="ArrowLeft" size={24} color={INK} />
          </TouchableOpacity>
          <Text style={styles.leaveTitle}>{t('applyLeave')}</Text>
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => setMyLeavesOpen(true)}
            style={styles.myLeavesButton}>
            <Icon name="CalendarDays" size={21} color={GREEN} />
            <Text style={styles.myLeavesText}>{t('myLeaves')}</Text>
          </TouchableOpacity>

          <MyLeavesModal visible={myLeavesOpen} onClose={() => setMyLeavesOpen(false)} />
        </View>

        <View style={styles.leaveBalanceCard}>
          <Text style={styles.leaveBalanceTitle}>{t('leaveBalance')}</Text>
          <View style={styles.leaveBalanceStats}>
            <LeaveBalanceItem value="12" title={t('casualLeave')} subtitle={t('daysAvailable')} />
            <View style={styles.leaveBalanceDivider} />
            <LeaveBalanceItem value="8" title={t('sickLeave')} subtitle={t('daysAvailable')} />
            <View style={styles.leaveBalanceDivider} />
            <LeaveBalanceItem value="10" title={t('earnedLeave')} subtitle={t('daysAvailable')} />
          </View>
        </View>

        <Text style={styles.leaveSectionTitle}>{t('leaveDetails')}</Text>

        <FormLabel text={`${t('leaveType')} *`} />
        <TouchableOpacity
          activeOpacity={0.78}
          onPress={() => setLeaveTypeOpen(o => !o)}
          style={styles.leaveSelect}>
          <Text style={[styles.leavePlaceholder, leaveType != null && styles.leaveSelectValue]}>
            {leaveType ?? t('selectLeaveType')}
          </Text>
          <Icon name={leaveTypeOpen ? 'ChevronUp' : 'ChevronDown'} size={21} color={INK} />
        </TouchableOpacity>
        {leaveTypeOpen && (
          <View style={styles.leaveDropdown}>
            {LEAVE_TYPES.map((option, index) => (
              <TouchableOpacity
                key={option}
                activeOpacity={0.75}
                onPress={() => {
                  setLeaveType(option);
                  setLeaveTypeOpen(false);
                }}
                style={[
                  styles.leaveDropdownItem,
                  index < LEAVE_TYPES.length - 1 && styles.leaveDropdownDivider,
                  leaveType === option && styles.leaveDropdownItemActive,
                ]}>
                <Text
                  style={[
                    styles.leaveDropdownText,
                    leaveType === option && styles.leaveDropdownTextActive,
                  ]}>
                  {option}
                </Text>
                {leaveType === option && <Icon name="Check" size={16} color={GREEN} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <FormLabel text={`${t('fromDate')} *`} />
        <TouchableOpacity
          activeOpacity={0.78}
          onPress={() => setCalendarTarget('from')}
          style={styles.leaveSelect}>
          <Text style={[styles.leavePlaceholder, fromDate != null && styles.leaveSelectValue]}>
            {fromDate ? formatDate(fromDate) : t('selectFromDate')}
          </Text>
          <Icon name="CalendarDays" size={20} color={MUTED} />
        </TouchableOpacity>

        <FormLabel text={`${t('toDate')} *`} />
        <TouchableOpacity
          activeOpacity={0.78}
          onPress={() => setCalendarTarget('to')}
          style={styles.leaveSelect}>
          <Text style={[styles.leavePlaceholder, toDate != null && styles.leaveSelectValue]}>
            {toDate ? formatDate(toDate) : t('selectToDate')}
          </Text>
          <Icon name="CalendarDays" size={20} color={MUTED} />
        </TouchableOpacity>

        <CalendarPicker
          visible={calendarTarget != null}
          selected={calendarTarget === 'from' ? fromDate : toDate}
          minDate={calendarTarget === 'to' ? fromDate ?? undefined : undefined}
          onSelect={date => {
            if (calendarTarget === 'from') {
              setFromDate(date);
              if (toDate && date > toDate) {setToDate(null);}
            } else {
              setToDate(date);
            }
            setCalendarTarget(null);
          }}
          onClose={() => setCalendarTarget(null)}
        />

        <TouchableOpacity
          activeOpacity={0.78}
          onPress={() => setHalfDay(current => !current)}
          style={styles.halfDayRow}>
          <View style={[styles.halfDayBox, halfDay && styles.halfDayBoxActive]}>
            {halfDay ? <Icon name="Check" size={14} color="#FFFFFF" /> : null}
          </View>
          <Text style={styles.halfDayText}>{t('halfDay')}</Text>
        </TouchableOpacity>

        <FormLabel text={`${t('reason')} *`} />
        <TextInput
          multiline
          placeholder={t('leaveReasonPlaceholder')}
          placeholderTextColor="#7A879E"
          style={styles.leaveReasonArea}
        />

        <FormLabel text={t('attachmentOptional')} />
        <TouchableOpacity activeOpacity={0.78} style={styles.leaveUploadBox}>
          <Icon name="Paperclip" size={25} color={GREEN} />
          <Text style={styles.leaveUploadText}>{t('uploadFile')}</Text>
          <Text style={styles.leaveUploadHint}>{t('fileHint')}</Text>
        </TouchableOpacity>

        <View style={styles.leaveNoteCard}>
          <Icon name="Info" size={25} color={GREEN} />
          <View style={styles.leaveNoteCopy}>
            <Text style={styles.leaveNoteTitle}>{t('note')}</Text>
            <Text style={styles.leaveNoteText}>{t('leaveNote')}</Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.82}
          onPress={() => Alert.alert(t('applyLeave'), t('leaveSubmitted'))}
          style={styles.submitLeaveButton}>
          <Text style={styles.submitLeaveText}>{t('submitLeaveRequest')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function LeaveBalanceItem({
  value,
  title,
  subtitle,
}: {
  value: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.leaveBalanceItem}>
      <Text style={styles.leaveBalanceValue}>{value}</Text>
      <Text style={styles.leaveBalanceLabel}>{title}</Text>
      <Text style={styles.leaveBalanceSub}>{subtitle}</Text>
    </View>
  );
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function CalendarPicker({
  visible,
  selected,
  minDate,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: Date | null;
  minDate?: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(
    selected?.getFullYear() ?? today.getFullYear(),
  );
  const [viewMonth, setViewMonth] = useState(
    selected?.getMonth() ?? today.getMonth(),
  );

  function prevMonth() {
    if (viewMonth === 0) {setViewYear(y => y - 1); setViewMonth(11);}
    else {setViewMonth(m => m - 1);}
  }
  function nextMonth() {
    if (viewMonth === 11) {setViewYear(y => y + 1); setViewMonth(0);}
    else {setViewMonth(m => m + 1);}
  }

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({length: daysInMonth}, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) {cells.push(null);}

  function isDisabled(day: number) {
    if (!minDate) {return false;}
    const d = new Date(viewYear, viewMonth, day);
    d.setHours(0, 0, 0, 0);
    const min = new Date(minDate);
    min.setHours(0, 0, 0, 0);
    return d < min;
  }
  function isSelected(day: number) {
    if (!selected) {return false;}
    return (
      selected.getFullYear() === viewYear &&
      selected.getMonth() === viewMonth &&
      selected.getDate() === day
    );
  }
  function isToday(day: number) {
    return (
      today.getFullYear() === viewYear &&
      today.getMonth() === viewMonth &&
      today.getDate() === day
    );
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={calStyles.overlay}>
        <TouchableOpacity activeOpacity={1} style={calStyles.sheet}>
          <View style={calStyles.navRow}>
            <TouchableOpacity onPress={prevMonth} style={calStyles.navBtn}>
              <Icon name="ChevronLeft" size={20} color={INK} />
            </TouchableOpacity>
            <Text style={calStyles.navTitle}>
              {MONTHS[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={calStyles.navBtn}>
              <Icon name="ChevronRight" size={20} color={INK} />
            </TouchableOpacity>
          </View>

          <View style={calStyles.dayNames}>
            {DAYS.map(d => (
              <Text key={d} style={calStyles.dayName}>{d}</Text>
            ))}
          </View>

          <View style={calStyles.grid}>
            {cells.map((day, i) => {
              if (day == null) {
                return <View key={`e${i}`} style={calStyles.cell} />;
              }
              const disabled = isDisabled(day);
              const sel = isSelected(day);
              const tod = isToday(day);
              return (
                <TouchableOpacity
                  key={day}
                  activeOpacity={0.75}
                  disabled={disabled}
                  onPress={() => onSelect(new Date(viewYear, viewMonth, day))}
                  style={[calStyles.cell, sel && calStyles.cellSelected]}>
                  <Text
                    style={[
                      calStyles.cellText,
                      tod && !sel && calStyles.cellToday,
                      sel && calStyles.cellTextSelected,
                      disabled && calStyles.cellDisabled,
                    ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity onPress={onClose} style={calStyles.cancelBtn}>
            <Text style={calStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const MY_LEAVES_DATA = [
  {
    id: '1',
    type: 'Sick Leave',
    from: '10 Apr 2025',
    to: '11 Apr 2025',
    days: 2,
    reason: 'Health Issue',
    status: 'Approved' as const,
  },
  {
    id: '2',
    type: 'Casual Leave',
    from: '22 Mar 2025',
    to: '22 Mar 2025',
    days: 1,
    reason: 'Family Related',
    status: 'Approved' as const,
  },
  {
    id: '3',
    type: 'Earned Leave',
    from: '05 Feb 2025',
    to: '07 Feb 2025',
    days: 3,
    reason: 'Travel',
    status: 'Rejected' as const,
  },
  {
    id: '4',
    type: 'Casual Leave',
    from: '28 May 2025',
    to: '29 May 2025',
    days: 2,
    reason: 'Other',
    status: 'Pending' as const,
  },
  {
    id: '5',
    type: 'Sick Leave',
    from: '15 Jan 2025',
    to: '15 Jan 2025',
    days: 1,
    reason: 'Health Issue',
    status: 'Approved' as const,
  },
];

const STATUS_CONFIG = {
  Approved: {bg: '#ECFDF5', text: '#047857', dot: '#10B981'},
  Rejected: {bg: '#FEF2F2', text: '#B91C1C', dot: '#EF4444'},
  Pending:  {bg: '#FFFBEB', text: '#92400E', dot: '#F59E0B'},
};

const BALANCE_ITEMS = [
  {label: 'Casual Leave',  total: 15, used: 3,  icon: 'Coffee'      as const},
  {label: 'Sick Leave',    total: 12, used: 4,  icon: 'HeartPulse'  as const},
  {label: 'Earned Leave',  total: 15, used: 5,  icon: 'Award'       as const},
];

function MyLeavesModal({visible, onClose}: {visible: boolean; onClose: () => void}) {
  const [tab, setTab] = useState<'balance' | 'history'>('balance');

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={mlStyles.overlay}>
        <View style={mlStyles.sheet}>
          {/* Header */}
          <View style={mlStyles.header}>
            <View style={mlStyles.headerLeft}>
              <Icon name="CalendarDays" size={20} color={GREEN} />
              <Text style={mlStyles.title}>My Leaves</Text>
            </View>
            <TouchableOpacity activeOpacity={0.75} onPress={onClose} style={mlStyles.closeBtn}>
              <Icon name="X" size={20} color={MUTED} />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={mlStyles.tabs}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setTab('balance')}
              style={[mlStyles.tab, tab === 'balance' && mlStyles.tabActive]}>
              <Text style={[mlStyles.tabText, tab === 'balance' && mlStyles.tabTextActive]}>
                Balance
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setTab('history')}
              style={[mlStyles.tab, tab === 'history' && mlStyles.tabActive]}>
              <Text style={[mlStyles.tabText, tab === 'history' && mlStyles.tabTextActive]}>
                History
              </Text>
            </TouchableOpacity>
          </View>

          {tab === 'balance' ? (
            <ScrollView showsVerticalScrollIndicator={false} style={mlStyles.body}>
              <Text style={mlStyles.sectionLabel}>Leave Year: Jan 2025 – Dec 2025</Text>
              {BALANCE_ITEMS.map(item => {
                const remaining = item.total - item.used;
                const pct = (item.used / item.total) * 100;
                return (
                  <View key={item.label} style={mlStyles.balanceCard}>
                    <View style={mlStyles.balanceTop}>
                      <View style={mlStyles.balanceIconWrap}>
                        <Icon name={item.icon} size={18} color={GREEN} />
                      </View>
                      <View style={mlStyles.balanceMeta}>
                        <Text style={mlStyles.balanceLabel}>{item.label}</Text>
                        <Text style={mlStyles.balanceSubtitle}>
                          {item.used} used · {remaining} remaining
                        </Text>
                      </View>
                      <View style={mlStyles.balanceCountWrap}>
                        <Text style={mlStyles.balanceCount}>{remaining}</Text>
                        <Text style={mlStyles.balanceCountSub}>/ {item.total}</Text>
                      </View>
                    </View>
                    <View style={mlStyles.progressTrack}>
                      <View style={[mlStyles.progressFill, {width: `${pct}%`}]} />
                    </View>
                  </View>
                );
              })}

              <View style={mlStyles.summaryRow}>
                <View style={mlStyles.summaryCard}>
                  <Text style={mlStyles.summaryValue}>9</Text>
                  <Text style={mlStyles.summaryLabel}>Total Used</Text>
                </View>
                <View style={[mlStyles.summaryCard, mlStyles.summaryCardGreen]}>
                  <Text style={[mlStyles.summaryValue, {color: GREEN}]}>33</Text>
                  <Text style={mlStyles.summaryLabel}>Total Available</Text>
                </View>
              </View>
            </ScrollView>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={mlStyles.body}>
              <Text style={mlStyles.sectionLabel}>{MY_LEAVES_DATA.length} leave requests</Text>
              {MY_LEAVES_DATA.map((item, index) => {
                const cfg = STATUS_CONFIG[item.status];
                return (
                  <View
                    key={item.id}
                    style={[
                      mlStyles.historyCard,
                      index < MY_LEAVES_DATA.length - 1 && mlStyles.historyCardBorder,
                    ]}>
                    <View style={mlStyles.historyTop}>
                      <View style={mlStyles.historyLeft}>
                        <Text style={mlStyles.historyType}>{item.type}</Text>
                        <Text style={mlStyles.historyReason}>{item.reason}</Text>
                      </View>
                      <View style={[mlStyles.statusBadge, {backgroundColor: cfg.bg}]}>
                        <View style={[mlStyles.statusDot, {backgroundColor: cfg.dot}]} />
                        <Text style={[mlStyles.statusText, {color: cfg.text}]}>
                          {item.status}
                        </Text>
                      </View>
                    </View>
                    <View style={mlStyles.historyDates}>
                      <Icon name="Calendar" size={13} color={MUTED} />
                      <Text style={mlStyles.historyDateText}>
                        {item.from === item.to
                          ? item.from
                          : `${item.from} – ${item.to}`}
                      </Text>
                      <View style={mlStyles.daysBadge}>
                        <Text style={mlStyles.daysText}>
                          {item.days} {item.days === 1 ? 'day' : 'days'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const mlStyles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(7,11,26,0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '82%',
    paddingBottom: 24,
    paddingHorizontal: 18,
    paddingTop: 20,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  title: {
    color: INK,
    fontSize: 18,
    fontWeight: '900',
  },
  closeBtn: {
    alignItems: 'center',
    backgroundColor: '#F3F5F8',
    borderRadius: 20,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  tabs: {
    backgroundColor: '#F3F5F8',
    borderRadius: 10,
    flexDirection: 'row',
    marginBottom: 16,
    padding: 3,
  },
  tab: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    paddingVertical: 8,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#182033',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  tabText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '800',
  },
  tabTextActive: {
    color: INK,
    fontWeight: '900',
  },
  body: {
    flexGrow: 0,
  },
  sectionLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 12,
  },
  /* Balance tab */
  balanceCard: {
    backgroundColor: '#FAFBFC',
    borderColor: '#E6ECF2',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  balanceTop: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  balanceIconWrap: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    marginRight: 12,
    width: 36,
  },
  balanceMeta: {
    flex: 1,
    minWidth: 0,
  },
  balanceLabel: {
    color: INK,
    fontSize: 14,
    fontWeight: '900',
  },
  balanceSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  balanceCountWrap: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 2,
  },
  balanceCount: {
    color: GREEN,
    fontSize: 22,
    fontWeight: '900',
  },
  balanceCountSub: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    backgroundColor: '#E6ECF2',
    borderRadius: 4,
    height: 5,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: GREEN,
    borderRadius: 4,
    height: 5,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  summaryCard: {
    alignItems: 'center',
    backgroundColor: '#F3F5F8',
    borderRadius: 12,
    flex: 1,
    paddingVertical: 14,
  },
  summaryCardGreen: {
    backgroundColor: '#ECFDF5',
  },
  summaryValue: {
    color: INK,
    fontSize: 24,
    fontWeight: '900',
  },
  summaryLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  /* History tab */
  historyCard: {
    paddingVertical: 14,
  },
  historyCardBorder: {
    borderBottomColor: '#EEF2F6',
    borderBottomWidth: 1,
  },
  historyTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historyLeft: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  historyType: {
    color: INK,
    fontSize: 14,
    fontWeight: '900',
  },
  historyReason: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  statusBadge: {
    alignItems: 'center',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusDot: {
    borderRadius: 4,
    height: 6,
    width: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  historyDates: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  historyDateText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
  },
  daysBadge: {
    backgroundColor: '#F3F5F8',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  daysText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '800',
  },
});

const calStyles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(7,11,26,0.45)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    paddingBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 20,
    width: '100%',
  },
  navRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBtn: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  navTitle: {
    color: INK,
    fontSize: 16,
    fontWeight: '900',
  },
  dayNames: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dayName: {
    color: MUTED,
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    alignItems: 'center',
    aspectRatio: 1,
    justifyContent: 'center',
    width: '14.28%',
  },
  cellSelected: {
    backgroundColor: GREEN,
    borderRadius: 100,
  },
  cellText: {
    color: INK,
    fontSize: 14,
    fontWeight: '700',
  },
  cellToday: {
    color: GREEN,
    fontWeight: '900',
  },
  cellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  cellDisabled: {
    color: '#C8D0DC',
  },
  cancelBtn: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 10,
  },
  cancelText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '800',
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FBFCFD',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 22,
    paddingHorizontal: 0,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
    backgroundColor: '#E9EEF0',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  greeting: {
    color: MUTED,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
  },
  name: {
    color: INK,
    fontSize: 25,
    fontWeight: '800',
    lineHeight: 32,
  },
  roleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 0,
  },
  role: {
    color: MUTED,
    fontSize: 16,
    fontWeight: '600',
  },
  verifiedBadge: {
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  bellButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: CARD_BORDER,
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    marginLeft: 12,
    shadowColor: '#182033',
    shadowOffset: {width: 0, height: 7},
    shadowOpacity: 0.05,
    shadowRadius: 14,
    width: 44,
  },
  notificationBadge: {
    alignItems: 'center',
    backgroundColor: '#FF1E24',
    borderRadius: 9,
    height: 18,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    top: 0,
    width: 18,
  },
  notificationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  attendanceCard: {
    backgroundColor: '#F7FFF8',
    borderColor: '#CFEFDA',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    overflow: 'hidden',
    paddingBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    position: 'relative',
    shadowColor: '#0B3019',
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.07,
    shadowRadius: 20,
  },
  attendanceCloudOne: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 34,
    height: 40,
    position: 'absolute',
    right: 50,
    top: 14,
    width: 88,
  },
  attendanceCloudTwo: {
    backgroundColor: 'rgba(255, 255, 255, 0.56)',
    borderRadius: 36,
    height: 54,
    position: 'absolute',
    right: -12,
    top: 56,
    width: 110,
  },
  attendanceHillBack: {
    backgroundColor: '#DDF5CF',
    borderTopLeftRadius: 130,
    borderTopRightRadius: 170,
    bottom: 54,
    height: 44,
    left: -36,
    opacity: 0.95,
    position: 'absolute',
    right: -24,
    transform: [{rotate: '-3deg'}],
  },
  attendanceHillFront: {
    backgroundColor: '#C7EFB8',
    borderTopLeftRadius: 170,
    borderTopRightRadius: 120,
    bottom: 34,
    height: 48,
    left: -48,
    opacity: 0.82,
    position: 'absolute',
    right: -42,
    transform: [{rotate: '4deg'}],
  },
  attendanceFarmScene: {
    alignItems: 'flex-end',
    bottom: 58,
    flexDirection: 'row',
    height: 38,
    position: 'absolute',
    right: 18,
    width: 96,
  },
  farmTree: {
    backgroundColor: '#79C989',
    borderRadius: 14,
    height: 22,
    marginRight: 5,
    width: 14,
  },
  farmHouse: {
    backgroundColor: '#FAF4E5',
    borderColor: '#9FCB98',
    borderRadius: 3,
    borderWidth: 1,
    height: 20,
    marginRight: 5,
    width: 29,
  },
  farmRoof: {
    backgroundColor: '#A7CFA0',
    height: 8,
    left: -3,
    position: 'absolute',
    right: -3,
    top: -7,
    transform: [{rotate: '12deg'}],
  },
  farmSilo: {
    backgroundColor: '#94CBA6',
    borderRadius: 6,
    height: 32,
    width: 11,
  },
  attendanceHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 13,
    zIndex: 1,
  },
  attendanceLabel: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 18,
  },
  calendarButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: GREEN_BORDER,
    borderRadius: 11,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    shadowColor: '#0B3019',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.12,
    shadowRadius: 12,
    width: 38,
  },
  attendanceMain: {
    flexDirection: 'row',
    marginBottom: 13,
    zIndex: 1,
  },
  statusColumn: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
  },
  statusContent: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  checkHalo: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 27,
    height: 54,
    justifyContent: 'center',
    marginRight: 10,
    width: 54,
  },
  checkRing: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  checkCircle: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: GREEN_BORDER,
    borderWidth: 1,
    borderRadius: 23,
    height: 46,
    justifyContent: 'center',
    shadowColor: GREEN,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.24,
    shadowRadius: 10,
    width: 46,
  },
  checkedOutCircle: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  attendanceLogo: {
    height: 38,
    width: 38,
  },
  statusTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  checkedIn: {
    color: GREEN,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 26,
    marginBottom: 11,
  },
  checkedOut: {
    color: '#DC2626',
  },
  locationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  locationText: {
    color: MUTED,
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  dateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dateText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  divider: {
    backgroundColor: '#DCE8E0',
    marginVertical: 3,
    width: 1,
  },
  timeColumn: {
    justifyContent: 'center',
    paddingLeft: 16,
    width: 118,
  },
  timeLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 15,
    marginBottom: 5,
  },
  timeRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    marginBottom: 6,
  },
  time: {
    color: INK,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 34,
  },
  ampm: {
    color: INK,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 19,
    marginLeft: 5,
  },
  durationLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 15,
    marginBottom: 5,
  },
  durationPill: {
    alignItems: 'center',
    backgroundColor: GREEN_SOFT,
    borderColor: GREEN_BORDER,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    height: 29,
    justifyContent: 'center',
    width: 88,
  },
  durationText: {
    color: GREEN,
    fontSize: 12,
    fontWeight: '900',
  },
  checkoutButton: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 10,
    height: 45,
    justifyContent: 'center',
    shadowColor: GREEN,
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.2,
    shadowRadius: 14,
    zIndex: 1,
  },
  checkoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(7, 11, 26, 0.42)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  calendarModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 16},
    shadowOpacity: 0.18,
    shadowRadius: 24,
    width: '100%',
  },
  calendarModalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  calendarTitle: {
    color: INK,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 25,
  },
  calendarMonth: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 2,
  },
  calendarClose: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: CARD_BORDER,
    borderRadius: 15,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  calendarStats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  calendarStat: {
    backgroundColor: '#F8FAFC',
    borderColor: CARD_BORDER,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 10,
  },
  calendarStatValue: {
    color: GREEN,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  calendarStatLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  absentText: {
    color: '#DC2626',
  },
  offText: {
    color: '#64748B',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDay: {
    color: MUTED,
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  calendarGrid: {
    gap: 7,
  },
  calendarWeek: {
    flexDirection: 'row',
  },
  calendarDaySlot: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  calendarDay: {
    alignItems: 'center',
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  calendarDayText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '800',
  },
  presentDay: {
    backgroundColor: GREEN_SOFT,
    borderColor: GREEN_BORDER,
    borderWidth: 1,
  },
  absentDay: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
  },
  offDay: {
    backgroundColor: '#F1F5F9',
  },
  todayDay: {
    backgroundColor: GREEN,
  },
  presentDayText: {
    color: GREEN,
  },
  absentDayText: {
    color: '#DC2626',
  },
  todayDayText: {
    color: '#FFFFFF',
  },
  calendarLegend: {
    borderTopColor: CARD_BORDER,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 14,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    marginHorizontal: 8,
  },
  legendDot: {
    borderRadius: 4,
    height: 8,
    marginRight: 5,
    width: 8,
  },
  legendText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  sectionTitle: {
    color: INK,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 21,
  },
  viewAll: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  viewAllText: {
    color: GREEN,
    fontSize: 15,
    fontWeight: '800',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderColor: CARD_BORDER,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    overflow: 'hidden',
    paddingHorizontal: 16,
    shadowColor: '#182033',
    shadowOffset: {width: 0, height: 9},
    shadowOpacity: 0.08,
    shadowRadius: 17,
  },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 76,
    paddingVertical: 10,
  },
  summaryBorder: {
    borderBottomColor: CARD_BORDER,
    borderBottomWidth: 1,
  },
  summaryIconWrap: {
    alignItems: 'center',
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    marginRight: 12,
    width: 34,
  },
  summaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  summaryLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  summaryTitle: {
    color: INK,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  summaryDetail: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 1,
  },
  summaryMetaPill: {
    backgroundColor: '#F8FAFC',
    borderColor: CARD_BORDER,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 10,
    maxWidth: 104,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  summaryMetaText: {
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 14,
    textAlign: 'center',
  },
  quickTitle: {
    color: INK,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 21,
    marginBottom: 12,
    paddingHorizontal: 5,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 25,
  },
  quickCard: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 62,
    paddingLeft: 7,
    paddingRight: 7,
    width: '48.8%',
  },
  quickAttendance: {
    backgroundColor: '#F8FEFA',
    borderColor: '#CBEBD5',
  },
  quickBill: {
    backgroundColor: '#FCF8FF',
    borderColor: '#E4D2FF',
  },
  quickTicket: {
    backgroundColor: '#F7FBFF',
    borderColor: '#BFDBFE',
  },
  quickLeave: {
    backgroundColor: '#FFF8F0',
    borderColor: '#FED7AA',
  },
  quickIconGreen: {
    alignItems: 'center',
    backgroundColor: GREEN_SOFT,
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    marginRight: 8,
    width: 38,
  },
  quickIconPurple: {
    alignItems: 'center',
    backgroundColor: PURPLE,
    borderRadius: 10,
    height: 38,
    justifyContent: 'center',
    marginHorizontal: 8,
    width: 38,
  },
  quickIconBlue: {
    alignItems: 'center',
    backgroundColor: BLUE_SOFT,
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    marginRight: 8,
    width: 38,
  },
  quickIconOrange: {
    alignItems: 'center',
    backgroundColor: ORANGE_SOFT,
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    marginRight: 8,
    width: 38,
  },
  quickCopy: {
    flex: 1,
    minWidth: 0,
  },
  quickCardTitle: {
    color: INK,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
    marginBottom: 4,
  },
  issuedHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 4,
  },
  issuedTitle: {
    color: INK,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  issuedSubtitle: {
    color: MUTED,
    fontSize: 12,
    marginTop: 2,
  },
  issueItemButton: {
    alignItems: 'center',
    backgroundColor: GREEN,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  issueItemButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  issuedTable: {
    backgroundColor: '#FFFFFF',
    borderColor: CARD_BORDER,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 24,
    overflow: 'hidden',
  },
  issuedTableHead: {
    alignItems: 'center',
    backgroundColor: '#F5F8FA',
    borderBottomColor: CARD_BORDER,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  issuedHeadCell: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  issuedRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  issuedRowBorder: {
    borderBottomColor: CARD_BORDER,
    borderBottomWidth: 1,
  },
  issuedColImage: {
    width: 40,
    marginRight: 10,
  },
  issuedImageBox: {
    alignItems: 'center',
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  issuedColName: {
    flex: 2.2,
    minWidth: 0,
    paddingRight: 6,
  },
  issuedItemName: {
    color: INK,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  issuedItemCategory: {
    color: MUTED,
    fontSize: 11,
    marginTop: 2,
  },
  issuedColTimeline: {
    flex: 2,
    paddingRight: 8,
  },
  issuedProgressTrack: {
    backgroundColor: '#EEF1F5',
    borderRadius: 4,
    height: 6,
    overflow: 'hidden',
    width: '100%',
  },
  issuedProgressFill: {
    borderRadius: 4,
    height: 6,
  },
  issuedProgressLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  issuedColTask: {
    flex: 2,
    minWidth: 0,
  },
  issuedEmptyBox: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  issuedEmptyText: {
    color: MUTED,
    fontSize: 13,
  },
  issuedTaskName: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
  },
  toast: {
    alignItems: 'center',
    backgroundColor: '#1A7A3C',
    borderRadius: 12,
    bottom: 36,
    flexDirection: 'row',
    gap: 10,
    left: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    position: 'absolute',
    right: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    color: '#FFFFFF',
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  issueOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  issueBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  issueSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '88%',
    paddingBottom: 12,
  },
  issueHandle: {
    alignSelf: 'center',
    backgroundColor: '#DDE3EC',
    borderRadius: 3,
    height: 4,
    marginTop: 10,
    marginBottom: 4,
    width: 40,
  },
  issueSheetHeader: {
    alignItems: 'center',
    borderBottomColor: '#EEF1F5',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  issueSheetIconWrap: {
    alignItems: 'center',
    backgroundColor: '#EFFAF2',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  issueSheetTitle: {
    color: INK,
    fontSize: 16,
    fontWeight: '800',
  },
  issueSheetSubtitle: {
    color: MUTED,
    fontSize: 12,
    marginTop: 2,
  },
  issueSheetClose: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  issueForm: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
  },
  issueFieldLabel: {
    color: INK,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 14,
  },
  issueInputWrap: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#DDE3EC',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  issueInput: {
    color: INK,
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  issueTwoCol: {
    flexDirection: 'row',
  },
  issueDropdown: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE3EC',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
  },
  issueDropdownItem: {
    alignItems: 'center',
    borderBottomColor: '#EEF1F5',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  issueDropdownLabel: {
    color: INK,
    fontSize: 13,
    fontWeight: '600',
  },
  issueDropdownDetail: {
    color: MUTED,
    fontSize: 11,
    marginTop: 2,
  },
  issueActions: {
    borderTopColor: '#EEF1F5',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 8,
  },
  issueCancelBtn: {
    alignItems: 'center',
    borderColor: '#DDE3EC',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 13,
  },
  issueCancelText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '700',
  },
  issueMakeBtn: {
    alignItems: 'center',
    backgroundColor: GREEN,
    borderRadius: 10,
    flex: 2,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 13,
  },
  issueMakeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  selectedItemRow: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: GREEN,
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  selectedItemImage: {
    borderRadius: 8,
    height: 42,
    width: 42,
    backgroundColor: '#EEF1F5',
  },
  selectedItemName: {
    color: INK,
    fontSize: 13,
    fontWeight: '700',
  },
  selectedItemMeta: {
    color: MUTED,
    fontSize: 11,
    marginTop: 2,
  },
  stockBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  issueItemRow: {
    alignItems: 'center',
    borderBottomColor: '#EEF1F5',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  itemThumb: {
    backgroundColor: '#EEF1F5',
    borderRadius: 8,
    height: 44,
    width: 44,
  },
  issueDropdownLoading: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  issueDropdownLoadingText: {
    color: MUTED,
    fontSize: 13,
  },
  unitLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  vehicleRoot: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  vehicleContent: {
    paddingHorizontal: 16,
  },
  vehicleHeader: {
    alignItems: 'flex-start',
    marginBottom: 38,
  },
  vehicleBack: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    top: 2,
    width: 28,
  },
  vehicleTitle: {
    color: INK,
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 25,
    marginLeft: 48,
    marginRight: 0,
    paddingTop: 7,
  },
  vehicleActionGroup: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 18,
    width: '100%',
  },
  vehicleAddButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#9FE2B7',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    flex: 1,
    height: 58,
    justifyContent: 'center',
  },
  vehicleAddText: {
    color: GREEN,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 23,
    marginLeft: 10,
  },
  vehicleFuelButton: {
    alignItems: 'center',
    backgroundColor: '#FFF8F0',
    borderColor: '#FDBA74',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    height: 58,
    justifyContent: 'center',
  },
  vehicleFuelText: {
    color: ORANGE,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 23,
    marginLeft: 10,
  },
  vehicleSummaryCard: {
    backgroundColor: '#F1FBF5',
    borderColor: '#BDEBCB',
    borderRadius: 13,
    borderWidth: 1,
    marginBottom: 37,
    paddingBottom: 18,
    paddingHorizontal: 8,
    paddingTop: 24,
  },
  vehicleSummaryTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  vehicleIconHalo: {
    alignItems: 'center',
    backgroundColor: '#D8F6E1',
    borderRadius: 29,
    height: 58,
    justifyContent: 'center',
    marginRight: 13,
    width: 58,
  },
  vehicleIconCircle: {
    alignItems: 'center',
    backgroundColor: GREEN,
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  vehicleSummaryInfo: {
    flex: 1,
    minWidth: 0,
  },
  vehicleNameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    alignSelf: 'flex-start',
  },
  vehicleNumber: {
    color: INK,
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 25,
  },
  vehicleActiveTiny: {
    color: GREEN,
    fontSize: 10,
    fontWeight: '900',
    marginLeft: 8,
    transform: [{rotate: '-8deg'}],
  },
  vehicleModel: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 1,
  },
  vehicleStatusPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E7F9ED',
    borderRadius: 8,
    height: 27,
    justifyContent: 'center',
    marginTop: 7,
    paddingHorizontal: 12,
  },
  vehicleStatusText: {
    color: GREEN,
    fontSize: 12,
    fontWeight: '900',
  },
  vehicleKmBlock: {
    alignItems: 'flex-end',
    paddingTop: 15,
  },
  vehicleKmValue: {
    color: INK,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
  },
  vehicleKmLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 5,
  },
  vehicleMetricRow: {
    flexDirection: 'row',
    gap: 8,
  },
  vehicleMetricCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    flex: 1,
    minHeight: 130,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  vehicleMetricIcon: {
    alignItems: 'center',
    backgroundColor: '#EAF8EF',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginBottom: 15,
    width: 40,
  },
  vehicleMetricValue: {
    color: INK,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
    textAlign: 'center',
  },
  vehicleMetricLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 7,
    textAlign: 'center',
  },
  vehicleSectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    marginBottom: 23,
  },
  vehicleSectionTitle: {
    color: INK,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
  },
  vehicleFilterButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: CARD_BORDER,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
    shadowColor: '#182033',
    shadowOffset: {width: 0, height: 7},
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  vehicleFilterText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '900',
    marginLeft: 7,
  },
  vehicleLogCard: {
    backgroundColor: '#FFFFFF',
    borderColor: CARD_BORDER,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 20,
    minHeight: 194,
    paddingBottom: 48,
    paddingHorizontal: 17,
    paddingTop: 27,
    shadowColor: '#182033',
    shadowOffset: {width: 0, height: 7},
    shadowOpacity: 0.06,
    shadowRadius: 15,
  },
  vehicleDateBlock: {
    alignItems: 'center',
    marginRight: 26,
    width: 34,
  },
  vehicleDateDay: {
    color: GREEN,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 27,
  },
  vehicleDateMonth: {
    color: GREEN,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
    marginTop: 2,
  },
  vehicleDateYear: {
    color: GREEN,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 17,
  },
  vehicleRouteBlock: {
    flex: 1,
    minWidth: 0,
  },
  vehicleRouteRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 24,
  },
  vehicleGreenDot: {
    backgroundColor: GREEN,
    borderColor: '#DDF7E5',
    borderRadius: 7,
    borderWidth: 3,
    height: 14,
    marginRight: 14,
    width: 14,
  },
  vehicleRedDot: {
    backgroundColor: '#FF364A',
    borderColor: '#FFE0E5',
    borderRadius: 7,
    borderWidth: 3,
    height: 14,
    marginRight: 14,
    width: 14,
  },
  vehicleRouteLine: {
    backgroundColor: '#C9D2DE',
    height: 16,
    marginLeft: 6,
    width: 1,
  },
  vehicleRouteText: {
    color: INK,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 20,
  },
  vehicleTimeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginLeft: 0,
    marginTop: 19,
  },
  vehicleTimeText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    marginLeft: 9,
  },
  vehicleDistanceBlock: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingTop: 15,
  },
  vehicleDistance: {
    color: INK,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
    marginRight: 9,
  },
  vehicleLogFooter: {
    alignItems: 'center',
    borderTopColor: CARD_BORDER,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 17,
    paddingVertical: 13,
    position: 'absolute',
    right: 17,
  },
  vehicleFooterItem: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  vehicleFooterText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
    marginLeft: 7,
  },
  vehicleMonthSummary: {
    alignItems: 'center',
    backgroundColor: '#F0FBF4',
    borderRadius: 13,
    flexDirection: 'row',
    minHeight: 83,
    paddingHorizontal: 17,
  },
  vehicleMonthIcon: {
    alignItems: 'center',
    backgroundColor: '#DDF6E6',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginRight: 17,
    width: 40,
  },
  vehicleMonthCopy: {
    flex: 1,
    minWidth: 0,
  },
  vehicleMonthTitle: {
    color: INK,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  vehicleMonthText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 7,
  },
  entryModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  entryBackdrop: {
    backgroundColor: 'rgba(4, 9, 22, 0.46)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  entrySheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingHorizontal: 17,
    paddingTop: 14,
  },
  vehicleSelectorSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 18,
    paddingHorizontal: 17,
    paddingTop: 14,
  },
  vehicleSelectorList: {
    gap: 10,
    paddingTop: 17,
  },
  vehicleSelectorItem: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: CARD_BORDER,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 74,
    paddingHorizontal: 12,
  },
  vehicleSelectorItemActive: {
    backgroundColor: '#F2FBF5',
    borderColor: '#BDEBCB',
  },
  vehicleSelectorIcon: {
    alignItems: 'center',
    backgroundColor: GREEN_SOFT,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginRight: 12,
    width: 40,
  },
  vehicleSelectorCopy: {
    flex: 1,
    minWidth: 0,
  },
  vehicleSelectorNumber: {
    color: INK,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  vehicleSelectorMeta: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    marginTop: 3,
  },
  entryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  entryTitle: {
    color: INK,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 29,
  },
  entryClose: {
    alignItems: 'center',
    backgroundColor: '#F5F8FB',
    borderRadius: 18,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  entryForm: {
    paddingBottom: 14,
    paddingTop: 17,
  },
  entryTwoColumn: {
    flexDirection: 'row',
    gap: 10,
  },
  entryFieldWrap: {
    marginBottom: 13,
  },
  entryFieldCompact: {
    flex: 1,
  },
  entryFieldLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    marginBottom: 7,
  },
  entryInputWrap: {
    alignItems: 'center',
    backgroundColor: '#F8FBF9',
    borderColor: '#DCEBE2',
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 47,
    paddingHorizontal: 12,
  },
  entryInputMultiline: {
    alignItems: 'flex-start',
    minHeight: 82,
    paddingTop: 13,
  },
  entryInput: {
    color: INK,
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
    marginLeft: 9,
    padding: 0,
  },
  entryInputTextArea: {
    minHeight: 54,
    textAlignVertical: 'top',
  },
  entryInputReadOnly: {
    color: '#64748B',
  },
  uploadBox: {
    alignItems: 'center',
    backgroundColor: '#F8FBF9',
    borderColor: '#DCEBE2',
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 72,
    marginBottom: 13,
    paddingHorizontal: 13,
  },
  uploadIconWrap: {
    alignItems: 'center',
    backgroundColor: GREEN_SOFT,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginRight: 12,
    width: 40,
  },
  uploadCopy: {
    flex: 1,
    minWidth: 0,
  },
  uploadLabel: {
    color: INK,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
  },
  uploadHint: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 2,
  },
  dropdownInputWrap: {
    alignItems: 'center',
    backgroundColor: '#F8FBF9',
    borderColor: '#DCEBE2',
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 47,
    paddingHorizontal: 12,
  },
  dropdownInputLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    minWidth: 0,
  },
  dropdownInputText: {
    color: INK,
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
    marginLeft: 9,
  },
  claimTypeList: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCEBE2',
    borderRadius: 11,
    borderWidth: 1,
    marginTop: 7,
    overflow: 'hidden',
  },
  claimTypeItem: {
    alignItems: 'center',
    borderBottomColor: '#EEF3F0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  claimTypeItemText: {
    color: INK,
    fontSize: 14,
    fontWeight: '800',
  },
  entryActions: {
    borderTopColor: CARD_BORDER,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 11,
    paddingBottom: 16,
    paddingTop: 13,
  },
  entryCancelButton: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: CARD_BORDER,
    borderRadius: 11,
    borderWidth: 1,
    flex: 1,
    height: 48,
    justifyContent: 'center',
  },
  entryCancelText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '900',
  },
  entrySaveButton: {
    alignItems: 'center',
    backgroundColor: GREEN,
    borderRadius: 11,
    flex: 1,
    height: 48,
    justifyContent: 'center',
  },
  entrySaveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  reimburseRoot: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  reimburseContent: {
    paddingHorizontal: 16,
  },
  reimburseHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 39,
  },
  reimburseBack: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    marginRight: 22,
    width: 28,
  },
  reimburseTitle: {
    color: INK,
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
  },
  newClaimButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: PURPLE_BORDER,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    height: 39,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  newClaimText: {
    color: PURPLE,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
    marginLeft: 7,
  },
  claimSummaryCard: {
    alignItems: 'center',
    backgroundColor: '#FCF7FF',
    borderColor: PURPLE_BORDER,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 126,
    marginBottom: 28,
    paddingHorizontal: 16,
  },
  claimSummaryIconWrap: {
    alignItems: 'center',
    backgroundColor: '#EFE2FF',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    marginRight: 14,
    width: 56,
  },
  claimSummaryIcon: {
    alignItems: 'center',
    backgroundColor: PURPLE,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  claimSummaryMain: {
    flex: 1,
    minWidth: 0,
  },
  claimSummaryTitle: {
    color: INK,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
    marginBottom: 14,
  },
  claimSummaryStats: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  claimSummaryDivider: {
    backgroundColor: '#E8D7F7',
    height: 44,
    marginHorizontal: 9,
    width: 1,
  },
  claimStat: {
    flex: 1,
    minWidth: 0,
  },
  claimStatValue: {
    color: '#33106D',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
  },
  claimStatLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 6,
  },
  claimTabs: {
    borderBottomColor: '#E3E8EF',
    borderBottomWidth: 1,
    flexDirection: 'row',
    marginBottom: 22,
  },
  claimTabButton: {
    alignItems: 'center',
    flex: 1,
    height: 48,
    justifyContent: 'center',
  },
  claimTabText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '900',
  },
  claimTabTextActive: {
    color: PURPLE,
  },
  claimTabIndicator: {
    backgroundColor: PURPLE,
    borderRadius: 2,
    bottom: -1,
    height: 2,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  claimCard: {
    backgroundColor: '#FFFFFF',
    borderColor: CARD_BORDER,
    borderRadius: 13,
    borderWidth: 1,
    marginBottom: 18,
    paddingHorizontal: 17,
    paddingTop: 17,
    shadowColor: '#182033',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
  claimCardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  claimIdText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  claimStatusBadge: {
    borderRadius: 13,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  claimStatusPending: {
    backgroundColor: '#FFF0DD',
  },
  claimStatusApproved: {
    backgroundColor: '#E8F8EF',
  },
  claimStatusRejected: {
    backgroundColor: '#FFE7EA',
  },
  claimStatusText: {
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
  },
  claimStatusPendingText: {
    color: '#F97316',
  },
  claimStatusApprovedText: {
    color: GREEN,
  },
  claimStatusRejectedText: {
    color: '#E11D48',
  },
  claimTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 19,
  },
  claimType: {
    color: INK,
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
    paddingRight: 12,
  },
  claimAmount: {
    color: INK,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  claimDateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 23,
  },
  claimDateText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    marginLeft: 7,
  },
  claimSmallLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginBottom: 6,
  },
  claimPurpose: {
    color: INK,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginBottom: 23,
  },
  claimMetaRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  claimMetaValue: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  claimDocBlock: {
    alignItems: 'flex-end',
  },
  claimDocRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  claimFooter: {
    alignItems: 'center',
    borderTopColor: CARD_BORDER,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    minHeight: 51,
  },
  claimViewDetails: {
    color: PURPLE,
    fontSize: 14,
    fontWeight: '900',
  },
  requestRoot: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  requestContent: {
    paddingHorizontal: 16,
  },
  requestHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 28,
  },
  requestBack: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    marginRight: 20,
    width: 28,
  },
  requestTitle: {
    color: INK,
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 27,
  },
  myRequestsButton: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 38,
  },
  myRequestsText: {
    color: GREEN,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
    marginLeft: 8,
  },
  requestDetailsTitle: {
    color: INK,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
    marginBottom: 17,
  },
  formLabel: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 17,
    marginBottom: 7,
  },
  requestInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE5ED',
    borderRadius: 9,
    borderWidth: 1,
    color: INK,
    fontSize: 14,
    fontWeight: '700',
    height: 50,
    marginBottom: 16,
    paddingHorizontal: 14,
  },
  requestTextArea: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE5ED',
    borderRadius: 9,
    borderWidth: 1,
    color: INK,
    fontSize: 14,
    fontWeight: '700',
    height: 112,
    marginBottom: 17,
    paddingHorizontal: 14,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  requestSelect: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE5ED',
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: 'row',
    height: 50,
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 14,
  },
  requestSelectText: {
    color: INK,
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
  },
  requestDropdownList: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE5ED',
    borderRadius: 9,
    borderWidth: 1,
    marginBottom: 12,
    marginTop: -9,
    overflow: 'hidden',
  },
  requestDropdownItem: {
    alignItems: 'center',
    borderBottomColor: '#EDF1F5',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 39,
    paddingHorizontal: 14,
  },
  requestDropdownText: {
    color: INK,
    fontSize: 14,
    fontWeight: '800',
  },
  priorityValue: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },
  priorityDot: {
    backgroundColor: GREEN,
    borderColor: '#DDF7E5',
    borderRadius: 9,
    borderWidth: 6,
    height: 22,
    marginRight: 10,
    width: 22,
  },
  requestUploadGrid: {
    gap: 8,
    marginBottom: 24,
  },
  requestUploadTile: {
    alignItems: 'center',
    borderColor: '#C9D3DF',
    borderRadius: 9,
    borderStyle: 'dashed',
    borderWidth: 1,
    height: 76,
    justifyContent: 'center',
  },
  requestUploadText: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
    marginTop: 7,
  },
  requestUploadHint: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 4,
  },
  submitRequestButton: {
    alignItems: 'center',
    backgroundColor: GREEN,
    borderRadius: 8,
    height: 54,
    justifyContent: 'center',
    shadowColor: GREEN,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  submitRequestText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 23,
  },
  previousRequestsList: {
    gap: 12,
  },
  previousRequestCard: {
    backgroundColor: '#FFFFFF',
    borderColor: CARD_BORDER,
    borderRadius: 12,
    borderWidth: 1,
    padding: 15,
    shadowColor: '#182033',
    shadowOffset: {width: 0, height: 7},
    shadowOpacity: 0.05,
    shadowRadius: 14,
  },
  previousRequestTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  previousRequestId: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  previousStatusBadge: {
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  previousStatusCompleted: {
    backgroundColor: '#E8F8EF',
  },
  previousStatusProgress: {
    backgroundColor: '#EAF2FF',
  },
  previousStatusPending: {
    backgroundColor: '#FFF0DD',
  },
  previousStatusText: {
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
  },
  previousStatusCompletedText: {
    color: GREEN,
  },
  previousStatusProgressText: {
    color: BLUE,
  },
  previousStatusPendingText: {
    color: ORANGE,
  },
  previousRequestType: {
    color: INK,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
    marginBottom: 12,
  },
  previousRequestMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 7,
  },
  previousRequestMetaText: {
    color: MUTED,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    marginLeft: 8,
  },
  leaveRoot: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  leaveContent: {
    paddingHorizontal: 16,
  },
  leaveHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  leaveBack: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    marginRight: 20,
    width: 28,
  },
  leaveTitle: {
    color: INK,
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 27,
  },
  myLeavesButton: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 38,
  },
  myLeavesText: {
    color: GREEN,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
    marginLeft: 8,
  },
  leaveBalanceCard: {
    backgroundColor: '#F4FBF7',
    borderColor: '#CBEBD5',
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  leaveBalanceTitle: {
    color: INK,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
    marginBottom: 9,
  },
  leaveBalanceStats: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  leaveBalanceItem: {
    flex: 1,
    minWidth: 0,
  },
  leaveBalanceValue: {
    color: GREEN,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
  },
  leaveBalanceLabel: {
    color: GREEN,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    marginTop: 6,
  },
  leaveBalanceSub: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
    marginTop: 4,
  },
  leaveBalanceDivider: {
    backgroundColor: '#D1E6DA',
    height: 54,
    marginHorizontal: 10,
    width: 1,
  },
  leaveSectionTitle: {
    color: INK,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 23,
    marginBottom: 9,
  },
  leaveSelect: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE5ED',
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: 'row',
    height: 43,
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 14,
  },
  leavePlaceholder: {
    color: MUTED,
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  leaveSelectValue: {
    color: INK,
  },
  leaveDropdown: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE5ED',
    borderRadius: 9,
    borderWidth: 1,
    marginBottom: 12,
    marginTop: -8,
    overflow: 'hidden',
  },
  leaveDropdownItem: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  leaveDropdownDivider: {
    borderBottomColor: '#EEF2F6',
    borderBottomWidth: 1,
  },
  leaveDropdownItemActive: {
    backgroundColor: '#F4FBF7',
  },
  leaveDropdownText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '700',
  },
  leaveDropdownTextActive: {
    color: GREEN,
    fontWeight: '900',
  },
  halfDayRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 11,
    marginTop: -2,
  },
  halfDayBox: {
    alignItems: 'center',
    borderColor: '#D7DFEA',
    borderRadius: 4,
    borderWidth: 1,
    height: 21,
    justifyContent: 'center',
    marginRight: 10,
    width: 21,
  },
  halfDayBoxActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  halfDayText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
  },
  leaveReasonArea: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE5ED',
    borderRadius: 9,
    borderWidth: 1,
    color: INK,
    fontSize: 14,
    fontWeight: '700',
    height: 82,
    marginBottom: 11,
    paddingHorizontal: 14,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  leaveUploadBox: {
    alignItems: 'center',
    borderColor: '#C9D3DF',
    borderRadius: 9,
    borderStyle: 'dashed',
    borderWidth: 1,
    height: 62,
    justifyContent: 'center',
    marginBottom: 11,
    flexDirection: 'row',
    gap: 8,
  },
  leaveUploadText: {
    color: GREEN,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  leaveUploadHint: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  leaveNoteCard: {
    alignItems: 'flex-start',
    backgroundColor: '#F0FAF4',
    borderRadius: 9,
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  leaveNoteCopy: {
    flex: 1,
    marginLeft: 10,
    minWidth: 0,
  },
  leaveNoteTitle: {
    color: INK,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
    marginBottom: 4,
  },
  leaveNoteText: {
    color: INK,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  submitLeaveButton: {
    alignItems: 'center',
    backgroundColor: GREEN,
    borderRadius: 8,
    height: 46,
    justifyContent: 'center',
    shadowColor: GREEN,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  submitLeaveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 21,
  },
  dpOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dpBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  dpSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: 24,
  },
  dpHandle: {
    alignSelf: 'center',
    backgroundColor: '#DDE3EC',
    borderRadius: 3,
    height: 4,
    marginBottom: 8,
    marginTop: 10,
    width: 40,
  },
  dpHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dpNavBtn: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  dpMonthYear: {
    color: INK,
    fontSize: 17,
    fontWeight: '800',
  },
  dpDayRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingBottom: 6,
  },
  dpDayLabel: {
    color: MUTED,
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  dpGrid: {
    paddingHorizontal: 8,
  },
  dpWeekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dpCell: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 2,
  },
  dpDayCircle: {
    alignItems: 'center',
    borderRadius: 20,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  dpDaySelected: {
    backgroundColor: GREEN,
  },
  dpDayToday: {
    borderColor: GREEN,
    borderWidth: 1.5,
  },
  dpDayText: {
    color: INK,
    fontSize: 14,
    fontWeight: '500',
  },
  dpDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dpDayTextToday: {
    color: GREEN,
    fontWeight: '800',
  },
  dpDayTextDisabled: {
    color: '#C8D0DC',
  },
  dpActions: {
    borderTopColor: '#EEF1F5',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  dpCancelBtn: {
    alignItems: 'center',
    borderColor: '#DDE3EC',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 13,
  },
  dpCancelText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '700',
  },
  dpConfirmBtn: {
    alignItems: 'center',
    backgroundColor: GREEN,
    borderRadius: 10,
    flex: 2,
    paddingVertical: 13,
  },
  dpConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
