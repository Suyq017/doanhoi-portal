Tôi sẽ lập kế hoạch để thay thế bảng Payment Transactions thành Payment History với cấu trúc mới và logic xử lý theo yêu cầu của bạn.

## Kế Hoạch Thay Thế Payment Transactions → Payment History

### **Phase 1: Tạo Payment History Entity**

#### 1.1. Tạo PaymentHistory Entity
```typescript
// backend/src/entities/payment-history.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { PaymentAssignment } from './payment-assignment.entity';

@Entity('payment_history')
export class PaymentHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  assignment_id: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('varchar', { length: 20, default: 'PENDING' })
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED';

  @Column('bigint', { unique: true })
  order_code: number;

  @Column('timestamp', { nullable: true })
  paid_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => PaymentAssignment, { eager: true })
  @JoinColumn({ name: 'assignment_id' })
  assignment: PaymentAssignment;
}
```

#### 1.2. Tạo PaymentHistory Service
```typescript
// backend/src/payment/services/payment-history.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentHistory } from '../../entities/payment-history.entity';

@Injectable()
export class PaymentHistoryService {
  constructor(
    @InjectRepository(PaymentHistory)
    private paymentHistoryRepository: Repository<PaymentHistory>
  ) {}

  async createPaymentRecord(data: {
    assignmentId: string;
    amount: number;
    orderCode: number;
  }): Promise<PaymentHistory> {
    const paymentHistory = this.paymentHistoryRepository.create({
      assignment_id: data.assignmentId,
      amount: data.amount,
      order_code: data.orderCode,
      status: 'PENDING'
    });

    return await this.paymentHistoryRepository.save(paymentHistory);
  }

  async findByOrderCode(orderCode: number): Promise<PaymentHistory | null> {
    return await this.paymentHistoryRepository.findOne({
      where: { order_code: orderCode },
      relations: ['assignment', 'assignment.campaign', 'assignment.campaign.organization']
    });
  }

  async updatePaymentStatus(
    orderCode: number, 
    status: 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED',
    paidAt?: Date
  ): Promise<PaymentHistory> {
    const paymentHistory = await this.findByOrderCode(orderCode);
    if (!paymentHistory) {
      throw new Error('Payment history not found');
    }

    paymentHistory.status = status;
    if (status === 'PAID' && paidAt) {
      paymentHistory.paid_at = paidAt;
    }

    return await this.paymentHistoryRepository.save(paymentHistory);
  }

  async findByAssignmentId(assignmentId: string): Promise<PaymentHistory[]> {
    return await this.paymentHistoryRepository.find({
      where: { assignment_id: assignmentId },
      order: { created_at: 'DESC' }
    });
  }
}
```

### **Phase 2: Cập Nhật PaymentController**

#### 2.1. Cập nhật create-payment-link
```typescript
// backend/src/api/payment/payment.controller.ts
@Controller('api/payment')
export class PaymentController {
  constructor(
    private readonly payosService: SimplePayosService,
    private readonly paymentHistoryService: PaymentHistoryService
  ) {}

  @Post('create-payment-link')
  async createPaymentLink(@Body() requestBody: any) {
    try {
      const YOUR_DOMAIN = process.env.FRONTEND_URL;
      const orderCode = Number(String(Date.now()).slice(-6));

      // Tạo payment history record trước
      const paymentHistory = await this.paymentHistoryService.createPaymentRecord({
        assignmentId: requestBody.assignmentId,
        amount: requestBody.amount,
        orderCode: orderCode
      });

      const order = {
        amount: requestBody.amount,
        description: requestBody.description || `Thanh toán mã ${orderCode}`,
        orderCode: orderCode,
        returnUrl: `${YOUR_DOMAIN}/payment-result/${orderCode}`,
        cancelUrl: `${YOUR_DOMAIN}/payment-result/${orderCode}`,
        organizationId: requestBody.organizationId
      };

      console.log('Payment request:', requestBody);
      const paymentLink = await this.payosService.createPaymentLink(order);

      return {
        success: true,
        data: {
          orderCode: orderCode,
          checkoutUrl: paymentLink.checkoutUrl,
          qrCode: paymentLink.qrCode,
          amount: order.amount,
          description: order.description,
          paymentHistoryId: paymentHistory.id
        }
      };
    } catch (error) {
      console.error('Error creating payment link:', error);
      throw new HttpException('Failed to create payment link', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('check-status/:orderCode')
  async checkPaymentStatus(@Param('orderCode') orderCode: string) {
    try {
      const orderNumber = parseInt(orderCode, 10);
      if (isNaN(orderNumber)) {
        throw new HttpException('Invalid Order Code', HttpStatus.BAD_REQUEST);
      }

      // Lấy payment history từ orderCode
      const paymentHistory = await this.paymentHistoryService.findByOrderCode(orderNumber);
      if (!paymentHistory) {
        throw new HttpException('Payment history not found', HttpStatus.NOT_FOUND);
      }

      // Lấy organizationId từ assignment → campaign → organization
      const organizationId = paymentHistory.assignment?.campaign?.organization?.id;
      if (!organizationId) {
        throw new HttpException('Organization not found for this payment', HttpStatus.NOT_FOUND);
      }

      // Gọi PayOS để check status và cập nhật database
      const paymentInfo = await this.payosService.getPaymentLinkInformation(orderNumber, organizationId);
      
      return paymentInfo;
    } catch (error) {
      console.error(`Error checking status for order ${orderCode}:`, error);
      throw new HttpException('Order not found or failed to check status', HttpStatus.NOT_FOUND);
    }
  }
}
```

### **Phase 3: Cập Nhật SimplePayosService**

