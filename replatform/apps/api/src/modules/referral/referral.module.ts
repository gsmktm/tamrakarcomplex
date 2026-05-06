import { Module } from "@nestjs/common";
import { ReferralService } from "./referral.service";
import { PointWalletModule } from "../point-wallet/point-wallet.module";

@Module({
  imports: [PointWalletModule],
  providers: [ReferralService],
  exports: [ReferralService],
})
export class ReferralModule {}
