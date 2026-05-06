import { Module } from "@nestjs/common";
import { ValuationService } from "./valuation.service";

@Module({ providers: [ValuationService], exports: [ValuationService] })
export class ValuationModule {}
