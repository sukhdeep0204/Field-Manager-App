import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import {useMemo, useState, useEffect} from 'react';
import Icon from './Icon';

const INK = '#070B1A';
const MUTED = '#43506F';
const GREEN = '#078B36';
const GREEN_SOFT = '#F3FCF6';
const GREEN_BORDER = '#BDEBCB';
const CARD_BORDER = '#E6ECF2';
const ORANGE = '#F97316';
const RED = '#E60000';
const BLUE = '#0B66F0';
const BLUE_SOFT = '#F7FBFF';

export type StockIssuedItem = {
  issue_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  status: string;
};

export type TaskVehicle = {
  vehicle_id: string;
  vehicle_number: string;
};

type Allocations = Record<string, Record<string, number>>;
// allocations[item_id][vehicle_id] = quantity

type Props = {
  visible: boolean;
  taskTitle: string;
  farmId: string;
  issuedItems: StockIssuedItem[];
  vehicles: TaskVehicle[];
  onClose: () => void;
  onConfirm: (allocations: Allocations) => void;
};

function buildInitialAllocations(
  items: StockIssuedItem[],
  vehicles: TaskVehicle[],
): Allocations {
  const result: Allocations = {};
  for (const item of items) {
    result[item.item_id] = {};
    for (const v of vehicles) {
      result[item.item_id][v.vehicle_id] = 0;
    }
  }
  return result;
}

function getAllocatedTotal(allocations: Allocations, itemId: string): number {
  const byVehicle = allocations[itemId];
  if (!byVehicle) {return 0;}
  return Object.values(byVehicle).reduce((sum, q) => sum + q, 0);
}

