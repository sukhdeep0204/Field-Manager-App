import {useState} from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Ellipse,
  Path,
  Polygon,
  Rect,
} from 'react-native-svg';

const GREEN = '#2D7A38';
const GREEN_DARK = '#1B5425';
const INK = '#0E1B12';
const MUTED = '#6B7280';
const BORDER = '#D1D5DB';
const GREEN_BORDER = '#4CAF50';

/* ─── Decorative leaf clusters for top corners ─── */
function TopLeafLeft() {
  return (
    <Svg width={110} height={120} viewBox="0 0 110 120" style={styles.leafLeft}>
      {/* back large leaf */}
      <Path d="M10 100 Q-10 40 50 10 Q60 60 10 100Z" fill="#A8D5A2" opacity={0.7} />
      {/* mid leaf */}
      <Path d="M30 110 Q5 55 65 20 Q72 72 30 110Z" fill="#7DC47A" opacity={0.85} />
      {/* front leaf */}
      <Path d="M55 115 Q25 65 80 30 Q90 82 55 115Z" fill="#5BB55A" opacity={0.9} />
      {/* stem */}
      <Path d="M10 100 Q35 85 55 115" stroke="#3D8C3D" strokeWidth={2} fill="none" />
    </Svg>
  );
}

function TopLeafRight() {
  return (
    <Svg width={110} height={120} viewBox="0 0 110 120" style={styles.leafRight}>
      <Path d="M100 100 Q120 40 60 10 Q50 60 100 100Z" fill="#A8D5A2" opacity={0.7} />
      <Path d="M80 110 Q105 55 45 20 Q38 72 80 110Z" fill="#7DC47A" opacity={0.85} />
      <Path d="M55 115 Q85 65 30 30 Q20 82 55 115Z" fill="#5BB55A" opacity={0.9} />
      <Path d="M100 100 Q75 85 55 115" stroke="#3D8C3D" strokeWidth={2} fill="none" />
    </Svg>
  );
}

/* ─── Farm landscape at bottom ─── */
function FarmLandscape() {
  return (
    <Svg width="100%" height={160} viewBox="0 0 390 160" preserveAspectRatio="xMidYMax slice">
      {/* sky tint */}
      <Rect x={0} y={0} width={390} height={160} fill="#EAF5EA" />

      {/* far rolling hill */}
      <Path d="M0 110 Q60 65 130 90 Q200 115 270 75 Q330 45 390 80 L390 160 L0 160Z" fill="#C8E6C2" />

      {/* near rolling hill */}
      <Path d="M0 135 Q80 100 160 120 Q240 140 320 108 Q355 95 390 112 L390 160 L0 160Z" fill="#A5D6A7" />

      {/* foreground strip */}
      <Rect x={0} y={148} width={390} height={12} fill="#81C784" />

      {/* Barn body */}
      <Rect x={210} y={82} width={46} height={36} fill="#8B4513" />
      {/* Barn roof */}
      <Polygon points="206,82 256,82 231,60" fill="#6B3410" />
      {/* Barn door */}
      <Rect x={222} y={100} width={12} height={18} fill="#5C2D0A" rx={2} />
      {/* Barn window */}
      <Rect x={238} y={88} width={10} height={9} fill="#C4A882" rx={1} />

      {/* Silo */}
      <Rect x={264} y={78} width={20} height={40} fill="#B0BEC5" />
      <Ellipse cx={274} cy={78} rx={10} ry={5} fill="#90A4AE" />

      {/* Tree 1 (left) */}
      <Rect x={95} y={115} width={7} height={25} fill="#5D4037" />
      <Circle cx={98} cy={105} r={18} fill="#388E3C" />
      <Circle cx={88} cy={110} r={12} fill="#43A047" />
      <Circle cx={108} cy={110} r={12} fill="#43A047" />

      {/* Tree 2 (mid-left) */}
      <Rect x={148} y={118} width={6} height={22} fill="#5D4037" />
      <Circle cx={151} cy={108} r={15} fill="#2E7D32" />
      <Circle cx={142} cy={113} r={10} fill="#388E3C" />
      <Circle cx={160} cy={113} r={10} fill="#388E3C" />

      {/* Tree 3 (right of barn) */}
      <Rect x={300} y={110} width={7} height={30} fill="#5D4037" />
      <Circle cx={303} cy={100} r={17} fill="#388E3C" />
      <Circle cx={293} cy={106} r={11} fill="#43A047" />
      <Circle cx={314} cy={106} r={11} fill="#43A047" />

      {/* Small bush left */}
      <Ellipse cx={50} cy={145} rx={22} ry={10} fill="#66BB6A" />
      <Ellipse cx={70} cy={143} rx={16} ry={9} fill="#4CAF50" />

      {/* Small bush right */}
      <Ellipse cx={340} cy={145} rx={20} ry={9} fill="#66BB6A" />
      <Ellipse cx={358} cy={143} rx={14} ry={8} fill="#4CAF50" />
    </Svg>
  );
}


