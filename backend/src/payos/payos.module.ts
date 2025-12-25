import { Module, forwardRef } from "@nestjs/common";
import { SimplePayosService } from "./payos.service";
import { PaymentModule } from "../payment/payment.module";

@Module({
  imports: [forwardRef(() => PaymentModule)], // Forward reference để tránh circular dependency
  providers: [SimplePayosService],
  exports: [SimplePayosService],
})
export class PayosModule {}
