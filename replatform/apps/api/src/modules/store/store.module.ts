import { Module } from "@nestjs/common";
import { StoreService } from "./store.service";
import { PackageModule } from "../package/package.module";

@Module({
  imports: [PackageModule],
  providers: [StoreService],
  exports: [StoreService],
})
export class StoreModule {}
