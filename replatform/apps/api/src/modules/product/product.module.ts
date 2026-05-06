import { Module } from "@nestjs/common";
import { ProductService } from "./product.service";
import { PackageModule } from "../package/package.module";

@Module({
  imports: [PackageModule],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
