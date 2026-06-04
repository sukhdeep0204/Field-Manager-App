import React, {useRef, useState} from 'react';
import {
  Alert,
  Image,
  Linking,
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

interface Props {
  visible: boolean;
  step: {type: string; data: any[]; status: string; task_media?: string[]};
  stepKey: string;
  taskId?: string;
  onClose: () => void;
  onComplete: () => void;
}

export default function CultivationStepPopup({
  visible,
  step,
  stepKey,
  taskId,
  onClose,
  onComplete,
}: Props) {
  const raw = step.data[0] ?? {};

  // ── resolved fields from nested API shape ──────────────────────────────
  const farmer   = raw.farmer_details ?? {};
  const farm     = raw.farm_details   ?? {};
  const landData = farm.land_data     ?? {};

  const ownerName    = farmer.owner_name  || '—';
  const ownerContact = farmer.contact     || '—';
  const ownerAddress = farmer.address     || '—';
  const activity     = raw.activity       || '—';
  const area         = farm.area != null  ? `${farm.area} ac` : '—';
  const location     = [landData.village, landData.district].filter(Boolean).join(', ') || '—';
  const cropType     = farm.crop_type     || '—';
  const dueDate      = raw.due_date       || '—';

  // polygon centroid for map link
  const polygonCoords: number[][] = landData.land_coordinates ?? [];
  const hasCoords = polygonCoords.length > 0;

  // ── state ──────────────────────────────────────────────────────────────
  const [photos, setPhotos]             = useState<(string | null)[]>([null, null, null]);
  const [activeCamIdx, setActiveCamIdx] = useState<number | null>(null);
  const [imageUrls, setImageUrls]       = useState<string[]>([]);
  const [uploading, setUploading]       = useState(false);
  const [completing, setCompleting]     = useState(false);
  const cameraRef = useRef<CameraApi>(null);

  const capturedCount = photos.filter(Boolean).length;
  const allCaptured   = capturedCount === 3;
  const uploaded      = imageUrls.length === 3;

  const openCamera = (idx: number) => setActiveCamIdx(idx);

  const handleCapture = async () => {
    if (!cameraRef.current || activeCamIdx === null) {return;}
    try {
      const res = await cameraRef.current.capture();
      setPhotos(prev => {
        const next = [...prev];
        next[activeCamIdx] = res.uri;
        return next;
      });
      setImageUrls([]); // reset urls if re-capturing
    } catch {
      Alert.alert('Camera', 'Could not capture photo.');
    } finally {
      setActiveCamIdx(null);
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos(prev => {const next = [...prev]; next[idx] = null; return next;});
    setImageUrls([]); // reset urls when any photo removed
  };

  // API 1 — upload all 3 images one by one
  const handleUpload = async () => {
    if (!allCaptured) {return;}
    if (!taskId) {
      Alert.alert('Error', 'Task ID is missing.');
      return;
    }
    setUploading(true);
    try {
      const urls: string[] = [];
      const uris = photos.filter(Boolean) as string[];

      for (let i = 0; i < uris.length; i++) {
        const formData = new FormData();
        formData.append('image', {
          uri: uris[i],
          type: 'image/jpeg',
          name: `cultivation-proof-${i + 1}-${Date.now()}.jpg`,
        } as any);

        const url = `${API_BASE_URL}/admin_ops_requests/upload_task_progress_images?task_id=${encodeURIComponent(taskId)}`;
        console.log(`[CultivationPopup] uploading image ${i + 1}/3 to:`, url);

        const res = await fetch(url, {method: 'POST', body: formData});
        const data = await res.json();
        console.log(`[CultivationPopup] image ${i + 1} response:`, res.status, data);

        if (!res.ok || !data.success || !data.image_url) {
          Alert.alert('Upload failed', `Image ${i + 1} failed to upload. Please try again.`);
          return;
        }
        urls.push(data.image_url);
      }

      setImageUrls(urls);
      console.log('[CultivationPopup] all images uploaded:', urls);
    } catch (e) {
      console.log('[CultivationPopup] upload error:', e);
      Alert.alert('Upload failed', 'Network error. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // API 2 — submit completion with image URLs
  const handleComplete = async () => {
    if (!uploaded) {return;}
    if (!taskId) {
      Alert.alert('Error', 'Task ID is missing.');
      return;
    }
    setCompleting(true);
    try {
      const url = `${API_BASE_URL}/admin_ops_requests/update_cultivation_task_type_status`;
      const body = {
        task_id: taskId,
        step_key: stepKey,
        status: 'completed',
        task_media: imageUrls,
      };
      console.log('[CultivationPopup] completing step:', url, body);

      const res = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
      });
      const data = await res.json();
      console.log('[CultivationPopup] complete response:', res.status, data);

      if (!res.ok || !data.success) {
        Alert.alert('Error', 'Could not mark step as completed. Try again.');
        return;
      }
      onComplete();
    } catch (e) {
      console.log('[CultivationPopup] complete error:', e);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setCompleting(false);
    }
  };

  const handleViewOnMap = async () => {
    if (!hasCoords) {
      Alert.alert('Map', 'No land coordinates available.');
      return;
    }
    // compute centroid of polygon
    const lat = polygonCoords.reduce((s, c) => s + c[0], 0) / polygonCoords.length;
    const lng = polygonCoords.reduce((s, c) => s + c[1], 0) / polygonCoords.length;
    await Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`);
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.handle} />

            {/* Header */}
            <View style={s.header}>
              <View style={[s.headerIcon, {backgroundColor: GREEN_SOFT}]}>
                <Icon name="Sprout" size={22} color={GREEN} />
              </View>
              <View style={{flex: 1}}>
                <Text style={s.headerTitle}>Cultivation</Text>
                <Text style={s.headerSub}>{activity} · {dueDate}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.75}>
                <Icon name="X" size={20} color={INK} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>

              {/* Land Owner */}
              <Text style={s.sectionTitle}>Land Owner</Text>
              <View style={s.infoCard}>
                <InfoRow icon="User"   label="Name"    value={ownerName} />
                <InfoRow icon="Phone"  label="Contact" value={ownerContact} divider />
                <InfoRow icon="MapPin" label="Address" value={ownerAddress} divider />
              </View>

              {/* Task Details */}
              <Text style={s.sectionTitle}>Task Details</Text>
              <View style={s.infoCard}>
                <InfoRow icon="Leaf"    label="Activity" value={activity} />
                <InfoRow icon="Wheat"   label="Crop"     value={cropType}  divider />
                <InfoRow icon="Sprout"  label="Area"     value={area}      divider />
                <InfoRow icon="MapPin"  label="Location" value={location}  divider />
              </View>

              {/* Map button */}
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={handleViewOnMap}
                style={[s.mapBtn, !hasCoords && s.mapBtnDisabled]}>
                <Icon name="MapPinned" size={17} color={BLUE} />
                <Text style={s.mapBtnText}>View Land on Map</Text>
              </TouchableOpacity>

              {/* Proof of Work */}
              <Text style={s.sectionTitle}>Proof of Work</Text>
              <View style={s.photoRow}>
                {photos.map((uri, idx) => (
                  <View key={idx} style={s.photoBox}>
                    {uri ? (
                      <>
                        <Image source={{uri}} style={s.photoPreview} resizeMode="cover" />
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => removePhoto(idx)}
                          style={s.photoRemove}>
                          <Icon name="X" size={12} color="#fff" />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => openCamera(idx)}
                        style={s.photoAdd}>
                        <Icon name="Plus" size={22} color={MUTED} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
              <Text style={s.photoHint}>{capturedCount}/3 photos captured</Text>

              {/* Upload */}
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={handleUpload}
                disabled={!allCaptured || uploading || uploaded}
                style={[
                  s.uploadBtn,
                  (!allCaptured || uploaded) && s.btnDisabled,
                  uploaded && s.btnDone,
                ]}>
                <Icon name={uploaded ? 'CheckCircle2' : 'ImageUp'} size={17} color="#fff" />
                <Text style={s.btnText}>
                  {uploaded ? 'Proof Uploaded' : uploading ? 'Uploading...' : 'Upload Proof'}
                </Text>
              </TouchableOpacity>

              {/* Complete */}
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={handleComplete}
                disabled={!uploaded || completing}
                style={[s.completeBtn, (!uploaded || completing) && s.btnDisabled]}>
                <Icon name="CircleCheck" size={17} color="#fff" />
                <Text style={s.btnText}>
                  {completing ? 'Completing...' : 'Task Completed'}
                </Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Camera modal */}
      <Modal
        visible={activeCamIdx !== null}
        animationType="slide"
        onRequestClose={() => setActiveCamIdx(null)}>
        <View style={s.camScreen}>
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            cameraType={CameraType.Back}
          />
          <View style={s.camActions}>
            <TouchableOpacity onPress={() => setActiveCamIdx(null)} style={s.camCancel}>
              <Text style={s.camCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCapture} style={s.camCapture}>
              <Icon name="Camera" size={20} color="#fff" />
              <Text style={s.camCaptureText}>Capture</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function InfoRow({
  icon, label, value, divider,
}: {icon: string; label: string; value: string; divider?: boolean}) {
  return (
    <View style={[ir.row, divider && ir.divider]}>
      <View style={ir.iconWrap}>
        <Icon name={icon} size={14} color={MUTED} />
      </View>
      <Text style={ir.label}>{label}</Text>
      <Text style={ir.value} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const ir = StyleSheet.create({
  row:     {flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 14},
  divider: {borderTopWidth: 1, borderTopColor: '#E6ECF2'},
  iconWrap:{width: 28, height: 28, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center'},
  label:   {width: 68, fontSize: 12, color: MUTED, fontWeight: '600'},
  value:   {flex: 1, fontSize: 13, color: INK, fontWeight: '600', textAlign: 'right'},
});

const s = StyleSheet.create({
  overlay:   {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end'},
  sheet:     {backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%'},
  handle:    {width: 40, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 6},
  header:    {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: CARD_BORDER},
  headerIcon:{width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center'},
  headerTitle:{fontSize: 18, fontWeight: '800', color: INK},
  headerSub: {fontSize: 12, color: MUTED, fontWeight: '500', marginTop: 1},
  closeBtn:  {padding: 4},
  body:      {paddingHorizontal: 18, paddingTop: 18, paddingBottom: 36, gap: 12},
  sectionTitle:{color: INK, fontSize: 15, fontWeight: '800', marginTop: 4},
  infoCard:  {borderWidth: 1, borderColor: CARD_BORDER, borderRadius: 12, overflow: 'hidden', backgroundColor: '#FAFBFC'},
  mapBtn:    {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 12, borderWidth: 1.5, borderColor: BLUE, backgroundColor: BLUE_SOFT},
  mapBtnDisabled:{opacity: 0.4},
  mapBtnText:{color: BLUE, fontSize: 14, fontWeight: '700'},
  photoRow:  {flexDirection: 'row', gap: 10},
  photoBox:  {flex: 1, aspectRatio: 1, borderRadius: 10, borderWidth: 1.5, borderColor: CARD_BORDER, borderStyle: 'dashed', overflow: 'hidden', backgroundColor: '#FAFBFC'},
  photoPreview:{width: '100%', height: '100%'},
  photoRemove:{position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center'},
  photoAdd:  {flex: 1, alignItems: 'center', justifyContent: 'center'},
  photoHint: {fontSize: 12, color: MUTED, textAlign: 'center', marginTop: -4},
  uploadBtn: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 14, backgroundColor: BLUE},
  completeBtn:{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 14, backgroundColor: GREEN},
  btnDone:   {backgroundColor: GREEN},
  btnDisabled:{opacity: 0.4},
  btnText:   {color: '#fff', fontSize: 15, fontWeight: '800'},
  camScreen: {flex: 1, backgroundColor: '#000'},
  camActions:{position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', gap: 16, paddingHorizontal: 24},
  camCancel: {flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center'},
  camCancelText:{color: '#fff', fontSize: 16, fontWeight: '700'},
  camCapture:{flex: 2, flexDirection: 'row', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center'},
  camCaptureText:{color: '#fff', fontSize: 16, fontWeight: '700'},
});
