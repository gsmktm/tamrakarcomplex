import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";

@Injectable()
export class PointWalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(userId: string) {
    return this.prisma.pointWallet.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async creditApproved(userId: string, points: number, referenceId: string) {
    const wallet = await this.getOrCreate(userId);
    await this.prisma.pointTransaction.create({
      data: { walletId: wallet.id, type: "credit", points, status: "approved", referenceId },
    });
    return this.prisma.pointWallet.update({
      where: { id: wallet.id },
      data: { approvedPoints: { increment: points } },
    });
  }

  async redeem(userId: string, points: number, referenceId: string) {
    const wallet = await this.getOrCreate(userId);
    if (wallet.approvedPoints < points) throw new Error("Not enough approved points.");
    await this.prisma.pointTransaction.create({
      data: { walletId: wallet.id, type: "debit", points, status: "used", referenceId },
    });
    return this.prisma.pointWallet.update({
      where: { id: wallet.id },
      data: { approvedPoints: { decrement: points }, usedPoints: { increment: points } },
    });
  }
}
