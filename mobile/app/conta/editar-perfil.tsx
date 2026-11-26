import { goBackOr } from "@/lib/navigation";
import { useEffect, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Colors, FontSizes, Spacing, BorderRadius } from "@/constants/theme";
import { useAuthStore } from "@/stores/authStore";
import { customerApi } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { formatBrazilianPhone, isValidPhone } from "@/lib/authFeedback";
import { formatCpf, isValidCpf, normalizeCpf } from "@/lib/cpf";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { LuxuryBackground } from "@/components/ios/LuxuryBackground";

export default function EditarPerfilScreen() {
  const router = useRouter();
  const { customer, setCustomer } = useAuthStore();
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(formatBrazilianPhone(customer?.phone ?? ""));
  const [cpf, setCpf] = useState("");
  const [cpfLocked, setCpfLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);

  useEffect(() => {
    if (!customer?.id) return;
    let active = true;
    customerApi.getAvatar()
      .then((response) => {
        if (!active) return;
        const avatarUrl = response.data.data?.avatarUrl ?? null;
        const current = useAuthStore.getState().customer;
        if (current?.id === customer.id) void setCustomer({ ...current, avatarUrl });
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [customer?.id, setCustomer]);

  async function chooseAvatar(source: "library" | "camera") {
    if (avatarBusy) return;
    setAvatarBusy(true);
    try {
      const permission = source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permissão necessária",
          source === "camera"
            ? "Permita o acesso à câmera para tirar sua foto de perfil."
            : "Permita o acesso às fotos para escolher sua foto de perfil.",
          [
            { text: "Agora não", style: "cancel" },
            ...(permission.canAskAgain ? [] : [{ text: "Abrir Ajustes", onPress: () => { void Linking.openSettings(); } }]),
          ],
        );
        return;
      }

      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.88,
        exif: false,
        base64: false,
      };
      const result = source === "camera"
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync(pickerOptions);
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const side = Math.min(asset.width, asset.height);
      const image = await ImageManipulator.manipulate(asset.uri)
        .crop({
          originX: Math.floor((asset.width - side) / 2),
          originY: Math.floor((asset.height - side) / 2),
          width: side,
          height: side,
        })
        .resize({ width: 512, height: 512 })
        .renderAsync();
      const compressed = await image.saveAsync({ format: SaveFormat.WEBP, compress: 0.82 });
      const response = await customerApi.uploadAvatar(compressed.uri);
      const avatarUrl = response.data.data?.avatarUrl;
      if (!avatarUrl) throw new Error("AVATAR_URL_MISSING");
      const current = useAuthStore.getState().customer;
      if (current) await setCustomer({ ...current, avatarUrl });
    } catch {
      Alert.alert("Não foi possível atualizar a foto", "Confira sua conexão e tente novamente. Sua foto atual foi preservada.");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar() {
    if (!customer?.avatarUrl || avatarBusy) return;
    Alert.alert("Remover foto de perfil?", "Sua foto será removida da conta.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => {
          setAvatarBusy(true);
          void customerApi.removeAvatar()
            .then(async () => {
              const current = useAuthStore.getState().customer;
              if (current) await setCustomer({ ...current, avatarUrl: null });
            })
            .catch(() => Alert.alert("Não foi possível remover", "Tente novamente quando sua conexão estiver estável."))
            .finally(() => setAvatarBusy(false));
        },
      },
    ]);
  }

  function openAvatarOptions() {
    Alert.alert("Foto do perfil", "Escolha uma opção", [
      { text: "Escolher da galeria", onPress: () => { void chooseAvatar("library"); } },
      { text: "Tirar foto", onPress: () => { void chooseAvatar("camera"); } },
      ...(customer?.avatarUrl ? [{ text: "Remover foto", style: "destructive" as const, onPress: removeAvatar }] : []),
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  useEffect(() => {
    let active = true;
    customerApi
      .getMe()
      .then((response) => {
        if (!active) return;
        const profile = response.data.data;
        setName(profile?.name ?? customer?.name ?? "");
        setPhone(formatBrazilianPhone(profile?.phone ?? customer?.phone ?? ""));
        setCpf(formatCpf(profile?.cpf ?? ""));
        setCpfLocked(isValidCpf(profile?.cpf ?? ""));
        if (profile) {
          const current = useAuthStore.getState().customer;
          void setCustomer({ ...profile, avatarUrl: current?.avatarUrl ?? null });
        }
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar todos os dados do perfil.");
      })
      .finally(() => {
        if (active) setLoadingProfile(false);
      });
    return () => {
      active = false;
    };
  }, [customer?.name, customer?.phone, setCustomer]);

  async function handleSave() {
    if (!name.trim()) {
      setError("O nome é obrigatório.");
      return;
    }
    if (!isValidCpf(cpf)) {
      setError("Informe um CPF válido para pagamentos via Pix.");
      return;
    }
    if (phone.trim() && !isValidPhone(phone)) {
      setError("Informe um telefone válido com DDD.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await customerApi.updateMe({
        name: name.trim(),
        phone: phone.trim() || null,
        cpf: normalizeCpf(cpf),
      });
      const updatedProfile = response.data.data;
      const current = useAuthStore.getState().customer;
      await setCustomer({ ...updatedProfile, avatarUrl: current?.avatarUrl ?? null });
      setCpf(formatCpf(updatedProfile.cpf ?? ""));
      setCpfLocked(isValidCpf(updatedProfile.cpf ?? ""));
      Alert.alert("Sucesso", "Dados atualizados com sucesso.", [
        { text: "OK", onPress: () => goBackOr(router, "/(tabs)/perfil") },
      ]);
    } catch (requestError: unknown) {
      const response = (requestError as {
        response?: { status?: number; data?: { error?: string; code?: string } };
      })?.response;
      const messages: Record<string, string> = {
        CPF_INVALID: "Informe um CPF válido.",
        CPF_IN_USE: "Este CPF já está vinculado a outra conta.",
        CPF_IMMUTABLE: "O CPF já vinculado a este perfil não pode ser alterado.",
        PHONE_INVALID: "Informe um telefone válido com DDD.",
        SESSION_EXPIRED: "Sua sessão expirou. Entre novamente.",
        PROFILE_NOT_FOUND: "Perfil não encontrado.",
        TEMPORARY_FAILURE: "Falha temporária. Tente novamente em instantes.",
      };
      const code = response?.data?.code;
      setError((code && messages[code]) || "Não foi possível salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (Platform.OS === "ios") {
    const busy = loading || loadingProfile;
    return (
      <SafeAreaView style={iosStyles.safe} edges={["top", "bottom"]}>
        <LuxuryBackground />
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={iosStyles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => goBackOr(router, "/(tabs)/perfil")} style={iosStyles.backRow}>
              <View style={iosStyles.backButton}><Ionicons name="arrow-back" size={28} color="#df0053" /></View><Text style={iosStyles.backText}>Voltar</Text>
            </TouchableOpacity>
            <View style={iosStyles.heroHeader}>
              <View style={iosStyles.heroCopy}>
                <Text accessibilityRole="header" style={iosStyles.title}>Editar perfil</Text>
                <Text style={iosStyles.subtitle}>Mantenha seus dados sempre atualizados{`\n`}para uma experiência ainda melhor{`\n`}na KA Bijoux.</Text>
              </View>
              <View style={iosStyles.logoMedallion}>
                {customer?.avatarUrl
                  ? <Image source={{ uri: customer.avatarUrl }} style={iosStyles.logo} contentFit="cover" accessibilityLabel="Foto do perfil" cachePolicy="memory-disk" />
                  : <Text style={iosStyles.avatarInitial}>{customer?.name?.trim().charAt(0).toUpperCase() || "K"}</Text>}
              </View>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Alterar foto do perfil" disabled={avatarBusy} onPress={openAvatarOptions} style={iosStyles.pencilBadge}>
                {avatarBusy ? <ActivityIndicator size="small" color="#e00054" /> : <Ionicons name="pencil-outline" size={20} color="#e00054" />}
              </TouchableOpacity>
            </View>

            {error ? <View style={iosStyles.errorBox}><Ionicons name="alert-circle-outline" size={20} color={Colors.error} /><Text style={iosStyles.errorText}>{error}</Text></View> : null}

            <View style={iosStyles.fieldCard}>
              <View style={iosStyles.fieldIcon}><Ionicons name="person-outline" size={28} color="#d90050" /></View>
              <View style={iosStyles.fieldBody}><Text style={iosStyles.label}>Nome completo</Text><TextInput value={name} onChangeText={setName} placeholder="Seu nome" placeholderTextColor={Colors.textLight} autoCapitalize="words" style={iosStyles.input} /></View>
            </View>
            <View style={iosStyles.fieldCard}>
              <View style={iosStyles.fieldIcon}><Ionicons name="mail-outline" size={28} color="#d90050" /></View>
              <View style={iosStyles.fieldBody}><Text style={iosStyles.label}>E-mail</Text><Text style={iosStyles.disabledText} numberOfLines={1}>{customer?.email}</Text></View>
            </View>
            <View style={iosStyles.hintRow}><Ionicons name="information-circle-outline" size={18} color="#d90050" /><Text style={iosStyles.hint}>O e-mail não pode ser alterado.</Text></View>
            <View style={iosStyles.fieldCard}>
              <View style={iosStyles.fieldIcon}><Ionicons name="card-outline" size={28} color="#d90050" /></View>
              <View style={iosStyles.fieldBody}><Text style={iosStyles.label}>CPF</Text><TextInput value={cpf} onChangeText={(value) => setCpf(formatCpf(value))} placeholder="000.000.000-00" placeholderTextColor={Colors.textLight} keyboardType="number-pad" maxLength={14} editable={!cpfLocked && !loadingProfile} style={[iosStyles.input, cpfLocked && iosStyles.lockedInput]} /></View>
            </View>
            <View style={iosStyles.hintRow}><Ionicons name={cpfLocked ? "lock-closed-outline" : "information-circle-outline"} size={18} color="#d90050" /><Text style={iosStyles.hint}>{cpfLocked ? "CPF vinculado e protegido. Ele não pode ser alterado." : "Necessário para identificar o pagamento no provedor. O CPF não poderá ser alterado após o primeiro vínculo."}</Text></View>
            <View style={iosStyles.fieldCard}>
              <View style={iosStyles.fieldIcon}><Ionicons name="call-outline" size={28} color="#d90050" /></View>
              <View style={iosStyles.fieldBody}><Text style={iosStyles.label}>Telefone</Text><TextInput value={phone} onChangeText={(value) => setPhone(formatBrazilianPhone(value))} placeholder="(00) 00000-0000" placeholderTextColor={Colors.textLight} keyboardType="phone-pad" style={iosStyles.input} /></View>
            </View>

            <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={handleSave} activeOpacity={0.85} style={busy && { opacity: 0.58 }}>
              <LinearGradient colors={["#ff5479", "#e60058", "#b50043"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={iosStyles.saveButton}>
                {busy ? <ActivityIndicator color="#fff" /> : <><Text style={iosStyles.saveText}>Salvar alterações</Text><Ionicons name="arrow-forward" size={26} color="#fff" /></>}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => goBackOr(router, "/(tabs)/perfil")} style={styles.backBtn}>
            <Text style={styles.backText}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Editar perfil</Text>

          <View style={styles.avatarEditor}>
            <View style={styles.avatarCircle}>
              {customer?.avatarUrl
                ? <Image source={{ uri: customer.avatarUrl }} style={styles.avatarImage} contentFit="cover" accessibilityLabel="Foto do perfil" cachePolicy="memory-disk" />
                : <Text style={styles.avatarInitial}>{customer?.name?.trim().charAt(0).toUpperCase() || "K"}</Text>}
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={styles.label}>Foto do perfil</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Alterar foto do perfil" onPress={openAvatarOptions} disabled={avatarBusy} style={styles.avatarAction}>
                {avatarBusy ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name="camera-outline" size={18} color={Colors.primary} />}
                <Text style={styles.avatarActionText}>{avatarBusy ? "Salvando foto..." : "Escolher ou tirar foto"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome completo</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Seu nome"
                placeholderTextColor={Colors.textLight}
                autoCapitalize="words"
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>E-mail</Text>
              <View style={[styles.input, styles.disabledInput]}>
                <Text style={styles.disabledText}>{customer?.email}</Text>
              </View>
              <Text style={styles.hint}>O e-mail não pode ser alterado.</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>CPF</Text>
              <TextInput
                value={cpf}
                onChangeText={(value) => setCpf(formatCpf(value))}
                placeholder="000.000.000-00"
                placeholderTextColor={Colors.textLight}
                keyboardType="number-pad"
                maxLength={14}
                editable={!cpfLocked && !loadingProfile}
                style={[styles.input, cpfLocked && styles.disabledInput]}
              />
              <Text style={styles.hint}>
                {cpfLocked
                  ? "CPF vinculado e protegido. Ele não pode ser alterado."
                  : "Necessário para identificar o pagamento no provedor. O CPF não poderá ser alterado após o primeiro vínculo."}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Telefone</Text>
              <TextInput
                value={phone}
                onChangeText={(value) => setPhone(formatBrazilianPhone(value))}
                placeholder="(00) 00000-0000"
                placeholderTextColor={Colors.textLight}
                keyboardType="phone-pad"
                style={styles.input}
              />
            </View>

            <Button
              label="Salvar alterações"
              onPress={handleSave}
              loading={loading || loadingProfile}
              disabled={loadingProfile}
              fullWidth
              size="lg"
              style={{ marginTop: 8 }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.base, paddingTop: 8, flexGrow: 1 },
  backBtn: { marginBottom: 20 },
  backText: { color: Colors.primary, fontWeight: "600", fontSize: FontSizes.base },
  title: { fontSize: FontSizes["2xl"], fontWeight: "800", color: Colors.textPrimary, marginBottom: 24 },
  errorBox: { backgroundColor: Colors.errorLight, borderRadius: BorderRadius.lg, padding: 12, marginBottom: 12 },
  errorText: { color: Colors.error, fontSize: FontSizes.sm, fontWeight: "500" },
  form: { gap: 16 },
  avatarEditor: { flexDirection: "row", alignItems: "center", gap: 16, padding: 16, marginBottom: 20, borderRadius: BorderRadius.xl, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  avatarCircle: { width: 76, height: 76, borderRadius: 38, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: "#fff0f4" },
  avatarImage: { width: "100%", height: "100%" },
  avatarInitial: { color: Colors.primary, fontSize: 30, fontWeight: "800" },
  avatarAction: { flexDirection: "row", alignItems: "center", gap: 7, minHeight: 36 },
  avatarActionText: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: "700" },
  inputGroup: { gap: 6 },
  label: { fontSize: FontSizes.sm, fontWeight: "600", color: Colors.textPrimary },
  input: { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.xl, paddingHorizontal: 16, paddingVertical: 14, fontSize: FontSizes.base, color: Colors.textPrimary },
  disabledInput: { backgroundColor: Colors.background, borderColor: Colors.borderLight, justifyContent: "center" },
  disabledText: { fontSize: FontSizes.base, color: Colors.textMuted },
  hint: { fontSize: FontSizes.xs, color: Colors.textLight, marginTop: 2, lineHeight: 17 },
});

const iosStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff7f8" },
  container: { paddingHorizontal: 20, paddingBottom: 38 },
  backRow: { marginTop: 4, height: 52, flexDirection: "row", alignItems: "center", gap: 10, alignSelf: "flex-start" },
  backButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center", shadowColor: "#cc6b87", shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  backText: { color: "#df0053", fontFamily: "Inter", fontSize: 16 },
  heroHeader: { minHeight: 190, marginTop: 6 },
  heroCopy: { width: "62%", paddingTop: 14 },
  title: { color: "#950035", fontFamily: "PlayfairDisplay", fontSize: 39, lineHeight: 42 },
  subtitle: { color: "#726e78", fontFamily: "Inter", fontSize: 14, lineHeight: 20, marginTop: 8 },
  logoMedallion: { position: "absolute", right: 1, top: 7, width: 132, height: 132, borderRadius: 66, overflow: "hidden", backgroundColor: "#fff0f4", borderWidth: 5, borderColor: "rgba(255,255,255,0.85)", shadowColor: "#c44d71", shadowOpacity: 0.15, shadowRadius: 13, shadowOffset: { width: 0, height: 6 } },
  logo: { width: "100%", height: "100%" },
  avatarInitial: { color: "#d90050", fontFamily: "PlayfairDisplay", fontSize: 52, fontWeight: "800" },
  pencilBadge: { position: "absolute", right: -1, top: 111, width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", shadowColor: "#bf4b70", shadowOpacity: 0.16, shadowRadius: 9, shadowOffset: { width: 0, height: 4 } },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(254,226,226,0.9)", borderRadius: 17, padding: 12, marginBottom: 12 },
  errorText: { flex: 1, color: Colors.error, fontFamily: "Inter", fontSize: 12, lineHeight: 17 },
  fieldCard: { minHeight: 88, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.88)", borderWidth: 1, borderColor: "rgba(235,144,169,0.38)", padding: 13, flexDirection: "row", alignItems: "center", gap: 13, marginBottom: 14, shadowColor: "#ca6d8a", shadowOpacity: 0.06, shadowRadius: 9, shadowOffset: { width: 0, height: 4 } },
  fieldIcon: { width: 52, height: 58, borderRadius: 17, backgroundColor: "#fff0f4", alignItems: "center", justifyContent: "center" },
  fieldBody: { flex: 1 },
  label: { color: "#7d102d", fontFamily: "Inter", fontSize: 15, fontWeight: "800" },
  input: { color: "#17121a", fontFamily: "Inter", fontSize: 18, paddingVertical: 6, paddingHorizontal: 0, marginTop: 2 },
  lockedInput: { color: "#57525d" },
  disabledText: { color: "#24202a", fontFamily: "Inter", fontSize: 17, marginTop: 8 },
  hintRow: { flexDirection: "row", gap: 8, marginTop: -5, marginBottom: 16, paddingHorizontal: 5 },
  hint: { flex: 1, color: "#79747e", fontFamily: "Inter", fontSize: 12, lineHeight: 17 },
  saveButton: { height: 64, borderRadius: 22, marginTop: 5, paddingHorizontal: 28, flexDirection: "row", alignItems: "center", justifyContent: "space-between", shadowColor: "#d21859", shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
  saveText: { flex: 1, color: "#fff", fontFamily: "PlayfairDisplay", fontSize: 21, textAlign: "center", marginLeft: 26 },
});
