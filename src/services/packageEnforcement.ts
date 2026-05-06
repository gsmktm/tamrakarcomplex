import {
  checkFeatureAccess,
  checkPackageLimit,
  getRawPackageEntitlements,
} from "@/lib/storeEntitlements";
import type { StorePackageSlug } from "@/lib/storePackages";

export const PACKAGE_RULES: Record<StorePackageSlug, ReturnType<typeof getRawPackageEntitlements>> = {
  free: getRawPackageEntitlements("free"),
  silver: getRawPackageEntitlements("silver"),
  gold: getRawPackageEntitlements("gold"),
  diamond: getRawPackageEntitlements("diamond"),
};

export function getPackageRules(packageName: string | null | undefined) {
  return getRawPackageEntitlements(packageName);
}

export function canAddProduct(storePackage: string | null | undefined, currentCount: number): boolean {
  return checkFeatureAccess(storePackage, "products").allowed && checkPackageLimit(storePackage, "product", currentCount).allowed;
}

export function canAddAdmin(storePackage: string | null | undefined, currentCount: number): boolean {
  return checkPackageLimit(storePackage, "admin", currentCount).allowed;
}

export function canUsePackageFeature(storePackage: string | null | undefined, feature: string): boolean {
  return checkFeatureAccess(storePackage, feature).allowed;
}
