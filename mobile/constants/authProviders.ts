export interface AuthProviderConfig {
  visible: boolean;
  enabled: boolean;
}

function enabled(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

// `visible` controla somente a apresentação. `enabled` só deve ser ligado
// depois que credenciais, callback e fluxo completo estiverem homologados.
export const GOOGLE_AUTH_CONFIG: AuthProviderConfig = {
  visible: !enabled(process.env.EXPO_PUBLIC_AUTH_HIDE_GOOGLE),
  enabled: enabled(process.env.EXPO_PUBLIC_AUTH_GOOGLE_ENABLED),
};

export const APPLE_AUTH_CONFIG: AuthProviderConfig = {
  visible: true,
  enabled: !enabled(process.env.EXPO_PUBLIC_AUTH_APPLE_DISABLED),
};
