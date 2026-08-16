// Écran de récupération de mot de passe
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleReset() {
    if (!email) {
      Alert.alert('Email requis', 'Renseigne ton adresse email.');
      return;
    }
    setIsSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'restoplus://reset-password',
    });
    setIsSubmitting(false);

    if (error) {
      Alert.alert('Erreur', error.message);
      return;
    }
    Alert.alert(
      'Email envoyé',
      'Si un compte existe avec cette adresse, un lien de réinitialisation a été envoyé.',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mot de passe oublié</Text>
      <Text style={styles.subtitle}>
        Entre ton email, on t'envoie un lien pour réinitialiser ton mot de passe.
      </Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TouchableOpacity
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={handleReset}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonText}>
          {isSubmitting ? 'Envoi...' : 'Envoyer le lien'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { textAlign: 'center', color: '#666', marginTop: 8, marginBottom: 24 },
  label: { fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    padding: 14, fontSize: 15,
  },
  button: {
    backgroundColor: '#16a34a', borderRadius: 10, padding: 16,
    alignItems: 'center', marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
