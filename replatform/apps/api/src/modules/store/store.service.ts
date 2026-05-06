import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { PackageService } from "../package/package.service";

@Injectable()
export class StoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly packages: PackageService,
  ) {}

  listPublicStores() {
    return this.prisma.store.findMany({
      where: { status: "active" },
      include: { package: true, categories: true, tags: true },
      orderBy: [{ package: { rank: "desc" } }, { rating: "desc" }, { updatedAt: "desc" }],
    });
  }

  getPublicStore(slug: string) {
    return this.prisma.store.findUnique({
      where: { slug },
      include: { package: true, products: { where: { published: true }, take: 24 }, reviews: true },
    });
  }

  async addStaff(storeId: string, userId: string, title?: string) {
    await this.packages.assertCanAddStoreStaff(storeId);
    return this.prisma.storeStaff.create({ data: { storeId, userId, title } });
  }
}
