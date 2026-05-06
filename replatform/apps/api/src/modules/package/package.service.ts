import { Injectable } from "@nestjs/common";
import { resolveEntitlements, assertPackageLimit } from "@tamrakar/domain";
import { PrismaService } from "../../prisma.service";

@Injectable()
export class PackageService {
  constructor(private readonly prisma: PrismaService) {}

  async getStoreEntitlements(storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: { package: true },
    });
    const pkg = store?.package;
    return resolveEntitlements(store?.packageSlug ?? pkg?.slug, pkg ? {
      productLimit: pkg.productLimit,
      marketplaceListingLimit: pkg.marketplaceListingLimit,
      storeStaffLimit: pkg.storeStaffLimit,
      valuationAccess: pkg.valuationAccess,
      repairAccess: pkg.repairAccess,
      exchangeAccess: pkg.exchangeAccess,
      sellDeviceAccess: pkg.sellDeviceAccess,
      referralAccess: pkg.referralAccess,
      featuredPlacement: pkg.featuredPlacement,
      seoControl: pkg.seoControl,
      analyticsLevel: pkg.analyticsLevel as any,
      supportLevel: pkg.supportLevel as any,
      verifiedBadge: pkg.verifiedBadge,
      homepageBoost: pkg.homepageBoost,
    } : undefined);
  }

  async assertCanAddProduct(storeId: string) {
    const entitlements = await this.getStoreEntitlements(storeId);
    const count = await this.prisma.product.count({ where: { storeId } });
    assertPackageLimit(count, entitlements.productLimit, "Product");
  }

  async assertCanAddMarketplaceListing(storeId: string) {
    const entitlements = await this.getStoreEntitlements(storeId);
    const count = await this.prisma.marketplaceListing.count({ where: { storeId } });
    assertPackageLimit(count, entitlements.marketplaceListingLimit, "Marketplace listing");
  }

  async assertCanAddStoreStaff(storeId: string) {
    const entitlements = await this.getStoreEntitlements(storeId);
    const count = await this.prisma.storeStaff.count({ where: { storeId, active: true } });
    assertPackageLimit(count, entitlements.storeStaffLimit, "Store staff");
  }
}
