import { prisma } from "@/lib/prisma";
import { LEGAL_ADDRESS_INLINE, LEGAL_IDENTITY } from "@/lib/legal-identity";
import { isNationalShippingConfigured } from "@/lib/shipping";

export interface PublicStoreInfo {
  name: string;
  address: string | null;
  city: string;
  state: string;
  zipCode: string | null;
  phone: string | null;
  email: string | null;
  hours: string | null;
  pickupEnabled: boolean;
  mototaxiEnabled: boolean;
  mototaxiPrice: string | null;
  carrierShippingEnabled: boolean;
}

export async function getPublicStoreInfo(): Promise<PublicStoreInfo> {
  try {
    const store = await prisma.storeSettings.findFirst({
      select: {
        storeName: true,
        storeAddress: true,
        storeCity: true,
        storeState: true,
        storeZipCode: true,
        storePhone: true,
        storeEmail: true,
        storeHours: true,
        storePickupEnabled: true,
        mototaxiEnabled: true,
        mototaxiPrice: true,
        correiosEnabled: true,
        shippingPackageWeight: true,
        shippingPackageHeight: true,
        shippingPackageWidth: true,
        shippingPackageLength: true,
        shippingHandlingDays: true,
      },
    });

    return {
      name: LEGAL_IDENTITY.tradeName,
      address: LEGAL_ADDRESS_INLINE,
      city: LEGAL_IDENTITY.address.city,
      state: LEGAL_IDENTITY.address.state,
      zipCode: LEGAL_IDENTITY.address.zipCode,
      phone: store?.storePhone?.trim() || null,
      email: LEGAL_IDENTITY.email,
      hours: store?.storeHours?.trim() || null,
      pickupEnabled: store?.storePickupEnabled ?? false,
      mototaxiEnabled: store?.mototaxiEnabled ?? false,
      mototaxiPrice: store ? store.mototaxiPrice.toFixed(2) : null,
      carrierShippingEnabled: store
        ? isNationalShippingConfigured({
            correiosEnabled: store.correiosEnabled,
            storeZipCode: store.storeZipCode,
            packageWeight: store.shippingPackageWeight
              ? Number(store.shippingPackageWeight)
              : null,
            packageHeight: store.shippingPackageHeight
              ? Number(store.shippingPackageHeight)
              : null,
            packageWidth: store.shippingPackageWidth
              ? Number(store.shippingPackageWidth)
              : null,
            packageLength: store.shippingPackageLength
              ? Number(store.shippingPackageLength)
              : null,
            handlingDays: store.shippingHandlingDays,
          })
        : false,
    };
  } catch {
    return {
      name: LEGAL_IDENTITY.tradeName,
      address: LEGAL_ADDRESS_INLINE,
      city: LEGAL_IDENTITY.address.city,
      state: LEGAL_IDENTITY.address.state,
      zipCode: LEGAL_IDENTITY.address.zipCode,
      phone: null,
      email: LEGAL_IDENTITY.email,
      hours: null,
      pickupEnabled: false,
      mototaxiEnabled: false,
      mototaxiPrice: null,
      carrierShippingEnabled: false,
    };
  }
}
