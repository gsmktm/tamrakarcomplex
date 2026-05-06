import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";

@Injectable()
export class SeoService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetadata(path: string) {
    return this.prisma.seoPage.findUnique({ where: { path } });
  }

  storeSchema(store: { name: string; slug: string; phone?: string | null; location?: string | null; rating?: number | null }) {
    return {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: store.name,
      url: `https://tamrakarcomplex.com/stores/${store.slug}`,
      telephone: store.phone,
      address: store.location,
      aggregateRating: store.rating ? { "@type": "AggregateRating", ratingValue: store.rating } : undefined,
    };
  }
}
