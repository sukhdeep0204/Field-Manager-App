import {
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {Camera, CameraType, type CameraApi} from 'react-native-camera-kit';
import Icon from '../components/Icon';
import { useLanguage } from '../context/LanguageContext';
import {API_BASE_URL} from '../config';
import {loadSession, type FarmDetail, type FarmerDetail} from '../auth/session';
import StockIssuePopup, {type StockIssuedItem} from '../components/StockIssuePopup';
import InventoryStepPopup from '../components/steps/InventoryStepPopup';
import LogisticsStepPopup from '../components/steps/LogisticsStepPopup';
import CultivationStepPopup from '../components/steps/CultivationStepPopup';
import InspectionStepPopup from '../components/steps/InspectionStepPopup';
import OthersStepPopup from '../components/steps/OthersStepPopup';

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
  taskId?: string;
  calanderId?: string;
  title: string;
  farmId: string;
  location: string;
  farmerName: string;
  dueTime: string;
  assignedAcres?: string;
  vehicles?: Array<{
    vehicle_id?: string;
    vendor_id?: string;
    vehicle_number: string;
  }>;
  equipment?: Array<{
    equipment_name: string;
    quantity: number;
    vendor_id?: string;
  }>;
  equipmentOtp?: string;
  transportCoordinationStatus?: string;
  equipmentCoordinationStatus?: string;
  description: string;
  assignedTo: string;
  priority: string;
  status: string;
  allocation: string;
  subTasks?: SubTask[];
  onDemandSteps?: OnDemandSteps;
};

type ApiTask = {
  equipment_otp?: string;
  calander_id?: string;
  trasport_coordination_status?: string;
  transport_coordination_status?: string;
  equipment_coordination_status?: string;
  task_id: string;
  feild_id: string[];
  farmer_name: string;
  assigned_acres: Array<{
    date: string;
    activity: string;
    assigned_acres: number;
    farm_id: string;
  }>;
  status: {
    feild_manager_status: string;
    farmer_status: string;
    supervisor_status: string;
  };
  vehicles: Array<{
    vehicle_id?: string;
    vendor_id?: string;
    vehicle_number: string;
  }>;
  equipment: Array<{
    equipment_name: string;
    equipment_id?: string;
    vendor_id?: string;
    quantity: number;
  }>;
  steps?: OnDemandSteps;
};

type ApiFieldVisitTask = {
  task_id: string;
  feild_id: string[];
  assigned_acres: Array<{
    date: string;
    activity: string;
    assigned_acres: number;
    farm_id: string;
  }>;
  allocation_schema: Array<{
    allocated_acres: number;
    farm_id: string;
    completed_acres: number;
  }>;
  created_at: string;
};

type ApiOnDemandTask = {
  task_id: string;
  staff_id: string;
  created_at: string;
  steps_dict: OnDemandSteps;
};

type FieldVisit = {
  id: string;
  landId: string;
  location: string;
  farmerName: string;
  activity: string;
  scheduledDate: string;
  scheduledTime: string;
  color: string;
  bg: string;
  items: Array<{ name: string; expected: number }>;
  borewells: number;
  assignedAcres: number;
  allocatedAcres: number;
};

type TransportVehicle = {
  vehicle_number: string;
  vehicle_model: string;
  driver_contact: string;
  driver_name: string;
};

type VendorDetail = {
  vendor_name: string;
  vendor_contact: string;
};

type FarmerDetails = {
  owner_name?: string;
  address?: string;
  farmer_id?: string;
  contact?: string;
};

type LandData = {
  land_coordinates?: number[][];
  farming_option?: string;
  state?: string;
  village?: string;
  district?: string;
  land_media?: { images?: string[]; video?: string };
};

type FarmDetails = {
  area?: number;
  land_data?: LandData;
  crop_type?: string;
  farm_id?: string;
};

type OnDemandStepData = {
  // inventory
  item_name?: string;
  unit?: string;
  quantity?: number;
  equipment_id?: string;
  // logistics
  vehicle_id?: string;
  vehicle_number?: string;
  // cultivation
  due_date?: string;
  activity?: string;
  farmer_details?: FarmerDetails;
  farm_details?: FarmDetails;
  farm_id?: string;
  // inspection — each data item is one field
  field_name?: string;
  input_type?: string;
  mandetory?: boolean;
  response?: string | null;
  options?: string[];
  // others
  description?: string;
};

type OnDemandStep = {
  type: 'logistics' | 'inventory' | 'cultivation' | 'inspection' | 'others';
  data: OnDemandStepData[];
  status: 'pending' | 'completed';
  equipment_otp?: string;
  task_media?: string[];
};

type OnDemandSteps = Record<string, OnDemandStep>;

