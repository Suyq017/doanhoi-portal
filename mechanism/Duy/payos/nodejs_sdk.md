# NodeJS SDK

thông tin

Code demo: <https://github.com/payOSHQ/payos-demo-nodejs>

## Tài liệu đầy đủ[​](#tài-liệu-đầy-đủ "Đường dẫn trực tiếp đến Tài liệu đầy đủ")

Để biết thêm chi tiết về các phương thức, tham số và tính năng nâng cao (pagination, error handling, logging, v.v.), vui lòng xem [GitHub Repository](https://github.com/payOSHQ/payos-lib-node).

## Cài đặt[​](#cài-đặt "Đường dẫn trực tiếp đến Cài đặt")

Cài đặt gói `@payos/node` thông qua npm hoặc yarn:

```
npm install @payos/node
# hoặc
yarn add @payos/node
```

## Khởi tạo[​](#khởi-tạo "Đường dẫn trực tiếp đến Khởi tạo")

Khởi tạo đối tượng PayOS với Client ID, API Key và Checksum Key từ kênh thanh toán:

```
import { PayOS } from '@payos/node';

const payOS = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID,
  apiKey: process.env.PAYOS_API_KEY,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY,
});
```

## Tạo link thanh toán[​](#tạo-link-thanh-toán "Đường dẫn trực tiếp đến Tạo link thanh toán")

Sử dụng phương thức `paymentRequests.create()` để tạo link thanh toán:

```
const paymentData = {
  orderCode: 123456,
  amount: 50000,
  description: 'Thanh toán đơn hàng',
  items: [
    {
      name: 'Sản phẩm A',
      quantity: 1,
      price: 50000,
    },
  ],
  cancelUrl: 'https://your-domain.com/cancel',
  returnUrl: 'https://your-domain.com/success',
};

const paymentLink = await payOS.paymentRequests.create(paymentData);
console.log(paymentLink.checkoutUrl);
```

## Xác minh webhook[​](#xác-minh-webhook "Đường dẫn trực tiếp đến Xác minh webhook")

Sử dụng phương thức `webhooks.verify()` để xác thực dữ liệu webhook:

```
app.post('/webhook', (req, res) => {
  try {
    const webhookData = payOS.webhooks.verify(req.body);
    console.log('Thanh toán thành công:', webhookData);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook không hợp lệ:', error);
    res.status(400).send('Invalid webhook');
  }
});
```

## Tạo payout[​](#tạo-payout "Đường dẫn trực tiếp đến Tạo payout")

Sử dụng phương thức `payouts.batch.create()` để tạo payout theo lô:

```
const referenceId = `payout_${Date.now()}`;
const payoutBatch = await payOS.payouts.batch.create({
  referenceId,
  category: ['salary'],
  validateDestination: true,
  payouts: [
    {
      referenceId: `${referenceId}_1`,
      amount: 2000,
      description: 'Thanh toán lương',
      toBin: '970422',
      toAccountNumber: '0123456789',
    },
    {
      referenceId: `${referenceId}_2`,
      amount: 3000,
      description: 'Thanh toán thưởng',
      toBin: '970422',
      toAccountNumber: '0987654321',
    },
  ],
});

console.log('Payout ID:', payoutBatch.id);
```
