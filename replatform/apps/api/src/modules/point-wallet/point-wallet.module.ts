import { Module } from "@nestjs/common";
import { PointWalletService } from "./point-wallet.service";

@Module({
  providers: [PointWalletService],
  exports: [PointWalletService],
})
export class PointWalletModule {}
