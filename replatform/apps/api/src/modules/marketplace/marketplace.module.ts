import { Module } from "@nestjs/common";
import { MarketplaceService } from "./marketplace.service";
import { PackageModule } from "../package/package.module";

@Module({
  imports: [PackageModule],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
