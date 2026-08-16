// Écran de connexion (Élève + Membre de l'administration)
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const [emailOrMatricule, setEmailOrMatricule] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin() {
    if (!emailOrMatricule || !password) {
      Alert.alert('Champs manquants', 'Renseigne ton email/matricule et ton mot de passe.');
      return;
    }

    setIsSubmitting(true);
    // Note : l'utilisateur peut se connecter par matricule côté UI, mais
    // Supabase Auth attend un email. La résolution matricule → email se fait
    // via une requête préalable sur `student_profiles` si le champ n'est pas
    // un email valide (TODO : Edge Function `resolve-login-identifier`).
    const email = emailOrMatricule.includes('@') ? emailOrMatricule : null;

    if (!email) {
      Alert.alert(
        'Connexion par matricule',
        "La résolution matricule → email n'est pas encore branchée (TODO Edge Function). " +
        'Utilise ton email pour l\'instant.'
      );
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsSubmitting(false);

    if (error) {
      Alert.alert('Connexion impossible', error.message);
      return;
    }
    // Redirection automatique gérée par app/_layout.tsx (AuthGate)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RestoPlus</Text>
      <Text style={styles.subtitle}>Votre restaurant, à portée de main</Text>

      <Text style={styles.label}>Email ou matricule</Text>
      <TextInput
        style={styles.input}
        placeholder="Entrez votre email ou matricule"
        autoCapitalize="none"
        keyboardType="email-address"
        value={emailOrMatricule}
        onChangeText={setEmailOrMatricule}
      />

      <Text style={styles.label}>Mot de passe</Text>
      <TextInput
        style={styles.input}
        placeholder="Entrez votre mot de passe"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Link href="/(auth)/forgot-password" style={styles.link}>
        Mot de passe oublié ?
      </Link>

      <TouchableOpacity
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonText}>
          {isSubmitting ? 'Connexion...' : 'Se connecter'}
        </Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text>Pas encore de compte ? </Text>
        <Link href="/(auth)/register" style={styles.link}>
          Créer un compte
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#16a34a' },
  subtitle: { textAlign: 'center', color: '#666', marginBottom: 32 },
  label: { fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    padding: 14, fontSize: 15,
  },
  link: { color: '#16a34a', fontWeight: '600' },
  button: {
    backgroundColor: '#16a34a', borderRadius: 10, padding: 16,
    alignItems: 'center', marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
});
