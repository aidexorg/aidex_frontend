import type { Payment } from '@/types';
import type { PaymentWrite } from '../types';
import type { WirePayment, WirePaymentWrite } from './wire';

export function wireToPayment(w: WirePayment): Payment {
  return {
    id: w.id,
    period_id: w.period_id,
    payment_date: w.payment_date,
    tracking_code: w.tracking_code,
    amount: w.amount,
    direct_to_dentist: w.direct_to_dentist,
    description: w.description,
    created_at: w.created_at,
    updated_at: w.updated_at,
  };
}

export function paymentWriteToWire(d: PaymentWrite): WirePaymentWrite {
  return {
    period_id: d.period_id,
    payment_date: d.payment_date,
    tracking_code: d.tracking_code,
    amount: d.amount,
    direct_to_dentist: d.direct_to_dentist,
    description: d.description,
  };
}

export function partialPaymentWriteToWire(d: Partial<PaymentWrite>): Partial<WirePaymentWrite> {
  const out: Partial<WirePaymentWrite> = {};
  if (d.period_id !== undefined) out.period_id = d.period_id;
  if (d.payment_date !== undefined) out.payment_date = d.payment_date;
  if (d.tracking_code !== undefined) out.tracking_code = d.tracking_code;
  if (d.amount !== undefined) out.amount = d.amount;
  if (d.direct_to_dentist !== undefined) out.direct_to_dentist = d.direct_to_dentist;
  if (d.description !== undefined) out.description = d.description;
  return out;
}
