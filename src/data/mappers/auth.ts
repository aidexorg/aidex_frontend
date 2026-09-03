import type { Account } from '@/types';
import type { AccountLogin, AccountRegister } from '../types';
import type { WireAccount, WireAccountLogin, WireAccountRegister } from './wire';

export function wireToAccount(w: WireAccount): Account {
  return {
    id: w.id,
    email: w.email,
    display_name: w.display_name,
    created_at: w.created_at,
  };
}

export function accountRegisterToWire(d: AccountRegister): WireAccountRegister {
  return {
    email: d.email,
    password: d.password,
    ...(d.display_name !== undefined ? { display_name: d.display_name } : {}),
  };
}

export function accountLoginToWire(d: AccountLogin): WireAccountLogin {
  return {
    email: d.email,
    password: d.password,
  };
}
