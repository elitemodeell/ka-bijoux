import AsyncStorage from "@react-native-async-storage/async-storage";
import { APP_DISTRIBUTION } from "@/constants/distribution";

const MIGRATION_KEY = "ka-google-play-catalog-schema";
const CATALOG_SCHEMA_VERSION = "2";

const LEGACY_CATALOG_KEYS = [
  "ka-checkout-attempt-v1",
  "ka-cart-cache",
  "ka-favorites-cache",
  "ka-product-cache",
  "ka-category-cache",
  "ka-search-history",
  "ka-recent-products",
];

export async function runGooglePlayCatalogMigration() {
  if (APP_DISTRIBUTION !== "GOOGLE_PLAY") {
    throw new Error("Distribuição móvel inválida.");
  }

  const currentVersion = await AsyncStorage.getItem(MIGRATION_KEY);
  if (currentVersion === CATALOG_SCHEMA_VERSION) return;

  await AsyncStorage.multiRemove(LEGACY_CATALOG_KEYS);
  await AsyncStorage.setItem(MIGRATION_KEY, CATALOG_SCHEMA_VERSION);
}
