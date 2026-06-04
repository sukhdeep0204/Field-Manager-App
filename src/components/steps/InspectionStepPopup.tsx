import React, {useState} from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {Camera, CameraType, type CameraApi} from 'react-native-camera-kit';
import Icon from '../Icon';
import {API_BASE_URL} from '../../config';

const INK = '#070B1A';
const MUTED = '#43506F';
const GREEN = '#078B36';
const CARD_BORDER = '#E6ECF2';
const PURPLE = '#8B5CF6';
const PURPLE_SOFT = '#F5F3FF';
const RED = '#EF4444';

type ApiField = {
  field_name: string;
  input_type: 'text' | 'number' | 'MCQ' | 'image_upload' | string;
  mandetory?: boolean;
  response?: string | null;
  options?: string[];
};

interface Props {
  visible: boolean;
  step: {type: string; data: ApiField[]; status: string};
  stepKey: string;
  taskId?: string;
  onClose: () => void;
  onComplete: () => void;
}

export default function InspectionStepPopup({
  visible,
  step,
  stepKey,
  taskId,
  onClose,
  onComplete,
}: Props) {
  const fields: ApiField[] = step.data ?? [];

  // text / number responses keyed by field_name
  const [textValues, setTextValues]       = useState<Record<string, string>>({});
  // MCQ selected option keyed by field_name
  const [mcqValues, setMcqValues]         = useState<Record<string, string>>({});
  // local camera URI for display, keyed by field_name
  const [photoValues, setPhotoValues]     = useState<Record<string, string | null>>({});
  // uploaded image URL for submission, keyed by field_name (populated when API is wired)
  const [imageUploadUrls, setImageUploadUrls] = useState<Record<string, string>>({});

  const [cameraOpen, setCameraOpen]           = useState(false);
  const [activeCamField, setActiveCamField]   = useState<string | null>(null);
  const [submitting, setSubmitting]           = useState(false);

  let camRef: CameraApi | null = null;

  const openCamera = (fieldName: string) => {
    setActiveCamField(fieldName);
    setCameraOpen(true);
  };

  const capturePhoto = async () => {
    if (!camRef || !activeCamField) {return;}
    try {
      const res = await camRef.capture();
      setPhotoValues(prev => ({...prev, [activeCamField]: res.uri}));
      // clear previously uploaded URL for this field so it must be re-uploaded
      setImageUploadUrls(prev => {
        const next = {...prev};
        delete next[activeCamField];
        return next;
      });
      setCameraOpen(false);
      setActiveCamField(null);
    } catch {
      Alert.alert('Camera', 'Could not capture photo.');
    }
  };

  const removePhoto = (fieldName: string) => {
    setPhotoValues(prev => ({...prev, [fieldName]: null}));
    setImageUploadUrls(prev => {
      const next = {...prev};
      delete next[fieldName];
      return next;
    });
  };

  // Returns the current response value for a field (used for required validation)
  const getValue = (field: ApiField): string => {
    if (field.input_type === 'MCQ') {
      return mcqValues[field.field_name] ?? '';
    }
    if (field.input_type === 'image_upload') {
      // URL takes priority; fall back to local URI so required check passes once photo is taken
      return imageUploadUrls[field.field_name] ?? photoValues[field.field_name] ?? '';
    }
    return textValues[field.field_name] ?? '';
  };

  // Builds the filled data array to send to the API.
  // Mirrors step.data exactly but with response populated per field type:
  //   text / number  → typed string value
  //   MCQ            → selected option string
  //   image_upload   → uploaded image URL (set after upload API is called)
  const buildResponseData = (): ApiField[] =>
    fields.map(field => ({
      ...field,
      response: (() => {
        switch (field.input_type) {
          case 'MCQ':          return mcqValues[field.field_name]      ?? null;
          case 'image_upload': return imageUploadUrls[field.field_name] ?? null;
          case 'number':
          case 'text':
          default:             return textValues[field.field_name]     ?? null;
        }
      })(),
    }));

  const handleSubmit = async () => {
    // ── 1. Validate required fields ──────────────────────────────────────
    const missing = fields.filter(f => f.mandetory && !getValue(f));
    if (missing.length > 0) {
      Alert.alert(
        'Required fields missing',
        missing.map(f => `• ${f.field_name}`).join('\n'),
      );
      return;
    }
    if (!taskId) {
      Alert.alert('Error', 'Task ID is missing.');
      return;
    }

    setSubmitting(true);
    try {
      // ── 2. Upload image_upload fields (local URI → image URL) ─────────
      // Use a local object so we don't depend on batched state updates
      const freshUrls: Record<string, string> = {...imageUploadUrls};

      const imageFields = fields.filter(
        f => f.input_type === 'image_upload' && photoValues[f.field_name] && !freshUrls[f.field_name],
      );

      for (const field of imageFields) {
        const uri = photoValues[field.field_name]!;
        const formData = new FormData();
        formData.append('image', {
          uri,
          type: 'image/jpeg',
          name: `inspection-${field.field_name.replace(/\s+/g, '-')}-${Date.now()}.jpg`,
        } as any);

        const uploadUrl = `${API_BASE_URL}/admin_ops_requests/upload_task_progress_images?task_id=${encodeURIComponent(taskId)}`;
        console.log('[InspectionPopup] uploading image for field:', field.field_name, uploadUrl);

        const res = await fetch(uploadUrl, {method: 'POST', body: formData});
        const data = await res.json();
        console.log('[InspectionPopup] image upload response:', res.status, data);

        if (!res.ok || !data.success || !data.image_url) {
          Alert.alert('Upload failed', `Could not upload image for "${field.field_name}". Try again.`);
          return;
        }
        freshUrls[field.field_name] = data.image_url;
      }

      // Sync fresh URLs back into state
      setImageUploadUrls(freshUrls);

      // ── 3. Build the filled response data array ───────────────────────
      const responseData: ApiField[] = fields.map(field => ({
        ...field,
        response: (() => {
          switch (field.input_type) {
            case 'MCQ':          return mcqValues[field.field_name]   ?? null;
            case 'image_upload': return freshUrls[field.field_name]   ?? null;
            case 'number':
            case 'text':
            default:             return textValues[field.field_name]  ?? null;
          }
        })(),
      }));

      console.log('[InspectionPopup] final payload:', JSON.stringify({
        task_id: taskId,
        step_key: stepKey,
        data: responseData,
      }, null, 2));

      // ── 4. Submit ─────────────────────────────────────────────────────
      const submitRes = await fetch(
        `${API_BASE_URL}/admin_ops_requests/update_inspection_data`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            task_id: taskId,
            step_key: stepKey,
            data: responseData,
          }),
        },
      );
      const submitData = await submitRes.json();
      console.log('[InspectionPopup] submit response:', submitRes.status, submitData);

      if (!submitRes.ok || !submitData.success) {
        Alert.alert('Error', 'Could not submit inspection. Try again.');
        return;
      }

      onComplete();
    } catch (e) {
      console.log('[InspectionPopup] error:', e);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.handle} />

            {/* Header */}
            <View style={s.header}>
              <View style={[s.headerIcon, {backgroundColor: PURPLE_SOFT}]}>
                <Icon name="ClipboardCheck" size={22} color={PURPLE} />
              </View>
              <View style={{flex: 1}}>
                <Text style={s.headerTitle}>Inspection</Text>
                <Text style={s.headerSub}>
                  {fields.length} field{fields.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.75}>
                <Icon name="X" size={20} color={INK} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={s.body}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">

              {fields.length === 0 ? (
                <View style={s.emptyBox}>
                  <Icon name="ClipboardList" size={32} color={MUTED} />
                  <Text style={s.emptyText}>No inspection fields provided.</Text>
                </View>
              ) : (
                fields.map((field, idx) => (
                  <View key={`${field.field_name}-${idx}`} style={s.fieldGroup}>

                    {/* Label row */}
                    <View style={s.labelRow}>
                      <Text style={s.fieldLabel}>{field.field_name}</Text>
                      {field.mandetory
                        ? <Text style={s.required}>*</Text>
                        : <Text style={s.optional}>optional</Text>}
                    </View>

                    {/* ── text ── */}
                    {field.input_type === 'text' && (
                      <TextInput
                        style={s.input}
                        value={textValues[field.field_name] ?? ''}
                        onChangeText={v =>
                          setTextValues(prev => ({...prev, [field.field_name]: v}))
                        }
                        placeholder="Enter your response..."
                        placeholderTextColor="#94A3B8"
                      />
                    )}

                    {/* ── number (strict numeric) ── */}
                    {field.input_type === 'number' && (
                      <TextInput
                        style={s.input}
                        value={textValues[field.field_name] ?? ''}
                        onChangeText={v => {
                          // strip anything that isn't a digit or decimal point
                          const clean = v.replace(/[^0-9.]/g, '');
                          setTextValues(prev => ({...prev, [field.field_name]: clean}));
                        }}
                        placeholder="0"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                      />
                    )}

                    {/* ── MCQ ── */}
                    {field.input_type === 'MCQ' && (
                      <View style={s.mcqGrid}>
                        {(field.options ?? []).map(opt => {
                          const selected = mcqValues[field.field_name] === opt;
                          return (
                            <TouchableOpacity
                              key={opt}
                              activeOpacity={0.78}
                              onPress={() =>
                                setMcqValues(prev => ({...prev, [field.field_name]: opt}))
                              }
                              style={[s.mcqOption, selected && s.mcqOptionSelected]}>
                              <View style={[s.mcqDot, selected && s.mcqDotSelected]}>
                                {selected ? <View style={s.mcqDotInner} /> : null}
                              </View>
                              <Text style={[s.mcqText, selected && s.mcqTextSelected]}>
                                {opt}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {/* ── image_upload ── */}
                    {field.input_type === 'image_upload' && (
                      <View>
                        {photoValues[field.field_name] ? (
                          <View style={s.photoPreviewWrap}>
                            <Image
                              source={{uri: photoValues[field.field_name]!}}
                              style={s.photoPreview}
                              resizeMode="cover"
                            />
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={() => removePhoto(field.field_name)}
                              style={s.photoRemove}>
                              <Icon name="X" size={13} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => openCamera(field.field_name)}
                            style={s.photoBox}>
                            <Icon name="Plus" size={28} color={PURPLE} />
                            <Text style={s.photoHint}>Tap to capture</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

                  </View>
                ))
              )}

              <TouchableOpacity
                style={[s.submitBtn, submitting && s.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.82}>
                <Icon name="Send" size={17} color="#fff" />
                <Text style={s.btnText}>
                  {submitting ? 'Submitting...' : 'Submit Inspection'}
                </Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Camera modal */}
      <Modal
        visible={cameraOpen}
        animationType="slide"
        onRequestClose={() => {
          setCameraOpen(false);
          setActiveCamField(null);
        }}>
        <View style={s.camScreen}>
          <Camera
            ref={r => { camRef = r; }}
            style={s.camPreview}
            cameraType={CameraType.Back}
          />
          <View style={s.camActions}>
            <TouchableOpacity
              onPress={() => { setCameraOpen(false); setActiveCamField(null); }}
              style={s.camCancel}>
              <Text style={s.camCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={capturePhoto} style={s.camCapture}>
              <Icon name="Camera" size={20} color="#fff" />
              <Text style={s.camCaptureText}>Capture</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end'},
  sheet: {backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%'},
  handle: {width: 40, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 6},
  header: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: CARD_BORDER},
  headerIcon: {width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center'},
  headerTitle: {fontSize: 18, fontWeight: '800', color: INK},
  headerSub: {fontSize: 12, color: MUTED, fontWeight: '500', marginTop: 1},
  closeBtn: {padding: 4},
  body: {paddingHorizontal: 18, paddingTop: 20, paddingBottom: 36, gap: 20},
  emptyBox: {alignItems: 'center', paddingVertical: 40, gap: 10},
  emptyText: {color: MUTED, fontSize: 14},
  fieldGroup: {gap: 8},
  labelRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  fieldLabel: {flex: 1, fontSize: 14, fontWeight: '700', color: INK},
  required: {fontSize: 13, fontWeight: '800', color: RED},
  optional: {fontSize: 11, fontWeight: '500', color: MUTED},
  // text / number
  input: {borderWidth: 1, borderColor: CARD_BORDER, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: INK, backgroundColor: '#FAFBFC'},
  // MCQ
  mcqGrid: {gap: 8},
  mcqOption: {flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: CARD_BORDER, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#FAFBFC'},
  mcqOptionSelected: {borderColor: PURPLE, backgroundColor: PURPLE_SOFT},
  mcqDot: {width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: CARD_BORDER, alignItems: 'center', justifyContent: 'center'},
  mcqDotSelected: {borderColor: PURPLE},
  mcqDotInner: {width: 8, height: 8, borderRadius: 4, backgroundColor: PURPLE},
  mcqText: {flex: 1, fontSize: 14, color: MUTED, fontWeight: '500'},
  mcqTextSelected: {color: PURPLE, fontWeight: '700'},
  // image upload
  photoBox: {height: 120, borderWidth: 1.5, borderColor: CARD_BORDER, borderStyle: 'dashed', borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFBFC', gap: 6},
  photoHint: {color: MUTED, fontSize: 12, fontWeight: '500'},
  photoPreviewWrap: {height: 140, borderRadius: 12, overflow: 'hidden'},
  photoPreview: {width: '100%', height: '100%'},
  photoRemove: {position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center'},
  // submit
  submitBtn: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 14, backgroundColor: PURPLE, marginTop: 4},
  submitBtnDisabled: {opacity: 0.55},
  btnText: {color: '#fff', fontSize: 15, fontWeight: '800'},
  // camera
  camScreen: {flex: 1, backgroundColor: '#000'},
  camPreview: {flex: 1},
  camActions: {position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', gap: 16, paddingHorizontal: 24},
  camCancel: {flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center'},
  camCancelText: {color: '#fff', fontSize: 16, fontWeight: '700'},
  camCapture: {flex: 2, flexDirection: 'row', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center'},
  camCaptureText: {color: '#fff', fontSize: 16, fontWeight: '700'},
});
