// Layout racine : fournit le contexte Auth et redirige selon l'état de connexion + le rôle.
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Slot, Redirect, usePathname } from 'expo-router';
import { AuthProvider, useAuth } from '../lib/auth-context';

function AuthGate() {
  const { session, profile, isLoading } = useAuth();
  const pathname = usePathname();
  const inAuthGroup = pathname?.startsWith('/(auth)') ?? false;

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Pas connecté → forcer vers l'écran de connexion
  if (!session && !inAuthGroup) {
    return <Redirect href="/(auth)/login" />;
  }

  // Connecté mais encore sur un écran d'auth → rediriger vers son espace
  if (session && profile && inAuthGroup) {
    if (profile.role === 'student') return <Redirect href="/(student)/home" />;
    if (profile.role === 'staff_admin') return <Redirect href="/(admin)/home" />;
    // Un membre du staff restaurant n'a pas d'espace dans l'app mobile
    // (voir décision : staff = dashboard web uniquement)
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
