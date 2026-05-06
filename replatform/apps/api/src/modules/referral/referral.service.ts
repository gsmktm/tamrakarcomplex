import { Injectable } from "@nestjs/common";
import { calculateReferralReward } from "@tamrakar/domain";
import { PrismaService } from "../../prisma.service";
import { PointWalletService } from "../point-wallet/point-wallet.service";

@Injectable()
export class ReferralService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: PointWalletService,
  ) {}

  async recordClick(input: { code: string; visitorId: string; userId?: string | null }) {
    const link = await this.prisma.referralLink.findUnique({ where: { code: input.code } });
    if (!link) return null;
    const rule = await this.getRule();
    const expiresAt = new Date(Date.now() + rule.attributionDays * 24 * 60 * 60 * 1000);
    return this.prisma.referralClick.create({
      data: { linkId: link.id, visitorId: input.visitorId, userId: input.userId ?? null, expiresAt },
    });
  }

  async createPendingForOrder(input: { orderId: string; visitorId: string; productPrice: number; explicitMargin?: number | null; commissionRate?: number | null; targetType: string; targetId: string }) {
    const rule = await this.getRule();
    if (!rule.enabled || input.productPrice < rule.minOrderValue) return null;

    const click = await this.prisma.referralClick.findFirst({
      where: { visitorId: input.visitorId, expiresAt: { gte: new Date() } },
      orderBy: { clickedAt: "desc" },
      include: { link: true },
    });
    if (!click) return null;

    const reward = calculateReferralReward({
      productPrice: input.productPrice,
      explicitMargin: input.explicitMargin,
      commissionRate: input.commissionRate,
      referralPercent: rule.defaultPercent,
      maxReward: rule.maxReward,
      minOrderValue: rule.minOrderValue,
    });

    return this.prisma.referralTransaction.create({
      data: {
        referrerId: click.link.userId,
        orderId: input.orderId,
        targetType: input.targetType,
        targetId: input.targetId,
        margin: Math.round(reward.margin),
        rewardPoints: reward.rewardPoints,
        needsMarginReview: reward.needsMarginReview,
        status: "pending",
      },
    });
  }

  async approve(transactionId: string) {
    const transaction = await this.prisma.referralTransaction.update({
      where: { id: transactionId },
      data: { status: "approved", approvedAt: new Date() },
    });
    await this.wallet.creditApproved(transaction.referrerId, transaction.rewardPoints, transaction.id);
    return transaction;
  }

  private async getRule() {
    return this.prisma.referralRule.findFirst() ?? Promise.resolve({
      enabled: true,
      pointValue: 1,
      defaultPercent: 3,
      minOrderValue: 0,
      maxReward: 1000,
      attributionDays: 30,
      approvalMode: "manual_after_completion",
    } as any);
  }
}
