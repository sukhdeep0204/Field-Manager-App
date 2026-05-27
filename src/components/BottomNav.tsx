import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from './Icon';
import {useLanguage} from '../context/LanguageContext';

const GREEN = '#078B36';
const INK = '#43506F';
const PENDING_TASK_COUNT = 3;

export default function BottomNav({state, navigation}: any) {
  const insets = useSafeAreaInsets();
  const {t} = useLanguage();

  return (
    <View style={[styles.wrap, {paddingBottom: Math.max(insets.bottom, 8)}]}>
      <View style={styles.bar}>
        {state.routes.map((route: any, index: number) => {
          const focused = state.index === index;
          const iconName = mapIconName(route.name);

          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.78}
              onPress={() => navigation.navigate(route.name)}
              style={[styles.item, focused && styles.activeItem]}>
              <View style={styles.iconWrap}>
                <Icon
                  name={iconName}
                  size={focused ? 26 : 24}
                  color={focused ? GREEN : INK}
                />
                {route.name === 'Tasks' && PENDING_TASK_COUNT > 0 ? (
                  <View style={styles.taskBadge}>
                    <Text style={styles.taskBadgeText}>{PENDING_TASK_COUNT}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.label, focused && styles.activeLabel]}>
                {mapLabel(route.name, t)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function mapLabel(routeName: string, t: ReturnType<typeof useLanguage>['t']) {
  switch (routeName) {
    case 'Home':
      return t('home');
    case 'Tasks':
      return t('tasks');
    case 'Lands':
      return t('lands');
    case 'Team':
      return t('team');
    case 'Profile':
      return t('profile');
    default:
      return routeName;
  }
}

function mapIconName(routeName: string) {
  switch (routeName) {
    case 'Home':
      return 'House';
    case 'Tasks':
      return 'ClipboardList';
    case 'Lands':
      return 'MapPinned';
    case 'Team':
      return 'Users';
    case 'Profile':
      return 'UserRound';
    default:
      return 'Circle';
  }
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFFFFF',
    bottom: 0,
    left: 0,
    paddingHorizontal: 17,
    paddingTop: 9,
    position: 'absolute',
    right: 0,
    shadowColor: '#172033',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 8,
  },
  bar: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    height: 72,
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  item: {
    alignItems: 'center',
    borderRadius: 10,
    height: 66,
    justifyContent: 'center',
    width: 58,
  },
  activeItem: {
    backgroundColor: '#EEF9F1',
    width: 64,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  taskBadge: {
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderColor: '#FFFFFF',
    borderRadius: 9,
    borderWidth: 1.5,
    height: 18,
    justifyContent: 'center',
    minWidth: 18,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -10,
    top: -7,
  },
  taskBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 12,
  },
  label: {
    color: INK,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
    marginTop: 5,
  },
  activeLabel: {
    color: GREEN,
    fontWeight: '800',
  },
});
