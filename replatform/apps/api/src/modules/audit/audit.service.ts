import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(input: { userId?: string; action: string; entity: string; entityId?: string; oldValue?: unknown; newValue?: unknown }) {
    return this.prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        oldValue: input.oldValue as any,
        newValue: input.newValue as any,
      },
    });
  }
}
