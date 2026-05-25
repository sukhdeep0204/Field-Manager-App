import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useState} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import {useLanguage} from '../context/LanguageContext';

const INK = '#070B1A';
const MUTED = '#43506F';
const GREEN = '#078B36';
const GREEN_SOFT = '#F3FCF6';
const GREEN_BORDER = '#BDEBCB';
const RED = '#E60000';
const RED_SOFT = '#FFF8F8';
const RED_BORDER = '#FF9D9D';
const BLUE = '#0B66F0';
const BLUE_SOFT = '#F7FBFF';
const BLUE_BORDER = '#93C5FD';
const ORANGE_TEXT = '#EA580C';
const CARD_BORDER = '#E6ECF2';

type Task = {
  title: string;
  farmId: string;
  location: string;
  farmerName: string;
  dueTime: string;
  description: string;
  assignedTo: string;
  priority: string;
  status: string;
  allocation: string;
};

type TaskGroup = {
  title: string;
  color: string;
  cardBg: string;
  borderColor: string;
  tasks: Task[];
};

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const {t} = useLanguage();
  const [activeTab, setActiveTab] = useState<'assigned' | 'pending' | 'completed'>('assigned');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});

  const visibleGroups =
    activeTab === 'assigned'
      ? TASK_GROUPS
      : activeTab === 'pending'
        ? PENDING_GROUPS
        : [];
  const assignedTaskCount = getTaskCount(TASK_GROUPS);
  const pendingTaskCount = getTaskCount(PENDING_GROUPS);

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
            <Text style={styles.title}>{t('tasks')}</Text>
            <Text style={styles.subtitle}>{t('tasksSubtitle')}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => Alert.alert(t('notifications'), t('taskNotifications'))}
            style={styles.bellButton}>
            <Icon name="Bell" size={24} color={INK} />
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => setActiveTab('assigned')}
            style={styles.tabButton}>
            <Text style={[styles.tabText, activeTab === 'assigned' && styles.activeTabText]}>
              {t('assigned')} ({assignedTaskCount})
            </Text>
            {activeTab === 'assigned' ? <View style={styles.activeIndicator} /> : null}
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => setActiveTab('pending')}
            style={styles.tabButton}>
            <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
              {t('pending')} ({pendingTaskCount})
            </Text>
            {activeTab === 'pending' ? <View style={styles.activeIndicator} /> : null}
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => setActiveTab('completed')}
            style={styles.tabButton}>
            <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
              {t('completed')}
            </Text>
            {activeTab === 'completed' ? <View style={styles.activeIndicator} /> : null}
          </TouchableOpacity>
        </View>

        {activeTab !== 'completed' ? (
          visibleGroups.map(group => (
            <View key={group.title} style={styles.group}>
              <Text style={[styles.groupTitle, {color: group.color}]}>
                {getGroupTitle(group.title, t)}
              </Text>
              {group.tasks.map(task => (
                <TaskCard
                  key={task.farmId}
                  task={task}
                  color={group.color}
                  cardBg={group.cardBg}
                  borderColor={group.borderColor}
                  onPress={() => setSelectedTask(task)}
                />
              ))}
            </View>
          ))
        ) : (
          <View style={styles.group}>
            <Text style={[styles.groupTitle, {color: GREEN}]}>{t('completed')} (2)</Text>
            {COMPLETED_TASKS.map(task => (
              <TaskCard
                key={task.farmId}
                task={task}
                color={GREEN}
                cardBg={GREEN_SOFT}
                borderColor={GREEN_BORDER}
                onPress={() => setSelectedTask(task)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <TaskDetailModal
        task={
          selectedTask
            ? {
                ...selectedTask,
                status: statusOverrides[selectedTask.farmId] ?? selectedTask.status,
              }
            : null
        }
        onClose={() => setSelectedTask(null)}
        onAssign={(member) => {
          Alert.alert(t('taskAllocation'), `${selectedTask?.title} - ${member}`);
        }}
        onStart={(task) => {
          setStatusOverrides(current => ({...current, [task.farmId]: 'Work Pending'}));
        }}
      />
    </View>
  );
}

function TaskCard({
  task,
  color,
  cardBg,
  borderColor,
  onPress,
}: {
  task: Task;
  color: string;
  cardBg: string;
  borderColor: string;
  onPress: () => void;
}) {
  const {language, t} = useLanguage();

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={[styles.taskCard, {backgroundColor: cardBg, borderColor}]}>
      <View style={[styles.cardAccent, {backgroundColor: color}]} />
      <View style={styles.taskDetails}>
        <Text style={styles.taskTitle}>{translateTaskText(task.title, language)}</Text>
        <DetailRow label={t('farmId')} value={task.farmId} />
        <DetailRow label={t('location')} value={task.location} />
        <DetailRow label={t('farmerName')} value={task.farmerName} />
        <DetailRow label={t('dueTime')} value={task.dueTime} valueColor={color} />
      </View>
    </TouchableOpacity>
  );
}

function TaskDetailModal({
  task,
  onClose,
  onAssign,
  onStart,
}: {
  task: Task | null;
  onClose: () => void;
  onAssign: (member: string) => void;
  onStart: (task: Task) => void;
}) {
  const {language, t} = useLanguage();
  const [staffDropdownOpen, setStaffDropdownOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState('Rahul');
  const isWorkPending = task?.status === 'Work Pending';
  const isCompleted = task?.status === 'Completed';

  return (
    <Modal animationType="fade" transparent visible={!!task} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.taskModal}>
          {task ? (
            <>
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleBlock}>
                    <Text style={styles.modalTitle}>{translateTaskText(task.title, language)}</Text>
                    <Text style={styles.modalSubtitle}>{task.farmId} • {task.location}</Text>
                  </View>
                  <TouchableOpacity activeOpacity={0.75} onPress={onClose} style={styles.modalClose}>
                    <Icon name="X" size={20} color={INK} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalStatusRow}>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>{translateTaskText(task.status, language)}</Text>
                  </View>
                  <View style={styles.priorityPill}>
                    <Text style={styles.priorityPillText}>{translateTaskText(task.priority, language)}</Text>
                  </View>
                </View>

                <View style={styles.topMapSection}>
                  <Text style={styles.modalSectionTitle}>{t('farmLocation')}</Text>
                  <View style={styles.mapPreview}>
                    <View style={styles.mapRoadHorizontal} />
                    <View style={styles.mapRoadVertical} />
                    <View style={styles.mapRoute} />
                    <View style={styles.mapMarker}>
                      <Icon name="MapPin" size={22} color="#FFFFFF" />
                    </View>
                    <View style={styles.mapLabel}>
                      <Text style={styles.mapLabelTitle}>{task.location}</Text>
                      <Text style={styles.mapLabelSub}>{task.farmId}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{t('taskDetails')}</Text>
                  <ModalInfoRow label={t('farmer')} value={task.farmerName} />
                  <ModalInfoRow label={t('dueTime')} value={task.dueTime} highlight />
                  <ModalInfoRow label={t('assignedTo')} value={task.assignedTo} />
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.dropdownLabel}>{t('assignStaff')}</Text>
                  <TouchableOpacity
                    activeOpacity={0.78}
                  disabled={isWorkPending || isCompleted}
                  onPress={() => setStaffDropdownOpen(open => !open)}
                  style={[
                    styles.dropdownButton,
                    (isWorkPending || isCompleted) && styles.dropdownButtonDisabled,
                  ]}>
                    <View style={styles.dropdownValue}>
                      <Icon name="UserRound" size={17} color={GREEN} />
                      <Text style={styles.dropdownValueText}>{selectedStaff}</Text>
                    </View>
                    <Icon
                      name={
                        isWorkPending || isCompleted
                          ? 'Lock'
                          : staffDropdownOpen
                            ? 'ChevronUp'
                            : 'ChevronDown'
                      }
                      size={19}
                      color={MUTED}
                    />
                  </TouchableOpacity>
                  {staffDropdownOpen && !isWorkPending && !isCompleted ? (
                    <View style={styles.dropdownList}>
                      {TEAM_MEMBERS.map(member => (
                        <TouchableOpacity
                          key={member}
                          activeOpacity={0.78}
                          onPress={() => {
                            setSelectedStaff(member);
                            setStaffDropdownOpen(false);
                            onAssign(member);
                          }}
                          style={styles.dropdownItem}>
                          <Text style={styles.dropdownItemText}>{member}</Text>
                          {selectedStaff === member ? (
                            <Icon name="Check" size={17} color={GREEN} />
                          ) : null}
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{t('workInstructions')}</Text>
                  <Text style={styles.modalBodyText}>{translateTaskText(task.description, language)}</Text>
                </View>
              </ScrollView>

              {!isCompleted ? (
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    disabled={isWorkPending}
                    activeOpacity={0.78}
                    onPress={() => {
                      onStart(task);
                      Alert.alert(
                        t('taskStarted'),
                        `${translateTaskText(task.title, language)} - ${t('workPending')}.`,
                      );
                    }}
                    style={[
                      styles.primaryAction,
                      isWorkPending && styles.pendingAction,
                    ]}>
                    <Text style={styles.primaryActionText}>
                      {isWorkPending ? t('workPending') : t('startTask')}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function ModalInfoRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.modalInfoRow}>
      <Text style={styles.modalInfoLabel}>{label}</Text>
      <Text style={[styles.modalInfoValue, highlight && styles.modalInfoHighlight]}>
        {value}
      </Text>
    </View>
  );
}

function DetailRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailColon}>:</Text>
      <Text style={[styles.detailValue, valueColor ? {color: valueColor} : null]}>
        {value}
      </Text>
    </View>
  );
}

function getTaskCount(groups: TaskGroup[]) {
  return groups.reduce((total, group) => total + group.tasks.length, 0);
}

function getGroupTitle(title: string, t: ReturnType<typeof useLanguage>['t']) {
  if (title.startsWith('Overdue')) {
    return `${t('overdue')} ${title.replace('Overdue', '')}`;
  }
  if (title.startsWith('Due Today')) {
    return `${t('dueToday')} ${title.replace('Due Today', '')}`;
  }
  if (title.startsWith('Upcoming')) {
    return `${t('upcoming')} ${title.replace('Upcoming', '')}`;
  }
  return title;
}

function translateTaskText(text: string, language: string) {
  if (language !== 'hi') {
    return text;
  }

  const hindiText: Record<string, string> = {
    'Land Verification': 'भूमि सत्यापन',
    'Farmer Meeting': 'किसान बैठक',
    'Document Collection': 'दस्तावेज संग्रह',
    'Land Survey': 'भूमि सर्वेक्षण',
    'Agreement Follow-up': 'अनुबंध फॉलो-अप',
    'Soil Sample Pickup': 'मिट्टी नमूना पिकअप',
    'Boundary Photo Upload': 'सीमा फोटो अपलोड',
    'High Priority': 'उच्च प्राथमिकता',
    'Medium Priority': 'मध्यम प्राथमिकता',
    'Normal Priority': 'सामान्य प्राथमिकता',
    Overdue: 'देरी से',
    Upcoming: 'आगामी',
    Completed: 'पूर्ण',
    'Due Today': 'आज देय',
    'Work Pending': 'कार्य लंबित',
    'Visit the farm and verify the land records and boundaries as per the official documents.':
      'फार्म पर जाकर आधिकारिक दस्तावेजों के अनुसार भूमि रिकॉर्ड और सीमाओं की पुष्टि करें।',
    'Meet the farmer to discuss current crop condition and upcoming plans.':
      'वर्तमान फसल स्थिति और आगामी योजनाओं पर चर्चा करने के लिए किसान से मिलें।',
    'Collect required documents and copies of land ownership proof.':
      'आवश्यक दस्तावेज और भूमि स्वामित्व प्रमाण की प्रतियां एकत्र करें।',
    'Conduct land survey and update the land information in the system.':
      'भूमि सर्वेक्षण करें और सिस्टम में भूमि जानकारी अपडेट करें।',
    'Follow up with the farmer regarding the agreement and pending documents.':
      'अनुबंध और लंबित दस्तावेजों के बारे में किसान से फॉलो-अप करें।',
    'Soil sample collected and submitted for testing.':
      'मिट्टी का नमूना एकत्र कर परीक्षण के लिए जमा किया गया।',
    'Farm boundary photos uploaded and verified.':
      'फार्म सीमा की फोटो अपलोड और सत्यापित की गई।',
  };

  return hindiText[text] ?? text;
}

const TASK_GROUPS: TaskGroup[] = [
  {
    title: 'Overdue (2)',
    color: RED,
    cardBg: RED_SOFT,
    borderColor: RED_BORDER,
    tasks: [
      {
        title: 'Land Verification',
        farmId: 'FM-10024',
        location: 'Bori, Durg',
        farmerName: 'Ramesh Yadav',
        dueTime: '20 May 2025, 05:00 PM',
        description:
          'Visit the farm and verify the land records and boundaries as per the official documents.',
        assignedTo: 'Rahul Sharma',
        priority: 'High Priority',
        status: 'Overdue',
        allocation:
          'Allocate this task to a field executive who can visit Bori today and verify the land documents.',
      },
      {
        title: 'Farmer Meeting',
        farmId: 'FM-10028',
        location: 'Jamgaon, Durg',
        farmerName: 'Suresh Patel',
        dueTime: '20 May 2025, 06:00 PM',
        description:
          'Meet the farmer to discuss current crop condition and upcoming plans.',
        assignedTo: 'Rahul Sharma',
        priority: 'High Priority',
        status: 'Overdue',
        allocation:
          'Assign a team member for farmer coordination and collect meeting notes after the visit.',
      },
    ],
  },
  {
    title: 'Due Today (1)',
    color: BLUE,
    cardBg: BLUE_SOFT,
    borderColor: BLUE_BORDER,
    tasks: [
      {
        title: 'Document Collection',
        farmId: 'FM-10035',
        location: 'Bori, Durg',
        farmerName: 'Mahesh Sahu',
        dueTime: '21 May 2025, 07:00 PM',
        description:
          'Collect required documents and copies of land ownership proof.',
        assignedTo: 'Rahul Sharma',
        priority: 'Medium Priority',
        status: 'Due Today',
        allocation:
          'Allocate document collection to a field executive carrying the verification checklist.',
      },
    ],
  },
  {
    title: 'Upcoming (2)',
    color: GREEN,
    cardBg: GREEN_SOFT,
    borderColor: GREEN_BORDER,
    tasks: [
      {
        title: 'Land Survey',
        farmId: 'FM-10040',
        location: 'Koni, Durg',
        farmerName: 'Gopal Verma',
        dueTime: '23 May 2025, 10:00 AM',
        description: 'Conduct land survey and update the land information in the system.',
        assignedTo: 'Rahul Sharma',
        priority: 'Normal Priority',
        status: 'Upcoming',
        allocation:
          'Assign the survey to a team member with GPS access and land measurement tools.',
      },
      {
        title: 'Agreement Follow-up',
        farmId: 'FM-10045',
        location: 'Bhilai, Durg',
        farmerName: 'Raju Singh',
        dueTime: '24 May 2025, 11:00 AM',
        description:
          'Follow up with the farmer regarding the agreement and pending documents.',
        assignedTo: 'Rahul Sharma',
        priority: 'Normal Priority',
        status: 'Upcoming',
        allocation:
          'Allocate follow-up to the coordinator responsible for pending agreement paperwork.',
      },
    ],
  },
];

const PENDING_GROUPS = TASK_GROUPS.slice(0, 2);

const COMPLETED_TASKS: Task[] = [
  {
    title: 'Soil Sample Pickup',
    farmId: 'FM-10018',
    location: 'Bori, Durg',
    farmerName: 'Nitin Sahu',
    dueTime: '19 May 2025, 12:00 PM',
    description: 'Soil sample collected and submitted for testing.',
    assignedTo: 'Rahul Sharma',
    priority: 'Completed',
    status: 'Completed',
    allocation: 'No allocation needed. Task has already been completed.',
  },
  {
    title: 'Boundary Photo Upload',
    farmId: 'FM-10021',
    location: 'Kumhari, Durg',
    farmerName: 'Amit Verma',
    dueTime: '19 May 2025, 03:00 PM',
    description: 'Farm boundary photos uploaded and verified.',
    assignedTo: 'Rahul Sharma',
    priority: 'Completed',
    status: 'Completed',
    allocation: 'No allocation needed. Task has already been completed.',
  },
];

const TEAM_MEMBERS = ['Rahul', 'Amit', 'Priya', 'Sandeep'];

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
  tabs: {
    borderBottomColor: '#DCE3EA',
    borderBottomWidth: 1,
    flexDirection: 'row',
    marginBottom: 20,
  },
  tabButton: {
    alignItems: 'center',
    flex: 1,
    height: 48,
    justifyContent: 'center',
  },
  tabText: {
    color: MUTED,
    fontSize: 15,
    fontWeight: '800',
  },
  activeTabText: {
    color: GREEN,
  },
  activeIndicator: {
    backgroundColor: GREEN,
    borderRadius: 2,
    bottom: -1,
    height: 3,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  group: {
    marginBottom: 16,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
    marginBottom: 10,
  },
  taskCard: {
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 13,
    minHeight: 132,
    overflow: 'hidden',
    paddingBottom: 15,
    paddingLeft: 13,
    paddingRight: 11,
    paddingTop: 14,
    shadowColor: '#182033',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.04,
    shadowRadius: 14,
  },
  cardAccent: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 2,
  },
  taskDetails: {
    minWidth: 0,
  },
  taskTitle: {
    color: INK,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 25,
    marginBottom: 14,
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 6,
  },
  detailLabel: {
    color: INK,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
    width: 91,
  },
  detailColon: {
    color: INK,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
    textAlign: 'center',
    width: 14,
  },
  detailValue: {
    color: INK,
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(7, 11, 26, 0.42)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  taskModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    maxHeight: '82%',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 16},
    shadowOpacity: 0.18,
    shadowRadius: 24,
    width: '100%',
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingBottom: 8,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  modalHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitleBlock: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  modalTitle: {
    color: INK,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  modalSubtitle: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 3,
  },
  modalClose: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: CARD_BORDER,
    borderRadius: 15,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  modalStatusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statusPill: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusPillText: {
    color: ORANGE_TEXT,
    fontSize: 12,
    fontWeight: '900',
  },
  priorityPill: {
    backgroundColor: '#F8FAFC',
    borderColor: CARD_BORDER,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  priorityPillText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '900',
  },
  modalSection: {
    borderTopColor: CARD_BORDER,
    borderTopWidth: 1,
    paddingTop: 13,
    marginTop: 13,
  },
  topMapSection: {
    borderTopColor: CARD_BORDER,
    borderTopWidth: 1,
    paddingTop: 13,
  },
  modalSectionTitle: {
    color: INK,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
    marginBottom: 9,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 7,
  },
  modalInfoLabel: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '700',
  },
  modalInfoValue: {
    color: INK,
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
    marginLeft: 14,
    textAlign: 'right',
  },
  modalInfoHighlight: {
    color: BLUE,
  },
  mapPreview: {
    backgroundColor: '#EAF3ED',
    borderColor: '#CBD5E1',
    borderRadius: 12,
    borderWidth: 1,
    height: 138,
    overflow: 'hidden',
    position: 'relative',
  },
  mapRoadHorizontal: {
    backgroundColor: '#FFFFFF',
    height: 22,
    left: -12,
    position: 'absolute',
    right: -12,
    top: 62,
    transform: [{rotate: '-8deg'}],
  },
  mapRoadVertical: {
    backgroundColor: '#FFFFFF',
    bottom: -20,
    left: 102,
    position: 'absolute',
    top: -20,
    transform: [{rotate: '18deg'}],
    width: 24,
  },
  mapRoute: {
    borderColor: GREEN,
    borderRadius: 20,
    borderStyle: 'dashed',
    borderWidth: 2,
    height: 70,
    left: 42,
    position: 'absolute',
    top: 32,
    transform: [{rotate: '-13deg'}],
    width: 170,
  },
  mapMarker: {
    alignItems: 'center',
    backgroundColor: RED,
    borderColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 3,
    height: 40,
    justifyContent: 'center',
    left: '48%',
    position: 'absolute',
    top: 38,
    width: 40,
  },
  mapLabel: {
    backgroundColor: '#FFFFFF',
    borderColor: CARD_BORDER,
    borderRadius: 10,
    borderWidth: 1,
    bottom: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    position: 'absolute',
  },
  mapLabelTitle: {
    color: INK,
    fontSize: 13,
    fontWeight: '900',
  },
  mapLabelSub: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  modalBodyText: {
    color: INK,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  dropdownLabel: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
    marginTop: 10,
  },
  dropdownButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: CARD_BORDER,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    height: 40,
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  dropdownButtonDisabled: {
    backgroundColor: '#F1F5F9',
  },
  dropdownValue: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  dropdownValueText: {
    color: INK,
    fontSize: 15,
    fontWeight: '900',
  },
  dropdownList: {
    backgroundColor: '#FFFFFF',
    borderColor: CARD_BORDER,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden',
  },
  dropdownItem: {
    alignItems: 'center',
    borderBottomColor: CARD_BORDER,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 36,
    paddingHorizontal: 12,
  },
  dropdownItemText: {
    color: INK,
    fontSize: 14,
    fontWeight: '800',
  },
  modalActions: {
    backgroundColor: '#FFFFFF',
    borderTopColor: CARD_BORDER,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  secondaryAction: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: CARD_BORDER,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    height: 44,
    justifyContent: 'center',
  },
  secondaryActionText: {
    color: MUTED,
    fontSize: 15,
    fontWeight: '900',
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: GREEN,
    borderRadius: 10,
    flex: 1,
    height: 44,
    justifyContent: 'center',
  },
  pendingAction: {
    backgroundColor: '#64748B',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});