export default function StockIssuePopup({
  visible,
  taskTitle,
  farmId,
  issuedItems,
  vehicles,
  onClose,
  onConfirm,
}: Props) {
  const [allocations, setAllocations] = useState<Allocations>({});

  useEffect(() => {
    if (visible) {
      setAllocations(buildInitialAllocations(issuedItems, vehicles));
    }
  }, [visible, issuedItems, vehicles]);

  const adjust = (itemId: string, vehicleId: string, delta: number) => {
    setAllocations(prev => {
      const current = prev[itemId]?.[vehicleId] ?? 0;
      const newVal = Math.max(0, current + delta);
      const item = issuedItems.find(i => i.item_id === itemId);
      const total = getAllocatedTotal(prev, itemId) - current + newVal;
      if (item && total > item.quantity) {return prev;}
      return {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          [vehicleId]: newVal,
        },
      };
    });
  };

  const handleConfirm = () => {
    const unallocated = issuedItems.filter(item => {
      const total = getAllocatedTotal(allocations, item.item_id);
      return total < item.quantity;
    });
    if (unallocated.length > 0) {
      Alert.alert(
        'Unallocated Stock',
        `${unallocated.map(i => i.item_name).join(', ')} still has unallocated quantity. Proceed anyway?`,
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Proceed', onPress: () => onConfirm(allocations)},
        ],
      );
      return;
    }
    onConfirm(allocations);
  };

  const hasVehicles = vehicles.length > 0;
  const hasItems = issuedItems.length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.backdrop}
          onPress={onClose}
        />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIconWrap}>
              <Icon name="PackageCheck" size={22} color={GREEN} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>Stock Allocation</Text>
              <Text style={styles.headerSub} numberOfLines={1}>
                {taskTitle} · {farmId}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onClose}
              style={styles.closeBtn}>
              <Icon name="X" size={20} color={INK} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled">

            {/* Issued Items Summary */}
            <Text style={styles.sectionTitle}>Issued Stock</Text>
            {!hasItems ? (
              <View style={styles.emptyBox}>
                <Icon name="PackageOpen" size={26} color={MUTED} />
                <Text style={styles.emptyText}>No stock issued for this task</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.itemPillRow}>
                {issuedItems.map(item => {
                  const allocated = getAllocatedTotal(allocations, item.item_id);
                  const remaining = item.quantity - allocated;
                  const allDone = remaining === 0;
                  return (
                    <View
                      key={item.item_id}
                      style={[
                        styles.itemPill,
                        allDone && styles.itemPillDone,
                      ]}>
                      <Icon
                        name="Package"
                        size={14}
                        color={allDone ? GREEN : BLUE}
                      />
                      <Text
                        style={[
                          styles.itemPillName,
                          allDone && styles.itemPillNameDone,
                        ]}
                        numberOfLines={1}>
                        {item.item_name}
                      </Text>
                      <View
                        style={[
                          styles.itemPillQtyBadge,
                          allDone && styles.itemPillQtyBadgeDone,
                        ]}>
                        <Text
                          style={[
                            styles.itemPillQty,
                            allDone && styles.itemPillQtyDone,
                          ]}>
                          ×{item.quantity}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            {/* Vehicles Summary */}
            <Text style={[styles.sectionTitle, {marginTop: 20}]}>
              Assigned Vehicles
            </Text>
            {!hasVehicles ? (
              <View style={styles.emptyBox}>
                <Icon name="Truck" size={26} color={MUTED} />
                <Text style={styles.emptyText}>No vehicles assigned to this task</Text>
              </View>
            ) : (
              <View style={styles.vehicleRow}>
                {vehicles.map(v => (
                  <View key={v.vehicle_id} style={styles.vehicleChip}>
                    <Icon name="Truck" size={14} color={MUTED} />
                    <Text style={styles.vehicleChipText} numberOfLines={1}>
                      {v.vehicle_number}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Allocation Table */}
            {hasItems && hasVehicles ? (
              <>
                <Text style={[styles.sectionTitle, {marginTop: 20}]}>
                  Allocate to Vehicles
                </Text>

                {issuedItems.map(item => {
                  const allocated = getAllocatedTotal(allocations, item.item_id);
                  const remaining = item.quantity - allocated;
                  const allDone = remaining === 0;

                  return (
                    <View key={item.item_id} style={styles.allocationCard}>
                      {/* Item header */}
                      <View style={styles.allocationItemHeader}>
                        <View style={styles.allocationItemIcon}>
                          <Icon name="Package" size={16} color={BLUE} />
                        </View>
                        <View style={styles.allocationItemCopy}>
                          <Text style={styles.allocationItemName}>
                            {item.item_name}
                          </Text>
                          <Text style={styles.allocationItemTotal}>
                            Total: {item.quantity} units
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.remainingBadge,
                            allDone
                              ? styles.remainingBadgeDone
                              : remaining < item.quantity * 0.5
                              ? styles.remainingBadgeWarning
                              : styles.remainingBadgeDefault,
                          ]}>
                          <Text
                            style={[
                              styles.remainingBadgeText,
                              allDone
                                ? styles.remainingBadgeTextDone
                                : remaining < item.quantity * 0.5
                                ? styles.remainingBadgeTextWarning
                                : styles.remainingBadgeTextDefault,
                            ]}>
                            {allDone ? '✓ All set' : `${remaining} left`}
                          </Text>
                        </View>
                      </View>

                      {/* Per-vehicle steppers */}
                      {vehicles.map((v, idx) => {
                        const qty =
                          allocations[item.item_id]?.[v.vehicle_id] ?? 0;
                        const canIncrease = allocated < item.quantity;
                        const isLast = idx === vehicles.length - 1;
                        return (
                          <View
                            key={v.vehicle_id}
                            style={[
                              styles.stepperRow,
                              !isLast && styles.stepperRowBorder,
                            ]}>
                            <View style={styles.stepperVehicleInfo}>
                              <View style={styles.stepperVehicleDot} />
                              <Text
                                style={styles.stepperVehicleNum}
                                numberOfLines={1}>
                                {v.vehicle_number}
                              </Text>
                            </View>
                            <View style={styles.stepper}>
                              <TouchableOpacity
                                activeOpacity={0.75}
                                disabled={qty <= 0}
                                onPress={() =>
                                  adjust(item.item_id, v.vehicle_id, -1)
                                }
                                style={[
                                  styles.stepperBtn,
                                  qty <= 0 && styles.stepperBtnDisabled,
                                ]}>
                                <Icon
                                  name="Minus"
                                  size={14}
                                  color={qty <= 0 ? '#C8D0DC' : RED}
                                />
                              </TouchableOpacity>

                              <View style={styles.stepperValBox}>
                                <Text style={styles.stepperVal}>{qty}</Text>
                              </View>

                              <TouchableOpacity
                                activeOpacity={0.75}
                                disabled={!canIncrease}
                                onPress={() =>
                                  adjust(item.item_id, v.vehicle_id, +1)
                                }
                                style={[
                                  styles.stepperBtn,
                                  !canIncrease && styles.stepperBtnDisabled,
                                ]}>
                                <Icon
                                  name="Plus"
                                  size={14}
                                  color={!canIncrease ? '#C8D0DC' : GREEN}
                                />
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
              </>
            ) : null}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              activeOpacity={0.76}
              onPress={onClose}
              style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleConfirm}
              disabled={!hasItems || !hasVehicles}
              style={[
                styles.confirmBtn,
                (!hasItems || !hasVehicles) && styles.confirmBtnDisabled,
              ]}>
              <Icon name="CheckCircle2" size={16} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>Confirm Allocation</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 12,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: '#DDE3EC',
    borderRadius: 3,
    height: 4,
    marginBottom: 4,
    marginTop: 10,
    width: 40,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: '#EEF1F5',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  headerIconWrap: {
    alignItems: 'center',
    backgroundColor: GREEN_SOFT,
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    color: INK,
    fontSize: 16,
    fontWeight: '800',
  },
  headerSub: {
    color: MUTED,
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  body: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    color: INK,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  emptyBox: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: CARD_BORDER,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    paddingVertical: 20,
  },
  emptyText: {
    color: MUTED,
    fontSize: 13,
  },
  // Issued item pills
  itemPillRow: {
    gap: 8,
    paddingBottom: 2,
  },
  itemPill: {
    alignItems: 'center',
    backgroundColor: BLUE_SOFT,
    borderColor: '#93C5FD',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  itemPillDone: {
    backgroundColor: GREEN_SOFT,
    borderColor: GREEN_BORDER,
  },
  itemPillName: {
    color: BLUE,
    fontSize: 13,
    fontWeight: '700',
    maxWidth: 120,
  },
  itemPillNameDone: {
    color: GREEN,
  },
  itemPillQtyBadge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  itemPillQtyBadgeDone: {
    backgroundColor: GREEN_BORDER,
  },
  itemPillQty: {
    color: BLUE,
    fontSize: 11,
    fontWeight: '800',
  },
  itemPillQtyDone: {
    color: GREEN,
  },
  // Vehicles
  vehicleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vehicleChip: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: CARD_BORDER,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  vehicleChipText: {
    color: INK,
    fontSize: 12,
    fontWeight: '600',
  },
  // Allocation cards
  allocationCard: {
    backgroundColor: '#FFFFFF',
    borderColor: CARD_BORDER,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  allocationItemHeader: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderBottomColor: CARD_BORDER,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  allocationItemIcon: {
    alignItems: 'center',
    backgroundColor: BLUE_SOFT,
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  allocationItemCopy: {
    flex: 1,
    minWidth: 0,
  },
  allocationItemName: {
    color: INK,
    fontSize: 14,
    fontWeight: '800',
  },
  allocationItemTotal: {
    color: MUTED,
    fontSize: 11,
    marginTop: 2,
  },
  remainingBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  remainingBadgeDone: {
    backgroundColor: GREEN_SOFT,
  },
  remainingBadgeWarning: {
    backgroundColor: '#FFF7ED',
  },
  remainingBadgeDefault: {
    backgroundColor: '#EFF6FF',
  },
  remainingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  remainingBadgeTextDone: {
    color: GREEN,
  },
  remainingBadgeTextWarning: {
    color: ORANGE,
  },
  remainingBadgeTextDefault: {
    color: BLUE,
  },
  // Stepper row
  stepperRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  stepperRowBorder: {
    borderBottomColor: '#EEF1F5',
    borderBottomWidth: 1,
  },
  stepperVehicleInfo: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    minWidth: 0,
  },
  stepperVehicleDot: {
    backgroundColor: MUTED,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  stepperVehicleNum: {
    color: INK,
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  stepper: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 0,
  },
  stepperBtn: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: CARD_BORDER,
    borderRadius: 8,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  stepperBtnDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  stepperValBox: {
    alignItems: 'center',
    minWidth: 44,
  },
  stepperVal: {
    color: INK,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  // Footer
  footer: {
    borderTopColor: '#EEF1F5',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 8,
  },
  cancelBtn: {
    alignItems: 'center',
    borderColor: CARD_BORDER,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 13,
  },
  cancelBtnText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '700',
  },
  confirmBtn: {
    alignItems: 'center',
    backgroundColor: GREEN,
    borderRadius: 10,
    flex: 2,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 13,
  },
  confirmBtnDisabled: {
    backgroundColor: '#C8D0DC',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
