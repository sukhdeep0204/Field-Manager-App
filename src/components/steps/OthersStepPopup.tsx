import React, {useState} from 'react';
import {
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

interface Props {
  visible: boolean;
  step: {type: string; data: any[]; status: string};
  stepKey: string;
  taskId?: string;
  onClose: () => void;
  onComplete: () => void;
}

export default function OthersStepPopup({
  visible,
  step,
  stepKey,
  taskId,
  onClose,
  onComplete,
}: Props) {
  const description: string =
    step.data[0]?.description ?? 'No description provided.';

  const [completing, setCompleting] = useState(false);

  const handleComplete = async () => {
    if (!taskId) {
      Alert.alert('Error', 'Task ID is missing.');
      return;
    }
    setCompleting(true);
    try {
      const url = `${API_BASE_URL}/admin_ops_requests/update_others_task_type_status`;
      const body = {task_id: taskId, step_key: stepKey, status: 'completed'};
      console.log('[OthersPopup] completing step:', url, body);

      const res = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
      });
      const data = await res.json();
      console.log('[OthersPopup] response:', res.status, data);

      if (!res.ok || !data.success) {
        Alert.alert('Error', 'Could not mark step as completed. Try again.');
        return;
      }
      onComplete();
    } catch (e) {
      console.log('[OthersPopup] error:', e);
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
            <View style={[styles.headerIcon, {backgroundColor: '#F1F5F9'}]}>
              <Icon name="FileText" size={20} color={MUTED} />
            </View>
            <Text style={styles.headerTitle}>Others</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="X" size={20} color={MUTED} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}>

            {/* Description */}
            <Text style={styles.sectionTitle}>Description</Text>
            <View style={styles.descCard}>
              <Text style={styles.descText}>{description}</Text>
            </View>

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
  sectionTitle: {
    color: INK,
    fontSize: 15,
    fontWeight: '800',
  },
  descCard: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  descText: {
    fontSize: 14,
    color: MUTED,
    lineHeight: 22,
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
