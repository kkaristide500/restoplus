// Mon QR Code — Élève
// L'élève AFFICHE son QR au staff, il ne scanne rien lui-même.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../lib/auth-context';
import { getMyQrCode } from '../../lib/queries/subscription';

export default function QrCodeScreen() {
  const { profile } = useAuth();
  const [codeValue, setCodeValue] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    getMyQrCode(profile.id)
      .then((qr) => setCodeValue(qr.code_value))
      .catch(() => setCodeValue(null))
      .finally(() => setIsLoading(false));
  }, [profile]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scanner le QR Code</Text>
      <Text style={styles.subtitle}>Présente ce code au staff au moment de ton repas</Text>

      <View style={styles.qrBox}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#fff" />
        ) : codeValue ? (
          <QRCode value={codeValue} size={220} backgroundColor="#fff" />
        ) : (
          <Text style={{ color: '#fff' }}>QR Code indisponible</Text>
        )}
      </View>

      <Text style={styles.name}>{profile?.full_name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  subtitle: { color: '#dcfce7', fontSize: 12, textAlign: 'center', marginBottom: 32 },
  qrBox: { backgroundColor: '#fff', padding: 20, borderRadius: 16 },
  name: { color: '#fff', fontWeight: '700', marginTop: 24, fontSize: 15 },
});
