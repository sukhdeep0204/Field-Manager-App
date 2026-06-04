import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from '../Icon';
import {API_BASE_URL} from '../../config';

const INK = '#070B1A';
const MUTED = '#43506F';
const GREEN = '#078B36';
const GREEN_SOFT = '#F3FCF6';
const GREEN_BORDER = '#BDEBCB';
const CARD_BORDER = '#E6ECF2';
const BLUE = '#0B66F0';
const BLUE_SOFT = '#F7FBFF';
const ORANGE_TEXT = '#EA580C';

interface DriverRow {
  driver_name?: string;
  driver_contact?: string;
  vehicle_number?: string;
}

interface Props {
  visible: boolean;
  step: {type: string; data: any[]; status: string};
  stepKey: string;
  taskId?: string;
  onClose: () => void;
  onComplete: () => void;
}

export default function LogisticsStepPopup({
  visible,
  step,
  stepKey,
  taskId,
  onClose,
  onComplete,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setFetchFailed(false);
    setDrivers([]);
    fetchDriverDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const fetchDriverDetails = async () => {
    setLoading(true);
    try {
      const vehicleList = step.data.map((v: any) => ({
        vehicle_id: v.vehicle_id ?? '',
        vehicle_number: v.vehicle_number ?? '',
      }));
      const response = await fetch(
        `${API_BASE_URL}/feild_manager/get_transport_coordination_data`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({vehicle_list: vehicleList}),
        },
      );
      if (!response.ok) throw new Error('Non-OK response');
      const json = await response.json();
      const rows: DriverRow[] = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json)
        ? json
        : [];
      setDrivers(rows);
    } catch {
      setFetchFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const tableRows: DriverRow[] = fetchFailed
    ? step.data.map((v: any) => ({
        driver_name: undefined,
        driver_contact: undefined,
        vehicle_number: v.vehicle_number ?? '—',
      }))
    : drivers;

  const handleComplete = async () => {
    if (!taskId) {
      Alert.alert('Error', 'Task ID is missing.');
      return;
    }
    setCompleting(true);
    try {
      const url = `${API_BASE_URL}/admin_ops_requests/update_logistics_task_type_status`;
      const body = {task_id: taskId, step_key: stepKey, status: 'completed'};
      console.log('[LogisticsPopup] completing step:', url, body);

      const res = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
      });
      const data = await res.json();
      console.log('[LogisticsPopup] response:', res.status, data);

      if (!res.ok || !data.success) {
        Alert.alert('Error', 'Could not mark step as completed. Try again.');
        return;
      }
      onComplete();
    } catch (e) {
      console.log('[LogisticsPopup] error:', e);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.headerIcon, {backgroundColor: '#EFF6FF'}]}>
              <Icon name="Truck" size={20} color={BLUE} />
            </View>
            <Text style={styles.headerTitle}>Logistics</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="X" size={20} color={MUTED} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}>

            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={BLUE} />
                <Text style={styles.loadingText}>Loading vehicle details...</Text>
              </View>
            ) : (
              <>
                {fetchFailed && (
                  <View style={styles.warningBox}>
                    <Icon name="AlertCircle" size={15} color={ORANGE_TEXT} />
                    <Text style={styles.warningText}>
                      Could not load full details. Showing basic info.
                    </Text>
                  </View>
                )}

                {/* Vehicle Table */}
                <Text style={styles.sectionTitle}>Vehicle Details</Text>
                <View style={styles.table}>
                  <View style={[styles.tableRow, styles.tableHead]}>
                    <Text style={[styles.tableCell, styles.tableHeadText, {flex: 2}]}>
                      Driver
                    </Text>
                    <Text style={[styles.tableCell, styles.tableHeadText, {flex: 2}]}>
                      Contact
                    </Text>
                    <Text style={[styles.tableCell, styles.tableHeadText, {flex: 2}]}>
                      Vehicle No.
                    </Text>
                  </View>
                  {tableRows.map((row, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.tableRow,
                        idx % 2 === 1 ? styles.tableRowAlt : null,
                      ]}>
                      <Text style={[styles.tableCell, {flex: 2}]}>
                        {row.driver_name ?? '—'}
                      </Text>
                      <Text style={[styles.tableCell, {flex: 2}]}>
                        {row.driver_contact ?? '—'}
                      </Text>
                      <Text style={[styles.tableCell, {flex: 2}]}>
                        {row.vehicle_number ?? '—'}
                      </Text>
                    </View>
                  ))}
                  {tableRows.length === 0 && (
                    <View style={styles.tableRow}>
                      <Text
                        style={[
                          styles.tableCell,
                          {flex: 1, color: MUTED, textAlign: 'center'},
                        ]}>
                        No vehicles assigned
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}

            {/* Mark Complete */}
            <TouchableOpacity
              style={[styles.completeBtn, completing && styles.btnDisabled]}
              onPress={handleComplete}
              disabled={completing}
              activeOpacity={0.82}>
              <Icon name="CircleCheck" size={18} color="#fff" />
              <Text style={styles.btnText}>
                {completing ? 'Completing...' : 'Mark Complete'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: CARD_BORDER,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: INK,
  },
  closeBtn: {
    padding: 4,
  },
  scrollBody: {
    flexGrow: 0,
  },
  body: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 32,
    gap: 14,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 24,
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: MUTED,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF4EE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FDDCCC',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: ORANGE_TEXT,
  },
  sectionTitle: {
    color: INK,
    fontSize: 15,
    fontWeight: '800',
  },
  table: {
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableHead: {
    backgroundColor: '#F8FAFC',
  },
  tableHeadText: {
    fontWeight: '700',
    color: INK,
    fontSize: 13,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: CARD_BORDER,
  },
  tableRowAlt: {
    backgroundColor: '#FAFBFC',
  },
  tableCell: {
    fontSize: 13,
    color: MUTED,
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: GREEN,
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
