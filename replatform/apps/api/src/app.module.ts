import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { AuthModule } from "./modules/auth/auth.module";
import { RbacModule } from "./modules/rbac/rbac.module";
import { StoreModule } from "./modules/store/store.module";
import { PackageModule } from "./modules/package/package.module";
import { SubscriptionModule } from "./modules/subscription/subscription.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { ProductModule } from "./modules/product/product.module";
import { MarketplaceModule } from "./modules/marketplace/marketplace.module";
import { ValuationModule } from "./modules/valuation/valuation.module";
import { RepairModule } from "./modules/repair/repair.module";
import { ExchangeModule } from "./modules/exchange/exchange.module";
import { SellDeviceModule } from "./modules/sell-device/sell-device.module";
import { ReferralModule } from "./modules/referral/referral.module";
import { PointWalletModule } from "./modules/point-wallet/point-wallet.module";
import { SeoModule } from "./modules/seo/seo.module";
import { AdminReportModule } from "./modules/admin-report/admin-report.module";
import { NotificationModule } from "./modules/notification/notification.module";
import { AuditModule } from "./modules/audit/audit.module";

@Module({
  imports: [
    AuthModule,
    RbacModule,
    StoreModule,
    PackageModule,
    SubscriptionModule,
    CatalogModule,
    ProductModule,
    MarketplaceModule,
    ValuationModule,
    RepairModule,
    ExchangeModule,
    SellDeviceModule,
    ReferralModule,
    PointWalletModule,
    SeoModule,
    AdminReportModule,
    NotificationModule,
    AuditModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