export default function LoginScreen({onLogin}: {onLogin?: () => void}) {
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [userIdFocused, setUserIdFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  return (
    <LinearGradient colors={['#FFFFFF', '#F0FAF1', '#E6F5E7']} style={styles.root} locations={[0, 0.4, 1]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* corner leaves */}
      <TopLeafLeft />
      <TopLeafRight />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {paddingTop: insets.top + 30, paddingBottom: insets.bottom + 16},
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Logo */}
          <View style={styles.logoWrap}>
            <Image
              source={require('../assets/logo-3f.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Heading */}
          <Text style={styles.heading}>
            Welcome <Text style={styles.headingGreen}>Back!</Text>
          </Text>
          <Text style={styles.subheading}>Sign in to continue to your account</Text>

          {/* Form */}
          <View style={styles.form}>
            {/* User ID */}
            <Text style={styles.label}>User ID</Text>
            <View style={[styles.inputBox, userIdFocused && styles.inputBoxFocused]}>
              <View style={styles.iconWrap}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={GREEN} strokeWidth={2} strokeLinecap="round" />
                  <Circle cx={12} cy={7} r={4} stroke={GREEN} strokeWidth={2} fill="none" />
                </Svg>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your user ID"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoCorrect={false}
                value={userId}
                onChangeText={setUserId}
                onFocus={() => setUserIdFocused(true)}
                onBlur={() => setUserIdFocused(false)}
              />
            </View>

            {/* Password */}
            <Text style={[styles.label, {marginTop: 18}]}>Password</Text>
            <View style={[styles.inputBox, passFocused && styles.inputBoxFocused]}>
              {/* lock icon */}
              <View style={styles.iconWrap}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Rect x={3} y={11} width={18} height={11} rx={2} stroke={GREEN} strokeWidth={2} fill="none" />
                  <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={GREEN} strokeWidth={2} strokeLinecap="round" />
                </Svg>
              </View>
              <TextInput
                style={[styles.textInput, {flex: 1}]}
                placeholder="Enter password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(v => !v)}
                activeOpacity={0.7}
                style={styles.eyeBtn}>
                {showPassword ? (
                  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" stroke={MUTED} strokeWidth={2} fill="none" />
                    <Circle cx={12} cy={12} r={3} stroke={MUTED} strokeWidth={2} fill="none" />
                  </Svg>
                ) : (
                  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                    <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22" stroke={MUTED} strokeWidth={2} strokeLinecap="round" />
                  </Svg>
                )}
              </TouchableOpacity>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.forgotWrap}
              onPress={() => {}}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login button */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.loginBtn}
              onPress={onLogin}>
              <Text style={styles.loginBtnText}>Login</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Farm landscape */}
      <View style={styles.farmWrap} pointerEvents="none">
        <FarmLandscape />
      </View>

      {/* Footer */}
      <View style={[styles.footer, {paddingBottom: insets.bottom + 8}]}>
        <Text style={styles.footerText}>
          New to 3F?{'  '}
          <Text style={styles.footerLink}>Contact Admin</Text>
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  flex: {flex: 1},
  leafLeft: {position: 'absolute', top: 0, left: 0, zIndex: 0},
  leafRight: {position: 'absolute', top: 0, right: 0, zIndex: 0},
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingBottom: 220,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 22,
  },
  logo: {
    width: 180,
    height: 180,
  },
  heading: {
    color: INK,
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 42,
  },
  headingGreen: {
    color: GREEN,
  },
  subheading: {
    color: MUTED,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 32,
    lineHeight: 22,
  },
  form: {
    width: '100%',
  },
  label: {
    color: INK,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: BORDER,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    height: 54,
    paddingHorizontal: 10,
  },
  inputBoxFocused: {
    borderColor: GREEN_BORDER,
    shadowColor: GREEN,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FAF1',
    borderRadius: 8,
    width: 36,
    height: 36,
    marginRight: 8,
  },
  textInput: {
    color: INK,
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 0,
    marginLeft: 6,
  },
  eyeBtn: {
    padding: 6,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: 12,
    marginBottom: 24,
  },
  forgotText: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '700',
  },
  loginBtn: {
    alignItems: 'center',
    backgroundColor: GREEN_DARK,
    borderRadius: 12,
    height: 54,
    justifyContent: 'center',
    shadowColor: GREEN_DARK,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  farmWrap: {
    bottom: 28,
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 0,
  },
  footer: {
    alignItems: 'center',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 10,
    paddingVertical: 10,
  },
  footerText: {
    color: INK,
    fontSize: 14,
    fontWeight: '600',
  },
  footerLink: {
    color: GREEN,
    fontWeight: '800',
  },
});
