import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { PackageService } from "../package/package.service";

@Injectable()
export class MarketplaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly packages: PackageService,
  ) {}

  async createStoreListing(storeId: string, data: { title: string; type: string; condition: string; price: number }) {
    await this.packages.assertCanAddMarketplaceListing(storeId);
    return this.prisma.marketplaceListing.create({ data: { storeId, ...data, status: "pending" } });
  }
}
