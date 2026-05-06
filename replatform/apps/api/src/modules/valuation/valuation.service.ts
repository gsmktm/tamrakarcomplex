import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";

@Injectable()
export class ValuationService {
  constructor(private readonly prisma: PrismaService) {}

  async estimate(input: { modelVariantId?: string; basePrice?: number; condition: string; defects?: string[] }) {
    const rule = input.modelVariantId
      ? await this.prisma.valuationRule.findFirst({ where: { modelVariantId: input.modelVariantId, active: true } })
      : null;
    const base = rule?.basePrice ?? input.basePrice ?? 0;
    const conditionFactors = (rule?.conditionFactors as Record<string, number> | undefined) ?? { new: 1, like_new: 0.85, used: 0.7, fair: 0.5 };
    const defectAdjustments = (rule?.defectAdjustments as Record<string, number> | undefined) ?? { screen: 8000, battery: 4000, camera: 5000 };
    const conditionFactor = conditionFactors[input.condition] ?? 0.7;
    const deductions = (input.defects ?? []).reduce((sum, defect) => sum + (defectAdjustments[defect] ?? 0), 0);
    return Math.max(0, Math.round(base * conditionFactor * (rule?.demandFactor ?? 1) - deductions));
  }
}
