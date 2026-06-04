import {ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useEffect, useState} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import {useLanguage} from '../context/LanguageContext';
import {loadSession} from '../auth/session';
import {API_BASE_URL} from '../config';

const INK = '#070B1A';
const MUTED = '#43506F';
const GREEN = '#078B36';
const GREEN_SOFT = '#F1FBF4';
const GREEN_BORDER = '#CFEED8';
const CARD_BORDER = '#E6ECF2';

type TeamMember = {
  id: string;
  name: string;
  role: string;
  block: string;
  contact: string;
  bg: string;
  initials: string;
};

type ApiTeamMember = {
  supervisor_id: string;
  supervisor_name: string;
  suervisor_contact: string;
  block_name: string;
};

const AVATAR_COLORS = [
  '#D9F8DF', '#E9D5FF', '#D7F0FF',
  '#FFE8D6', '#CFFAF0', '#FEF3C7',
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function mapApiMembers(apiMembers: ApiTeamMember[]): TeamMember[] {
  return apiMembers.map((m, i) => ({
    id: m.supervisor_id,
    name: m.supervisor_name,
    role: 'Supervisor',
    block: m.block_name,
    contact: m.suervisor_contact,
    bg: AVATAR_COLORS[i % AVATAR_COLORS.length],
    initials: getInitials(m.supervisor_name),
  }));
}

export default function RequestScreen() {
  const insets = useSafeAreaInsets();
  const {t} = useLanguage();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(
    mapApiMembers([] as ApiTeamMember[]),
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fetchTeamMembers = async () => {
    try {
      const session = await loadSession();
      const staffId = session?.profile?.staff_id;
      if (!staffId) { return; }

      const res = await fetch(
        `${API_BASE_URL}/feild_manager/get_my_team/${encodeURIComponent(staffId)}`,
      );
      const data = await res.json();

      if (res.ok && data.success && Array.isArray(data.team_members)) {
        setTeamMembers(mapApiMembers(data.team_members as ApiTeamMember[]));
      }
    } catch {
      // keep existing list
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTeamMembers();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {paddingTop: insets.top + 18, paddingBottom: insets.bottom + 112},
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} colors={[GREEN]} />
        }>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{t('team')}</Text>
            <Text style={styles.subtitle}>{t('teamSubtitle')}</Text>
          </View>
          <View style={styles.countBadge}>
            <Icon name="Users" size={16} color={GREEN} />
            <Text style={styles.countBadgeText}>{teamMembers.length}</Text>
          </View>
        </View>

        {/* Loading / empty */}
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={GREEN} />
            <Text style={styles.loadingText}>Loading team...</Text>
          </View>
        ) : teamMembers.length === 0 ? (
          <View style={styles.emptyBox}>
            <Icon name="Users" size={32} color={MUTED} />
            <Text style={styles.emptyText}>No team members found</Text>
          </View>
        ) : null}

        {/* Team member cards */}
        {teamMembers.map(member => (
          <View key={member.id} style={styles.memberCard}>

            {/* Avatar */}
            <View style={[styles.avatar, {backgroundColor: member.bg}]}>
              <Text style={styles.avatarText}>{member.initials}</Text>
            </View>

            {/* Info */}
            <View style={styles.memberInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.memberName}>{member.name}</Text>
                <View style={styles.rolePill}>
                  <Text style={styles.rolePillText}>{member.role}</Text>
                </View>
              </View>

              <Text style={styles.memberId}>{member.id}</Text>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Icon name="LayoutGrid" size={13} color={MUTED} />
                  <Text style={styles.metaText}>{member.block}</Text>
                </View>
                <View style={styles.metaDot} />
                <View style={styles.metaItem}>
                  <Icon name="Phone" size={13} color={MUTED} />
                  <Text style={styles.metaText}>{member.contact}</Text>
                </View>
              </View>
            </View>

          </View>
        ))}
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  root:    { backgroundColor: '#FBFCFD', flex: 1 },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 18 },

  header: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 28,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { color: INK, fontSize: 42, fontWeight: '900', lineHeight: 50 },
  subtitle: { color: MUTED, fontSize: 15, fontWeight: '700', lineHeight: 21, marginTop: 6 },

  countBadge: {
    alignItems: 'center',
    backgroundColor: GREEN_SOFT,
    borderColor: GREEN_BORDER,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  countBadgeText: { color: GREEN, fontSize: 15, fontWeight: '900' },

  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: { color: MUTED, fontSize: 14, fontWeight: '700' },

  emptyBox: {
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: { color: MUTED, fontSize: 14, fontWeight: '600' },

  memberCard: {
    backgroundColor: '#FFFFFF',
    borderColor: CARD_BORDER,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#182033',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    marginRight: 14,
    width: 56,
  },
  avatarText: { color: GREEN, fontSize: 18, fontWeight: '900' },

  memberInfo: { flex: 1, minWidth: 0 },

  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 3,
  },
  memberName: { color: INK, fontSize: 16, fontWeight: '800' },

  rolePill: {
    backgroundColor: GREEN_SOFT,
    borderColor: GREEN_BORDER,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  rolePillText: { color: GREEN, fontSize: 11, fontWeight: '700' },

  memberId: { color: MUTED, fontSize: 11, fontWeight: '500', marginBottom: 8 },

  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaItem: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  metaText: { color: MUTED, fontSize: 12, fontWeight: '600' },
  metaDot: {
    backgroundColor: MUTED,
    borderRadius: 2,
    height: 4,
    opacity: 0.35,
    width: 4,
  },
});
