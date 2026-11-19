export interface PaymentInitRequest {
  scheduleId: string;
  bookingId: string;
  amountBtn: number;
  currency: 'BTN';
  customerEmail: string;
  returnUrl: string;
}

export interface PaymentInitResponse {
  provider: string;
  referenceId: string;
  checkoutUrl: string | null;
  status: 'GATEWAY_NOT_CONFIGURED' | 'PENDING_GATEWAY';
  message: string;
}

export interface BhutanPaymentGatewayAdapter {
  readonly providerName: string;
  initiatePayment(req: PaymentInitRequest): Promise<PaymentInitResponse>;
}

// Placeholder adapter ready for RMA Payment Gateway / BOBL / BDBL integration
export class RmaGatewayStubAdapter implements BhutanPaymentGatewayAdapter {
  readonly providerName = 'RMA_BT_GATEWAY';

  async initiatePayment(req: PaymentInitRequest): Promise<PaymentInitResponse> {
    return {
      provider: this.providerName,
      referenceId: `PENDING-${req.scheduleId.slice(0, 8).toUpperCase()}`,
      checkoutUrl: null,
      status: 'GATEWAY_NOT_CONFIGURED',
      message:
        'Payment schedule recorded in BTN. Live RMA/Bank of Bhutan gateway credentials have not been configured in this environment.',
    };
  }
}
