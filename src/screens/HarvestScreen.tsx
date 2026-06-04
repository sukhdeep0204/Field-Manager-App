import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useEffect, useState} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import {useLanguage} from '../context/LanguageContext';
import {loadSession, type FarmDetail, type FarmerDetail} from '../auth/session';
import {API_BASE_URL} from '../config';

let LeafletWebView: any = null;
try {
  LeafletWebView = require('react-native-webview').WebView;
} catch {
  LeafletWebView = null;
}

const INK = '#071126';
const MUTED = '#34405F';
const GREEN = '#058B2D';
const GREEN_SOFT = '#E8F7EC';
const CARD_BORDER = '#ECF1F6';
const BLUE = '#186BE8';
const BLUE_SOFT = '#EAF2FF';
const BLUE_BORDER = '#BFDBFE';
const ORANGE = '#EA580C';
const ORANGE_SOFT = '#FFF4EE';

const LANDS = [
  {
    id: 'FM-10024',
    location: 'Bori, Durg',
    farmerName: 'Ramesh Yadav',
    crop: 'Paddy (Dhan)',
    area: '5.20',
    owner: 'Ramesh Yadav',
    ownerPhone: '+91 98765 43210',
    labourAssigned: '7',
    supervisor: 'Amit Kumar',
    soil: 'Clay Loam',
    irrigation: 'Canal + Borewell',
    coordinates: '21.1904, 81.2849',
    photos: ['North Boundary', 'Crop View', 'Water Source'],
    fieldVisitDate: '2026-06-05',
    fieldVisitActivity: 'Land Verification',
    fieldVisitTime: '10:00 AM',
  },
  {
    id: 'FM-10028',
    location: 'Jamgaon, Durg',
    farmerName: 'Suresh Patel',
    crop: 'Wheat (Gehu)',
    area: '4.75',
    owner: 'Suresh Patel',
    ownerPhone: '+91 98765 12870',
    labourAssigned: '7',
    supervisor: 'Neeraj Sahu',
    soil: 'Sandy Loam',
    irrigation: 'Borewell',
    coordinates: '21.2235, 81.3008',
    photos: ['Entry Point', 'Field Center', 'Boundary Stone'],
    fieldVisitDate: '2026-05-30',
    fieldVisitActivity: 'Farmer Meeting',
    fieldVisitTime: '09:00 AM',
  },
  {
    id: 'FM-10035',
    location: 'Bhilai, Durg',
    farmerName: 'Mahesh Sahu',
    crop: 'Chana (Gram)',
    area: '3.80',
    owner: 'Mahesh Sahu',
    ownerPhone: '+91 98765 76421',
    labourAssigned: '7',
    supervisor: 'Vikram Patel',
    soil: 'Black Soil',
    irrigation: 'Rainfed',
    coordinates: '21.1938, 81.3509',
    photos: ['South Edge', 'Crop Closeup', 'Access Road'],
    fieldVisitDate: '2026-06-10',
    fieldVisitActivity: 'Insecticide Spray',
    fieldVisitTime: '07:00 PM',
  },
  {
    id: 'FM-10040',
    location: 'Koni, Durg',
    farmerName: 'Gopal Verma',
    crop: 'Maize (Makki)',
    area: '6.10',
    owner: 'Gopal Verma',
    ownerPhone: '+91 98765 33314',
    labourAssigned: '7',
    supervisor: 'Rohit Verma',
    soil: 'Alluvial',
    irrigation: 'Canal',
    coordinates: '21.1696, 81.2942',
    photos: ['Main Plot', 'Pump Area', 'Crop Rows'],
  },
  {
    id: 'FM-10045',
    location: 'Bhilai, Durg',
    farmerName: 'Raju Singh',
    crop: 'Cotton (Kapas)',
    area: '4.25',
    owner: 'Raju Singh',
    ownerPhone: '+91 98765 99310',
    labourAssigned: '7',
    supervisor: 'Sanjay Yadav',
    soil: 'Red Sandy',
    irrigation: 'Drip Line',
    coordinates: '21.2084, 81.3691',
    photos: ['Plant Health', 'Drip Line', 'Farm Gate'],
  },
  {
    id: 'FM-10050',
    location: 'Utai, Durg',
    farmerName: 'Deepak Yadav',
    crop: 'Arhar (Toor Dal)',
    area: '3.60',
    owner: 'Deepak Yadav',
    ownerPhone: '+91 98765 22041',
    labourAssigned: '7',
    supervisor: 'Manoj Sharma',
    soil: 'Medium Black',
    irrigation: 'Well',
    coordinates: '21.1312, 81.4074',
    photos: ['West Boundary', 'Crop Stage', 'Well Point'],
  },
];


const VISIT_ACTIVITY_TYPES = [
  'Routine Visit',
  'Land Verification',
  'Farmer Meeting',
  'Insecticide Spray',
  'Soil Test',
  'Land Survey',
  'Photo Upload',
  'Agreement Follow-up',
  'Other',
];

type Land = {
  id: string;
  location: string;
  farmerName: string;
  crop: string;
  area: string;
  owner: string;
  ownerPhone: string;
  labourAssigned: string;
  supervisor: string;
  soil: string;
  irrigation: string;
  district?: string;
  village?: string;
  farmingOption?: string;
  farmerContact?: string;
  farmerAlternateContact?: string;
  permanentAddress?: string;
  coordinates: string;
  photos: string[];
  landCoordinates?: number[][];
  landImageUrls?: string[];
  landVideoUrl?: string;
  fieldVisitDate?: string;
  fieldVisitActivity?: string;
  fieldVisitTime?: string;
};

