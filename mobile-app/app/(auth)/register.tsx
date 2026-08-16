// Écran d'inscription — choix du profil (Étudiant / Membre de l'administration)
// ⚠️ Le profil "Visiteur" n'existe pas ici : le visiteur n'a pas de compte
// (voir docs/phase1-analysis.md, décision de cadrage n°1).
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import type { SignUpRole } from '../../lib/types';

const ROLE_OPTIONS: { role: SignUpRole; title: string; description: string }[] = [
  {
    role: 'student',
    title: 'Étudiant',
    description: "Accès au menu étudiant, gestion de l'abonnement et consultation des repas.",
  },
  {
    role: 'staff_admin',
    title: "Membre de l'administration",
    description: 'Accès au menu administration, commande et livraison au bureau.',
  },
];

export default function RegisterScreen() {
  const [selectedRole, setSelectedRole] = useState<SignUpRole | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [matricule, setMatricule] = useState(''); // requis si student
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRegister() {
    if (!selectedRole) {
      Alert.alert('Profil requis', 'Choisis un profil pour continuer.');
      return;
    }
    if (!fullName || !email || !password) {
      Alert.alert('Champs manquants', 'Remplis tous les champs obligatoires.');
      return;
    }
    if (selectedRole === 'student' && !matricule) {
      Alert.alert('Matricule requis', 'Le matricule est obligatoire pour un profil Étudiant.');
      return;
    }

    setIsSubmitting(true);

    // Les métadonnées passées ici sont lues par le trigger `handle_new_auth_user`
    // (migration 0002_auth_rls.sql) qui crée automatiquement la ligne `users`
    // + le bon profil (student_profiles / staff_profiles).
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: selectedRole,
          full_name: fullName,
          matricule: selectedRole === 'student' ? matricule : undefined,
        },
      },
    });

    setIsSubmitting(false);

    if (error) {
      Alert.alert('Inscription impossible', error.message);
      return;
    }

    Alert.alert(
      'Compte créé',
      'Vérifie ta boîte mail pour confirmer ton compte, puis connecte-toi.',
      [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Créer un compte</Text>
      <Text style={styles.subtitle}>Choisissez votre profil pour continuer</Text>

      {ROLE_OPTIONS.map((option) => {
        const isSelected = selectedRole === option.role;
        return (
          <TouchableOpacity
            key={option.role}
            style={[styles.roleCard, isSelected && styles.roleCardSelected]}
            onPress={() => setSelectedRole(option.role)}
          >
            <Text style={styles.roleTitle}>{option.title}</Text>
            <Text style={styles.roleDescription}>{option.description}</Text>
          </TouchableOpacity>
        );
      })}

      {selectedRole && (
        <View style={styles.form}>
          <Text style={styles.label}>Nom complet</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />

          {selectedRole === 'student' && (
            <>
              <Text style={styles.label}>Matricule</Text>
              <TextInput style={styles.input} value={matricule} onChangeText={setMatricule} autoCapitalize="characters" />
            </>
          )}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Mot de passe</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />

          <TouchableOpacity
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isSubmitting}
          >
            <Text style={styles.buttonText}>
              {isSubmitting ? 'Création...' : 'Créer mon compte'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.footer}>
        <Text>Vous avez déjà un compte ? </Text>
        <Link href="/(auth)/login" style={styles.link}>Se connecter</Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 48, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { textAlign: 'center', color: '#666', marginBottom: 24 },
  roleCard: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14,
    padding: 16, marginBottom: 14,
  },
  roleCardSelected: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  roleTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  roleDescription: { color: '#666', fontSize: 13 },
  form: { marginTop: 12 },
  label: { fontWeight: '600', marginBottom: 6, marginTop: 12 },
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
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  link: { color: '#16a34a', fontWeight: '600' },
});
