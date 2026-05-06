import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { PackageService } from "../package/package.service";

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly packages: PackageService,
  ) {}

  async createStoreProduct(storeId: string, data: { title: string; slug: string; price: number; margin?: number }) {
    await this.packages.assertCanAddProduct(storeId);
    return this.prisma.product.create({ data: { storeId, title: data.title, slug: data.slug, price: data.price, margin: data.margin, published: false } });
  }
}
