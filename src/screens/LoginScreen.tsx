import React, {useState} from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Ellipse, G, Path} from 'react-native-svg';
import Icon from '../components/Icon';
import {API_BASE_URL} from '../config';
import {
  saveSession,
  type FarmAccess,
  type FarmDetail,
  type FarmerDetail,
  type StaffProfile,
} from '../auth/session';

const INK = '#161D2B';
const MUTED = '#717884';
const GREEN = '#5DBB21';
const GREEN_DARK = '#348F17';
const BLUE = '#0D3F78';
const BORDER = '#CED4DB';
const CARD = '#FFFFFF';

export default function LoginScreen({onLogin}: {onLogin?: (profile: StaffProfile) => void}) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient colors={['#F8FBF4', '#FFFFFF', '#EAF4DE']} style={styles.root}>
      <FarmBackground />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scroll,
            {paddingTop: insets.top + 22, paddingBottom: insets.bottom + 24},
          ]}>
          <View style={styles.brand}>
            <Image
              source={require('../assets/logo-3f.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.brandTitle}>
              <Text style={styles.brandGreen}>SBR </Text>
              <Text style={styles.brandBlue}>FIELD MANAGER</Text>
            </Text>
            <View style={styles.ornamentRow}>
              <View style={styles.ornamentLine} />
              <Icon name="Sprout" size={24} color={GREEN_DARK} />
              <View style={styles.ornamentLine} />
            </View>
            <Text style={styles.tagline}>Visit. Track. Progress.</Text>
          </View>

          <LoginCard onLogin={onLogin} />

          <View style={styles.footer}>
            <Icon name="ShieldCheck" size={36} color="#FFFFFF" />
            <View>
              <Text style={styles.footerTitle}>Secure. Transparent. Accountable.</Text>
              <Text style={styles.footerSub}>All field work. One place.</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function LoginCard({onLogin}: {onLogin?: (profile: StaffProfile) => void}) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [secure, setSecure] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!userId.trim() || !password.trim()) {
      Alert.alert('Missing details', 'Please enter your User ID and password.');
      return;
    }

    try {
      setIsLoading(true);
      const loginResponse = await fetch(`${API_BASE_URL}/login/login`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          username: userId.trim(),
          password,
        }),
      });
      const loginData = await loginResponse.json();

      if (!loginResponse.ok || !loginData?.success || !loginData?.token) {
        throw new Error('Invalid username or password.');
      }

      const credentialsResponse = await fetch(`${API_BASE_URL}/login/get_credentials`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({token: loginData.token}),
      });
      const profile = (await credentialsResponse.json()) as StaffProfile;

      if (
        !credentialsResponse.ok ||
        !profile?.staff_id ||
        !profile?.staff_name ||
        !profile?.staff_department ||
        !profile?.staff_designation
      ) {
        throw new Error('Unable to fetch staff details.');
      }

      const farmsResponse = await fetch(
        `${API_BASE_URL}/feild_manager/get_farms/${encodeURIComponent(profile.staff_id)}`,
      );
      const farmAccess = (await farmsResponse.json()) as FarmAccess;

      if (
        !farmsResponse.ok ||
        !farmAccess?.manager_id ||
        !Array.isArray(farmAccess?.assigned_zones) ||
        !Array.isArray(farmAccess?.block_ids) ||
        !Array.isArray(farmAccess?.farm_ids) ||
        typeof farmAccess?.count !== 'number'
      ) {
        throw new Error('Unable to fetch assigned farms.');
      }

      const farmDetailsResponses = await Promise.all(
        farmAccess.farm_ids.map(farmId =>
          fetch(`${API_BASE_URL}/farmer_managment/get_farm_details_from_farm_id/${encodeURIComponent(farmId)}`),
        ),
      );
      const farmDetails = (await Promise.all(
        farmDetailsResponses.map(response => response.json()),
      )) as FarmDetail[];

      const hasInvalidFarm = farmDetailsResponses.some((response, index) => {
        const farm = farmDetails[index]?.farm;
        return (
          !response.ok ||
          !farm?.farm_id ||
          !farm?.farmer_id ||
          !farm?.crop_type ||
          typeof farm?.area !== 'number' ||
          !farm?.land_data?.village ||
          !farm?.land_data?.district ||
          !Array.isArray(farm?.land_data?.land_coordinates)
        );
      });

      if (hasInvalidFarm) {
        throw new Error('Unable to fetch farm details.');
      }

      const farmerDetailsResponses = await Promise.all(
        farmAccess.farm_ids.map(farmId =>
          fetch(
            `${API_BASE_URL}/farmer_managment/get_farmer_details_from_farm_id/${encodeURIComponent(farmId)}`,
          ),
        ),
      );
      const farmerDetailsList = (await Promise.all(
        farmerDetailsResponses.map(response => response.json()),
      )) as FarmerDetail[];

      const hasInvalidFarmer = farmerDetailsResponses.some((response, index) => {
        const farmer = farmerDetailsList[index]?.farmer;
        return !response.ok || !farmer?.farmer_id || !farmer?.farmer_name;
      });
      if (hasInvalidFarmer) {
        throw new Error('Unable to fetch farmer details.');
      }

      const farmerDetailsByFarmId: Record<string, FarmerDetail> = {};
      farmAccess.farm_ids.forEach((farmId, index) => {
        farmerDetailsByFarmId[farmId] = farmerDetailsList[index];
      });

      await saveSession(loginData.token, profile, farmAccess, farmDetails, farmerDetailsByFarmId);
      onLogin?.(profile);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed. Please try again.';
      Alert.alert('Login failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.welcome}>Welcome Back</Text>
      <Text style={styles.cardSubtitle}>Sign in to continue to your dashboard</Text>

      <Text style={styles.label}>User ID</Text>
      <View style={styles.field}>
        <Icon name="UserRound" size={24} color={GREEN_DARK} />
        <TextInput
          autoCapitalize="none"
          onChangeText={setUserId}
          placeholder="Enter your User ID"
          placeholderTextColor="#8A9099"
          style={styles.input}
          value={userId}
        />
      </View>

      <Text style={styles.label}>Password</Text>
      <View style={styles.field}>
        <Icon name="LockKeyhole" size={24} color={GREEN_DARK} />
        <TextInput
          autoCapitalize="none"
          onChangeText={setPassword}
          placeholder="Enter your password"
          placeholderTextColor="#8A9099"
          secureTextEntry={secure}
          style={styles.input}
          value={password}
        />
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setSecure(value => !value)}
          style={styles.eyeButton}>
          <Icon name={secure ? 'Eye' : 'EyeOff'} size={24} color="#858B93" />
        </TouchableOpacity>
      </View>

      <View style={styles.optionRow}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => setRemember(value => !value)}
          style={styles.rememberRow}>
          <View style={[styles.checkbox, remember && styles.checkboxOn]}>
            {remember && <Icon name="Check" size={15} color="#FFFFFF" />}
          </View>
          <Text style={styles.rememberText}>Remember me</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.75}>
          <Text style={styles.forgot}>Forgot password?</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        activeOpacity={0.86}
        disabled={isLoading}
        onPress={handleLogin}
        style={styles.loginButton}>
        <LinearGradient
          colors={['#72C927', '#54B51E']}
          start={{x: 0, y: 0.5}}
          end={{x: 1, y: 0.5}}
          style={styles.loginGradient}>
          <Text style={styles.loginText}>{isLoading ? 'Signing in...' : 'Login'}</Text>
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.orText}>or</Text>
        <View style={styles.divider} />
      </View>

      <TouchableOpacity activeOpacity={0.82} disabled={isLoading} style={styles.biometricButton}>
        <Icon name="Fingerprint" size={30} color={GREEN_DARK} />
        <Text style={styles.biometricText}>Login with Biometrics</Text>
      </TouchableOpacity>
    </View>
  );
}

function FarmBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 390 844" preserveAspectRatio="none">
        <Path
          d="M0 70 C66 92 72 150 126 150 C200 150 212 77 390 66 L390 0 L0 0 Z"
          fill="#EEF5EA"
          opacity={0.9}
        />
        <Path
          d="M0 666 C55 620 104 604 170 626 C236 648 302 600 390 574 L390 844 L0 844 Z"
          fill="#8ECF44"
          opacity={0.66}
        />
        <Path
          d="M0 705 C82 686 142 730 219 708 C278 692 331 676 390 647 L390 844 L0 844 Z"
          fill="#5CA82E"
          opacity={0.72}
        />
        <Path
          d="M0 758 C84 746 168 777 250 765 C303 758 346 739 390 724 L390 844 L0 844 Z"
          fill="#3F842D"
          opacity={0.52}
        />
        <Path
          d="M0 612 C55 575 98 570 155 584 C216 598 274 578 390 526 L390 664 C314 697 241 722 174 706 C100 690 45 661 0 683 Z"
          fill="#B9DE82"
          opacity={0.42}
        />
        <G opacity={0.42}>
          {Array.from({length: 42}).map((_, index) => {
            const x = (index * 17) % 390;
            const h = 28 + (index % 7) * 9;
            return (
              <Path
                key={index}
                d={`M${x} 666 C${x + 4} ${642 - h / 3} ${x + 6} ${633 - h} ${x + 14} ${620 - h}`}
                stroke="#6FAB34"
                strokeWidth={2}
                strokeLinecap="round"
              />
            );
          })}
        </G>
        <G opacity={0.46} transform="translate(-8 245) rotate(-18)">
          <Path d="M8 170 C22 116 39 70 78 20" stroke="#4EA334" strokeWidth={5} fill="none" />
          <Ellipse cx={40} cy={90} rx={16} ry={48} fill="#58A83C" />
          <Ellipse cx={72} cy={44} rx={16} ry={42} fill="#72B95A" />
          <Ellipse cx={24} cy={142} rx={16} ry={43} fill="#4D9A35" />
        </G>
        <Path
          d="M390 230 C352 298 371 375 332 431 C303 473 328 522 390 533 Z"
          fill="#EFF6E8"
          opacity={0.8}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  flex: {flex: 1},
  scroll: {
    alignItems: 'center',
    minHeight: 844,
    paddingHorizontal: 24,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoImage: {
    height: 132,
    marginBottom: 10,
    width: 132,
  },
  brandTitle: {
    fontSize: 23,
    fontWeight: '900',
    marginTop: -2,
    textAlign: 'center',
  },
  brandGreen: {color: '#4F9C33'},
  brandBlue: {color: BLUE},
  ornamentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  ornamentLine: {
    backgroundColor: '#7BBE56',
    height: 2,
    width: 52,
  },
  tagline: {
    color: MUTED,
    fontSize: 15,
    fontWeight: '500',
    marginTop: 7,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    elevation: 9,
    maxWidth: 332,
    paddingHorizontal: 22,
    paddingVertical: 22,
    shadowColor: '#2E5A1A',
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.13,
    shadowRadius: 24,
    width: '100%',
  },
  welcome: {
    color: INK,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  cardSubtitle: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 18,
    marginTop: 6,
    textAlign: 'center',
  },
  label: {
    color: INK,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  field: {
    alignItems: 'center',
    borderColor: BORDER,
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 13,
    height: 50,
    marginBottom: 16,
    paddingHorizontal: 14,
  },
  input: {
    color: INK,
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },
  eyeButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 36,
  },
  optionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  rememberRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: '#AAB0B8',
    borderRadius: 4,
    borderWidth: 1,
    height: 21,
    justifyContent: 'center',
    width: 21,
  },
  checkboxOn: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  rememberText: {
    color: INK,
    fontSize: 13,
    fontWeight: '500',
  },
  forgot: {
    color: GREEN_DARK,
    fontSize: 13,
    fontWeight: '700',
  },
  loginButton: {
    borderRadius: 9,
    marginBottom: 12,
    overflow: 'hidden',
  },
  loginGradient: {
    alignItems: 'center',
    height: 50,
    justifyContent: 'center',
  },
  loginText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  dividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    marginBottom: 12,
  },
  divider: {
    backgroundColor: '#E1E4E8',
    flex: 1,
    height: 1,
  },
  orText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '500',
  },
  biometricButton: {
    alignItems: 'center',
    alignSelf: 'center',
    borderColor: '#A7D18F',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 22,
    width: '86%',
  },
  biometricText: {
    color: GREEN_DARK,
    fontSize: 13,
    fontWeight: '800',
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    marginTop: 30,
  },
  footerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  footerSub: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 6,
    opacity: 0.95,
  },
});
