import React from 'react';
import {
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useState} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import {useLanguage} from '../context/LanguageContext';

const INK = '#071126';
const MUTED = '#34405F';
const GREEN = '#058B2D';
const GREEN_SOFT = '#E8F7EC';
const CARD_BORDER = '#ECF1F6';

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

type Land = (typeof LANDS)[number];

export default function HarvestScreen() {
  const insets = useSafeAreaInsets();
  const {language, t} = useLanguage();
  const [selectedLand, setSelectedLand] = useState<Land | null>(null);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {paddingTop: insets.top + 6, paddingBottom: insets.bottom + 112},
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
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

        <Text style={styles.sectionTitle}>{t('assignedLands')}</Text>

        <View style={styles.list}>
          {LANDS.map(land => (
            <TouchableOpacity
              key={land.id}
              activeOpacity={0.82}
              onPress={() => setSelectedLand(land)}
              style={styles.card}>
              <View style={styles.details}>
                <Text style={styles.landId}>{land.id}</Text>
                <InfoRow label={t('location')} value={land.location} />
                <InfoRow label={t('farmerName')} value={land.farmerName} />
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
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <LandDetailsModal
        land={selectedLand}
        bottomInset={insets.bottom}
        onClose={() => setSelectedLand(null)}
      />
    </View>
  );
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
              <View style={styles.mapGrid} />
              <View style={styles.mapPin}>
                <Icon name="MapPin" size={25} color="#FFFFFF" />
              </View>
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
              <DetailRow label={t('phone')} value={land.ownerPhone} />
            </View>

            <View style={styles.detailBlock}>
              <Text style={styles.blockTitle}>{t('staffAssigned')}</Text>
              <DetailRow label={t('labourAssigned')} value={`${land.labourAssigned} ${t('labourers')}`} />
              <DetailRow label={t('supervisor')} value={land.supervisor} />
            </View>

            <View style={styles.detailBlock}>
              <Text style={styles.blockTitle}>{t('landDetails')}</Text>
              <DetailRow label={t('farmerName')} value={land.farmerName} />
              <DetailRow label={t('crop')} value={translateLandText(land.crop, language)} />
              <DetailRow label={t('area')} value={`${land.area} ${t('acres')}`} />
              <DetailRow label={t('soilType')} value={translateLandText(land.soil, language)} />
            </View>

            <View style={styles.photoSection}>
              <Text style={styles.blockTitle}>{t('photographs')}</Text>
              <View style={styles.photoGrid}>
                {land.photos.map((photo, index) => (
                  <View key={photo} style={styles.photoThumb}>
                    <View style={[styles.photoTone, index === 1 && styles.photoToneAlt]} />
                    <Icon name="Image" size={22} color="#FFFFFF" />
                    <Text style={styles.photoText}>{translateLandText(photo, language)}</Text>
                  </View>
                ))}
              </View>
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
  sectionTitle: {
    color: INK,
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 28,
    marginTop: 33,
  },
  list: {
    gap: 13,
    marginTop: 13,
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: CARD_BORDER,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 106,
    paddingBottom: 10,
    paddingLeft: 13,
    paddingRight: 17,
    paddingTop: 10,
    shadowColor: '#18233A',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
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
    height: 170,
    overflow: 'hidden',
  },
  mapGrid: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#DDEFE4',
    borderColor: '#C5DEC9',
    borderWidth: 1,
  },
  mapPin: {
    alignItems: 'center',
    backgroundColor: GREEN,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    left: '46%',
    position: 'absolute',
    top: 52,
    width: 44,
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
  photoGrid: {
    flexDirection: 'row',
    gap: 9,
  },
  photoThumb: {
    alignItems: 'center',
    backgroundColor: '#244A31',
    borderRadius: 12,
    flex: 1,
    height: 88,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 6,
  },
  photoTone: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#4C8B59',
    opacity: 0.72,
  },
  photoToneAlt: {
    backgroundColor: '#2F6F8E',
  },
  photoText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 14,
    marginTop: 7,
    textAlign: 'center',
  },
});
