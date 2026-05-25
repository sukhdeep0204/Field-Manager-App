import React, {useEffect, useState} from 'react';
import {View, Text, ActivityIndicator, StyleSheet} from 'react-native';
import tokens, {spacing, typography, palette} from '../styles/tokens';
import {useLanguage} from '../context/LanguageContext';

export default function SplashScreen({onDone}: {onDone: () => void}) {
  const {t} = useLanguage();

  useEffect(() => {
    const id = setTimeout(() => onDone(), 10000); // 10s splash
    return () => clearTimeout(id);
  }, [onDone]);

  return (
    <View style={[tokens.container, styles.center]}>
      <Text style={styles.title}>Field Manager</Text>
      <ActivityIndicator size="large" color={palette.primary} style={{marginTop: spacing.md}} />
      <Text style={styles.caption}>{t('loadingDashboard')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {justifyContent: 'center', alignItems: 'center'},
  title: {fontSize: 28, fontWeight: '800'},
  caption: {marginTop: spacing.sm, color: palette.textLight},
});
