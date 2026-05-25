import React from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import {LanguageCode, useLanguage} from '../context/LanguageContext';

const AVATAR = require('../assets/rahul-sharma-avatar.png');

const INK = '#071126';
const MUTED = '#34405F';
const GREEN = '#078B36';
const GREEN_SOFT = '#EEF9F1';
const BORDER = '#E9EEF4';
const RED = '#F01818';

export default function ProfileScreen({onLogout}: {onLogout: () => void}) {
  const insets = useSafeAreaInsets();
  const {language, setLanguage, t} = useLanguage();

  const accountItems = [
    {
      key: 'personal',
      icon: 'UserRound',
      title: t('personalInformation'),
      subtitle: t('personalInformationSub'),
    },
    {
      key: 'password',
      icon: 'ShieldCheck',
      title: t('changePassword'),
      subtitle: t('changePasswordSub'),
    },
    {
      key: 'contact',
      icon: 'Phone',
      title: t('contactInformation'),
      subtitle: t('contactInformationSub'),
    },
    {
      key: 'notifications',
      icon: 'Bell',
      title: t('notificationSettings'),
      subtitle: t('notificationSettingsSub'),
    },
    {
      key: 'language',
      icon: 'Languages',
      title: t('language'),
      subtitle: t('languageSub'),
      value: language === 'en' ? t('english') : t('hindi'),
    },
  ];

  const supportItems = [
    {
      key: 'help',
      icon: 'CircleHelp',
      title: t('helpSupport'),
      subtitle: t('helpSupportSub'),
    },
    {
      key: 'terms',
      icon: 'FileText',
      title: t('termsConditions'),
      subtitle: t('termsConditionsSub'),
    },
    {
      key: 'privacy',
      icon: 'ShieldCheck',
      title: t('privacyPolicy'),
      subtitle: t('privacyPolicySub'),
    },
    {
      key: 'about',
      icon: 'Info',
      title: t('aboutApp'),
      subtitle: t('version'),
    },
  ];

  const changeLanguage = (nextLanguage: LanguageCode) => {
    setLanguage(nextLanguage).then(() => {
      Alert.alert(t('language'), t('languageChanged'));
    });
  };

  const handleProfileAction = (key: string, title: string, subtitle: string) => {
    if (key === 'language') {
      Alert.alert(t('chooseLanguage'), '', [
        {text: 'English', onPress: () => changeLanguage('en')},
        {text: 'हिंदी', onPress: () => changeLanguage('hi')},
        {text: t('cancel'), style: 'cancel'},
      ]);
      return;
    }

    if (key === 'about') {
      Alert.alert(t('aboutApp'), `Field Manager\n${t('version')}`);
      return;
    }

    Alert.alert(title, subtitle);
  };

  const handleLogout = () => {
    Alert.alert(t('logout'), t('logoutConfirm'), [
      {text: t('cancel'), style: 'cancel'},
      {text: t('logout'), style: 'destructive', onPress: onLogout},
    ]);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {paddingTop: insets.top + 6, paddingBottom: insets.bottom + 116},
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{t('profile')}</Text>
            <Text style={styles.subtitle}>{t('profileSubtitle')}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.76}
            onPress={() => Alert.alert(t('notifications'), t('notificationMessage'))}
            style={styles.bellButton}>
            <Icon name="Bell" size={26} color={INK} />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <Image source={AVATAR} style={styles.avatar} />
          <View style={styles.profileInfo}>
            <Text style={styles.name}>Amit Kumar</Text>
            <Text style={styles.role}>{t('fieldExecutive')}</Text>
            <ContactRow icon="Phone" text="+91 98765 43210" />
            <ContactRow icon="Mail" text="amit.kumar@fieldforce.com" />
            <ContactRow icon="MapPin" text="Bhilai, Durg, Chhattisgarh" />
          </View>
        </View>

        <ProfileSection
          title={t('account')}
          items={accountItems}
          onItemPress={handleProfileAction}
        />
        <ProfileSection
          title={t('support')}
          items={supportItems}
          onItemPress={handleProfileAction}
        />

        <TouchableOpacity activeOpacity={0.78} onPress={handleLogout} style={styles.logoutButton}>
          <Icon name="LogOut" size={24} color={RED} />
          <Text style={styles.logoutText}>{t('logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function ContactRow({icon, text}: {icon: string; text: string}) {
  return (
    <View style={styles.contactRow}>
      <Icon name={icon} size={23} color={GREEN} />
      <Text style={styles.contactText}>{text}</Text>
    </View>
  );
}

function ProfileSection({
  title,
  items,
  onItemPress,
}: {
  title: string;
  items: Array<{key: string; icon: string; title: string; subtitle: string; value?: string}>;
  onItemPress: (key: string, title: string, subtitle: string) => void;
}) {
  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.menuCard}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.76}
            onPress={() => onItemPress(item.key, item.title, item.subtitle)}
            style={styles.menuRow}>
            <View style={styles.menuIconSlot}>
              <Icon name={item.icon} size={27} color={GREEN} />
            </View>
            <View style={[styles.menuCopy, index < items.length - 1 && styles.menuDivider]}>
              <View style={styles.menuMain}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              {item.value ? <Text style={styles.menuValue}>{item.value}</Text> : null}
              <Icon name="ChevronRight" size={28} color={MUTED} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 17,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    paddingRight: 14,
  },
  title: {
    color: INK,
    fontSize: 31,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 39,
  },
  subtitle: {
    color: MUTED,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
    marginTop: 2,
  },
  bellButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F6',
    borderRadius: 12,
    borderWidth: 1,
    height: 54,
    justifyContent: 'center',
    marginRight: 1,
    marginTop: 1,
    shadowColor: '#1A2740',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.08,
    shadowRadius: 18,
    width: 54,
    elevation: 3,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: '#F51F2D',
    borderRadius: 10,
    height: 19,
    justifyContent: 'center',
    position: 'absolute',
    right: -2,
    top: -2,
    width: 19,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 14,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: BORDER,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 35,
    minHeight: 148,
    paddingBottom: 22,
    paddingLeft: 13,
    paddingRight: 17,
    paddingTop: 21,
    position: 'relative',
    shadowColor: '#18233A',
    shadowOffset: {width: 0, height: 5},
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  avatar: {
    backgroundColor: '#E7ECEF',
    borderRadius: 55,
    height: 110,
    width: 110,
  },
  profileInfo: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
    marginLeft: 23,
    minWidth: 0,
  },
  name: {
    color: INK,
    fontSize: 23,
    fontWeight: '900',
    lineHeight: 29,
  },
  role: {
    color: GREEN,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 21,
    marginBottom: 15,
    marginTop: 3,
  },
  contactRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 25,
    marginTop: 9,
  },
  contactText: {
    color: MUTED,
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    marginLeft: 18,
  },
  sectionWrap: {
    marginTop: 25,
  },
  sectionTitle: {
    color: INK,
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 28,
    marginBottom: 13,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderColor: BORDER,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    shadowColor: '#18233A',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  menuRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 73,
  },
  menuIconSlot: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    marginRight: 16,
    width: 32,
  },
  menuCopy: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    minHeight: 73,
  },
  menuDivider: {
    borderBottomColor: '#E9EEF4',
    borderBottomWidth: 1,
  },
  menuMain: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  menuTitle: {
    color: INK,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 21,
  },
  menuSubtitle: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
    marginTop: 2,
  },
  menuValue: {
    color: GREEN,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 19,
    marginRight: 7,
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: BORDER,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    height: 58,
    justifyContent: 'center',
    marginTop: 25,
    shadowColor: '#18233A',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  logoutText: {
    color: RED,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
    marginLeft: 12,
  },
});
