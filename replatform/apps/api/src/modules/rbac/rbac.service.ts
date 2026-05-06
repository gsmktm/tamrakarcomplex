import { Injectable } from "@nestjs/common";
import type { PlatformRole } from "@tamrakar/domain";
import { PrismaService } from "../../prisma.service";

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  async hasRole(userId: string, role: PlatformRole) {
    const found = await this.prisma.userRole.findFirst({
      where: { userId, role: { name: role } },
    });
    return Boolean(found);
  }

  async canAccessStore(userId: string, storeId: string) {
    const owned = await this.prisma.store.findFirst({ where: { id: storeId, ownerId: userId } });
    if (owned) return true;
    const staff = await this.prisma.storeStaff.findFirst({ where: { storeId, userId, active: true } });
    return Boolean(staff);
  }
}
