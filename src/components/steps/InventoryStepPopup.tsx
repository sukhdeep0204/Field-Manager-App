import React, {useRef, useState} from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {Camera, CameraType, type CameraApi} from 'react-native-camera-kit';
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
  step: {type: string; data: any[]; status: string; equipment_otp?: string};
  stepKey: string;
  taskId?: string;
  onClose: () => void;
  onComplete: () => void;
}

export default function InventoryStepPopup({
  visible,
  step,
  stepKey,
  taskId,
  onClose,
  onComplete,
}: Props) {
  const [cameraVisible, setCameraVisible] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const cameraRef = useRef<CameraApi>(null);

  const otp: string | undefined = step.equipment_otp;
  const uploaded = imageUrl !== null;

  console.log('[InventoryPopup] rendered — taskId:', taskId, 'stepKey:', stepKey, 'photo:', photo, 'imageUrl:', imageUrl);

  const handleCapture = async () => {
    if (!cameraRef.current) {return;}
    try {
      const result = await cameraRef.current.capture();
      console.log('[InventoryPopup] photo captured:', result.uri);
      setPhoto(result.uri);
      setImageUrl(null);
      setCameraVisible(false);
    } catch (e) {
      console.log('[InventoryPopup] capture error:', e);
      setCameraVisible(false);
    }
  };

  // API 1 — upload handover proof image
  const handleUpload = async () => {
    console.log('[InventoryPopup] handleUpload — photo:', photo, 'taskId:', taskId);
    if (!photo) {
      console.log('[InventoryPopup] blocked: no photo');
      return;
    }
    if (!taskId) {
      console.log('[InventoryPopup] blocked: no taskId');
      Alert.alert('Error', 'Task ID is missing.');
      return;
    }
    setUploading(true);
    try {
      const url = `${API_BASE_URL}/feild_manager/upload_equipment_coordination_image?task_id=${encodeURIComponent(taskId)}`;
      console.log('[InventoryPopup] uploading to:', url);

      const formData = new FormData();
      formData.append('image', {
        uri: photo,
        type: 'image/jpeg',
        name: `handover-proof-${Date.now()}.jpg`,
      } as any);

      const res = await fetch(url, {method: 'POST', body: formData});
      const data = await res.json();
      console.log('[InventoryPopup] upload response:', res.status, data);

      if (!res.ok || !data.success || !data.image_url) {
        Alert.alert('Upload failed', 'Could not upload proof image. Try again.');
        return;
      }
      setImageUrl(data.image_url);
    } catch (e) {
      console.log('[InventoryPopup] upload error:', e);
      Alert.alert('Upload failed', 'Network error. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // API 2 — mark step completed with proof URL
  const handleComplete = async () => {
    console.log('[InventoryPopup] handleComplete — imageUrl:', imageUrl, 'taskId:', taskId, 'stepKey:', stepKey);
    if (!imageUrl) {
      console.log('[InventoryPopup] blocked: no imageUrl');
      return;
    }
    if (!taskId) {
      console.log('[InventoryPopup] blocked: no taskId');
      Alert.alert('Error', 'Task ID is missing.');
      return;
    }
    setCompleting(true);
    try {
      const url = `${API_BASE_URL}/admin_ops_requests/update_inventory_task_type_status`;
      const body = {
        task_id: taskId,
        step_key: stepKey,
        status: 'completed',
        handover_proof_delivery: imageUrl,
      };
      console.log('[InventoryPopup] completing step:', url, body);

      const res = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
      });
      const data = await res.json();
      console.log('[InventoryPopup] complete response:', res.status, data);

      if (!res.ok || !data.success) {
        Alert.alert('Error', 'Could not mark step as completed. Try again.');
        return;
      }
      onComplete();
    } catch (e) {
      console.log('[InventoryPopup] complete error:', e);
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
            <View style={[styles.headerIcon, {backgroundColor: '#FFF4EE'}]}>
              <Icon name="Package" size={20} color={ORANGE_TEXT} />
            </View>
            <Text style={styles.headerTitle}>Inventory</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="X" size={20} color={MUTED} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}>

            {/* OTP Box */}
            {otp ? (
              <View style={styles.otpBox}>
                <Text style={styles.otpLabel}>Handover OTP</Text>
                <Text style={styles.otpValue}>{otp}</Text>
              </View>
            ) : null}

            {/* Equipment Table */}
            <Text style={styles.sectionTitle}>Equipment List</Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHead]}>
                <Text style={[styles.tableCell, styles.tableHeadText, {flex: 2}]}>Item</Text>
                <Text style={[styles.tableCell, styles.tableHeadText, {flex: 1}]}>Qty</Text>
                <Text style={[styles.tableCell, styles.tableHeadText, {flex: 1}]}>Unit</Text>
              </View>
              {step.data.map((item: any, idx: number) => (
                <View
                  key={idx}
                  style={[
                    styles.tableRow,
                    idx % 2 === 1 ? styles.tableRowAlt : null,
                  ]}>
                  <Text style={[styles.tableCell, {flex: 2}]}>
                    {item.item_name ?? '—'}
                  </Text>
                  <Text style={[styles.tableCell, {flex: 1}]}>
                    {item.quantity ?? '—'}
                  </Text>
                  <Text style={[styles.tableCell, {flex: 1}]}>
                    {item.unit ?? '—'}
                  </Text>
                </View>
              ))}
              {step.data.length === 0 && (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, {flex: 1, color: MUTED, textAlign: 'center'}]}>
                    No items
                  </Text>
                </View>
              )}
            </View>

            {/* Proof of Handover */}
            <Text style={styles.sectionTitle}>Proof of Handover</Text>
            <TouchableOpacity
              style={styles.photoBox}
              onPress={() => setCameraVisible(true)}
              activeOpacity={0.8}>
              {photo ? (
                <Image source={{uri: photo}} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Icon name="Camera" size={32} color={MUTED} />
                  <Text style={styles.photoPlaceholderText}>Tap to capture</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Upload Button */}
            <TouchableOpacity
              style={[
                styles.uploadBtn,
                !photo || uploading ? styles.btnDisabled : null,
                uploaded ? styles.btnDone : null,
              ]}
              onPress={handleUpload}
              disabled={!photo || uploading || uploaded}>
              <Icon
                name={uploaded ? 'CheckCircle2' : 'ImageUp'}
                size={18}
                color="#fff"
              />
              <Text style={styles.btnText}>
                {uploaded ? 'Proof Uploaded' : uploading ? 'Uploading...' : 'Upload Proof'}
              </Text>
            </TouchableOpacity>

            {/* Mark Complete */}
            <TouchableOpacity
              style={[
                styles.completeBtn,
                (!uploaded || completing) ? styles.btnDisabled : null,
              ]}
              onPress={handleComplete}
              disabled={!uploaded || completing}>
              <Icon name="CircleCheck" size={18} color="#fff" />
              <Text style={styles.btnText}>
                {completing ? 'Completing...' : 'Mark Complete'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* Camera Modal */}
      <Modal
        visible={cameraVisible}
        animationType="slide"
        onRequestClose={() => setCameraVisible(false)}>
        <View style={styles.cameraContainer}>
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            cameraType={CameraType.Back}
            flashMode="auto"
          />
          <View style={styles.cameraFooter}>
            <TouchableOpacity
              style={styles.cameraCancelBtn}
              onPress={() => setCameraVisible(false)}>
              <Text style={styles.cameraCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cameraCaptureBtn}
              onPress={handleCapture}>
              <Icon name="Camera" size={22} color="#fff" />
              <Text style={styles.cameraCaptureText}>Capture</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  otpBox: {
    backgroundColor: GREEN_SOFT,
    borderWidth: 1,
    borderColor: GREEN_BORDER,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  otpLabel: {
    fontSize: 12,
    color: GREEN,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  otpValue: {
    fontSize: 36,
    fontWeight: '800',
    color: GREEN,
    letterSpacing: 8,
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
  photoBox: {
    height: 160,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: CARD_BORDER,
    borderStyle: 'dashed',
    overflow: 'hidden',
    backgroundColor: '#FAFBFC',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoPlaceholderText: {
    fontSize: 13,
    color: MUTED,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: BLUE,
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: GREEN,
  },
  btnDone: {
    backgroundColor: GREEN,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraFooter: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 24,
  },
  cameraCancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraCancelText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  cameraCaptureBtn: {
    flex: 2,
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cameraCaptureText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
