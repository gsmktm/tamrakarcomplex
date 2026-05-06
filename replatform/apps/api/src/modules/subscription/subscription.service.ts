import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  requestPackageChange(storeId: string, packageId: string) {
    return this.prisma.storeSubscription.create({
      data: { storeId, packageId, status: "pending_payment" },
    });
  }

  async approvePayment(subscriptionId: string, paymentId: string) {
    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setMonth(expiryDate.getMonth() + 1);
    const subscription = await this.prisma.storeSubscription.update({
      where: { id: subscriptionId },
      data: { status: "active", startDate: now, expiryDate, renewalDate: expiryDate },
      include: { package: true },
    });
    await this.prisma.storePayment.update({ where: { id: paymentId }, data: { status: "paid", paidAt: now } });
    await this.prisma.store.update({
      where: { id: subscription.storeId },
      data: { packageId: subscription.packageId, packageSlug: subscription.package.slug, subscriptionStatus: "active" },
    });
    return subscription;
  }

  async expireOverdueSubscriptions() {
    const now = new Date();
    const expired = await this.prisma.storeSubscription.findMany({
      where: { status: "active", expiryDate: { lt: now } },
    });
    for (const sub of expired) {
      await this.prisma.storeSubscription.update({ where: { id: sub.id }, data: { status: "expired" } });
      await this.prisma.store.update({ where: { id: sub.storeId }, data: { packageSlug: "free", subscriptionStatus: "expired" } });
    }
    return expired.length;
  }
}
