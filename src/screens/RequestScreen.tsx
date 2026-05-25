import {Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useState} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import {useLanguage} from '../context/LanguageContext';

const INK = '#070B1A';
const MUTED = '#43506F';
const GREEN = '#078B36';
const GREEN_SOFT = '#F1FBF4';
const GREEN_BORDER = '#CFEED8';
const CARD_BORDER = '#E6ECF2';

type TeamMember = {
  name: string;
  role: string;
  location: string;
  joined: string;
  bg: string;
  initials: string;
};

export default function RequestScreen() {
  const insets = useSafeAreaInsets();
  const {t} = useLanguage();
  const [approvedMembers, setApprovedMembers] = useState<Record<string, boolean>>({});
  const roleCounts = ROLE_COUNTS.map(role => ({
    ...role,
    label:
      role.key === 'supervisor'
        ? t('supervisorRole')
        : role.key === 'driver'
          ? t('driver')
          : t('labour'),
  }));

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {paddingTop: insets.top + 18, paddingBottom: insets.bottom + 112},
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{t('team')}</Text>
            <Text style={styles.subtitle}>{t('teamSubtitle')}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => Alert.alert(t('notifications'), t('teamNotifications'))}
            style={styles.bellButton}>
            <Icon name="Bell" size={24} color={INK} />
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.roleCardsRow}>
          {roleCounts.map(role => (
            <TouchableOpacity
              key={role.label}
              activeOpacity={0.82}
              onPress={() => Alert.alert(role.label, `${role.count} ${t('teamMembers')}`)}
              style={[
                styles.roleCard,
                {backgroundColor: role.bg, borderColor: role.border},
              ]}>
              <View style={[styles.roleIcon, {backgroundColor: role.iconBg}]}>
                <Icon name={role.icon} size={24} color={role.color} />
              </View>
              <Text style={[styles.roleCount, {color: role.color}]}>{role.count}</Text>
              <Text style={styles.roleLabel} numberOfLines={1}>
                {role.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{t('approveAttendance')}</Text>
        {TEAM_MEMBERS.map(member => {
          const approved = !!approvedMembers[member.name];

          return (
            <View
              key={member.name}
              style={styles.memberCard}>
              <View style={[styles.avatar, {backgroundColor: member.bg}]}>
                <Text style={styles.avatarText}>{member.initials}</Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberRole}>
                  {member.role === 'Field Executive'
                    ? t('fieldExecutive')
                    : member.role === 'Field Supervisor'
                      ? t('supervisorRole')
                      : member.role}
                </Text>
                <View style={styles.locationRow}>
                  <Icon name="MapPin" size={17} color={INK} />
                  <Text style={styles.memberLocation}>{member.location}</Text>
                </View>
              </View>
              <TouchableOpacity
                activeOpacity={0.78}
                disabled={approved}
                onPress={() => {
                  setApprovedMembers(current => ({...current, [member.name]: true}));
                  Alert.alert(t('attendanceApproved'), `${member.name} - ${t('approved')}.`);
                }}
                style={[styles.approveButton, approved && styles.approvedButton]}>
                <Icon name="Check" size={16} color="#FFFFFF" />
                <Text style={styles.approveButtonText}>
                  {approved ? t('approved') : t('approve')}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    name: 'Aman Verma',
    role: 'Field Executive',
    location: 'Bori, Durg',
    joined: '12 May 2023',
    bg: '#D9F8DF',
    initials: 'AV',
  },
  {
    name: 'Pooja Sahu',
    role: 'Field Executive',
    location: 'Jamgaon, Durg',
    joined: '18 Jun 2023',
    bg: '#E9D5FF',
    initials: 'PS',
  },
  {
    name: 'Rahul Tiwari',
    role: 'Field Supervisor',
    location: 'Koni, Durg',
    joined: '25 Jul 2023',
    bg: '#D7F0FF',
    initials: 'RT',
  },
  {
    name: 'Sandeep Patel',
    role: 'Field Executive',
    location: 'Bhilai, Durg',
    joined: '03 Aug 2023',
    bg: '#FFE8D6',
    initials: 'SP',
  },
  {
    name: 'Vikram Singh',
    role: 'Field Executive',
    location: 'Patan, Durg',
    joined: '14 Sep 2023',
    bg: '#CFFAF0',
    initials: 'VS',
  },
];

const ROLE_COUNTS = [
  {
    key: 'supervisor',
    label: 'Supervisor',
    count: '3',
    icon: 'ShieldCheck',
    color: '#0B8F39',
    bg: '#F1FBF4',
    border: '#BDEBCB',
    iconBg: '#D7F6DF',
  },
  {
    key: 'driver',
    label: 'Driver',
    count: '4',
    icon: 'Truck',
    color: '#0B66F0',
    bg: '#F4F9FF',
    border: '#BFDBFE',
    iconBg: '#DBEAFE',
  },
  {
    key: 'labour',
    label: 'Labour',
    count: '5',
    icon: 'HardHat',
    color: '#F97316',
    bg: '#FFF7ED',
    border: '#FED7AA',
    iconBg: '#FFEDD5',
  },
];

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#FBFCFD',
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 34,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: INK,
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 50,
  },
  subtitle: {
    color: MUTED,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 6,
  },
  bellButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: CARD_BORDER,
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    marginLeft: 14,
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
    right: -1,
    top: -1,
    width: 18,
  },
  notificationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  roleCardsRow: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 27,
  },
  roleCard: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    minHeight: 104,
    paddingHorizontal: 6,
    paddingVertical: 12,
    shadowColor: '#182033',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.05,
    shadowRadius: 16,
  },
  roleIcon: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginBottom: 6,
    width: 40,
  },
  roleCount: {
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 30,
  },
  roleLabel: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  sectionTitle: {
    color: INK,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 29,
    marginBottom: 17,
  },
  memberCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: CARD_BORDER,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    minHeight: 116,
    paddingHorizontal: 13,
    shadowColor: '#182033',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.05,
    shadowRadius: 16,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 40,
    height: 80,
    justifyContent: 'center',
    marginRight: 22,
    width: 80,
  },
  avatarText: {
    color: GREEN,
    fontSize: 22,
    fontWeight: '900',
  },
  memberInfo: {
    flex: 1,
    minWidth: 0,
  },
  memberName: {
    color: INK,
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 27,
  },
  memberRole: {
    color: MUTED,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginTop: 4,
  },
  locationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    marginTop: 9,
  },
  memberLocation: {
    color: MUTED,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  approveButton: {
    alignItems: 'center',
    backgroundColor: GREEN,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 5,
    height: 38,
    justifyContent: 'center',
    marginLeft: 10,
    paddingHorizontal: 10,
  },
  approvedButton: {
    backgroundColor: '#64748B',
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
});
