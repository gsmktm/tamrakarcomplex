import { PrismaClient, PlatformRole } from "@prisma/client";
import { PACKAGE_DEFAULTS } from "../packages/domain/src/index";

const prisma = new PrismaClient();

async function main() {
  for (const roleName of Object.values(PlatformRole)) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
  }

  for (const [slug, pkg] of Object.entries(PACKAGE_DEFAULTS)) {
    await prisma.storePackage.upsert({
      where: { slug },
      update: {
        name: pkg.name,
        monthlyPrice: pkg.monthlyPrice,
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
        analyticsLevel: pkg.analyticsLevel,
        supportLevel: pkg.supportLevel,
        verifiedBadge: pkg.verifiedBadge,
        homepageBoost: pkg.homepageBoost,
        rank: pkg.rank,
      },
      create: {
        slug,
        name: pkg.name,
        monthlyPrice: pkg.monthlyPrice,
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
        analyticsLevel: pkg.analyticsLevel,
        supportLevel: pkg.supportLevel,
        verifiedBadge: pkg.verifiedBadge,
        homepageBoost: pkg.homepageBoost,
        rank: pkg.rank,
      },
    });
  }

  await prisma.referralRule.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      enabled: true,
      pointValue: 1,
      defaultPercent: 3,
      minOrderValue: 0,
      maxReward: 1000,
      attributionDays: 30,
      approvalMode: "manual_after_completion",
    },
  });

  await prisma.seoPage.upsert({
    where: { path: "/stores" },
    update: {},
    create: {
      path: "/stores",
      title: "Best Mobile Shops in Tamrakar Complex",
      description: "Explore verified mobile shops, repair specialists, accessories stores, and used phone sellers in Tamrakar Complex.",
      keywords: ["Tamrakar Complex", "mobile shops Nepal", "New Road mobile stores"],
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