#### 3.1. Cập nhật getPaymentLinkInformation để xử lý PaymentHistory
```typescript
// backend/src/payos/payos.service.ts
@Injectable()
export class SimplePayosService {
  constructor(
    private payosConfigService: PayosConfigService,
    private paymentHistoryService: PaymentHistoryService
  ) {}

  async getPaymentLinkInformation(orderCode: number, organizationId: string) {
    try {
      // Lấy config PayOS
      const config = await this.payosConfigService.getEffectiveConfig(organizationId);
      const payos = new PayOS(config.clientId, config.apiKey, config.checksumKey);

      // Gọi PayOS API
      const paymentLinkInfo = await payos.getPaymentLinkInformation(orderCode);
      
      // Lấy payment history từ database
      const paymentHistory = await this.paymentHistoryService.findByOrderCode(orderCode);
      if (!paymentHistory) {
        throw new Error('Payment history not found');
      }

      // Cập nhật status nếu có thay đổi từ PayOS
      if (paymentHistory.status !== paymentLinkInfo.status) {
        let paidAt: Date | undefined;
        
        if (paymentLinkInfo.status === 'PAID' && paymentLinkInfo.transactions?.length > 0) {
          paidAt = new Date(paymentLinkInfo.transactions[0].transactionDateTime);
          
          // Cập nhật assignment status thành PAID
          await this.updateAssignmentStatusToPaid(paymentHistory.assignment_id, paidAt);
        }

        // Cập nhật payment history
        await this.paymentHistoryService.updatePaymentStatus(
          orderCode, 
          paymentLinkInfo.status as any,
          paidAt
        );
      }

      return {
        success: true,
        data: {
          ...paymentLinkInfo,
          paymentHistoryId: paymentHistory.id,
          assignmentId: paymentHistory.assignment_id
        }
      };
    } catch (error) {
      console.error('Error getting payment link information:', error);
      return {
        success: false,
        message: error.message || 'Failed to get payment information'
      };
    }
  }

  private async updateAssignmentStatusToPaid(assignmentId: string, paidAt: Date) {
    // Logic để cập nhật assignment status thành PAID
    // Sẽ implement trong PaymentAssignmentService
  }
}
```

### **Phase 4: Cập Nhật Module Configuration**

#### 4.1. Cập nhật PaymentModule
```typescript
// backend/src/payment/payment.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentCampaign,
      PaymentFeeLevel,
      PaymentAssignment,
      PaymentHistory, // Thay thế PaymentTransaction
      OrganizationPayosConfig,
      Organization,
      User,
    ]),
    forwardRef(() => PayosModule),
  ],
  controllers: [
    PaymentCampaignController,
    PaymentFeeLevelController,
    PaymentAssignmentController,
    OrganizationPayOSConfigController,
    PayosConfigController,
    PaymentWebhookController,
    PaymentBulkController,
    PaymentController,
  ],
  providers: [
    PaymentCampaignService,
    PaymentFeeLevelService,
    PaymentAssignmentService,
    PaymentHistoryService, // Thay thế PaymentTransactionService
    PayosConfigService,
    PayosService,
  ],
  exports: [
    PaymentCampaignService,
    PaymentFeeLevelService,
    PaymentAssignmentService,
    PaymentHistoryService, // Export PaymentHistoryService
    PayosConfigService,
    PayosService,
  ],
})
export class PaymentModule {}
```

#### 4.2. Cập nhật PayosModule
```typescript
// backend/src/payos/payos.module.ts
@Module({
  imports: [
    forwardRef(() => PaymentModule),
  ],
  controllers: [],
  providers: [SimplePayosService],
  exports: [SimplePayosService],
})
export class PayosModule {}
```

### **Phase 5: Migration Plan**

#### 5.1. Database Migration
```sql
-- Tạo bảng payment_history mới
CREATE TABLE payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  order_code BIGINT UNIQUE NOT NULL,
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assignment_id) REFERENCES payment_assignments(id)
);

-- Migrate dữ liệu từ payment_transactions (nếu cần)
INSERT INTO payment_history (assignment_id, amount, status, order_code, paid_at, created_at)
SELECT assignment_id, amount, status, order_code, paid_at, created_at 
FROM payment_transactions;

-- Drop bảng cũ (sau khi đã backup)
-- DROP TABLE payment_transactions;
```

### **Phase 6: Frontend Updates**

#### 6.1. Cập nhật Interface
```typescript
// frontend/src/features/fee-collection/services/paymentService.ts
export interface CreatePaymentLinkRequest {
  amount: number;
  description: string;
  organizationId: string;
  assignmentId: string; // Thêm assignmentId
  returnUrl?: string;
  cancelUrl?: string;
}
```

### **Phase 7: Implementation Timeline**

#### Week 1: Database & Entity Setup
- [ ] Tạo PaymentHistory entity
- [ ] Tạo PaymentHistoryService
- [ ] Setup database migration
- [ ] Test database operations

#### Week 2: API Updates
- [ ] Cập nhật PaymentController
- [ ] Cập nhật SimplePayosService
- [ ] Update module configurations
- [ ] Test API endpoints

#### Week 3: Integration & Testing
- [ ] Integration testing với PayOS
- [ ] Frontend interface updates
- [ ] End-to-end testing
- [ ] Performance testing

### **Benefits của Approach Mới**

✅ **Simplified Structure**: Bảng payment_history đơn giản hơn với các trường cần thiết
✅ **Better Data Flow**: orderCode → assignmentId → campaignId → organizationId
✅ **Automatic Organization Detection**: Không cần client gửi organizationId khi check status
✅ **Proper Status Tracking**: Track chính xác trạng thái thanh toán
✅ **Database Integrity**: Foreign key constraints đảm bảo data consistency

Kế hoạch này sẽ tạo ra một hệ thống payment tracking hiệu quả và dễ bảo trì hơn.