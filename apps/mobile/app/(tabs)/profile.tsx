import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { useAuthStore } from '../../src/store/auth.store';
import { useThemeStore } from '../../src/store/theme.store';
import type { ThemePreference } from '../../src/types';
import { ALL_CATEGORIES, CATEGORY_LABELS, THEME_PRESET_LIST } from '../../src/utils';

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
];

export default function ProfileScreen() {
  const { colors, preset } = useAppTheme();
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);
  const setPreset = useThemeStore((state) => state.setPreset);

  const user = useAuthStore((state) => state.user);
  const guestCategories = useAuthStore((state) => state.guestCategories);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const authError = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const logout = useAuthStore((state) => state.logout);
  const toggleCategory = useAuthStore((state) => state.toggleCategory);
  const updateDisplayName = useAuthStore((state) => state.updateDisplayName);

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const selectedCategories = user ? user.categories : guestCategories;

  const handleSubmitAuth = async () => {
    if (!email.trim() || !password) return;

    if (authMode === 'login') {
      const ok = await login(email.trim(), password);
      if (ok) {
        setPassword('');
      }
    } else {
      const ok = await register(
        email.trim(),
        password,
        displayName.trim() || undefined,
      );
      if (ok) {
        setPassword('');
      }
    }
  };

  const handleSaveDisplayName = async () => {
    if (!nameDraft.trim()) return;
    const ok = await updateDisplayName(nameDraft.trim());
    if (ok) {
      setEditingName(false);
    }
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.screenTitle, { color: colors.text }]}>
            Perfil
          </Text>

          {/* Seção 1: Conta / Autenticação */}
          <View
            style={[
              styles.section,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            {user ? (
              <View style={styles.accountBox}>
                <View style={styles.accountHeader}>
                  <View style={styles.accountInfo}>
                    <Text
                      style={[
                        styles.sectionEyebrow,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Conta sincronizada
                    </Text>
                    {editingName ? (
                      <View style={styles.inlineEditRow}>
                        <TextInput
                          value={nameDraft}
                          onChangeText={setNameDraft}
                          placeholder="Seu nome"
                          placeholderTextColor={colors.textSecondary}
                          style={[
                            styles.input,
                            styles.inlineInput,
                            {
                              color: colors.text,
                              borderColor: colors.border,
                              backgroundColor: colors.background,
                            },
                          ]}
                        />
                        <Pressable
                          onPress={() => void handleSaveDisplayName()}
                          disabled={isSubmitting}
                          accessibilityRole="button"
                          accessibilityLabel="Salvar nome"
                          style={[
                            styles.smallButton,
                            { backgroundColor: colors.text },
                          ]}
                        >
                          <Text
                            style={[
                              styles.smallButtonText,
                              { color: colors.background },
                            ]}
                          >
                            Salvar
                          </Text>
                        </Pressable>
                      </View>
                    ) : (
                      <View style={styles.nameRow}>
                        <Text
                          style={[styles.userName, { color: colors.text }]}
                        >
                          {user.displayName || 'Leitor'}
                        </Text>
                        <Pressable
                          onPress={() => {
                            setNameDraft(user.displayName ?? '');
                            setEditingName(true);
                          }}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel="Editar nome de exibição"
                          style={styles.iconButton}
                        >
                          <Ionicons
                            name="pencil-outline"
                            size={18}
                            color={colors.textSecondary}
                          />
                        </Pressable>
                      </View>
                    )}
                    <Text
                      style={[
                        styles.userEmail,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {user.email}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={logout}
                  accessibilityRole="button"
                  accessibilityLabel="Sair da conta"
                  style={[
                    styles.secondaryButton,
                    { borderColor: colors.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      { color: colors.danger },
                    ]}
                  >
                    Sair da conta
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.authForm}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {authMode === 'login' ? 'Entrar na conta' : 'Criar sua conta'}
                </Text>
                <Text
                  style={[
                    styles.sectionSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  Sincronize suas editorias preferidas e preserve artigos
                  favoritos no Supabase.
                </Text>

                {authMode === 'register' ? (
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: colors.text }]}>
                      Nome de exibição
                    </Text>
                    <TextInput
                      value={displayName}
                      onChangeText={(text) => {
                        clearError();
                        setDisplayName(text);
                      }}
                      placeholder="Como prefere ser chamado"
                      placeholderTextColor={colors.textSecondary}
                      autoCapitalize="words"
                      style={[
                        styles.input,
                        {
                          color: colors.text,
                          borderColor: colors.border,
                          backgroundColor: colors.background,
                        },
                      ]}
                    />
                  </View>
                ) : null}

                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    E-mail
                  </Text>
                  <TextInput
                    value={email}
                    onChangeText={(text) => {
                      clearError();
                      setEmail(text);
                    }}
                    placeholder="voce@exemplo.com"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[
                      styles.input,
                      {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    Senha
                  </Text>
                  <TextInput
                    value={password}
                    onChangeText={(text) => {
                      clearError();
                      setPassword(text);
                    }}
                    placeholder="Mínimo de 6 caracteres"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry
                    autoCapitalize="none"
                    style={[
                      styles.input,
                      {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                  />
                </View>

                {authError ? (
                  <Text style={[styles.errorText, { color: colors.danger }]}>
                    {authError}
                  </Text>
                ) : null}

                <Pressable
                  onPress={() => void handleSubmitAuth()}
                  disabled={isSubmitting || !email.trim() || password.length < 6}
                  accessibilityRole="button"
                  accessibilityLabel={
                    authMode === 'login' ? 'Entrar na conta' : 'Criar conta'
                  }
                  style={({ pressed }) => [
                    styles.primaryButton,
                    {
                      backgroundColor: colors.text,
                      opacity:
                        isSubmitting || !email.trim() || password.length < 6
                          ? 0.5
                          : pressed
                            ? 0.85
                            : 1,
                    },
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={colors.background} />
                  ) : (
                    <Text
                      style={[
                        styles.primaryButtonText,
                        { color: colors.background },
                      ]}
                    >
                      {authMode === 'login' ? 'Entrar na conta' : 'Criar conta'}
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => {
                    clearError();
                    setAuthMode(authMode === 'login' ? 'register' : 'login');
                  }}
                  accessibilityRole="button"
                  style={styles.switchAuthButton}
                >
                  <Text
                    style={[
                      styles.switchAuthText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {authMode === 'login'
                      ? 'Ainda não tem conta? Criar agora'
                      : 'Já possui uma conta? Entrar'}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Seção 2: Preferências de Categorias */}
          <View
            style={[
              styles.section,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Editorias seguidas
            </Text>
            <Text
              style={[
                styles.sectionSubtitle,
                { color: colors.textSecondary },
              ]}
            >
              Usadas no filtro Seguindo da aba Início.
            </Text>

            <View style={styles.categoriesGrid}>
              {ALL_CATEGORIES.map((slug) => {
                const isSelected = selectedCategories.includes(slug);
                return (
                  <Pressable
                    key={slug}
                    onPress={() => void toggleCategory(slug)}
                    accessibilityRole="checkbox"
                    accessibilityLabel={CATEGORY_LABELS[slug]}
                    accessibilityState={{ checked: isSelected }}
                    style={[
                      styles.categoryItem,
                      {
                        backgroundColor: isSelected
                          ? colors.text
                          : colors.background,
                        borderColor: isSelected ? colors.text : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        isSelected ? 'checkmark-circle' : 'add-circle-outline'
                      }
                      size={18}
                      color={
                        isSelected ? colors.background : colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.categoryItemText,
                        {
                          color: isSelected ? colors.background : colors.text,
                        },
                      ]}
                    >
                      {CATEGORY_LABELS[slug]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Seção 3: Aparência / Tema */}
          <View
            style={[
              styles.section,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Aparência
            </Text>
            <Text
              style={[
                styles.sectionSubtitle,
                { color: colors.textSecondary },
              ]}
            >
              Escolha o esquema de cores para leitura diurna ou noturna.
            </Text>

            <View style={styles.themeRow}>
              {THEME_OPTIONS.map((option) => {
                const isSelected = preference === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setPreference(option.value)}
                    accessibilityRole="radio"
                    accessibilityLabel={`Tema ${option.label}`}
                    accessibilityState={{ checked: isSelected }}
                    style={[
                      styles.themeOption,
                      {
                        backgroundColor: isSelected
                          ? colors.text
                          : colors.background,
                        borderColor: isSelected ? colors.text : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.themeOptionText,
                        {
                          color: isSelected ? colors.background : colors.text,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.presetLabel, { color: colors.text }]}>
              Paleta de cores
            </Text>

            <View style={styles.presetGrid}>
              {THEME_PRESET_LIST.map((item) => {
                const isSelected = preset === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setPreset(item.id)}
                    accessibilityRole="radio"
                    accessibilityLabel={`Paleta ${item.label}`}
                    accessibilityState={{ checked: isSelected }}
                    style={[
                      styles.presetItem,
                      {
                        backgroundColor: isSelected
                          ? colors.primarySoft
                          : colors.background,
                        borderColor: isSelected
                          ? colors.primary
                          : colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.presetSwatch,
                        { backgroundColor: item.swatch },
                      ]}
                    />
                    <Text
                      style={[
                        styles.presetItemText,
                        {
                          color: isSelected ? colors.primary : colors.text,
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 36,
    gap: 16,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  sectionEyebrow: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: -4,
  },
  accountBox: {
    gap: 14,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountInfo: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 14,
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: -10,
  },
  inlineEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  inlineInput: {
    flex: 1,
  },
  smallButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  authForm: {
    gap: 12,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  switchAuthButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchAuthText: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  categoryItemText: {
    fontSize: 14,
    fontWeight: '600',
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  themeOption: {
    flex: 1,
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  presetLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  presetSwatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  presetItemText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