type SubTask = {
  id: string;
  title: string;
  type: 'inventory' | 'field';
  assignedTo: string;
  status: 'Assigned' | 'Pending' | 'Completed';
  description: string;
  itemName?: string;
  quantity?: string;
  receivingCode?: string;
  pickupPoint?: string;
  destination?: string;
  requiresPickupImage?: boolean;
  requiresDropImage?: boolean;
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
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<
    'assigned' | 'pending' | 'completed'
  >('assigned');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [stepPopup, setStepPopup] = useState<{ task: Task; key: string } | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, string>
  >({});
  const [stockPopupOpen, setStockPopupOpen] = useState(false);
  const [stockTask, setStockTask] = useState<Task | null>(null);
  const [issuedItems, setIssuedItems] = useState<StockIssuedItem[]>([]);
  const [apiTasks, setApiTasks] = useState<Task[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [onDemandTasks, setOnDemandTasks] = useState<Task[]>([]);

  const fetchTasks = async () => {
    try {
      const session = await loadSession();
      const farmIds = session?.farmAccess?.farm_ids ?? [];
      const farmDetails = session?.farmDetails ?? [];
      if (!farmIds.length) {
        return;
      }

      const response = await fetch(`${API_BASE_URL}/feild_manager/get_all_tasks`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({farm_id: farmIds}),
      });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data?.tasks)) {
        return;
      }

      setApiTasks(mapApiTasksToUi(data.tasks as ApiTask[], farmDetails));
    } catch {
      // keep mock fallback
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchIssuedItems();
    fetchOnDemandTasks();
  }, []);

  const fetchOnDemandTasks = async () => {
    try {
      const session = await loadSession();
      const staffId = session?.profile?.staff_id;
      if (!staffId) { return; }
      const res = await fetch(
        `${API_BASE_URL}/admin_ops_requests/get_on_demand_task/${encodeURIComponent(staffId)}`,
      );
      const data = await res.json();
      if (!res.ok || !Array.isArray(data?.on_demand_tasks)) { return; }

      const mapped: Task[] = (data.on_demand_tasks as ApiOnDemandTask[]).map(item => ({
        taskId: item.task_id,
        title: 'On Demand Task',
        farmId: item.task_id,
        location: '',
        farmerName: 'Admin Assigned',
        dueTime: formatOnDemandDate(item.created_at),
        description: '',
        assignedTo: item.staff_id,
        priority: 'Normal',
        status: 'Assigned',
        allocation: '',
        onDemandSteps: item.steps_dict,
      }));

      setOnDemandTasks(mapped);
    } catch {
      // keep empty
    }
  };

  const fetchIssuedItems = async () => {
    try {
      const session = await loadSession();
      const staffId = session?.profile?.staff_id;
      if (!staffId) { return; }
      const res = await fetch(`${API_BASE_URL}/inventory/get_my_issued_items/${encodeURIComponent(staffId)}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data?.issued_items)) {
        setIssuedItems(data.issued_items as StockIssuedItem[]);
      }
    } catch {
      // keep empty
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchTasks(), fetchOnDemandTasks()]);
    setRefreshing(false);
  };


  const [taskFilter, setTaskFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const taskSource = [
    ...(apiTasks.length ? apiTasks : flattenGroups(TASK_GROUPS)),
    ...onDemandTasks,
    ...(apiTasks.length === 0 && onDemandTasks.length === 0 ? [DEMO_ON_DEMAND_TASK] : []),
  ];
  const assignedTasks = taskSource.filter(
    task => task.status.toLowerCase() === 'assigned' || task.status.toLowerCase() === 'in progress',
  );
  const pendingTasks = taskSource.filter(
    task => task.status.toLowerCase() === 'pending' || task.status.toLowerCase() === 'work pending',
  );
  const completedTasks = taskSource.filter(task => task.status.toLowerCase() === 'completed');

  const tabTasks =
    activeTab === 'assigned'
      ? assignedTasks
      : activeTab === 'pending'
      ? pendingTasks
      : completedTasks;

  const visibleTasks = taskFilter === 'all'
    ? tabTasks
    : tabTasks.filter(task => {
        const d = parseDueDate(task.dueTime);
        if (!d) { return false; }
        const now = new Date();
        if (taskFilter === 'today') {
          return d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth() &&
            d.getDate() === now.getDate();
        }
        if (taskFilter === 'week') {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          return d >= startOfWeek && d <= endOfWeek;
        }
        if (taskFilter === 'month') {
          return d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth();
        }
        return true;
      });
  const assignedTaskCount = assignedTasks.length;
  const pendingTaskCount = pendingTasks.length;

  const cardColor = activeTab === 'completed' ? GREEN : activeTab === 'pending' ? ORANGE_TEXT : BLUE;
  const cardBg = activeTab === 'completed' ? GREEN_SOFT : activeTab === 'pending' ? '#FFF7ED' : BLUE_SOFT;
  const cardBorderColor = activeTab === 'completed' ? GREEN_BORDER : activeTab === 'pending' ? '#FED7AA' : BLUE_BORDER;

  return (
    <View style={styles.root}>
      <FlatList
        style={styles.scroll}
        data={visibleTasks}
        keyExtractor={(task) => `${task.farmId}-${task.dueTime}-${task.title}`}
        renderItem={({ item: task }) =>
          task.onDemandSteps ? (
            <OnDemandTaskCard
              task={task}
              onStepPress={(key) => setStepPopup({ task, key })}
            />
          ) : (
            <TaskCard
              task={task}
              color={cardColor}
              cardBg={cardBg}
              borderColor={cardBorderColor}
              onPress={() => setSelectedTask(task)}
              onIssueItem={() => { setStockTask(task); setStockPopupOpen(true); }}
            />
          )
        }
        ListHeaderComponent={(
          <View>
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={styles.title}>{t('tasks')}</Text>
                <Text style={styles.subtitle}>{t('tasksSubtitle')}</Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() =>
                  Alert.alert(t('notifications'), t('taskNotifications'))
                }
                style={styles.bellButton}
              >
                <Icon name="Bell" size={24} color={INK} />
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationText}>3</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.tabs}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => { setActiveTab('assigned'); setTaskFilter('all'); }}
                style={styles.tabButton}
              >
                <Text style={[styles.tabText, activeTab === 'assigned' && styles.activeTabText]}>
                  {t('assigned')} ({assignedTaskCount})
                </Text>
                {activeTab === 'assigned' ? <View style={styles.activeIndicator} /> : null}
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => { setActiveTab('pending'); setTaskFilter('all'); }}
                style={styles.tabButton}
              >
                <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
                  {t('pending')} ({pendingTaskCount})
                </Text>
                {activeTab === 'pending' ? <View style={styles.activeIndicator} /> : null}
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => { setActiveTab('completed'); setTaskFilter('all'); }}
                style={styles.tabButton}
              >
                <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
                  {t('completed')}
                </Text>
                {activeTab === 'completed' ? <View style={styles.activeIndicator} /> : null}
              </TouchableOpacity>
            </View>
            <View style={styles.filterBar}>
              {(['all', 'today', 'week', 'month'] as const).map(f => (
                <TouchableOpacity
                  key={f}
                  activeOpacity={0.78}
                  onPress={() => setTaskFilter(f)}
                  style={[styles.filterChip, taskFilter === f && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, taskFilter === f && styles.filterChipTextActive]}>
                    {f === 'all' ? 'All' : f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'This Month'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={GREEN}
            colors={[GREEN]}
          />
        }
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 112 },
        ]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
      />

      <TaskDetailModal
        task={
          selectedTask && !selectedTask.onDemandSteps
            ? {
                ...selectedTask,
                status:
                  statusOverrides[selectedTask.farmId] ?? selectedTask.status,
              }
            : null
        }
        onClose={() => setSelectedTask(null)}
      />


      {/* Step-type popups — rendered at root level to avoid nested-Modal issue */}
      {stepPopup && stepPopup.task.onDemandSteps?.[stepPopup.key] ? (() => {
        const step = stepPopup.task.onDemandSteps![stepPopup.key];
        const props = {
          visible: true as const,
          step,
          stepKey: stepPopup.key,
          taskId: stepPopup.task.taskId,
          onClose: () => setStepPopup(null),
          onComplete: () => setStepPopup(null),
        };
        switch (step.type) {
          case 'inventory':   return <InventoryStepPopup   {...props} />;
          case 'logistics':   return <LogisticsStepPopup   {...props} />;
          case 'cultivation': return <CultivationStepPopup {...props} />;
          case 'inspection':  return <InspectionStepPopup  {...props} />;
          default:            return <OthersStepPopup      {...props} />;
        }
      })() : null}

      <StockIssuePopup
        visible={stockPopupOpen}
        taskTitle={stockTask ? stockTask.title : ''}
        farmId={stockTask ? stockTask.farmId : ''}
        issuedItems={issuedItems}
        vehicles={stockTask?.vehicles ?? []}
        onClose={() => { setStockPopupOpen(false); setStockTask(null); }}
        onConfirm={allocations => {
          console.log('[stock] allocation confirmed', allocations);
          setStockPopupOpen(false);
          setStockTask(null);
        }}
      />
    </View>
  );
}

function OnDemandTaskCard({
  task,
  onStepPress,
}: {
  task: Task;
  onStepPress: (stepKey: string) => void;
}) {
  const steps = task.onDemandSteps ?? {};
  const sortedSteps = Object.entries(steps).sort(([a], [b]) =>
    parseInt(a.replace('step_', ''), 10) - parseInt(b.replace('step_', ''), 10),
  );
  const total = sortedSteps.length;
  const done = sortedSteps.filter(([, s]) => s.status === 'completed').length;

  return (
    <View style={styles.odCard}>

      {/* ── Header + meta (non-interactive) ── */}
      <View style={styles.odCardHeader}>
        <View style={styles.odCardIconWrap}>
          <Icon name="Zap" size={16} color={ORANGE_TEXT} />
        </View>
        <View style={styles.odCardTitleWrap}>
          <Text style={styles.odCardTitle} numberOfLines={1}>{task.title}</Text>
          <Text style={styles.odCardSub} numberOfLines={1}>
            {task.farmerName} · {task.farmId}
          </Text>
        </View>
        <View style={styles.odCardBadge}>
          <Text style={styles.odCardBadgeText}>On Demand</Text>
        </View>
      </View>

      <View style={styles.odCardMeta}>
        <Icon name="CalendarDays" size={12} color={MUTED} />
        <Text style={styles.odCardDateText}>{task.dueTime}</Text>
        <View style={styles.odCardCountPill}>
          <Text style={styles.odCardStepCount}>{done}/{total} done</Text>
        </View>
      </View>

      {/* ── Flowchart — each node is tappable ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.odFlowScroll}
      >
        {sortedSteps.map(([key, step], i) => {
          const cfg = STEP_TYPE_CONFIG[step.type] ?? STEP_TYPE_CONFIG.others;
          const isDone = step.status === 'completed';
          const isActive = !isDone && i === done;
          const nodeColor = isDone ? GREEN : isActive ? cfg.color : '#B0BDC8';
          const nodeBg = isDone ? GREEN_SOFT : isActive ? cfg.bg : '#F4F6F8';
          return (
            <View key={key} style={styles.odFlowItem}>
              {/* Step node — tappable */}
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={() => onStepPress(key)}
                style={[styles.odFlowNode, { borderColor: nodeColor, backgroundColor: nodeBg }]}
              >
                <View style={[styles.odFlowNodeTop, { backgroundColor: nodeColor + '28' }]}>
                  <Icon name={cfg.icon} size={26} color={nodeColor} />
                  <Text style={[styles.odFlowNodeType, { color: nodeColor }]}>{cfg.label}</Text>
                </View>
                <View style={[styles.odFlowStatus, { backgroundColor: nodeColor + '18' }]}>
                  <View style={[styles.odFlowDot, { backgroundColor: nodeColor }]} />
                  <Text style={[styles.odFlowStatusText, { color: nodeColor }]}>
                    {isDone ? 'Done' : 'Pending'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Connector */}
              {i < total - 1 ? (
                <View style={styles.odFlowConnector}>
                  <View style={[styles.odFlowLine, { backgroundColor: isDone ? GREEN : CARD_BORDER }]} />
                  <Icon name="ChevronRight" size={13} color={isDone ? GREEN : '#B0BDC8'} />
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

    </View>
  );
}

function TaskCard({
  task,
  color,
  onPress,
  onIssueItem,
}: {
  task: Task;
  color: string;
  cardBg: string;
  borderColor: string;
  onPress: () => void;
  onIssueItem?: () => void;
}) {
  const { language } = useLanguage();
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const transportDone = (task.transportCoordinationStatus || '').toLowerCase() === 'completed';
  const equipmentDone = (task.equipmentCoordinationStatus || '').toLowerCase() === 'completed';
  const hasTransport = Boolean(task.vehicles?.length);
  const isCompleted = task.status.toLowerCase() === 'completed';

  return (
    <TouchableOpacity activeOpacity={0.95} onPress={onPress} style={styles.taskCard2}>

      {/* ── Land Visual Strip ── */}
      <View style={styles.landStrip}>
        {[0,1,2,3,4,5,6,7,8,9].map(i => (
          <View key={i} style={[styles.fieldRowLine, { top: 6 + i * 11 }]} />
        ))}
        <View style={styles.landStripOverlay} />
        <View style={styles.landStripContent}>
          <View style={styles.farmIdBadge}>
            <Icon name="MapPin" size={10} color="#FFFFFF" />
            <Text style={styles.farmIdBadgeText} numberOfLines={1}>
              {task.farmId.length > 12 ? task.farmId.slice(0, 12) + '…' : task.farmId}
            </Text>
          </View>
          <View style={styles.acresBadge}>
            <Icon name="Sprout" size={10} color={GREEN} />
            <Text style={styles.acresBadgeText}>{task.assignedAcres ?? '-'} ac</Text>
          </View>
        </View>
      </View>

      {/* ── Task Info ── */}
      <View style={styles.taskCardBody}>
        <View style={styles.taskCardTitleRow}>
          <Text style={styles.taskCardActivity} numberOfLines={1}>
            {translateTaskText(task.title, language)}
          </Text>
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => setAssignOpen(o => !o)}
            style={[styles.assignSelector, { borderColor: color + '60', backgroundColor: color + '0E' }]}>
            <Icon name="UserPlus" size={11} color={color} />
            <Text style={[styles.assignSelectorText, { color }]} numberOfLines={1}>
              {assignedTo ?? 'Assign To'}
            </Text>
            <Icon name={assignOpen ? 'ChevronUp' : 'ChevronDown'} size={11} color={color} />
          </TouchableOpacity>
        </View>

        {assignOpen ? (
          <View style={styles.assignDropdown}>
            {TASK_SUPERVISORS.map(name => (
              <TouchableOpacity
                key={name}
                activeOpacity={0.78}
                onPress={() => { setAssignedTo(name); setAssignOpen(false); }}
                style={styles.assignDropdownItem}>
                <Icon name="User" size={13} color={assignedTo === name ? color : MUTED} />
                <Text style={[styles.assignDropdownName, assignedTo === name && { color }]}>{name}</Text>
                {assignedTo === name ? <Icon name="Check" size={13} color={color} /> : null}
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <View style={styles.taskCardInfoRow}>
          <Icon name="User" size={12} color={MUTED} />
          <Text style={styles.taskCardInfoText} numberOfLines={1}>{task.farmerName}</Text>
          <View style={styles.infoDot} />
          <Icon name="MapPin" size={12} color={MUTED} />
          <Text style={styles.taskCardInfoText} numberOfLines={1}>{task.location}</Text>
        </View>

        <View style={styles.taskCardDueRow}>
          <Icon name="CalendarDays" size={12} color={color} />
          <Text style={[styles.taskCardDueText, { color }]}>Due: {task.dueTime}</Text>
        </View>
      </View>

      {/* ── Divider ── */}
      <View style={styles.taskCardDivider} />

      {/* ── Action Chips ── */}
      <View style={styles.taskActionsWrap}>
        {hasTransport ? (
          <TaskActionChip icon="Truck" label="Transport" done={transportDone} color={color} onPress={onPress} />
        ) : null}
        <TaskActionChip icon="Settings2" label="Equipment" done={equipmentDone} color={color} onPress={onPress} />
        <TaskActionChip icon="PackagePlus" label="Issue Item" done={false} color={color} onPress={() => onIssueItem ? onIssueItem() : onPress()} />
      </View>

      {/* ── Complete Task Button ── */}
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={onPress}
        style={[styles.completeTaskBtn, isCompleted && styles.completeTaskBtnDone, { borderColor: color + '60' }]}
      >
        <Icon name={isCompleted ? 'CheckCircle2' : 'CircleCheck'} size={15} color={isCompleted ? GREEN : color} />
        <Text style={[styles.completeTaskBtnText, { color: isCompleted ? GREEN : color }]}>
          {isCompleted ? 'Completed' : 'Complete Task'}
        </Text>
      </TouchableOpacity>

    </TouchableOpacity>
  );
}

const TASK_SUPERVISORS = [
  'Rahul Sharma',
  'Priya Singh',
  'Amit Kumar',
  'Sunita Verma',
  'Deepak Patel',
];

function TaskActionChip({
  icon,
  label,
  done,
  color,
  onPress,
}: {
  icon: string;
  label: string;
  done: boolean;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.78}
      onPress={onPress}
      style={[styles.taskActionChip, done ? styles.taskActionChipDone : { borderColor: color + '50', backgroundColor: color + '0C' }]}
    >
      <Icon name={done ? 'CheckCircle2' : icon} size={12} color={done ? GREEN : color} />
      <Text style={[styles.taskActionChipText, { color: done ? GREEN : color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function TaskDetailModal({
  task,
  onClose,
}: {
  task: Task | null;
  onClose: () => void;
}) {
  const { language } = useLanguage();
  const [transportDone, setTransportDone] = useState(false);
  const [equipmentDone, setEquipmentDone] = useState(false);
  const [equipmentReceiptAttached, setEquipmentReceiptAttached] = useState(false);
  const [equipmentImageUrl, setEquipmentImageUrl] = useState('');
  const [uploadingEquipmentImage, setUploadingEquipmentImage] = useState(false);
  const [completedAcres, setCompletedAcres] = useState('');
  const [taskPhotos, setTaskPhotos] = useState<Array<string | null>>([
    null,
    null,
    null,
  ]);
  const [equipmentPhotos, setEquipmentPhotos] = useState<Array<string | null>>([null]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [activePhotoSlot, setActivePhotoSlot] = useState<number | null>(null);
  const [cameraTarget, setCameraTarget] = useState<'task' | 'equipment'>('task');
  const [taskMarkedCompleted, setTaskMarkedCompleted] = useState(false);
  const [completingTask, setCompletingTask] = useState(false);
  const [uploadingTaskImages, setUploadingTaskImages] = useState(false);
  const [taskProgressImageUrls, setTaskProgressImageUrls] = useState<string[]>([]);
  const [transportVehicles, setTransportVehicles] = useState<TransportVehicle[]>([]);
  const [transportVendor, setTransportVendor] = useState<VendorDetail | null>(null);
  const [equipmentVendor, setEquipmentVendor] = useState<VendorDetail | null>(null);
  const [completedSubTasks, setCompletedSubTasks] = useState<Record<string, boolean>>({});
  const [pickupProofs, setPickupProofs] = useState<Record<string, boolean>>({});
  const [dropProofs, setDropProofs] = useState<Record<string, boolean>>({});
  const [subTaskOwners] = useState<Record<string, string>>({});
  const prerequisiteSubTasks =
    task?.subTasks?.filter(subTask => !isMainTaskSubTask(task, subTask)) ?? [];
  const isWorkPending = task?.status === 'Work Pending';
  const isCompleted = task?.status === 'Completed';
  const hasBlockedSubTasks = Boolean(
    prerequisiteSubTasks.some(
      subTask =>
        subTask.status !== 'Completed' && !completedSubTasks[subTask.id],
    ),
  );
  const completedPrerequisites = prerequisiteSubTasks.filter(
    subTask => subTask.status === 'Completed' || completedSubTasks[subTask.id],
  ).length;
  const { dueDate, dueClock } = getDueParts(task?.dueTime);
  const hasTransportCoordination = Boolean(task?.vehicles?.length);
  const hasEquipmentCoordination = true;
  const equipmentItems = task?.equipment ?? [];

  const markPickupProof = (subTask: SubTask) => {
    setPickupProofs(current => ({ ...current, [subTask.id]: true }));
    Alert.alert('Pickup image', 'Pickup proof uploaded.');
  };

  const markDropProof = (subTask: SubTask) => {
    if (subTask.requiresPickupImage && !pickupProofs[subTask.id]) {
      Alert.alert(
        'Pickup proof required',
        'Upload pickup image before drop completion.',
      );
      return;
    }
    setDropProofs(current => ({ ...current, [subTask.id]: true }));
    Alert.alert('Drop image', 'Completion proof uploaded.');
  };

  const markSubTaskDone = (subTask: SubTask) => {
    if (subTask.requiresDropImage && !dropProofs[subTask.id]) {
      Alert.alert(
        'Completion proof required',
        'Upload drop completion image first.',
      );
      return;
    }
    setCompletedSubTasks(current => ({ ...current, [subTask.id]: true }));
  };

  let cameraRef: CameraApi | null = null;

  const openCameraForSlot = (index: number, target: 'task' | 'equipment') => {
    setCameraTarget(target);
    setActivePhotoSlot(index);
    setCameraOpen(true);
  };

  const captureTaskPhoto = async () => {
    if (!cameraRef || activePhotoSlot === null) {
      return;
    }

    try {
      const captured = await cameraRef.capture();
      if (cameraTarget === 'task') {
        setTaskPhotos(current => {
          const next = [...current];
          next[activePhotoSlot] = captured.uri;
          return next;
        });
        setTaskProgressImageUrls([]);
        setTaskMarkedCompleted(false);
      } else {
        setEquipmentPhotos(current => {
          const next = [...current];
          next[activePhotoSlot] = captured.uri;
          return next;
        });
        setEquipmentReceiptAttached(false);
        setEquipmentImageUrl('');
      }
      setCameraOpen(false);
      setActivePhotoSlot(null);
    } catch {
      Alert.alert('Camera', 'Unable to capture photo right now.');
    }
  };

  const removeTaskPhoto = (index: number) => {
    setTaskPhotos(current => {
      const next = [...current];
      next[index] = null;
      return next;
    });
    setTaskProgressImageUrls([]);
    setTaskMarkedCompleted(false);
  };

  const removeEquipmentPhoto = (index: number) => {
    setEquipmentPhotos(current => {
      const next = [...current];
      next[index] = null;
      return next;
    });
    setEquipmentReceiptAttached(false);
    setEquipmentImageUrl('');
  };

  const uploadTaskProgressImage = async (uri: string) => {
    if (!task?.taskId) {
      return null;
    }
    const formData = new FormData();
    formData.append('task_id', task.taskId);
    formData.append('image', {
      uri,
      type: 'image/jpeg',
      name: `task-progress-${Date.now()}.jpg`,
    } as any);

    const response = await fetch(
      `${API_BASE_URL}/admin_all_task/upload_task_progress_images?task_id=${encodeURIComponent(task.taskId)}`,
      {
        method: 'POST',
        body: formData,
      },
    );
    const data = await response.json();
    const success = Boolean(data?.success ?? data?.suceess);
    const imageUrl = (data?.image_url ?? data?.['image_url ']) as string | undefined;
    if (!response.ok || !success || !imageUrl) {
      return null;
    }
    return imageUrl;
  };

  const uploadTaskImages = async () => {
    const selected = taskPhotos.filter(Boolean) as string[];
    if (selected.length < 3) {
      Alert.alert('Task', 'Please capture all 3 photos first.');
      return;
    }
    if (!task?.taskId) {
      Alert.alert('Task', 'Task ID missing.');
      return;
    }

    try {
      setUploadingTaskImages(true);
      const uploaded: string[] = [];
      for (const uri of selected) {
        const imageUrl = await uploadTaskProgressImage(uri);
        if (!imageUrl) {
          Alert.alert('Task', 'One or more images failed to upload.');
          return;
        }
        uploaded.push(imageUrl);
      }
      setTaskProgressImageUrls(uploaded);
      Alert.alert('Task', 'Task progress images uploaded successfully.');
    } finally {
      setUploadingTaskImages(false);
    }
  };

  const completeTask = async () => {
    if (!task?.taskId) {
      Alert.alert('Task', 'Task ID missing.');
      return;
    }
    const completedAcresValue = Number(completedAcres);
    if (!Number.isFinite(completedAcresValue)) {
      Alert.alert('Task', 'Please enter a valid completed acres value.');
      return;
    }

    try {
      setCompletingTask(true);
      const response = await fetch(`${API_BASE_URL}/admin_all_task/update_task_status`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          task_id: task.taskId,
          feild_id: task.farmId,
          completed_acres: completedAcresValue,
          status: 'completed',
          calander_id: task.calanderId ?? '',
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        Alert.alert('Task', 'Unable to mark task as completed.');
        return;
      }
      setTaskMarkedCompleted(true);
      Alert.alert('Task', 'Task marked completed successfully.');
    } catch {
      Alert.alert('Task', 'Unable to update task status right now.');
    } finally {
      setCompletingTask(false);
    }
  };

  const openTaskLocationInMaps = async () => {
    if (!task?.farmId) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/farmer_managment/get_land_coordinates_from_farm_id/${encodeURIComponent(task.farmId)}`,
      );
      const data = await response.json();
      const coords = data?.land_coordinates;

      if (!response.ok || !Array.isArray(coords) || coords.length < 2) {
        Alert.alert('Location', 'Unable to fetch land coordinates.');
        return;
      }

      const lat = Number(coords[0]);
      const lng = Number(coords[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        Alert.alert('Location', 'Invalid land coordinates.');
        return;
      }

      await Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`);
    } catch {
      Alert.alert('Location', 'Unable to open map right now.');
    }
  };

  useEffect(() => {
    const fetchTransportCoordination = async () => {
      if (!task?.vehicles?.length) {
        setTransportVehicles([]);
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/feild_manager/get_transport_coordination_data`,
          {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({vehicle_list: task.vehicles}),
          },
        );
        const data = await response.json();
        if (!response.ok || !Array.isArray(data?.vehicles)) {
          setTransportVehicles([]);
          return;
        }
        setTransportVehicles(data.vehicles as TransportVehicle[]);
      } catch {
        setTransportVehicles([]);
      }
    };

    fetchTransportCoordination();
  }, [task]);

  useEffect(() => {
    setCompletedAcres('');
    setTaskPhotos([null, null, null]);
    setEquipmentPhotos([null]);
    setTaskProgressImageUrls([]);
    setTaskMarkedCompleted(false);
    setCompletingTask(false);
    setEquipmentReceiptAttached(false);
    setEquipmentImageUrl('');
    setTransportVendor(null);
    setEquipmentVendor(null);

    const transportVendorId = task?.vehicles?.find(v => v.vendor_id)?.vendor_id;
    const equipmentVendorId = task?.equipment?.find(e => e.vendor_id)?.vendor_id;
    if (transportVendorId) {
      fetchVendorDetails(transportVendorId).then(setTransportVendor);
    }
    if (equipmentVendorId) {
      fetchVendorDetails(equipmentVendorId).then(setEquipmentVendor);
    }
  }, [task?.taskId]);

  useEffect(() => {
    setTransportDone((task?.transportCoordinationStatus || '').toLowerCase() === 'completed');
    setEquipmentDone((task?.equipmentCoordinationStatus || '').toLowerCase() === 'completed');
  }, [task]);

  const hasThreePhotos = taskPhotos.filter(Boolean).length === 3;
  const hasEquipmentPhoto = equipmentPhotos.filter(Boolean).length === 1;
  const hasCompletedAcres = completedAcres.trim().length > 0;
  const canUploadTaskImages = hasThreePhotos && !uploadingTaskImages;
  const canUploadEquipmentImages = hasEquipmentPhoto && !uploadingEquipmentImage;
  const canCompleteTask =
    hasCompletedAcres &&
    hasThreePhotos &&
    taskProgressImageUrls.length === 3 &&
    !completingTask;

  const completeTransportCoordination = async () => {
    if (!task?.taskId) {
      Alert.alert('Transport', 'Task ID missing.');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/feild_manager/update_vehicle_coordination_status`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          task_id: task.taskId,
          new_status: 'completed',
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        Alert.alert('Transport', 'Unable to update vehicle coordination status.');
        return;
      }
      setTransportDone(true);
      Alert.alert('Transport', 'Vehicle coordination marked completed.');
    } catch {
      Alert.alert('Transport', 'Unable to update status right now.');
    }
  };

  const uploadEquipmentImage = async (uri: string) => {
    if (!task?.taskId) {
      Alert.alert('Equipment', 'Task ID missing.');
      return null;
    }
    const formData = new FormData();
    formData.append('image', {
      uri,
      type: 'image/jpeg',
      name: `equipment-${Date.now()}.jpg`,
    } as any);

    const response = await fetch(
      `${API_BASE_URL}/feild_manager/upload_equipment_coordination_image?task_id=${encodeURIComponent(task.taskId)}`,
      {
        method: 'POST',
        body: formData,
      },
    );
    const data = await response.json();
    if (!response.ok || !data?.success || !data?.image_url) {
      return null;
    }
    return data.image_url as string;
  };

  const completeEquipmentCoordination = async () => {
    if (!task?.taskId) {
      Alert.alert('Equipment', 'Task ID missing.');
      return;
    }
    if (!equipmentImageUrl) {
      Alert.alert('Equipment', 'Attach receiving image first.');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/feild_manager/update_equipment_coordination_status`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          task_id: task.taskId,
          new_status: 'completed',
          image_url: equipmentImageUrl,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        Alert.alert('Equipment', 'Unable to update equipment coordination status.');
        return;
      }
      setEquipmentDone(true);
      Alert.alert('Equipment', 'Equipment coordination marked completed.');
    } catch {
      Alert.alert('Equipment', 'Unable to update status right now.');
    }
  };

  const uploadEquipmentImages = async () => {
    const selected = equipmentPhotos.filter(Boolean) as string[];
    if (!selected.length) {
      Alert.alert('Equipment', 'Please capture receiving photo first.');
      return;
    }
    try {
      setUploadingEquipmentImage(true);
      const imageUrl = await uploadEquipmentImage(selected[0]);
      if (!imageUrl) {
        Alert.alert('Equipment', 'Receiving image upload failed.');
        return;
      }
      setEquipmentImageUrl(imageUrl);
      setEquipmentReceiptAttached(true);
      Alert.alert('Equipment', 'Receiving image uploaded.');
    } finally {
      setUploadingEquipmentImage(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={!!task}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.taskModal}>
          {task ? (
            <>
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.sheetHandle} />
                <View style={styles.modalHeader}>
                  <View style={styles.modalTaskIcon}>
                    <Icon name="ClipboardList" size={30} color={GREEN} />
                  </View>
                  <View style={styles.modalTitleBlock}>
                    <Text style={styles.modalTitle}>
                      {translateTaskText(task.title, language)}
                    </Text>
                    <View style={styles.taskTagRow}>
                      <View style={styles.fieldTag}>
                        <Text style={styles.fieldTagText}>Field Task</Text>
                      </View>
                      <View style={styles.priorityTag}>
                        <Text style={styles.priorityTagText}>
                          {translateTaskText(task.priority, language)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={onClose}
                    style={styles.modalClose}
                  >
                    <Icon name="X" size={20} color={INK} />
                  </TouchableOpacity>
                </View>

                <View style={styles.dueRow}>
                  <View style={styles.dueItem}>
                    <Icon name="CalendarDays" size={18} color={MUTED} />
                    <Text style={styles.dueLabel}>Due: </Text>
                    <Text style={styles.dueDateText}>{dueDate}</Text>
                  </View>
                  <View style={styles.dueDivider} />
                  <View style={styles.dueItem}>
                    <Icon name="Clock3" size={19} color={MUTED} />
                    <Text style={styles.dueTimeText}>{dueClock}</Text>
                  </View>
                  <View style={styles.statusTag}>
                    <Text style={styles.statusTagText}>
                      {translateTaskText(task.status, language)}
                    </Text>
                  </View>
                </View>

                <View style={styles.timeline}>
                  <FlowStep
                    active
                    complete
                    icon="ClipboardCheck"
                    label="Assigned"
                    caption="18 May"
                  />
                  <View
                    style={[styles.timelineLine, styles.timelineLineComplete]}
                  />
                  <FlowStep
                    active={!hasBlockedSubTasks || isWorkPending}
                    complete={isWorkPending || isCompleted}
                    icon="MapPin"
                    label="In Progress"
                  />
                  <View style={styles.timelineLine} />
                  <FlowStep
                    active={isWorkPending}
                    complete={isCompleted}
                    icon="Camera"
                    label="Verification"
                  />
                  <View style={styles.timelineLine} />
                  <FlowStep
                    active={isCompleted}
                    complete={isCompleted}
                    icon="CircleCheck"
                    label="Completed"
                  />
                </View>

                <View style={[styles.cleanSection, styles.hiddenSection]}>
                  <Text style={styles.cleanSectionTitle}>Land Details</Text>
                  <View style={styles.detailGrid}>
                    <View style={styles.detailGridItem}>
                      <Text style={styles.detailGridLabel}>Farm ID</Text>
                      <Text style={styles.detailGridValue}>{task.farmId}</Text>
                    </View>
                    <View style={styles.detailGridItem}>
                      <Text style={styles.detailGridLabel}>Farmer Name</Text>
                      <Text style={styles.detailGridValue}>{task.farmerName}</Text>
                    </View>
                    <View style={styles.detailGridItem}>
                      <Text style={styles.detailGridLabel}>Location</Text>
                      <Text style={styles.detailGridValue}>{task.location}</Text>
                    </View>
                    <View style={styles.detailGridItem}>
                      <Text style={styles.detailGridLabel}>Task</Text>
                      <Text style={styles.detailGridValue}>
                        {translateTaskText(task.title, language)}
                      </Text>
                    </View>
                  </View>
                </View>

                {hasTransportCoordination ? (
                  <View style={styles.cleanSection}>
                    <Text style={styles.cleanSectionTitle}>
                      {transportVendor ? 'Vendor' : 'Transport Coordination'}
                    </Text>
                    {transportVendor ? (
                      <View style={styles.vendorInfoCard}>
                        <View style={styles.vendorInfoRow}>
                          <Icon name="Building2" size={14} color={MUTED} />
                          <Text style={styles.vendorInfoText}>{transportVendor.vendor_name}</Text>
                        </View>
                        <View style={styles.vendorInfoRow}>
                          <Icon name="Phone" size={14} color={MUTED} />
                          <Text style={styles.vendorInfoText}>{transportVendor.vendor_contact}</Text>
                        </View>
                      </View>
                    ) : (
                      <>
                        <Text style={styles.descriptionText}>
                          TASK: coordinate with the driver to do this task
                        </Text>
                        {transportVehicles.length ? (
                          <View style={styles.transportTable}>
                            <View style={styles.transportHeadRow}>
                              <Text style={[styles.transportHeadCell, styles.transportCellName]}>Name</Text>
                              <Text style={[styles.transportHeadCell, styles.transportCellPhone]}>Ph. No.</Text>
                              <Text style={[styles.transportHeadCell, styles.transportCellVehicle]}>Vehicle</Text>
                              <Text style={[styles.transportHeadCell, styles.transportCellNumber]}>V.No.</Text>
                            </View>
                            {transportVehicles.map(vehicle => (
                              <View key={`${vehicle.vehicle_number}-${vehicle.driver_name}`} style={styles.transportBodyRow}>
                                <Text style={[styles.transportBodyCell, styles.transportCellName]}>
                                  {vehicle.driver_name || '-'}
                                </Text>
                                <Text style={[styles.transportBodyCell, styles.transportCellPhone]}>
                                  {vehicle.driver_contact || '-'}
                                </Text>
                                <Text style={[styles.transportBodyCell, styles.transportCellVehicle]}>
                                  {vehicle.vehicle_model || '-'}
                                </Text>
                                <Text style={[styles.transportBodyCell, styles.transportCellNumber]}>
                                  {vehicle.vehicle_number || '-'}
                                </Text>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <Text style={styles.descriptionText}>No transport data found.</Text>
                        )}
                      </>
                    )}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      disabled={transportDone}
                      onPress={completeTransportCoordination}
                      style={[styles.coordButton, transportDone && styles.coordButtonDone]}
                    >
                      <Text style={styles.coordButtonText}>
                        {transportDone ? 'Coordination Completed' : 'Coordination Complete'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {hasEquipmentCoordination ? (
                  <View style={styles.cleanSection}>
                    <Text style={styles.cleanSectionTitle}>
                      {equipmentVendor ? 'Vendor' : 'Equipment Coordination'}
                    </Text>

                    {equipmentVendor ? (
                      /* ── Vendor case ── */
                      <View style={styles.vendorInfoCard}>
                        <View style={styles.vendorInfoRow}>
                          <Icon name="Building2" size={14} color={MUTED} />
                          <Text style={styles.vendorInfoText}>{equipmentVendor.vendor_name}</Text>
                        </View>
                        <View style={styles.vendorInfoRow}>
                          <Icon name="Phone" size={14} color={MUTED} />
                          <Text style={styles.vendorInfoText}>{equipmentVendor.vendor_contact}</Text>
                        </View>
                      </View>
                    ) : equipmentItems.length === 0 ? (
                      /* ── No equipment case ── */
                      <Text style={styles.descriptionText}>No Equipment is needed</Text>
                    ) : (
                      /* ── Actual equipment case ── */
                      <>
                        <View style={styles.otpBox}>
                          <Text style={styles.otpLabel}>OTP</Text>
                          <Text style={styles.otpValue}>{task?.equipmentOtp || '-'}</Text>
                        </View>
                        <View style={styles.equipmentTable}>
                          <View style={styles.equipmentHeadRow}>
                            <Text style={[styles.equipmentHeadCell, styles.equipmentHeadLeft]}>
                              Item Name
                            </Text>
                            <Text style={styles.equipmentHeadCell}>Quantity</Text>
                          </View>
                          {equipmentItems.map(item => (
                            <View key={`${item.equipment_name}-${item.quantity}`} style={styles.equipmentBodyRow}>
                              <Text style={[styles.equipmentBodyCell, styles.equipmentHeadLeft]}>
                                {item.equipment_name}
                              </Text>
                              <Text style={styles.equipmentBodyCell}>{item.quantity}</Text>
                            </View>
                          ))}
                        </View>
                        <View style={styles.taskPhotoRow}>
                          {equipmentPhotos.map((uri, index) => (
                            <View key={`equipment-photo-${index}`} style={styles.taskPhotoBox}>
                              {uri ? (
                                <>
                                  <Image source={{uri}} style={styles.taskPhotoPreview} resizeMode="cover" />
                                  <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() => removeEquipmentPhoto(index)}
                                    style={styles.taskPhotoRemove}>
                                    <Icon name="X" size={14} color="#FFFFFF" />
                                  </TouchableOpacity>
                                </>
                              ) : (
                                <TouchableOpacity
                                  activeOpacity={0.8}
                                  onPress={() => openCameraForSlot(index, 'equipment')}
                                  style={styles.taskPhotoAdd}>
                                  <Icon name="Plus" size={18} color={BLUE} />
                                </TouchableOpacity>
                              )}
                            </View>
                          ))}
                        </View>
                        <TouchableOpacity
                          activeOpacity={0.82}
                          onPress={uploadEquipmentImages}
                          disabled={!canUploadEquipmentImages}
                          style={[
                            styles.uploadEquipButton,
                            !canUploadEquipmentImages && styles.uploadEquipButtonDisabled,
                            equipmentReceiptAttached && styles.uploadEquipButtonDone,
                          ]}
                        >
                          <Icon
                            name={equipmentReceiptAttached ? 'CheckCircle2' : 'ImageUp'}
                            size={18}
                            color={equipmentReceiptAttached ? GREEN : BLUE}
                          />
                          <Text
                            style={[
                              styles.uploadEquipText,
                              equipmentReceiptAttached && styles.uploadEquipTextDone,
                            ]}
                          >
                            {equipmentReceiptAttached
                              ? 'Item Image Uploaded'
                              : uploadingEquipmentImage
                              ? 'Uploading...'
                              : 'Upload Item Image'}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}

                    <TouchableOpacity
                      activeOpacity={0.8}
                      disabled={equipmentDone}
                      onPress={completeEquipmentCoordination}
                      style={[styles.coordButton, equipmentDone && styles.coordButtonDone]}
                    >
                      <Text style={styles.coordButtonText}>
                        {equipmentDone ? 'Coordination Completed' : 'Coordination Complete'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                <View style={[styles.cleanSection, styles.hiddenSection]}>
                  <View style={styles.sectionTitleRow}>
                    <Text style={styles.cleanSectionTitle}>
                      Sub Tasks ({completedPrerequisites}/
                      {prerequisiteSubTasks.length})
                    </Text>
                    {prerequisiteSubTasks.length > 3 ? (
                      <Text style={styles.viewAllText}>View All</Text>
                    ) : null}
                  </View>
                  {prerequisiteSubTasks.length ? (
                    <View style={styles.subTaskList}>
                      {prerequisiteSubTasks.map((subTask, index) => {
                        const owner =
                          subTaskOwners[subTask.id] ?? subTask.assignedTo;
                        const done =
                          subTask.status === 'Completed' ||
                          completedSubTasks[subTask.id];

                        return (
                          <View key={subTask.id} style={styles.subTaskListItem}>
                            <TouchableOpacity
                              activeOpacity={0.78}
                              onPress={() => markSubTaskDone(subTask)}
                              style={styles.subTaskStatusButton}
                            >
                              <View
                                style={[
                                  styles.subTaskStatusCircle,
                                  done && styles.subTaskStatusCircleDone,
                                ]}
                              >
                                {done ? (
                                  <Icon
                                    name="Check"
                                    size={15}
                                    color="#FFFFFF"
                                  />
                                ) : null}
                              </View>
                            </TouchableOpacity>
                            <View style={styles.subTaskListCopy}>
                              <Text style={styles.subTaskListTitle}>
                                {subTask.title}
                              </Text>
                              <Text style={styles.subTaskListMeta}>
                                {owner}
                                {subTask.receivingCode
                                  ? ` • ${subTask.receivingCode}`
                                  : ''}
                              </Text>
                              {subTask.itemName ? (
                                <Text style={styles.subTaskListMeta}>
                                  {subTask.itemName} • {subTask.quantity}
                                </Text>
                              ) : null}
                              {!done &&
                              (subTask.requiresPickupImage ||
                                subTask.requiresDropImage) ? (
                                <View style={styles.proofRow}>
                                  {subTask.requiresPickupImage ? (
                                    <ProofButton
                                      done={Boolean(pickupProofs[subTask.id])}
                                      icon="Camera"
                                      label={
                                        pickupProofs[subTask.id]
                                          ? 'Pickup done'
                                          : 'Pickup photo'
                                      }
                                      onPress={() => markPickupProof(subTask)}
                                    />
                                  ) : null}
                                  {subTask.requiresDropImage ? (
                                    <ProofButton
                                      done={Boolean(dropProofs[subTask.id])}
                                      disabled={
                                        subTask.requiresPickupImage &&
                                        !pickupProofs[subTask.id]
                                      }
                                      icon="ImageUp"
                                      label={
                                        dropProofs[subTask.id]
                                          ? 'Drop done'
                                          : 'Drop photo'
                                      }
                                      onPress={() => markDropProof(subTask)}
                                    />
                                  ) : null}
                                </View>
                              ) : null}
                            </View>
                            <View
                              style={[
                                styles.subTaskStatePill,
                                done
                                  ? styles.subTaskStateDone
                                  : index === completedPrerequisites
                                  ? styles.subTaskStateActive
                                  : styles.subTaskStatePending,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.subTaskStateText,
                                  done
                                    ? styles.subTaskStateDoneText
                                    : index === completedPrerequisites
                                    ? styles.subTaskStateActiveText
                                    : styles.subTaskStatePendingText,
                                ]}
                              >
                                {done
                                  ? 'Done'
                                  : index === completedPrerequisites
                                  ? 'In Progress'
                                  : 'Pending'}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={styles.emptySubTaskBox}>
                      <Text style={styles.emptySubTaskText}>
                        No sub tasks. Main task can start directly.
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.cleanSection}>
                  <View style={styles.taskHeaderRow}>
                    <Text style={styles.cleanSectionTitle}>Task</Text>
                    <TouchableOpacity
                      activeOpacity={0.78}
                      onPress={openTaskLocationInMaps}
                      style={styles.mapIconButton}>
                      <Icon name="MapPinned" size={17} color={BLUE} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.taskInfoBox}>
                    <View style={styles.taskInfoRow}>
                      <Text style={styles.taskInfoKey}>Farm ID</Text>
                      <Text style={styles.taskInfoValue}>{`${task.farmId.slice(0, 4)}******`}</Text>
                    </View>
                    <View style={styles.taskInfoRow}>
                      <Text style={styles.taskInfoKey}>Farmer Name</Text>
                      <Text style={styles.taskInfoValue}>{task.farmerName}</Text>
                    </View>
                    <View style={styles.taskInfoRow}>
                      <Text style={styles.taskInfoKey}>Location</Text>
                      <Text style={styles.taskInfoValue}>{task.location}</Text>
                    </View>
                  </View>

                  <View style={styles.acresRow}>
                    <Text style={styles.detailGridLabel}>Activity</Text>
                    <Text style={styles.detailGridValue}>{translateTaskText(task.title, language)}</Text>
                  </View>
                  <View style={styles.acresRow}>
                    <Text style={[styles.detailGridLabel, styles.acresLabelBold]}>Allocated Acres</Text>
                    <Text style={styles.detailGridValue}>{task.assignedAcres ?? '-'}</Text>
                  </View>
                  <View style={styles.acresRow}>
                    <Text style={styles.detailGridLabel}>Completed Acres</Text>
                    <View style={styles.completedAcresWrap}>
                      <TextInput
                        value={completedAcres}
                        onChangeText={setCompletedAcres}
                        placeholder="Enter"
                        keyboardType="decimal-pad"
                        placeholderTextColor="#94A3B8"
                        style={styles.completedAcresInput}
                      />
                    </View>
                  </View>

                  <Text style={styles.cleanSectionTitle}>Attach photos</Text>
                  <View style={styles.taskPhotoRow}>
                    {taskPhotos.map((uri, index) => (
                      <View key={`task-photo-${index}`} style={styles.taskPhotoBox}>
                        {uri ? (
                          <>
                            <Image source={{uri}} style={styles.taskPhotoPreview} resizeMode="cover" />
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={() => removeTaskPhoto(index)}
                              style={styles.taskPhotoRemove}>
                              <Icon name="X" size={14} color="#FFFFFF" />
                            </TouchableOpacity>
                          </>
                        ) : (
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => openCameraForSlot(index, 'task')}
                            style={styles.taskPhotoAdd}>
                            <Icon name="Plus" size={18} color={BLUE} />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                    <TouchableOpacity
                      activeOpacity={0.82}
                      onPress={uploadTaskImages}
                      disabled={!canUploadTaskImages}
                      style={[
                        styles.uploadTaskImagesButton,
                        !canUploadTaskImages && styles.uploadTaskImagesButtonDisabled,
                      ]}>
                    <Icon name="Upload" size={17} color="#FFFFFF" />
                    <Text style={styles.uploadTaskImagesText}>
                      {uploadingTaskImages ? 'Uploading...' : 'Upload'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={completeTask}
                    disabled={!canCompleteTask}
                    style={[
                      styles.taskCompleteButton,
                      !canCompleteTask && styles.taskCompleteButtonDisabled,
                      taskMarkedCompleted && styles.taskCompleteButtonDone,
                    ]}>
                    <Text style={styles.taskCompleteButtonText}>
                      {completingTask ? 'Completing...' : 'Task Completed'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <Modal
                visible={cameraOpen}
                animationType="slide"
                onRequestClose={() => {
                  setCameraOpen(false);
                  setActivePhotoSlot(null);
                }}>
                <View style={styles.cameraScreen}>
                  <Camera
                    ref={ref => {
                      cameraRef = ref;
                    }}
                    style={styles.cameraPreview}
                    cameraType={CameraType.Back}
                  />
                  <View style={styles.cameraActions}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        setCameraOpen(false);
                        setActivePhotoSlot(null);
                      }}
                      style={styles.cameraCancel}>
                      <Text style={styles.cameraCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={captureTaskPhoto}
                      style={styles.cameraCapture}>
                      <Icon name="Camera" size={20} color="#FFFFFF" />
                      <Text style={styles.cameraCaptureText}>Capture</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const STEP_TYPE_CONFIG: Record<string, { icon: string; color: string; label: string; bg: string }> = {
  logistics:   { icon: 'Truck',         color: BLUE,       label: 'Logistics',   bg: BLUE_SOFT   },
  inventory:   { icon: 'Package',       color: ORANGE_TEXT, label: 'Inventory',   bg: '#FFF4EE'   },
  cultivation: { icon: 'Sprout',        color: GREEN,       label: 'Cultivation', bg: GREEN_SOFT  },
  inspection:  { icon: 'ClipboardCheck',color: '#8B5CF6',  label: 'Inspection',  bg: '#F5F3FF'   },
  others:      { icon: 'FileText',      color: MUTED,       label: 'Others',      bg: '#F1F5F9'   },
};

function OnDemandTaskModal({
  task,
  onClose,
  onStepOpen,
}: {
  task: Task | null;
  onClose: () => void;
  onStepOpen: (stepKey: string) => void;
}) {
  const [stepStatuses, setStepStatuses] = useState<Record<string, 'pending' | 'completed'>>({});

  useEffect(() => {
    setStepStatuses({});
  }, [task?.taskId]);

  if (!task?.onDemandSteps) { return null; }

  const sortedSteps = Object.entries(task.onDemandSteps).sort(([a], [b]) => {
    const numA = parseInt(a.replace('step_', ''), 10);
    const numB = parseInt(b.replace('step_', ''), 10);
    return numA - numB;
  });

  const activeStepKey = sortedSteps.find(
    ([key, step]) => (stepStatuses[key] ?? step.status) === 'pending',
  )?.[0];

  const completedCount = sortedSteps.filter(
    ([key, step]) => (stepStatuses[key] ?? step.status) === 'completed',
  ).length;


  return (
    <Modal animationType="fade" transparent visible={!!task} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.taskModal}>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sheetHandle} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={[styles.modalTaskIcon, { backgroundColor: '#FFF4EE' }]}>
                <Icon name="Zap" size={28} color={ORANGE_TEXT} />
              </View>
              <View style={styles.modalTitleBlock}>
                <Text style={styles.modalTitle}>{task.title || 'On Demand Task'}</Text>
                <View style={styles.taskTagRow}>
                  <View style={[styles.fieldTag, { backgroundColor: '#FFF4EE', borderColor: '#FED7AA' }]}>
                    <Text style={[styles.fieldTagText, { color: ORANGE_TEXT }]}>On Demand</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity activeOpacity={0.75} onPress={onClose} style={styles.modalClose}>
                <Icon name="X" size={20} color={INK} />
              </TouchableOpacity>
            </View>

            {/* Task meta */}
            <View style={styles.taskInfoBox}>
              <View style={styles.taskInfoRow}>
                <Text style={styles.taskInfoKey}>Farm ID</Text>
                <Text style={styles.taskInfoValue}>{task.farmId}</Text>
              </View>
              <View style={styles.taskInfoRow}>
                <Text style={styles.taskInfoKey}>Farmer</Text>
                <Text style={styles.taskInfoValue}>{task.farmerName}</Text>
              </View>
              <View style={styles.taskInfoRow}>
                <Text style={styles.taskInfoKey}>Location</Text>
                <Text style={styles.taskInfoValue}>{task.location}</Text>
              </View>
            </View>

            {/* Progress */}
            <View style={styles.odProgressRow}>
              <Text style={styles.odProgressLabel}>
                {completedCount} of {sortedSteps.length} steps completed
              </Text>
              <View style={styles.odProgressTrack}>
                <View
                  style={[
                    styles.odProgressFill,
                    { width: `${Math.round((completedCount / sortedSteps.length) * 100)}%` as any },
                  ]}
                />
              </View>
            </View>

            {/* Steps */}
            {sortedSteps.map(([key, step], index) => {
              const status = stepStatuses[key] ?? step.status;
              const isDone = status === 'completed';
              const isActive = key === activeStepKey;
              const cfg = STEP_TYPE_CONFIG[step.type] ?? STEP_TYPE_CONFIG.others;
              const isLast = index === sortedSteps.length - 1;

              return (
                <View key={key} style={styles.odStepRow}>
                  {/* Left: number + connector */}
                  <View style={styles.odStepLeft}>
                    <View style={[
                      styles.odStepNum,
                      isDone && styles.odStepNumDone,
                      isActive && { backgroundColor: cfg.color },
                    ]}>
                      {isDone
                        ? <Icon name="Check" size={12} color="#FFFFFF" />
                        : <Text style={[styles.odStepNumText, isActive && { color: '#FFFFFF' }]}>{index + 1}</Text>
                      }
                    </View>
                    {!isLast ? (
                      <View style={[styles.odStepConnector, isDone && styles.odStepConnectorDone]} />
                    ) : null}
                  </View>

                  {/* Right: card */}
                  <View style={[
                    styles.odStepCard,
                    isDone && styles.odStepCardDone,
                    isActive && { borderColor: cfg.color + '60', backgroundColor: cfg.bg },
                  ]}>
                    {/* Type pill + status */}
                    <View style={styles.odStepTitleRow}>
                      <View style={[styles.odTypePill, { backgroundColor: cfg.color + '18' }]}>
                        <Icon name={cfg.icon} size={12} color={cfg.color} />
                        <Text style={[styles.odTypePillText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                      <View style={[
                        styles.odStatusPill,
                        isDone ? styles.odStatusDone : isActive ? styles.odStatusActive : styles.odStatusPending,
                      ]}>
                        <Text style={[
                          styles.odStatusText,
                          isDone ? styles.odStatusDoneText : isActive ? { color: cfg.color } : styles.odStatusPendingText,
                        ]}>
                          {isDone ? 'Done' : isActive ? 'In Progress' : 'Pending'}
                        </Text>
                      </View>
                    </View>

                    {/* Step data */}
                    {step.data.map((item, di) => (
                      <View key={di} style={styles.odDataRow}>
                        {step.type === 'logistics' ? (
                          <>
                            <Icon name="Truck" size={13} color={MUTED} />
                            <Text style={styles.odDataText}>{item.vehicle_number || '-'}</Text>
                          </>
                        ) : step.type === 'inventory' ? (
                          <>
                            <Icon name="Package" size={13} color={MUTED} />
                            <Text style={styles.odDataText}>{item.item_name || '-'}</Text>
                            <Text style={styles.odDataMeta}>{item.quantity} {item.unit}</Text>
                          </>
                        ) : (
                          <>
                            <Icon name="AlignLeft" size={13} color={MUTED} />
                            <Text style={styles.odDataText}>{item.description || '-'}</Text>
                          </>
                        )}
                      </View>
                    ))}

                    {/* Open step popup for the active step */}
                    {isActive ? (
                      <TouchableOpacity
                        activeOpacity={0.82}
                        onPress={() => onStepOpen(key)}
                        style={[styles.odCompleteBtn, { backgroundColor: cfg.color }]}
                      >
                        <Icon name="ArrowRight" size={15} color="#FFFFFF" />
                        <Text style={styles.odCompleteBtnText}>View & Complete</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              );
            })}

            {completedCount === sortedSteps.length ? (
              <View style={styles.odAllDoneBox}>
                <Icon name="CheckCircle2" size={22} color={GREEN} />
                <Text style={styles.odAllDoneText}>All steps completed</Text>
              </View>
            ) : null}

          </ScrollView>

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
      <Text
        style={[styles.modalInfoValue, highlight && styles.modalInfoHighlight]}
      >
        {value}
      </Text>
    </View>
  );
}

function FlowStep({
  active,
  complete,
  icon,
  label,
  caption,
}: {
  active?: boolean;
  complete?: boolean;
  icon: string;
  label: string;
  caption?: string;
}) {
  return (
    <View style={styles.flowStep}>
      <View
        style={[
          styles.flowStepIcon,
          active && styles.flowStepIconActive,
          complete && styles.flowStepIconComplete,
        ]}
      >
        <Icon
          name={icon}
          size={20}
          color={active || complete ? GREEN : MUTED}
        />
      </View>
      <Text style={styles.flowStepLabel}>{label}</Text>
      {caption ? <Text style={styles.flowStepCaption}>{caption}</Text> : null}
    </View>
  );
}

function ProofButton({
  disabled,
  done,
  icon,
  label,
  onPress,
}: {
  disabled?: boolean;
  done: boolean;
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={disabled ? 1 : 0.78}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.proofButton,
        done && styles.proofButtonDone,
        disabled && styles.proofButtonDisabled,
      ]}
    >
      <Icon
        name={done ? 'CheckCircle2' : icon}
        size={18}
        color={done ? GREEN : disabled ? '#96A0AE' : GREEN}
      />
      <Text
        style={[
          styles.proofButtonText,
          done && styles.proofButtonDoneText,
          disabled && styles.proofButtonDisabledText,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
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
      <Text
        style={[styles.detailValue, valueColor ? { color: valueColor } : null]}
      >
        {value}
      </Text>
    </View>
  );
}

const CROP_HEALTH_OPTIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Critical'];
const FENCING_OPTIONS = ['Good', 'Damaged', 'Partially Missing', 'Needs Repair'];

function VisitDetailModal({
  visit,
  onClose,
  onSave,
}: {
  visit: FieldVisit | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [photos, setPhotos] = useState([false, false, false]);
  const [remarks, setRemarks] = useState('');
  const [cropHealth, setCropHealth] = useState('');
  const [cropHealthOpen, setCropHealthOpen] = useState(false);
  const [fencing, setFencing] = useState('');
  const [fencingOpen, setFencingOpen] = useState(false);
  const [itemChecks, setItemChecks] = useState<Record<string, boolean>>({});
  const [itemCounts, setItemCounts] = useState<Record<string, string>>({});
  const [borewellStatus, setBorewellStatus] = useState<Record<number, boolean>>({});
  const [cropIssue, setCropIssue] = useState('');
  const [roadsOkay, setRoadsOkay] = useState<boolean | null>(null);
  const [roadsNote, setRoadsNote] = useState('');
  const [propertyDamage, setPropertyDamage] = useState<boolean | null>(null);
  const [damageNote, setDamageNote] = useState('');

  useEffect(() => {
    setPhotos([false, false, false]);
    setRemarks('');
    setCropHealth('');
    setCropHealthOpen(false);
    setFencing('');
    setFencingOpen(false);
    setItemChecks({});
    setItemCounts({});
    setBorewellStatus({});
    setCropIssue('');
    setRoadsOkay(null);
    setRoadsNote('');
    setPropertyDamage(null);
    setDamageNote('');
  }, [visit?.id]);

  const handlePhoto = (i: number) => {
    setPhotos(cur => { const next = [...cur]; next[i] = true; return next; });
    Alert.alert('Photo Uploaded', `Photo ${i + 1} uploaded successfully.`);
  };

  const handleSave = () => {
    if (!cropHealth) { Alert.alert('Required', 'Please select crop health status.'); return; }
    if (!fencing) { Alert.alert('Required', 'Please select fencing condition.'); return; }
    const missing = photos.filter(p => !p).length;
    if (missing > 0) { Alert.alert('Photos Required', `Please upload all 3 field photos. ${missing} remaining.`); return; }
    onSave();
  };

  if (!visit) { return null; }

  return (
    <Modal visible={!!visit} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.fvModalOverlay}>
        <TouchableOpacity activeOpacity={1} style={styles.fvBackdrop} onPress={onClose} />
        <View style={styles.fvSheet}>
          <View style={styles.fvHandle} />

          {/* Header */}
          <View style={styles.fvHeader}>
            <View style={[styles.fvHeaderIcon, { backgroundColor: visit.bg }]}>
              <Icon name="MapPin" size={22} color={visit.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fvTitle}>{visit.activity}</Text>
              <Text style={[styles.fvSubId, { color: visit.color }]}>{visit.id} · {visit.landId}</Text>
            </View>
            <TouchableOpacity activeOpacity={0.76} onPress={onClose} style={styles.fvClose}>
              <Icon name="X" size={21} color={INK} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.fvForm}>

            {/* Visit details (read-only) */}
            <View style={styles.vdDetailCard}>
              <VDRow icon="User" label="Farmer" value={visit.farmerName} />
              <VDRow icon="MapPin" label="Location" value={visit.location} />
              <VDRow icon="CalendarDays" label="Date" value={visit.scheduledDate} />
              <VDRow icon="Clock3" label="Time" value={visit.scheduledTime} isLast />
            </View>

            {/* Crop Health */}
            <Text style={styles.fvFieldLabel}>Crop Health *</Text>
            <TouchableOpacity style={styles.fvSelect} onPress={() => { setCropHealthOpen(o => !o); setFencingOpen(false); }}>
              <Icon name="Leaf" size={16} color={cropHealth ? GREEN : MUTED} />
              <Text style={[styles.fvSelectText, !cropHealth && { color: '#8B97AA' }]}>{cropHealth || 'Select crop health status'}</Text>
              <Icon name={cropHealthOpen ? 'ChevronUp' : 'ChevronDown'} size={16} color={MUTED} />
            </TouchableOpacity>
            {cropHealthOpen && (
              <View style={styles.fvDropdown}>
                {CROP_HEALTH_OPTIONS.map((opt, i) => (
                  <TouchableOpacity key={opt}
                    style={[styles.fvDropdownItem, i === CROP_HEALTH_OPTIONS.length - 1 && { borderBottomWidth: 0 }]}
                    onPress={() => { setCropHealth(opt); setCropHealthOpen(false); }}>
                    <Text style={styles.fvDropdownText}>{opt}</Text>
                    {cropHealth === opt && <Icon name="Check" size={15} color={GREEN} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Fencing Condition */}
            <Text style={styles.fvFieldLabel}>Fencing Condition *</Text>
            <TouchableOpacity style={styles.fvSelect} onPress={() => { setFencingOpen(o => !o); setCropHealthOpen(false); }}>
              <Icon name="Shield" size={16} color={fencing ? GREEN : MUTED} />
              <Text style={[styles.fvSelectText, !fencing && { color: '#8B97AA' }]}>{fencing || 'Select fencing condition'}</Text>
              <Icon name={fencingOpen ? 'ChevronUp' : 'ChevronDown'} size={16} color={MUTED} />
            </TouchableOpacity>
            {fencingOpen && (
              <View style={styles.fvDropdown}>
                {FENCING_OPTIONS.map((opt, i) => (
                  <TouchableOpacity key={opt}
                    style={[styles.fvDropdownItem, i === FENCING_OPTIONS.length - 1 && { borderBottomWidth: 0 }]}
                    onPress={() => { setFencing(opt); setFencingOpen(false); }}>
                    <Text style={styles.fvDropdownText}>{opt}</Text>
                    {fencing === opt && <Icon name="Check" size={15} color={GREEN} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Farm Items Check */}
            <Text style={styles.fvFieldLabel}>Farm Items Check</Text>
            <View style={styles.vdDetailCard}>
              {visit.items.map((item, idx) => {
                const checked = !!itemChecks[item.name];
                const isLast = idx === visit.items.length - 1;
                return (
                  <View key={item.name} style={[styles.itemCheckRow, !isLast && styles.vdRowBorder]}>
                    <TouchableOpacity activeOpacity={0.8}
                      onPress={() => setItemChecks(c => ({ ...c, [item.name]: !c[item.name] }))}
                      style={styles.itemCheckbox}>
                      <Icon name={checked ? 'CheckSquare' : 'Square'} size={22} color={checked ? GREEN : MUTED} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemExpected}>Expected: {item.expected}</Text>
                    </View>
                    {!checked && (
                      <View style={styles.itemCountWrap}>
                        <Text style={styles.itemCountLabel}>Found</Text>
                        <TextInput
                          style={styles.itemCountInput}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor={MUTED}
                          value={itemCounts[item.name] ?? ''}
                          onChangeText={v => setItemCounts(c => ({ ...c, [item.name]: v }))}
                        />
                      </View>
                    )}
                    {!checked && <Icon name="AlertTriangle" size={16} color={RED} style={{ marginLeft: 4 }} />}
                  </View>
                );
              })}
            </View>

            {/* Borewell Status */}
            <Text style={styles.fvFieldLabel}>Borewell Status ({visit.borewells} total)</Text>
            <View style={styles.vdDetailCard}>
              {Array.from({ length: visit.borewells }, (_, i) => {
                const status = borewellStatus[i] as boolean | undefined;
                const isLast = i === visit.borewells - 1;
                return (
                  <View key={i} style={[styles.vdRow, !isLast && styles.vdRowBorder]}>
                    <Icon name="Droplets" size={15} color={BLUE} />
                    <Text style={[styles.vdLabel, { width: 72 }]}>Borewell {i + 1}</Text>
                    <View style={styles.yesNoRow}>
                      <TouchableOpacity onPress={() => setBorewellStatus(s => ({ ...s, [i]: true }))}
                        style={[styles.yesNoBtn, status === true && styles.yesNoBtnYes]}>
                        <Text style={[styles.yesNoText, status === true && { color: GREEN }]}>Working</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setBorewellStatus(s => ({ ...s, [i]: false }))}
                        style={[styles.yesNoBtn, status === false && styles.yesNoBtnNo]}>
                        <Text style={[styles.yesNoText, status === false && { color: RED }]}>Faulty</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Crop Issues */}
            <Text style={styles.fvFieldLabel}>Crop Issues</Text>
            <View style={styles.fvTextAreaWrap}>
              <TextInput multiline value={cropIssue} onChangeText={setCropIssue}
                placeholder="Describe any crop issues (pest, disease, drought stress, etc.)..."
                placeholderTextColor="#8B97AA" style={styles.fvTextArea} />
            </View>

            {/* Roads Condition */}
            <Text style={styles.fvFieldLabel}>Roads Condition *</Text>
            <View style={styles.yesNoPillRow}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => setRoadsOkay(true)}
                style={[styles.yesNoPill, roadsOkay === true && styles.yesNoPillYes]}>
                <Icon name="CheckCircle2" size={15} color={roadsOkay === true ? '#FFFFFF' : GREEN} />
                <Text style={[styles.yesNoPillText, roadsOkay === true && styles.yesNoPillTextActive]}>All Good</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.8} onPress={() => setRoadsOkay(false)}
                style={[styles.yesNoPill, roadsOkay === false && styles.yesNoPillNo]}>
                <Icon name="AlertCircle" size={15} color={roadsOkay === false ? '#FFFFFF' : RED} />
                <Text style={[styles.yesNoPillText, roadsOkay === false && styles.yesNoPillTextActive]}>Issues Found</Text>
              </TouchableOpacity>
            </View>
            {roadsOkay === false && (
              <View style={[styles.fvTextAreaWrap, { marginTop: 8 }]}>
                <TextInput multiline value={roadsNote} onChangeText={setRoadsNote}
                  placeholder="Describe road issues..." placeholderTextColor="#8B97AA" style={styles.fvTextArea} />
              </View>
            )}

            {/* Farm Property Damage */}
            <Text style={styles.fvFieldLabel}>Farm Property Damage *</Text>
            <View style={styles.yesNoPillRow}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => setPropertyDamage(false)}
                style={[styles.yesNoPill, propertyDamage === false && styles.yesNoPillYes]}>
                <Icon name="CheckCircle2" size={15} color={propertyDamage === false ? '#FFFFFF' : GREEN} />
                <Text style={[styles.yesNoPillText, propertyDamage === false && styles.yesNoPillTextActive]}>No Damage</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.8} onPress={() => setPropertyDamage(true)}
                style={[styles.yesNoPill, propertyDamage === true && styles.yesNoPillNo]}>
                <Icon name="AlertTriangle" size={15} color={propertyDamage === true ? '#FFFFFF' : RED} />
                <Text style={[styles.yesNoPillText, propertyDamage === true && styles.yesNoPillTextActive]}>Damage Found</Text>
              </TouchableOpacity>
            </View>
            {propertyDamage === true && (
              <View style={[styles.fvTextAreaWrap, { marginTop: 8 }]}>
                <TextInput multiline value={damageNote} onChangeText={setDamageNote}
                  placeholder="Describe damage to farm properties..." placeholderTextColor="#8B97AA" style={styles.fvTextArea} />
              </View>
            )}

            {/* Remarks */}
            <Text style={styles.fvFieldLabel}>Remarks</Text>
            <View style={styles.fvTextAreaWrap}>
              <TextInput multiline value={remarks} onChangeText={setRemarks}
                placeholder="Enter observations, findings or notes..."
                placeholderTextColor="#8B97AA" style={styles.fvTextArea} />
            </View>

            {/* Field Photos */}
            <Text style={styles.fvFieldLabel}>Field Photos (3 required) *</Text>
            <View style={styles.fvPhotoGrid}>
              {photos.map((done, i) => (
                <TouchableOpacity key={i} activeOpacity={0.78} onPress={() => handlePhoto(i)}
                  style={[styles.fvPhotoSlot, done && styles.fvPhotoSlotDone]}>
                  <Icon name={done ? 'CheckCircle2' : 'Camera'} size={22} color={GREEN} />
                  <Text style={styles.fvPhotoLabel}>{done ? 'Done' : `Photo ${i + 1}`}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity activeOpacity={0.82} onPress={handleSave} style={styles.fvSaveBtn}>
              <Text style={styles.fvSaveBtnText}>Save Field Visit</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function VDRow({ icon, label, value, isLast }: { icon: string; label: string; value: string; isLast?: boolean }) {
  return (
    <View style={[styles.vdRow, !isLast && styles.vdRowBorder]}>
      <Icon name={icon} size={15} color={MUTED} />
      <Text style={styles.vdLabel}>{label}</Text>
      <Text style={styles.vdValue}>{value}</Text>
    </View>
  );
}

function getTaskCount(groups: TaskGroup[]) {
  return groups.reduce((total, group) => total + group.tasks.length, 0);
}

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function parseDueDate(dueTime: string): Date | null {
  if (!dueTime || dueTime === '-') { return null; }
  // ISO format: "2026-10-07"
  if (/^\d{4}-\d{2}-\d{2}/.test(dueTime)) {
    const d = new Date(dueTime);
    return isNaN(d.getTime()) ? null : d;
  }
  // "20 May 2025" or "20 May 2025, 05:00 PM"
  const parts = dueTime.trim().split(/[\s,]+/);
  const day = parseInt(parts[0], 10);
  const month = MONTH_MAP[(parts[1] ?? '').toLowerCase().slice(0, 3)];
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || month === undefined || isNaN(year)) { return null; }
  return new Date(year, month, day);
}

function flattenGroups(groups: TaskGroup[]) {
  return groups.flatMap(group => group.tasks);
}

function mapApiTasksToUi(tasks: ApiTask[], farmDetails: FarmDetail[]): Task[] {
  const locationByFarmId = new Map(
    farmDetails.map(item => [
      item.farm.farm_id,
      `${item.farm.land_data.village}, ${item.farm.land_data.district}`,
    ]),
  );

  return tasks.map(task => {
    const firstAssigned = task.assigned_acres?.[0];
    const farmId = firstAssigned?.farm_id || task.feild_id?.[0] || '-';
    const status = normalizeTaskStatus(task.status?.feild_manager_status);

    return {
      taskId: task.task_id,
      calanderId: task.calander_id ?? '',
      title: firstAssigned?.activity || 'Task',
      farmId,
      location: locationByFarmId.get(farmId) || '-',
      farmerName: task.farmer_name || '-',
      dueTime: firstAssigned?.date || '-',
      assignedAcres: `${firstAssigned?.assigned_acres ?? 0}`,
      vehicles: task.vehicles ?? [],
      equipmentOtp: task.equipment_otp ?? '',
      transportCoordinationStatus:
        task.trasport_coordination_status ?? task.transport_coordination_status ?? 'pending',
      equipmentCoordinationStatus: task.equipment_coordination_status ?? 'pending',
      equipment: (task.equipment ?? []).map(item => ({
        equipment_name: item.equipment_name,
        quantity: item.quantity,
        vendor_id: item.vendor_id,
      })),
      description: '',
      assignedTo: 'Field Manager',
      priority: 'Normal',
      status,
      allocation: 'Field Team',
      subTasks: [],
      onDemandSteps: task.steps,
    };
  });
}

function formatOnDemandDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) { return isoString; }
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return isoString;
  }
}

async function fetchVendorDetails(vendorId: string): Promise<VendorDetail | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/field_manager/get_vendor_details`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({vendor_id: vendorId}),
    });
    const data = await res.json();
    const details = data?.vendor_details?.vendor_details;
    if (!res.ok || !details) { return null; }
    return {
      vendor_name: details.vendor_name,
      vendor_contact: details.vendor_contact,
    };
  } catch {
    return null;
  }
}

function normalizeTaskStatus(status?: string) {
  const value = (status || '').toLowerCase();
  if (value === 'completed') {
    return 'Completed';
  }
  if (value === 'pending') {
    return 'Pending';
  }
  if (value === 'assigned') {
    return 'Assigned';
  }
  return 'Assigned';
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

function getDueParts(dueTime?: string) {
  if (!dueTime) {
    return { dueDate: '-', dueClock: '-' };
  }

  const [datePart, timePart] = dueTime.split(',').map(part => part.trim());
  return { dueDate: datePart || dueTime, dueClock: timePart || '' };
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

function isMainTaskSubTask(task: Task, subTask: SubTask) {
  if (subTask.type !== 'field') {
    return false;
  }

  const taskWords = task.title
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2);
  const subTaskTitle = subTask.title.toLowerCase();

  return (
    taskWords.length > 0 && taskWords.every(word => subTaskTitle.includes(word))
  );
}

const ORANGE = ORANGE_TEXT;
const ORANGE_SOFT = '#FFF4EE';

const UPCOMING_FIELD_VISITS = [
  {
    id: 'FV-2026-042', landId: 'FM-10035', location: 'Bori field shed, Durg',
    farmerName: 'Mahesh Sahu', activity: 'Insecticide Spray',
    scheduledDate: 'Today', scheduledTime: '07:00 PM', color: ORANGE, bg: ORANGE_SOFT,
    items: [
      { name: 'Tractor', expected: 1 },
      { name: 'Pump Set', expected: 2 },
      { name: 'Sprayer', expected: 3 },
      { name: 'Plough', expected: 1 },
    ],
    borewells: 2,
  },
  {
    id: 'FV-2026-043', landId: 'FM-10024', location: 'Bori, Durg',
    farmerName: 'Ramesh Yadav', activity: 'Land Verification',
    scheduledDate: '26 May', scheduledTime: '10:00 AM', color: BLUE, bg: BLUE_SOFT,
    items: [
      { name: 'Tractor', expected: 1 },
      { name: 'Harvester', expected: 1 },
      { name: 'Storage Tanks', expected: 4 },
    ],
    borewells: 1,
  },
  {
    id: 'FV-2026-044', landId: 'FM-10040', location: 'Koni, Durg',
    farmerName: 'Gopal Verma', activity: 'Land Survey',
    scheduledDate: '27 May', scheduledTime: '09:00 AM', color: GREEN, bg: GREEN_SOFT,
    items: [
      { name: 'Tractor', expected: 2 },
      { name: 'Pump Set', expected: 1 },
      { name: 'Sprayer', expected: 2 },
      { name: 'Drip Pipes (sets)', expected: 10 },
    ],
    borewells: 3,
  },
];

const VISIT_ACTIVITY_TYPES = [
  'Routine Visit', 'Land Verification', 'Farmer Meeting', 'Insecticide Spray',
  'Soil Test', 'Land Survey', 'Photo Upload', 'Agreement Follow-up', 'Other',
];

const LAND_OPTIONS = [
  'FM-10024 - Bori, Durg', 'FM-10028 - Jamgaon, Durg', 'FM-10035 - Bhilai, Durg',
  'FM-10040 - Koni, Durg', 'FM-10045 - Bhilai, Durg', 'FM-10050 - Utai, Durg',
];

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
        title: 'Insecticide Spray',
        farmId: 'FM-10035',
        location: 'Bori, Durg',
        farmerName: 'Mahesh Sahu',
        dueTime: '21 May 2025, 07:00 PM',
        description:
          'Move assigned insecticide from inventory to the farm, then complete spray activity on the affected crop area.',
        assignedTo: 'Rahul Sharma',
        priority: 'Medium Priority',
        status: 'Due Today',
        allocation:
          'Main task can be done by self or assigned. Inventory movement and spray work can be split into sub tasks.',
        subTasks: [
          {
            id: 'SUB-INV-10035-01',
            title: 'Get insecticide from inventory to farm',
            type: 'inventory',
            assignedTo: 'Rahul Sharma',
            status: 'Assigned',
            description:
              'Pick up the assigned insecticide from inventory and deliver it to the farm before spraying.',
            itemName: 'Neem-based insecticide',
            quantity: '12 Litres',
            receivingCode: 'RC-7284',
            pickupPoint: 'Central Inventory Store, Durg',
            destination: 'FM-10035 - Bori field shed',
            requiresPickupImage: true,
            requiresDropImage: true,
          },
          {
            id: 'SUB-FLD-10035-02',
            title: 'Spray insecticide on affected crop',
            type: 'field',
            assignedTo: 'Rahul Sharma',
            status: 'Pending',
            description:
              'Spray the delivered insecticide on the affected crop rows and report completion.',
          },
        ],
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
        description:
          'Conduct land survey and update the land information in the system.',
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

const DEMO_ON_DEMAND_TASK: Task = {
  taskId: 'OD-DEMO-001',
  title: 'Urea Delivery',
  farmId: 'FM-10035',
  location: 'Bori, Durg',
  farmerName: 'Mahesh Sahu',
  dueTime: '2026-06-05',
  assignedAcres: '5',
  description: 'On demand urea delivery task assigned by admin.',
  assignedTo: 'Field Manager',
  priority: 'High Priority',
  status: 'Assigned',
  allocation: 'On Demand',
  onDemandSteps: {
    step_1: {
      type: 'inventory',
      data: [{ item_name: 'Madhur Urea', unit: 'KGS', quantity: 4, equipment_id: 'product_f22cda7b' }],
      status: 'pending',
    },
    step_2: {
      type: 'logistics',
      data: [{ vehicle_id: '6280ec13-960d-4af1-bdfc-568e49e11ef2', vehicle_number: 'CG07B1121' }],
      status: 'pending',
    },
    step_3: {
      type: 'others',
      data: [{ description: 'Urea load karwa dena truck me' }],
      status: 'pending',
    },
  },
};

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
    shadowOffset: { width: 0, height: 7 },
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
  switchBar: {
    flexDirection: 'row',
    backgroundColor: '#EAECF0',
    borderRadius: 12,
    padding: 3,
    marginBottom: 18,
    gap: 3,
  },
  switchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  switchBtnActive: {
    backgroundColor: GREEN,
  },
  switchText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '800',
  },
  switchTextActive: {
    color: '#FFFFFF',
  },
  switchCount: {
    backgroundColor: '#FFE0E0',
    borderRadius: 999,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  switchCountActive: {
    backgroundColor: '#FF3B30',
  },
  switchCountText: {
    color: '#E60000',
    fontSize: 11,
    fontWeight: '800',
  },
  switchCountTextActive: {
    color: '#FFFFFF',
  },
  logVisitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: GREEN_SOFT,
    borderColor: GREEN_BORDER,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  logVisitIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: GREEN_BORDER,
    borderWidth: 1,
  },
  logVisitCopy: { flex: 1 },
  logVisitTitle: { color: INK, fontSize: 15, fontWeight: '900' },
  logVisitSub: { color: MUTED, fontSize: 12, fontWeight: '600', marginTop: 2 },
  fvSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  fvSectionTitle: { color: INK, fontSize: 16, fontWeight: '900' },
  fvCountBadge: {
    backgroundColor: GREEN_SOFT,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  fvCountText: { color: GREEN, fontSize: 12, fontWeight: '900' },
  visitCardsRow: { gap: 10, paddingBottom: 4 },
  visitCard: {
    borderRadius: 12,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    marginBottom: 10,
  },
  visitCardTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  visitDot: { width: 8, height: 8, borderRadius: 4 },
  visitActivity: { fontSize: 13, fontWeight: '900', flex: 1 },
  visitLandId: { color: INK, fontSize: 15, fontWeight: '900' },
  visitFarmer: { color: MUTED, fontSize: 12, fontWeight: '700' },
  visitRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  visitMeta: { color: MUTED, fontSize: 11, fontWeight: '600', flex: 1 },
  visitTapHint: { marginTop: 8 },
  visitTapHintText: { fontSize: 11, fontWeight: '800' },
  emptyVisitsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 40,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  emptyVisitsText: { color: MUTED, fontSize: 13, fontWeight: '700' },
  fvModalOverlay: { flex: 1, justifyContent: 'flex-end' },
  fvBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(7,11,26,0.45)' },
  fvSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '90%',
  },
  fvHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#D8DDE7',
    alignSelf: 'center',
    marginTop: 10, marginBottom: 4,
  },
  fvHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: CARD_BORDER,
  },
  fvHeaderIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: GREEN_SOFT,
    alignItems: 'center', justifyContent: 'center',
  },
  fvTitle: { flex: 1, color: INK, fontSize: 17, fontWeight: '900' },
  fvClose: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: '#F1F4F8',
    alignItems: 'center', justifyContent: 'center',
  },
  fvForm: { padding: 16, gap: 4, paddingBottom: 40 },
  fvFieldLabel: { color: INK, fontSize: 13, fontWeight: '800', marginTop: 12, marginBottom: 6 },
  fvSelect: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: CARD_BORDER, borderRadius: 9,
    height: 44, paddingHorizontal: 12,
  },
  fvSelectText: { flex: 1, color: INK, fontSize: 13, fontWeight: '700' },
  fvDropdown: {
    borderWidth: 1, borderColor: CARD_BORDER,
    borderRadius: 9, overflow: 'hidden', marginTop: 4,
  },
  fvDropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: CARD_BORDER,
  },
  fvDropdownText: { color: INK, fontSize: 13, fontWeight: '700' },
  fvTextAreaWrap: {
    borderWidth: 1, borderColor: CARD_BORDER, borderRadius: 9, padding: 10,
  },
  fvTextArea: { color: INK, fontSize: 13, minHeight: 80, textAlignVertical: 'top' },
  fvPhotoGrid: { flexDirection: 'row', gap: 8, marginTop: 4 },
  fvPhotoSlot: {
    flex: 1, height: 80, borderRadius: 10,
    borderWidth: 1.5, borderColor: GREEN_BORDER, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: GREEN_SOFT,
  },
  fvPhotoSlotDone: { backgroundColor: GREEN_SOFT, borderStyle: 'solid' },
  fvPhotoLabel: { color: GREEN, fontSize: 10, fontWeight: '800' },
  fvSaveBtn: {
    backgroundColor: GREEN, borderRadius: 10,
    height: 48, alignItems: 'center', justifyContent: 'center',
    marginTop: 20,
  },
  fvSaveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  mainCategoryRow: {
    flexDirection: 'row',
    marginBottom: 14,
    gap: 8,
  },
  mainCategoryChip: {
    alignItems: 'center',
    borderColor: GREEN_BORDER,
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  mainCategoryChipActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  mainCategoryText: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '800',
  },
  mainCategoryTextActive: {
    color: '#FFFFFF',
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
  filterBar: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
    marginTop: 4,
  },
  filterLabel: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '600',
  },
  filterChip: {
    borderColor: '#DDE3EC',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  filterChipActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },
  filterChipText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    shadowOffset: { width: 0, height: 8 },
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
  taskCard2: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6ECF2',
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#182033',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },
  landStrip: {
    backgroundColor: '#1B4D2E',
    height: 110,
    overflow: 'hidden',
    position: 'relative',
  },
  fieldRowLine: {
    backgroundColor: '#2E7D4F',
    height: 1,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  landStripOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  landStripContent: {
    alignItems: 'center',
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  farmIdBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  farmIdBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  acresBadge: {
    alignItems: 'center',
    backgroundColor: '#EFFAF2',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  acresBadgeText: {
    color: GREEN,
    fontSize: 11,
    fontWeight: '700',
  },
  taskCardBody: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  taskCardTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  taskCardActivity: {
    color: INK,
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 21,
  },
  taskPriorityPill: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  taskPriorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  assignSelector: {
    alignItems: 'center',
    borderRadius: 7,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    maxWidth: 120,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  assignSelectorText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    minWidth: 0,
  },
  assignDropdown: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE3EC',
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    marginTop: 2,
    overflow: 'hidden',
  },
  assignDropdownItem: {
    alignItems: 'center',
    borderBottomColor: '#EEF1F5',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  assignDropdownName: {
    color: INK,
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  taskCardInfoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginBottom: 6,
  },
  taskCardInfoText: {
    color: MUTED,
    flex: 1,
    fontSize: 12,
    minWidth: 0,
  },
  infoDot: {
    backgroundColor: '#C8D0DC',
    borderRadius: 2,
    height: 4,
    width: 4,
  },
  taskCardDueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  taskCardDueText: {
    fontSize: 12,
    fontWeight: '700',
  },
  taskCardDivider: {
    backgroundColor: '#EEF1F5',
    height: 1,
    marginHorizontal: 14,
  },
  taskActionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  taskActionChip: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  taskActionChipDone: {
    backgroundColor: '#F0FBF4',
    borderColor: '#BDEBCB',
  },
  taskActionChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  completeTaskBtn: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    marginHorizontal: 14,
    marginBottom: 12,
    paddingVertical: 10,
  },
  completeTaskBtnDone: {
    backgroundColor: '#F0FBF4',
    borderColor: '#BDEBCB',
  },
  completeTaskBtnText: {
    fontSize: 13,
    fontWeight: '800',
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
  subTaskCountPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: GREEN_BORDER,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    marginTop: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  subTaskCountText: {
    color: GREEN,
    fontSize: 12,
    fontWeight: '900',
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(7, 11, 26, 0.42)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  taskModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    maxHeight: '86%',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    width: '100%',
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingBottom: 12,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: '#D8DDE7',
    borderRadius: 999,
    height: 4,
    marginBottom: 14,
    width: 84,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTaskIcon: {
    alignItems: 'center',
    backgroundColor: GREEN_SOFT,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    marginRight: 12,
    width: 48,
  },
  modalTitleBlock: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  modalTitle: {
    color: INK,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 27,
  },
  taskTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 7,
  },
  fieldTag: {
    backgroundColor: GREEN_SOFT,
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  fieldTagText: {
    color: GREEN,
    fontSize: 12,
    fontWeight: '900',
  },
  priorityTag: {
    backgroundColor: '#FFF1F2',
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  priorityTagText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '900',
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
    backgroundColor: '#F2F4F8',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  dueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginBottom: 18,
  },
  dueItem: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  dueLabel: {
    color: INK,
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 5,
  },
  dueDateText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '900',
  },
  dueTimeText: {
    color: INK,
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 6,
  },
  dueDivider: {
    backgroundColor: '#CBD5E1',
    height: 22,
    width: 1,
  },
  statusTag: {
    backgroundColor: '#FFF3EA',
    borderRadius: 7,
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusTagText: {
    color: ORANGE_TEXT,
    fontSize: 12,
    fontWeight: '900',
  },
  timeline: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    marginBottom: 20,
  },
  flowStep: {
    alignItems: 'center',
    width: 64,
  },
  flowStepIcon: {
    alignItems: 'center',
    backgroundColor: '#F4F6FA',
    borderColor: '#DDE4EE',
    borderRadius: 23,
    borderWidth: 1.5,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  flowStepIconActive: {
    backgroundColor: GREEN_SOFT,
    borderColor: GREEN_BORDER,
  },
  flowStepIconComplete: {
    backgroundColor: GREEN_SOFT,
    borderColor: GREEN_BORDER,
  },
  flowStepLabel: {
    color: INK,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 16,
    marginTop: 7,
    textAlign: 'center',
  },
  flowStepCaption: {
    color: MUTED,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  timelineLine: {
    borderColor: '#D8DEE8',
    borderStyle: 'dashed',
    borderTopWidth: 2,
    flex: 1,
    marginHorizontal: -8,
    marginTop: 23,
  },
  timelineLineComplete: {
    borderColor: GREEN,
    borderStyle: 'solid',
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
  subTaskFlowSection: {
    borderTopColor: CARD_BORDER,
    borderTopWidth: 1,
    marginTop: 2,
    paddingTop: 12,
  },
  subTaskFlowHeader: {
    marginBottom: 7,
  },
  subTaskFlowHint: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    marginTop: -5,
  },
  subTaskFlowRow: {
    flexDirection: 'row',
  },
  subTaskFlowRail: {
    alignItems: 'center',
    width: 32,
  },
  subTaskFlowLine: {
    backgroundColor: '#DDE6EE',
    flex: 1,
    marginBottom: 4,
    marginTop: 4,
    width: 2,
  },
  subTaskFlowLineDone: {
    backgroundColor: GREEN_BORDER,
  },
  topMapSection: {
    borderTopColor: CARD_BORDER,
    borderTopWidth: 1,
    marginTop: 13,
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
    transform: [{ rotate: '-8deg' }],
  },
  mapRoadVertical: {
    backgroundColor: '#FFFFFF',
    bottom: -20,
    left: 102,
    position: 'absolute',
    top: -20,
    transform: [{ rotate: '18deg' }],
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
    transform: [{ rotate: '-13deg' }],
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
  cleanSection: {
    marginBottom: 18,
  },
  cleanSectionTitle: {
    color: INK,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
    marginBottom: 9,
  },
  descriptionText: {
    color: '#526079',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
  },
  hiddenSection: {
    display: 'none',
  },
  completedAcresInput: {
    backgroundColor: '#FFFFFF',
    borderColor: CARD_BORDER,
    borderRadius: 8,
    borderWidth: 1,
    color: INK,
    fontSize: 12,
    fontWeight: '800',
    height: 34,
    paddingHorizontal: 10,
  },
  completedAcresWrap: {
    width: 110,
  },
  taskInfoBox: {
    backgroundColor: '#F8FAFC',
    borderColor: CARD_BORDER,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  taskInfoRow: {
    alignItems: 'center',
    borderBottomColor: CARD_BORDER,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  taskInfoKey: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '800',
  },
  taskInfoValue: {
    color: INK,
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 12,
    textAlign: 'right',
  },
  acresRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  acresLabelBold: {
    fontWeight: '900',
  },
  taskPhotoRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  uploadTaskImagesButton: {
    alignItems: 'center',
    backgroundColor: BLUE,
    borderRadius: 9,
    flexDirection: 'row',
    gap: 6,
    height: 38,
    justifyContent: 'center',
    marginTop: 10,
  },
  uploadTaskImagesButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  uploadTaskImagesText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  taskPhotoBox: {
    borderColor: CARD_BORDER,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    height: 86,
    overflow: 'hidden',
    position: 'relative',
  },
  taskPhotoAdd: {
    alignItems: 'center',
    backgroundColor: BLUE_SOFT,
    flex: 1,
    justifyContent: 'center',
  },
  taskPhotoPreview: {
    height: '100%',
    width: '100%',
  },
  taskPhotoRemove: {
    alignItems: 'center',
    backgroundColor: RED,
    borderRadius: 14,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: 6,
    top: 6,
    width: 24,
  },
  taskCompleteButton: {
    alignItems: 'center',
    backgroundColor: BLUE,
    borderRadius: 9,
    height: 42,
    justifyContent: 'center',
    marginTop: 12,
  },
  taskCompleteButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  taskCompleteButtonDone: {
    backgroundColor: GREEN,
  },
  taskCompleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  cameraScreen: {
    backgroundColor: '#000000',
    flex: 1,
  },
  cameraPreview: {
    flex: 1,
  },
  cameraActions: {
    alignItems: 'center',
    backgroundColor: '#111827',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cameraCancel: {
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 9,
    height: 42,
    justifyContent: 'center',
    width: 110,
  },
  cameraCancelText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  cameraCapture: {
    alignItems: 'center',
    backgroundColor: GREEN,
    borderRadius: 9,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    height: 42,
    justifyContent: 'center',
  },
  cameraCaptureText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  coordButton: {
    alignItems: 'center',
    backgroundColor: BLUE,
    borderRadius: 9,
    height: 40,
    justifyContent: 'center',
    marginTop: 10,
  },
  coordButtonDone: {
    backgroundColor: GREEN,
  },
  coordButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  otpBox: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: CARD_BORDER,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  otpLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '800',
  },
  otpValue: {
    color: INK,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  equipmentTable: {
    borderColor: CARD_BORDER,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    overflow: 'hidden',
  },
  equipmentHeadRow: {
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  equipmentHeadCell: {
    color: INK,
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'right',
  },
  equipmentHeadLeft: {
    textAlign: 'left',
  },
  equipmentBodyRow: {
    borderTopColor: CARD_BORDER,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  equipmentBodyCell: {
    color: '#526079',
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
  transportTable: {
    borderColor: CARD_BORDER,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    overflow: 'hidden',
  },
  transportHeadRow: {
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  transportBodyRow: {
    borderTopColor: CARD_BORDER,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 9,
  },
  transportHeadCell: {
    color: INK,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'left',
  },
  transportBodyCell: {
    color: '#526079',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'left',
  },
  transportCellName: {
    flex: 1.1,
  },
  transportCellPhone: {
    flex: 1.1,
  },
  transportCellVehicle: {
    flex: 1,
  },
  transportCellNumber: {
    flex: 1,
  },
  uploadEquipButton: {
    alignItems: 'center',
    backgroundColor: BLUE_SOFT,
    borderColor: BLUE_BORDER,
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 40,
    paddingHorizontal: 10,
  },
  uploadEquipButtonDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  uploadEquipButtonDone: {
    backgroundColor: GREEN_SOFT,
    borderColor: GREEN_BORDER,
  },
  uploadEquipText: {
    color: BLUE,
    fontSize: 12,
    fontWeight: '900',
  },
  uploadEquipTextDone: {
    color: GREEN,
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  taskHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 2,
  },
  mapIconButton: {
    alignItems: 'center',
    backgroundColor: BLUE_SOFT,
    borderColor: BLUE_BORDER,
    borderRadius: 8,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  viewAllText: {
    color: GREEN,
    fontSize: 13,
    fontWeight: '900',
  },
  subTaskList: {
    borderColor: CARD_BORDER,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  subTaskListItem: {
    alignItems: 'center',
    borderBottomColor: CARD_BORDER,
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 54,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  subTaskStatusButton: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    marginRight: 10,
    width: 28,
  },
  subTaskStatusCircle: {
    borderColor: '#D5DCE7',
    borderRadius: 11,
    borderWidth: 2,
    height: 22,
    width: 22,
  },
  subTaskStatusCircleDone: {
    alignItems: 'center',
    backgroundColor: GREEN,
    borderColor: GREEN,
    justifyContent: 'center',
  },
  subTaskListCopy: {
    flex: 1,
    minWidth: 0,
  },
  subTaskListTitle: {
    color: INK,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
  },
  subTaskListMeta: {
    color: MUTED,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
    marginTop: 2,
  },
  subTaskStatePill: {
    borderRadius: 7,
    marginLeft: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  subTaskStateDone: {
    backgroundColor: GREEN_SOFT,
  },
  subTaskStateActive: {
    backgroundColor: '#EAF3FF',
  },
  subTaskStatePending: {
    backgroundColor: '#F1F5F9',
  },
  subTaskStateText: {
    fontSize: 10,
    fontWeight: '900',
  },
  subTaskStateDoneText: {
    color: GREEN,
  },
  subTaskStateActiveText: {
    color: BLUE,
  },
  subTaskStatePendingText: {
    color: MUTED,
  },
  proofRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 5,
  },
  emptySubTaskBox: {
    backgroundColor: '#F8FAFC',
    borderColor: CARD_BORDER,
    borderRadius: 10,
    borderWidth: 1,
    padding: 11,
  },
  emptySubTaskText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '800',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
  },
  detailGridItem: {
    paddingRight: 12,
    width: '50%',
  },
  detailGridLabel: {
    color: '#53617B',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    marginBottom: 3,
  },
  detailGridValue: {
    color: '#526079',
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  locationValueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  attachmentRow: {
    flexDirection: 'row',
    gap: 9,
  },
  attachmentCard: {
    alignItems: 'center',
    borderColor: CARD_BORDER,
    borderRadius: 9,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    minHeight: 52,
    minWidth: 0,
    paddingHorizontal: 8,
  },
  fileBadge: {
    alignItems: 'center',
    borderRadius: 4,
    height: 26,
    justifyContent: 'center',
    marginRight: 7,
    width: 26,
  },
  pdfBadge: {
    backgroundColor: '#EF1F2D',
  },
  jpgBadge: {
    backgroundColor: GREEN,
  },
  fileBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
  attachmentCopy: {
    flex: 1,
    minWidth: 0,
  },
  attachmentTitle: {
    color: INK,
    fontSize: 11,
    fontWeight: '900',
  },
  attachmentMeta: {
    color: '#526079',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  ownerPanel: {
    marginBottom: 4,
  },
  ownerTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lockedOwnerPill: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  lockedOwnerText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '900',
  },
  ownerActionRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 7,
  },
  selfActionButton: {
    alignItems: 'center',
    backgroundColor: GREEN_SOFT,
    borderColor: GREEN_BORDER,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 34,
    justifyContent: 'center',
  },
  selfActionText: {
    color: GREEN,
    fontSize: 12,
    fontWeight: '900',
  },
  assignActionButton: {
    alignItems: 'center',
    backgroundColor: BLUE_SOFT,
    borderColor: BLUE_BORDER,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 34,
    justifyContent: 'center',
  },
  assignActionText: {
    color: BLUE,
    fontSize: 13,
    fontWeight: '900',
  },
  lockedActionButton: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  subTaskCard: {
    backgroundColor: '#F8FAFC',
    borderColor: CARD_BORDER,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    marginBottom: 8,
    padding: 10,
  },
  subTaskCardDone: {
    backgroundColor: GREEN_SOFT,
    borderColor: GREEN_BORDER,
  },
  subTaskHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  subTaskIndex: {
    alignItems: 'center',
    backgroundColor: GREEN,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  subTaskIndexDone: {
    backgroundColor: '#16A34A',
  },
  subTaskIndexText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  subTaskHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  subTaskTitle: {
    color: INK,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  subTaskMeta: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    marginTop: 2,
  },
  subTaskDescription: {
    color: INK,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginBottom: 4,
  },
  subTaskCompactInfo: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    marginTop: 2,
  },
  compactOwnerRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 7,
  },
  mainTaskStep: {
    minHeight: 58,
    justifyContent: 'center',
  },
  compactInstructionText: {
    color: INK,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 10,
  },
  proofButton: {
    alignItems: 'center',
    borderColor: GREEN_BORDER,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    marginTop: 5,
    minHeight: 30,
    paddingHorizontal: 6,
  },
  proofButtonDone: {
    backgroundColor: GREEN_SOFT,
  },
  proofButtonDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  proofButtonText: {
    color: GREEN,
    fontSize: 11,
    fontWeight: '900',
  },
  proofButtonDoneText: {
    color: GREEN,
  },
  proofButtonDisabledText: {
    color: '#96A0AE',
  },
  completeSubTaskButton: {
    alignItems: 'center',
    backgroundColor: GREEN,
    borderRadius: 9,
    justifyContent: 'center',
    marginTop: 7,
    minHeight: 36,
  },
  completeSubTaskText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  completedSubTaskBadge: {
    alignItems: 'center',
    backgroundColor: GREEN_SOFT,
    borderColor: GREEN_BORDER,
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 38,
  },
  completedSubTaskText: {
    color: GREEN,
    fontSize: 13,
    fontWeight: '900',
  },
  dropdownLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 5,
    marginTop: 8,
  },
  dropdownButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: CARD_BORDER,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    height: 36,
    justifyContent: 'space-between',
    paddingHorizontal: 10,
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
    fontSize: 13,
    fontWeight: '900',
  },
  dropdownList: {
    backgroundColor: '#FFFFFF',
    borderColor: CARD_BORDER,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 5,
    overflow: 'hidden',
  },
  dropdownItem: {
    alignItems: 'center',
    borderBottomColor: CARD_BORDER,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 32,
    paddingHorizontal: 10,
  },
  dropdownItemText: {
    color: INK,
    fontSize: 13,
    fontWeight: '800',
  },
  modalActions: {
    backgroundColor: '#FFFFFF',
    borderTopColor: CARD_BORDER,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
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
  blockedAction: {
    backgroundColor: '#94A3B8',
    borderColor: '#94A3B8',
  },
  progressAction: {
    alignItems: 'center',
    backgroundColor: GREEN,
    borderRadius: 7,
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    height: 42,
    justifyContent: 'center',
  },
  progressActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  completeAction: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: GREEN,
    borderRadius: 7,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    height: 42,
    justifyContent: 'center',
  },
  completeActionText: {
    color: GREEN,
    fontSize: 13,
    fontWeight: '900',
  },
  blockedCompleteText: {
    color: '#FFFFFF',
  },
  blockedOutlineAction: {
    backgroundColor: '#F8FAFC',
    borderColor: CARD_BORDER,
    borderWidth: 1,
  },
  blockedOutlineText: {
    color: MUTED,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  visitTimePill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, marginLeft: 'auto' as const },
  visitTimePillText: { fontSize: 11, fontWeight: '700' as const },
  visitFooterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  visitPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F1F5F9', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  visitPillText: { color: MUTED, fontSize: 11, fontWeight: '700' as const },
  itemCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11 },
  itemCheckbox: { padding: 2 },
  itemName: { color: INK, fontSize: 13, fontWeight: '800' as const },
  itemExpected: { color: MUTED, fontSize: 11, fontWeight: '600' as const, marginTop: 1 },
  itemCountWrap: { alignItems: 'center' as const },
  itemCountLabel: { color: RED, fontSize: 10, fontWeight: '700' as const, marginBottom: 2 },
  itemCountInput: {
    borderWidth: 1, borderColor: RED_BORDER, borderRadius: 6,
    width: 52, height: 30, textAlign: 'center' as const,
    color: INK, fontWeight: '800' as const, fontSize: 13,
  },
  yesNoRow: { flexDirection: 'row', gap: 6 },
  yesNoBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, borderWidth: 1, borderColor: CARD_BORDER, backgroundColor: '#F8FAFC' },
  yesNoBtnYes: { backgroundColor: GREEN_SOFT, borderColor: GREEN_BORDER },
  yesNoBtnNo: { backgroundColor: RED_SOFT, borderColor: RED_BORDER },
  yesNoText: { color: MUTED, fontSize: 12, fontWeight: '800' as const },
  yesNoPillRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  yesNoPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: CARD_BORDER, backgroundColor: '#F8FAFC' },
  yesNoPillYes: { backgroundColor: GREEN, borderColor: GREEN },
  yesNoPillNo: { backgroundColor: RED, borderColor: RED },
  yesNoPillText: { color: MUTED, fontSize: 13, fontWeight: '800' as const },
  yesNoPillTextActive: { color: '#FFFFFF' },
  fvSubId: { color: MUTED, fontSize: 12, fontWeight: '600', marginTop: 1 },
  vdDetailCard: {
    backgroundColor: '#F7F9FC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    overflow: 'hidden',
    marginBottom: 16,
  },
  vdRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11 },
  vdRowBorder: { borderBottomWidth: 1, borderBottomColor: CARD_BORDER },
  vdLabel: { color: MUTED, fontSize: 12, fontWeight: '600', width: 64 },
  vdValue: { color: INK, fontSize: 13, fontWeight: '700', flex: 1 },
  odCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 14,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 10,
    marginBottom: 12,
    gap: 10,
  },
  odCardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  odCardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF4EE',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  odCardTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  odCardTitle: {
    color: INK,
    fontSize: 15,
    fontWeight: '800' as const,
  },
  odCardSub: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  odCardBadge: {
    backgroundColor: '#FFF4EE',
    borderColor: '#FED7AA',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  odCardBadgeText: {
    color: ORANGE_TEXT,
    fontSize: 10,
    fontWeight: '800' as const,
  },
  odCardMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
  },
  odCardDateText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '500' as const,
    flex: 1,
  },
  odCardCountPill: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  odCardStepCount: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '700' as const,
  },
  odFlowScroll: {
    paddingVertical: 6,
    paddingBottom: 4,
  },
  odFlowItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  odFlowNode: {
    width: 138,
    borderWidth: 1.5,
    borderRadius: 14,
    overflow: 'hidden' as const,
    gap: 0,
  },
  odFlowNodeTop: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 5,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  odFlowNodeType: {
    fontSize: 13,
    fontWeight: '800' as const,
    letterSpacing: 0.2,
  },
  odFlowStatus: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    marginHorizontal: 10,
    marginBottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
  },
  odFlowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  odFlowStatusText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  odFlowConnector: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 6,
  },
  odFlowLine: {
    width: 18,
    height: 2,
  },
  onDemandBadge: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 3,
    backgroundColor: '#FFF4EE', borderColor: '#FED7AA', borderWidth: 1,
    borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2,
  },
  onDemandBadgeText: { color: ORANGE_TEXT, fontSize: 9, fontWeight: '800' as const },
  odProgressRow: { marginBottom: 20, gap: 8 },
  odProgressLabel: { color: MUTED, fontSize: 13, fontWeight: '600' as const },
  odProgressTrack: { height: 6, backgroundColor: '#E6ECF2', borderRadius: 3 },
  odProgressFill: { height: 6, backgroundColor: GREEN, borderRadius: 3 },
  odStepRow: { flexDirection: 'row' as const, marginBottom: 4, alignItems: 'flex-start' as const },
  odStepLeft: { alignItems: 'center' as const, width: 32, paddingTop: 2 },
  odStepNum: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#E6ECF2',
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  odStepNumDone: { backgroundColor: GREEN },
  odStepNumText: { color: MUTED, fontSize: 12, fontWeight: '800' as const },
  odStepConnector: { width: 2, flex: 1, marginTop: 4, backgroundColor: CARD_BORDER, minHeight: 24 },
  odStepConnectorDone: { backgroundColor: GREEN },
  odStepCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  odStepCardDone: { backgroundColor: GREEN_SOFT, borderColor: GREEN_BORDER },
  odStepTitleRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  odTypePill: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  odTypePillText: { fontSize: 12, fontWeight: '700' as const },
  odStatusPill: { marginLeft: 'auto' as const, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  odStatusDone: { backgroundColor: GREEN_SOFT },
  odStatusActive: { backgroundColor: BLUE_SOFT },
  odStatusPending: { backgroundColor: '#F1F5F9' },
  odStatusText: { fontSize: 11, fontWeight: '700' as const },
  odStatusDoneText: { color: GREEN },
  odStatusPendingText: { color: MUTED },
  odDataRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  odDataText: { color: INK, fontSize: 13, fontWeight: '600' as const, flex: 1 },
  odDataMeta: { color: MUTED, fontSize: 12, fontWeight: '600' as const },
  odCompleteBtn: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    justifyContent: 'center' as const, gap: 7,
    borderRadius: 9, paddingVertical: 10, marginTop: 2,
  },
  odCompleteBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' as const },
  odAllDoneBox: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    justifyContent: 'center' as const, gap: 8,
    backgroundColor: GREEN_SOFT, borderColor: GREEN_BORDER, borderWidth: 1,
    borderRadius: 10, paddingVertical: 14, marginTop: 8,
  },
  odAllDoneText: { color: GREEN, fontSize: 14, fontWeight: '800' as const },
  vendorInfoCard: {
    backgroundColor: '#F8FAFC',
    borderColor: CARD_BORDER,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
    marginBottom: 12,
    padding: 14,
  },
  vendorInfoRow: {
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    gap: 8,
  },
  vendorInfoText: {
    color: INK,
    fontSize: 14,
    fontWeight: '600' as const,
  },
});