export default function HarvestScreen() {
  const insets = useSafeAreaInsets();
  const {language, t} = useLanguage();
  const [lands, setLands] = useState<Land[]>(LANDS);
  const [isLoadingLands, setIsLoadingLands] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [visitFilter, setVisitFilter] = useState<'all' | 'today' | 'upcoming' | 'overdue'>('all');
  const [selectedLand, setSelectedLand] = useState<Land | null>(null);
  const [fieldVisitModalOpen, setFieldVisitModalOpen] = useState(false);

  const filteredLands = visitFilter === 'all'
    ? lands
    : lands.filter(land => {
        const status = land.fieldVisitDate ? getVisitStatus(land.fieldVisitDate) : null;
        return status === visitFilter;
      });

  const hydrateLands = async () => {
    const session = await loadSession();
    const farmDetails = session?.farmDetails ?? [];
    const farmerDetails = session?.farmerDetails ?? {};
    const farmIds: string[] = session?.farmAccess?.farm_ids ?? [];

    let baseLands: Land[] = farmDetails.length > 0
      ? mapFarmDetailsToLands(farmDetails, farmerDetails)
      : LANDS;

    if (farmIds.length > 0) {
      try {
        const res = await fetch(
          `${API_BASE_URL}/admin_all_task/get_all_upcoming_field_visit_tasks`,
          {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({farm_id: farmIds}),
          },
        );
        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          const visitMap: Record<string, string> = {};
          data.forEach((item: {feild_id: string[]; next_visit_date: string}) => {
            const farmId = item.feild_id?.[0];
            if (farmId && item.next_visit_date) {
              visitMap[farmId] = item.next_visit_date;
            }
          });
          baseLands = baseLands.map(land => ({
            ...land,
            fieldVisitDate: visitMap[land.id] ?? land.fieldVisitDate,
          }));
        }
      } catch {
        // keep existing fieldVisitDate
      }
    }

    setLands(baseLands);
    setIsLoadingLands(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await hydrateLands();
    setRefreshing(false);
  };

  useEffect(() => {
    hydrateLands();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {paddingTop: insets.top + 6, paddingBottom: insets.bottom + 112},
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={GREEN}
            colors={[GREEN]}
          />
        }>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{t('lands')}</Text>
            <Text style={styles.subtitle}>{t('landsSubtitle')}</Text>
          </View>
          <TouchableOpacity activeOpacity={0.76} style={styles.bellButton}>
            <Icon name="Bell" size={26} color={INK} />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.82}
          onPress={() => setFieldVisitModalOpen(true)}
          style={styles.logVisitButton}>
          <View style={styles.logVisitIcon}>
            <Icon name="MapPinPlus" size={22} color={GREEN} />
          </View>
          <View style={styles.logVisitCopy}>
            <Text style={styles.logVisitTitle}>{t('logFieldVisit')}</Text>
            <Text style={styles.logVisitSub}>Record observations, photos & activity</Text>
          </View>
          <Icon name="ChevronRight" size={22} color={GREEN} />
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, {marginTop: 24, marginBottom: 10}]}>
          {`${t('assignedLands').split('(')[0].trim()} (${filteredLands.length})`}
        </Text>

        {/* ── Visit filter chips ── */}
        <View style={styles.filterChipsRow}>
          {([
            {key: 'all',      label: 'All'},
            {key: 'today',    label: 'Today'},
            {key: 'upcoming', label: 'Upcoming'},
            {key: 'overdue',  label: 'Overdue'},
          ] as const).map(({key, label}) => (
            <TouchableOpacity
              key={key}
              activeOpacity={0.78}
              onPress={() => setVisitFilter(key)}
              style={[
                styles.filterChip,
                visitFilter === key && styles.filterChipActive,
                visitFilter === key && key === 'today'    && styles.filterChipToday,
                visitFilter === key && key === 'overdue'  && styles.filterChipOverdue,
                visitFilter === key && key === 'upcoming' && styles.filterChipUpcoming,
              ]}>
              <Text style={[
                styles.filterChipText,
                visitFilter === key && styles.filterChipTextActive,
                visitFilter === key && key === 'today'    && {color: ORANGE},
                visitFilter === key && key === 'overdue'  && {color: '#DC2626'},
                visitFilter === key && key === 'upcoming' && {color: GREEN},
              ]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.list}>
          {isLoadingLands ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={GREEN} />
              <Text style={styles.loadingText}>Loading lands...</Text>
            </View>
          ) : null}
          {filteredLands.length === 0 && !isLoadingLands ? (
            <View style={styles.emptyFilterBox}>
              <Icon name="CalendarSearch" size={28} color={MUTED} />
              <Text style={styles.emptyFilterText}>
                No lands with {visitFilter} field visits
              </Text>
            </View>
          ) : null}
          {filteredLands.map(land => {
            const visitStatus = land.fieldVisitDate
              ? getVisitStatus(land.fieldVisitDate)
              : null;

            return (
              <TouchableOpacity
                key={land.id}
                activeOpacity={0.82}
                onPress={() => setSelectedLand(land)}
                style={styles.card}>

                {/* ── Top row ── */}
                <View style={styles.cardTopRow}>
                  <View style={styles.details}>
                    <Text style={styles.landId}>{land.farmerName}</Text>
                    <InfoRow label={t('location')} value={land.location} />
                    <InfoRow label="Farm ID" value={maskFarmId(land.id)} />
                    <InfoRow label={t('crop')} value={translateLandText(land.crop, language)} />
                    <InfoRow label={t('area')} value={`${land.area} ${t('acres')}`} />
                  </View>

                  <View style={styles.verticalDivider} />

                  <View style={styles.areaPane}>
                    <View style={styles.landIconWrap}>
                      <Icon name="Sprout" size={26} color={GREEN} />
                    </View>
                    <Text style={styles.areaNumber}>{land.area}</Text>
                    <Text style={styles.areaLabel}>{t('acres')}</Text>
                  </View>

                  <Icon name="ChevronRight" size={31} color={MUTED} style={styles.chevron} />
                </View>

                {/* ── Field visit banner ── */}
                {visitStatus ? (
                  <View style={[
                    styles.visitBanner,
                    visitStatus === 'today'    && styles.visitBannerToday,
                    visitStatus === 'overdue'  && styles.visitBannerOverdue,
                    visitStatus === 'upcoming' && styles.visitBannerUpcoming,
                  ]}>
                    <Icon
                      name={
                        visitStatus === 'today'    ? 'CalendarClock' :
                        visitStatus === 'overdue'  ? 'AlertCircle'   :
                                                     'CalendarDays'
                      }
                      size={13}
                      color={
                        visitStatus === 'today'    ? ORANGE    :
                        visitStatus === 'overdue'  ? '#DC2626' :
                                                     GREEN
                      }
                    />
                    <Text style={[
                      styles.visitBannerText,
                      visitStatus === 'today'    && styles.visitBannerTextToday,
                      visitStatus === 'overdue'  && styles.visitBannerTextOverdue,
                      visitStatus === 'upcoming' && styles.visitBannerTextUpcoming,
                    ]}>
                      {visitStatus === 'today'
                        ? `Field visit today · ${land.fieldVisitTime ?? ''}`
                        : visitStatus === 'overdue'
                        ? `Visit overdue · ${land.fieldVisitDate}`
                        : `Next visit · ${land.fieldVisitDate}`}
                    </Text>
                    {land.fieldVisitActivity ? (
                      <Text style={[
                        styles.visitBannerActivity,
                        visitStatus === 'today'    && {color: ORANGE},
                        visitStatus === 'overdue'  && {color: '#DC2626'},
                        visitStatus === 'upcoming' && {color: GREEN},
                      ]}>
                        {land.fieldVisitActivity}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <LandDetailsModal
        land={selectedLand}
        bottomInset={insets.bottom}
        onClose={() => setSelectedLand(null)}
      />

      <FieldVisitEntryModal
        lands={lands}
        visible={fieldVisitModalOpen}
        onClose={() => setFieldVisitModalOpen(false)}
        onSave={() => {
          setFieldVisitModalOpen(false);
          Alert.alert(t('logFieldVisit'), t('visitSaved'));
        }}
      />
    </View>
  );
}

function FieldVisitEntryModal({
  lands,
  visible,
  onClose,
  onSave,
}: {
  lands: Land[];
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const {t} = useLanguage();
  const [landOpen, setLandOpen] = useState(false);
  const [selectedLandId, setSelectedLandId] = useState('FM-10035 - Bori, Durg');
  const [activityOpen, setActivityOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState('Routine Visit');
  const [photosUploaded, setPhotosUploaded] = useState([false, false, false]);
  const [videoUploaded, setVideoUploaded] = useState(false);

  const handlePhotoTap = (index: number) => {
    setPhotosUploaded(current => {
      const next = [...current];
      next[index] = true;
      return next;
    });
    Alert.alert('Photo Uploaded', `Photo ${index + 1} uploaded successfully.`);
  };

  const handleVideoTap = () => {
    setVideoUploaded(true);
    Alert.alert('Video Uploaded', 'Field video uploaded successfully.');
  };

  const handleSave = () => {
    const missingPhotos = photosUploaded.filter(p => !p).length;
    if (missingPhotos > 0) {
      Alert.alert('Photos Required', `Please upload all 3 field photos. ${missingPhotos} remaining.`);
      return;
    }
    if (!videoUploaded) {
      Alert.alert('Video Required', 'Please upload the field video before saving.');
      return;
    }
    onSave();
  };

  const landOptions = lands.map(l => `${l.id} - ${l.location}`);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.fvModalOverlay}>
        <TouchableOpacity activeOpacity={1} style={styles.fvBackdrop} onPress={onClose} />
        <View style={styles.fvSheet}>
          <View style={styles.fvHandle} />
          <View style={styles.fvHeader}>
            <View style={styles.fvHeaderIcon}>
              <Icon name="MapPinPlus" size={22} color={GREEN} />
            </View>
            <Text style={styles.fvTitle}>{t('logFieldVisit')}</Text>
            <TouchableOpacity activeOpacity={0.76} onPress={onClose} style={styles.fvClose}>
              <Icon name="X" size={21} color={INK} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.fvForm}>
            <Text style={styles.fvFieldLabel}>{t('selectLand')} *</Text>
            <TouchableOpacity
              activeOpacity={0.78}
              onPress={() => setLandOpen(open => !open)}
              style={styles.fvSelect}>
              <Icon name="MapPinned" size={17} color={GREEN} />
              <Text style={styles.fvSelectText}>{selectedLandId}</Text>
              <Icon name={landOpen ? 'ChevronUp' : 'ChevronDown'} size={18} color={MUTED} />
            </TouchableOpacity>
            {landOpen ? (
              <View style={styles.fvDropdown}>
                {landOptions.map(option => (
                  <TouchableOpacity
                    key={option}
                    activeOpacity={0.78}
                    onPress={() => {
                      setSelectedLandId(option);
                      setLandOpen(false);
                    }}
                    style={styles.fvDropdownItem}>
                    <Text style={styles.fvDropdownText}>{option}</Text>
                    {selectedLandId === option ? <Icon name="Check" size={16} color={GREEN} /> : null}
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <Text style={styles.fvFieldLabel}>{t('visitActivity')} *</Text>
            <TouchableOpacity
              activeOpacity={0.78}
              onPress={() => setActivityOpen(open => !open)}
              style={styles.fvSelect}>
              <Icon name="ClipboardList" size={17} color={GREEN} />
              <Text style={styles.fvSelectText}>{selectedActivity}</Text>
              <Icon name={activityOpen ? 'ChevronUp' : 'ChevronDown'} size={18} color={MUTED} />
            </TouchableOpacity>
            {activityOpen ? (
              <View style={styles.fvDropdown}>
                {VISIT_ACTIVITY_TYPES.map(type => (
                  <TouchableOpacity
                    key={type}
                    activeOpacity={0.78}
                    onPress={() => {
                      setSelectedActivity(type);
                      setActivityOpen(false);
                    }}
                    style={styles.fvDropdownItem}>
                    <Text style={styles.fvDropdownText}>{type}</Text>
                    {selectedActivity === type ? <Icon name="Check" size={16} color={GREEN} /> : null}
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <View style={styles.fvTwoCol}>
              <FVField label={t('visitDate')} value="25 May 2026" icon="CalendarDays" compact />
              <FVField label={t('visitTime')} value="07:00 PM" icon="Clock3" compact />
            </View>

            <Text style={styles.fvFieldLabel}>{t('visitRemarks')}</Text>
            <View style={styles.fvTextAreaWrap}>
              <TextInput
                multiline
                placeholder="Enter observations, findings or notes..."
                placeholderTextColor="#8B97AA"
                style={styles.fvTextArea}
              />
            </View>

            <View style={styles.fvMediaSection}>
              <View style={styles.fvMediaLabelRow}>
                <Text style={styles.fvMediaLabel}>Field Photos</Text>
                <View style={styles.fvRequiredBadge}>
                  <Text style={styles.fvRequiredText}>3 required *</Text>
                </View>
                <Text style={styles.fvPhotoCount}>
                  {photosUploaded.filter(Boolean).length}/3
                </Text>
              </View>
              <View style={styles.fvPhotoGrid}>
                {photosUploaded.map((uploaded, index) => (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.78}
                    onPress={() => handlePhotoTap(index)}
                    style={[styles.fvPhotoTile, uploaded && styles.fvPhotoTileDone]}>
                    <Icon
                      name={uploaded ? 'CheckCircle2' : 'Camera'}
                      size={24}
                      color={uploaded ? GREEN : MUTED}
                    />
                    <Text style={[styles.fvPhotoTileLabel, uploaded && styles.fvPhotoTileLabelDone]}>
                      {uploaded ? 'Uploaded' : `Photo ${index + 1}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.fvMediaSection}>
              <View style={styles.fvMediaLabelRow}>
                <Text style={styles.fvMediaLabel}>Field Video</Text>
                <View style={[styles.fvRequiredBadge, styles.fvMandatoryBadge]}>
                  <Text style={[styles.fvRequiredText, styles.fvMandatoryText]}>mandatory *</Text>
                </View>
              </View>
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={handleVideoTap}
                style={[styles.fvUploadBox, videoUploaded && styles.fvUploadBoxDone]}>
                <View style={[styles.fvUploadIcon, videoUploaded && styles.fvUploadIconDone]}>
                  <Icon name={videoUploaded ? 'CircleCheck' : 'Video'} size={22} color={videoUploaded ? GREEN : MUTED} />
                </View>
                <View style={styles.fvUploadCopy}>
                  <Text style={[styles.fvUploadLabel, videoUploaded && styles.fvUploadLabelDone]}>
                    {videoUploaded ? 'Video uploaded' : 'Upload field activity video'}
                  </Text>
                  <Text style={styles.fvUploadHint}>
                    {videoUploaded ? 'Tap to replace' : 'MP4, MOV up to 100MB'}
                  </Text>
                </View>
                <Icon name={videoUploaded ? 'Check' : 'Upload'} size={20} color={videoUploaded ? GREEN : MUTED} />
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.fvActions}>
            <TouchableOpacity activeOpacity={0.76} onPress={onClose} style={styles.fvCancelBtn}>
              <Text style={styles.fvCancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.82} onPress={handleSave} style={styles.fvSaveBtn}>
              <Icon name="MapPinPlus" size={18} color="#FFFFFF" />
              <Text style={styles.fvSaveText}>{t('logVisit')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function FVField({
  label,
  value,
  icon,
  compact,
}: {
  label: string;
  value: string;
  icon: string;
  compact?: boolean;
}) {
  return (
    <View style={[styles.fvFieldWrap, compact && styles.fvFieldCompact]}>
      <Text style={styles.fvFieldLabel}>{label}</Text>
      <View style={styles.fvInputWrap}>
        <Icon name={icon} size={17} color={GREEN} />
        <TextInput
          defaultValue={value}
          style={styles.fvInput}
          placeholderTextColor="#8B97AA"
        />
      </View>
    </View>
  );
}

function mapFarmDetailsToLands(
  farmDetails: FarmDetail[],
  farmerDetailsByFarmId: Record<string, FarmerDetail>,
): Land[] {
  return farmDetails.map(({farm}) => {
    const coordinates = farm.land_data.land_coordinates ?? [];
    const firstPoint = coordinates[0];
    const locationLabel = `${farm.land_data.village}, ${farm.land_data.district}`;
    const farmerDetails = farmerDetailsByFarmId[farm.farm_id]?.farmer;
    const permanentAddress = farmerDetails?.kyc_data?.[0]?.permanent_address || '-';

    return {
      id: farm.farm_id,
      location: locationLabel,
      farmerName: farmerDetails?.farmer_name || farm.farmer_id,
      crop: farm.crop_type,
      area: String(farm.area),
      owner: farmerDetails?.farmer_name || farm.farmer_id,
      ownerPhone: farmerDetails?.farmer_contact || '-',
      labourAssigned: '-',
      supervisor: '-',
      soil: '-',
      irrigation: '-',
      district: farm.land_data.district || '-',
      village: farm.land_data.village || '-',
      farmingOption: farmerDetails?.farming_option || farm.land_data.farming_option || '-',
      farmerContact: farmerDetails?.farmer_contact || '-',
      farmerAlternateContact: farmerDetails?.farmer_alternate_contact || '-',
      permanentAddress,
      coordinates: firstPoint ? `${firstPoint[0]}, ${firstPoint[1]}` : 'Not Available',
      photos: farm.land_data.land_media?.images?.length
        ? farm.land_data.land_media.images.map((_, index) => `Image ${index + 1}`)
        : ['No Images'],
      landCoordinates: coordinates,
      landImageUrls: farm.land_data.land_media?.images ?? [],
      landVideoUrl: farm.land_data.land_media?.video ?? '',
    };
  });
}

function parseCoordinateText(value: string) {
  const parts = value.split(',').map(item => item.trim());
  if (parts.length !== 2) {
    return null;
  }

  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {lat, lng};
}

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function getVisitStatus(scheduledDate: string): 'today' | 'overdue' | 'upcoming' | null {
  if (!scheduledDate || scheduledDate === '-') { return null; }
  if (scheduledDate.toLowerCase() === 'today') { return 'today'; }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let visitDate: Date | null = null;

  if (/^\d{4}-\d{2}-\d{2}/.test(scheduledDate)) {
    visitDate = new Date(scheduledDate);
  } else {
    const parts = scheduledDate.trim().split(/\s+/);
    const day = parseInt(parts[0], 10);
    const month = MONTH_MAP[(parts[1] ?? '').toLowerCase().slice(0, 3)];
    const year = parts[2] ? parseInt(parts[2], 10) : today.getFullYear();
    if (!isNaN(day) && month !== undefined) {
      visitDate = new Date(year, month, day);
    }
  }

  if (!visitDate || isNaN(visitDate.getTime())) { return null; }
  visitDate.setHours(0, 0, 0, 0);

  if (visitDate.getTime() === today.getTime()) { return 'today'; }
  return visitDate < today ? 'overdue' : 'upcoming';
}

function maskFarmId(farmId: string) {
  return `${farmId.slice(0, 4)}*****`;
}

function getLeafletHtml(land: Land) {
  const parsedFromText = parseCoordinateText(land.coordinates);
  const points =
    land.landCoordinates && land.landCoordinates.length > 0
      ? land.landCoordinates
      : parsedFromText
        ? [[parsedFromText.lat, parsedFromText.lng]]
        : [];
  const jsonPoints = JSON.stringify(points);

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const points = ${jsonPoints};
    const fallback = [20.5937, 78.9629];
    const center = points.length ? points[0] : fallback;
    const map = L.map('map').setView(center, points.length > 1 ? 16 : 17);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    if (points.length === 1) {
      L.marker(points[0]).addTo(map);
    } else if (points.length > 1) {
      const polygon = L.polygon(points, {color: '#058B2D', weight: 2, fillOpacity: 0.2}).addTo(map);
      map.fitBounds(polygon.getBounds(), {padding: [16, 16]});
    } else {
      L.marker(fallback).addTo(map);
    }
  </script>
</body>
</html>`;
}

function InfoRow({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.colon}>:</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function LandDetailsModal({
  land,
  bottomInset,
  onClose,
}: {
  land: Land | null;
  bottomInset: number;
  onClose: () => void;
}) {
  const {language, t} = useLanguage();

  if (!land) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity activeOpacity={1} style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalSheet, {paddingBottom: Math.max(bottomInset, 14)}]}>
          <View style={styles.sheetHandle} />
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{land.id}</Text>
              <Text style={styles.modalSubtitle}>{land.location}</Text>
            </View>
            <TouchableOpacity activeOpacity={0.76} onPress={onClose} style={styles.closeButton}>
              <Icon name="X" size={22} color={INK} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
            <View style={styles.mapBox}>
              {LeafletWebView ? (
                <LeafletWebView
                  originWhitelist={['*']}
                  source={{html: getLeafletHtml(land)}}
                  style={styles.mapWebview}
                  javaScriptEnabled
                  scrollEnabled={false}
                />
              ) : (
                <View style={styles.mapFallback}>
                  <Icon name="MapPin" size={22} color={GREEN} />
                  <Text style={styles.mapFallbackText}>Map preview unavailable</Text>
                </View>
              )}
              <View style={styles.mapLabel}>
                <Text style={styles.mapLabelTitle}>{land.area} {t('acres')}</Text>
                <Text style={styles.mapLabelSub}>{land.coordinates}</Text>
              </View>
            </View>

            <View style={styles.summaryStrip}>
              <MiniStat icon="Sprout" label={t('crop')} value={translateLandText(land.crop, language)} />
            </View>

            <View style={styles.detailBlock}>
              <Text style={styles.blockTitle}>{t('ownerDetails')}</Text>
              <DetailRow label={t('ownerName')} value={land.owner} />
              <DetailRow label="Farming Option" value={land.farmingOption} />
              <DetailRow label="Contact" value={land.farmerContact} />
              <DetailRow label="Alternate Contact" value={land.farmerAlternateContact || '-'} />
              <DetailRow label="Permanent Address" value={land.permanentAddress || '-'} />
            </View>

            <View style={styles.detailBlock}>
              <Text style={styles.blockTitle}>{t('landDetails')}</Text>
              <DetailRow label={t('area')} value={`${land.area} ${t('acres')}`} />
              <DetailRow label={t('crop')} value={translateLandText(land.crop, language)} />
              <DetailRow label="District" value={land.district} />
              <DetailRow label="Village" value={land.village} />
            </View>

            <View style={styles.photoSection}>
              <Text style={styles.blockTitle}>{t('photographs')}</Text>
              {land.landImageUrls && land.landImageUrls.length > 0 ? (
                <View style={styles.mediaList}>
                  {land.landImageUrls.map((url, index) => (
                    <View key={`${url}-${index}`} style={styles.mediaItem}>
                      <Image source={{uri: url}} style={styles.mediaImage} resizeMode="cover" />
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.mediaEmpty}>No image URLs available</Text>
              )}
              <Text style={[styles.blockTitle, {marginTop: 12}]}>Video</Text>
              {land.landVideoUrl ? (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => Linking.openURL(land.landVideoUrl as string)}
                  style={styles.videoLink}>
                  <Icon name="PlayCircle" size={18} color={BLUE} />
                  <Text style={styles.videoUrl}>Open Video</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.mediaEmpty}>No video URL available</Text>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function MiniStat({icon, label, value}: {icon: string; label: string; value: string}) {
  return (
    <View style={styles.miniStat}>
      <View style={styles.miniIcon}>
        <Icon name={icon} size={20} color={GREEN} />
      </View>
      <View style={styles.miniCopy}>
        <Text style={styles.miniLabel}>{label}</Text>
        <Text style={styles.miniValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function translateLandText(text: string, language: string) {
  if (language !== 'hi') {
    return text;
  }

  const hindiText: Record<string, string> = {
    'Paddy (Dhan)': 'धान',
    'Wheat (Gehu)': 'गेहूं',
    'Chana (Gram)': 'चना',
    'Maize (Makki)': 'मक्का',
    'Cotton (Kapas)': 'कपास',
    'Arhar (Toor Dal)': 'अरहर',
    'Clay Loam': 'चिकनी दोमट',
    'Sandy Loam': 'रेतीली दोमट',
    'Black Soil': 'काली मिट्टी',
    Alluvial: 'जलोढ़ मिट्टी',
    'Red Sandy': 'लाल रेतीली',
    'Medium Black': 'मध्यम काली मिट्टी',
    'North Boundary': 'उत्तरी सीमा',
    'Crop View': 'फसल दृश्य',
    'Water Source': 'जल स्रोत',
    'Entry Point': 'प्रवेश बिंदु',
    'Field Center': 'खेत केंद्र',
    'Boundary Stone': 'सीमा पत्थर',
    'South Edge': 'दक्षिण किनारा',
    'Crop Closeup': 'फसल नजदीकी दृश्य',
    'Access Road': 'पहुंच मार्ग',
    'Main Plot': 'मुख्य प्लॉट',
    'Pump Area': 'पंप क्षेत्र',
    'Crop Rows': 'फसल कतारें',
    'Plant Health': 'पौधे की स्थिति',
    'Drip Line': 'ड्रिप लाइन',
    'Farm Gate': 'फार्म गेट',
    'West Boundary': 'पश्चिमी सीमा',
    'Crop Stage': 'फसल चरण',
    'Well Point': 'कुआं बिंदु',
  };

  return hindiText[text] ?? text;
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 17,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: INK,
    fontSize: 31,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 39,
  },
  subtitle: {
    color: MUTED,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 26,
    marginTop: 2,
  },
  bellButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F6',
    borderRadius: 12,
    borderWidth: 1,
    height: 54,
    justifyContent: 'center',
    marginRight: 1,
    marginTop: 1,
    shadowColor: '#1A2740',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.08,
    shadowRadius: 18,
    width: 54,
    elevation: 3,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: '#F51F2D',
    borderRadius: 10,
    height: 19,
    justifyContent: 'center',
    position: 'absolute',
    right: -2,
    top: -2,
    width: 19,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 14,
  },
  logVisitButton: {
    alignItems: 'center',
    backgroundColor: GREEN_SOFT,
    borderColor: '#B6E6C4',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  logVisitIcon: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    marginRight: 13,
    width: 44,
  },
  logVisitCopy: {
    flex: 1,
    minWidth: 0,
  },
  logVisitTitle: {
    color: GREEN,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 21,
  },
  logVisitSub: {
    color: '#3C7A52',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 2,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    marginTop: 26,
    marginBottom: 12,
  },
  visitCountBadge: {
    alignItems: 'center',
    backgroundColor: BLUE_SOFT,
    borderRadius: 999,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  visitCountText: {
    color: BLUE,
    fontSize: 12,
    fontWeight: '900',
  },
  visitCardsRow: {
    gap: 12,
    paddingRight: 17,
  },
  visitCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
    width: 190,
  },
  visitCardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  visitActivityDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  visitActivity: {
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
  },
  visitLandId: {
    color: INK,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 21,
  },
  visitFarmer: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 2,
  },
  visitTimeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    marginTop: 7,
  },
  visitLocation: {
    color: MUTED,
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  visitTime: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
  },
  sectionTitle: {
    color: INK,
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 28,
    marginTop: 0,
  },
  list: {
    gap: 13,
    marginTop: 13,
  },
  loadingWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  loadingText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: CARD_BORDER,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#18233A',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 106,
    paddingBottom: 10,
    paddingLeft: 13,
    paddingRight: 17,
    paddingTop: 10,
  },
  visitBanner: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: CARD_BORDER,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  visitBannerToday: {
    backgroundColor: ORANGE_SOFT,
    borderTopColor: '#FED7AA',
  },
  visitBannerOverdue: {
    backgroundColor: '#FFF5F5',
    borderTopColor: '#FECACA',
  },
  visitBannerUpcoming: {
    backgroundColor: GREEN_SOFT,
    borderTopColor: '#BBF7D0',
  },
  visitBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: MUTED,
  },
  visitBannerTextToday:    { color: ORANGE },
  visitBannerTextOverdue:  { color: '#DC2626' },
  visitBannerTextUpcoming: { color: GREEN },
  visitBannerActivity: {
    fontSize: 11,
    fontWeight: '800',
    color: MUTED,
  },
  details: {
    flex: 1,
    minWidth: 0,
  },
  landId: {
    color: INK,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 24,
    marginBottom: 8,
  },
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 17,
    marginBottom: 2,
  },
  infoLabel: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
    width: 86,
  },
  colon: {
    color: INK,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 17,
    textAlign: 'center',
    width: 18,
  },
  infoValue: {
    color: MUTED,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
    paddingLeft: 8,
  },
  verticalDivider: {
    backgroundColor: '#E5EBF3',
    height: 64,
    marginLeft: 10,
    width: 1,
  },
  areaPane: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 29,
    width: 59,
  },
  landIconWrap: {
    alignItems: 'center',
    backgroundColor: GREEN_SOFT,
    borderRadius: 25,
    height: 49,
    justifyContent: 'center',
    marginBottom: 7,
    width: 49,
  },
  areaNumber: {
    color: GREEN,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 25,
  },
  areaLabel: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 18,
    marginTop: 2,
  },
  chevron: {
    marginLeft: 18,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    backgroundColor: 'rgba(4, 9, 22, 0.46)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingHorizontal: 17,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: '#D9E0EA',
    borderRadius: 2,
    height: 4,
    marginBottom: 14,
    width: 46,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: INK,
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 31,
  },
  modalSubtitle: {
    color: MUTED,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 1,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#F5F8FB',
    borderRadius: 18,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  modalContent: {
    paddingTop: 15,
    paddingBottom: 12,
  },
  mapBox: {
    backgroundColor: '#E9F4EC',
    borderRadius: 14,
    height: 220,
    overflow: 'hidden',
  },
  mapWebview: {
    flex: 1,
  },
  mapFallback: {
    alignItems: 'center',
    backgroundColor: '#E9F4EC',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
  },
  mapFallbackText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
  },
  mapLabel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    bottom: 14,
    left: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    position: 'absolute',
    shadowColor: '#1D2A3B',
    shadowOffset: {width: 0, height: 5},
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  mapLabelTitle: {
    color: GREEN,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 23,
  },
  mapLabelSub: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  summaryStrip: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 13,
  },
  miniStat: {
    alignItems: 'center',
    backgroundColor: '#F7FAF8',
    borderColor: '#E7EFE8',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    minWidth: 0,
    padding: 10,
  },
  miniIcon: {
    alignItems: 'center',
    backgroundColor: GREEN_SOFT,
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  miniCopy: {
    flex: 1,
    marginLeft: 9,
    minWidth: 0,
  },
  miniLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
  miniValue: {
    color: INK,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
  },
  detailBlock: {
    borderColor: '#E8EEF5',
    borderRadius: 13,
    borderWidth: 1,
    marginTop: 13,
    padding: 13,
  },
  blockTitle: {
    color: INK,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
    marginBottom: 9,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  detailLabel: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  detailValue: {
    color: INK,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    paddingLeft: 12,
    textAlign: 'right',
  },
  photoSection: {
    marginTop: 13,
  },
  mediaList: {
    gap: 10,
  },
  mediaItem: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    paddingBottom: 8,
  },
  mediaImage: {
    height: 140,
    width: '100%',
  },
  mediaUrl: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 8,
    paddingHorizontal: 10,
  },
  mediaEmpty: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  videoLink: {
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  videoUrl: {
    color: BLUE,
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  fvModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  fvBackdrop: {
    backgroundColor: 'rgba(4, 9, 22, 0.46)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  fvSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingHorizontal: 17,
    paddingTop: 10,
    paddingBottom: 0,
  },
  fvHandle: {
    alignSelf: 'center',
    backgroundColor: '#D9E0EA',
    borderRadius: 2,
    height: 4,
    marginBottom: 14,
    width: 46,
  },
  fvHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 16,
    gap: 11,
  },
  fvHeaderIcon: {
    alignItems: 'center',
    backgroundColor: GREEN_SOFT,
    borderRadius: 11,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  fvTitle: {
    color: INK,
    flex: 1,
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 25,
  },
  fvClose: {
    alignItems: 'center',
    backgroundColor: '#F5F8FB',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  fvForm: {
    paddingBottom: 8,
  },
  fvFieldLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
    marginBottom: 6,
    marginTop: 14,
  },
  fvSelect: {
    alignItems: 'center',
    backgroundColor: '#F7FAF8',
    borderColor: '#DCE9E0',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  fvSelectText: {
    color: INK,
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  fvDropdown: {
    backgroundColor: '#FFFFFF',
    borderColor: CARD_BORDER,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
  },
  fvDropdownItem: {
    alignItems: 'center',
    borderBottomColor: CARD_BORDER,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 38,
    paddingHorizontal: 12,
  },
  fvDropdownText: {
    color: INK,
    fontSize: 13,
    fontWeight: '800',
  },
  fvTwoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  fvFieldWrap: {
    flex: 1,
  },
  fvFieldCompact: {
    flex: 1,
  },
  fvInputWrap: {
    alignItems: 'center',
    backgroundColor: '#F7FAF8',
    borderColor: '#DCE9E0',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    height: 44,
    paddingHorizontal: 12,
  },
  fvInput: {
    color: INK,
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    padding: 0,
  },
  fvTextAreaWrap: {
    backgroundColor: '#F7FAF8',
    borderColor: '#DCE9E0',
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 80,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fvTextArea: {
    color: INK,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    minHeight: 60,
    padding: 0,
    textAlignVertical: 'top',
  },
  fvMediaSection: {
    marginTop: 16,
  },
  fvMediaLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  fvMediaLabel: {
    color: INK,
    fontSize: 13,
    fontWeight: '900',
  },
  fvRequiredBadge: {
    backgroundColor: '#FFF3E0',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  fvRequiredText: {
    color: ORANGE,
    fontSize: 11,
    fontWeight: '900',
  },
  fvMandatoryBadge: {
    backgroundColor: '#FFF0F0',
  },
  fvMandatoryText: {
    color: '#DC2626',
  },
  fvPhotoCount: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 'auto',
  },
  fvPhotoGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  fvPhotoTile: {
    alignItems: 'center',
    backgroundColor: '#F5F8FB',
    borderColor: CARD_BORDER,
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    flex: 1,
    justifyContent: 'center',
    minHeight: 80,
    paddingVertical: 12,
  },
  fvPhotoTileDone: {
    backgroundColor: GREEN_SOFT,
    borderColor: '#B6E6C4',
    borderStyle: 'solid',
  },
  fvPhotoTileLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 6,
  },
  fvPhotoTileLabelDone: {
    color: GREEN,
  },
  fvUploadBox: {
    alignItems: 'center',
    backgroundColor: '#F7FAF8',
    borderColor: '#DCE9E0',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fvUploadBoxDone: {
    backgroundColor: GREEN_SOFT,
    borderColor: '#B6E6C4',
  },
  fvUploadIcon: {
    alignItems: 'center',
    backgroundColor: '#EAEEF3',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  fvUploadIconDone: {
    backgroundColor: '#FFFFFF',
  },
  fvUploadCopy: {
    flex: 1,
    minWidth: 0,
  },
  fvUploadLabel: {
    color: INK,
    fontSize: 13,
    fontWeight: '900',
  },
  fvUploadLabelDone: {
    color: GREEN,
  },
  fvUploadHint: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  fvActions: {
    backgroundColor: '#FFFFFF',
    borderTopColor: CARD_BORDER,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 24,
    paddingTop: 12,
  },
  fvCancelBtn: {
    alignItems: 'center',
    backgroundColor: '#F5F8FB',
    borderRadius: 10,
    flex: 1,
    height: 46,
    justifyContent: 'center',
  },
  fvCancelText: {
    color: MUTED,
    fontSize: 15,
    fontWeight: '900',
  },
  fvSaveBtn: {
    alignItems: 'center',
    backgroundColor: GREEN,
    borderRadius: 10,
    flex: 2,
    flexDirection: 'row',
    gap: 8,
    height: 46,
    justifyContent: 'center',
  },
  fvSaveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  landsSectionHeader: {
    marginTop: 24,
    marginBottom: 10,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  filterChip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: '#F5F8FB',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterChipActive: {
    borderColor: CARD_BORDER,
  },
  filterChipToday: {
    backgroundColor: ORANGE_SOFT,
    borderColor: '#FED7AA',
  },
  filterChipOverdue: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FECACA',
  },
  filterChipUpcoming: {
    backgroundColor: GREEN_SOFT,
    borderColor: '#BBF7D0',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: MUTED,
  },
  filterChipTextActive: {
    fontWeight: '900',
    color: INK,
  },
  emptyFilterBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 40,
  },
  emptyFilterText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
