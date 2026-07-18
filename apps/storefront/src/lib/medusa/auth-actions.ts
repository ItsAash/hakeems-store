'use server';

import { redirect } from 'next/navigation';
import type { ChannelCode } from '@/lib/channel';
import { createMedusaClient } from '@/lib/medusa/client';
import { getAuthToken, setAuthToken, removeAuthToken } from '@/lib/medusa/auth-cookie';

export type ActionResult = { success: true } | { success: false; message: string };

export async function loginAction(
  channelCode: ChannelCode,
  input: { email: string; password: string },
): Promise<ActionResult> {
  try {
    const client = createMedusaClient(channelCode);
    const token = await client.auth.login('customer', 'emailpass', {
      email: input.email,
      password: input.password,
    });

    if (typeof token === 'string') {
      await setAuthToken(token);
      return { success: true };
    }

    return { success: false, message: 'Authentication failed. Please try again.' };
  } catch (err: any) {
    const message = err?.errors?.[0]?.message ?? err?.message ?? 'Invalid email or password.';
    return { success: false, message };
  }
}

export async function registerAction(
  channelCode: ChannelCode,
  input: { email: string; password: string; first_name: string; last_name: string },
): Promise<ActionResult> {
  try {
    const client = createMedusaClient(channelCode);
    const token = await client.auth.register('customer', 'emailpass', {
      email: input.email,
      password: input.password,
      first_name: input.first_name,
      last_name: input.last_name,
    });

    if (typeof token !== 'string') {
      return { success: false, message: 'Registration failed. Please try again.' };
    }

    await client.store.customer.create({ email: input.email });

    const loginToken = await client.auth.login('customer', 'emailpass', {
      email: input.email,
      password: input.password,
    });

    if (typeof loginToken === 'string') {
      await setAuthToken(loginToken);
    }

    return { success: true };
  } catch (err: any) {
    const message = err?.errors?.[0]?.message ?? err?.message ?? 'Could not create account.';
    return { success: false, message };
  }
}

export async function requestPasswordResetAction(channelCode: ChannelCode, email: string): Promise<void> {
  const client = createMedusaClient(channelCode);
  try {
    await client.auth.resetPassword('customer', 'emailpass', { identifier: email });
  } catch (err) {
    // Deliberately swallowed: the caller always shows the same "if an account exists…"
    // message regardless of outcome, so a real account can't be distinguished from a
    // missing one by response behavior.
    console.error('requestPasswordResetAction failed', err);
  }
}

export async function resetPasswordAction(
  channelCode: ChannelCode,
  input: { token: string; password: string },
): Promise<ActionResult> {
  try {
    const client = createMedusaClient(channelCode);
    // Not sdk.auth.updateProvider — it discards the response body, but Medusa's
    // /auth/:actor/:provider/update route returns a fresh session token once the
    // reset token is consumed, which we need to log the customer straight in
    // (matching the old Vendure flow, where resetPassword also returned a session).
    const result = await client.client.fetch<{ token?: string }>('/auth/customer/emailpass/update', {
      method: 'POST',
      headers: { Authorization: `Bearer ${input.token}` },
      body: { password: input.password },
    });

    if (result?.token) {
      await setAuthToken(result.token);
    }

    return { success: true };
  } catch (err: any) {
    const message = err?.errors?.[0]?.message ?? err?.message ?? 'This reset link is invalid or has expired.';
    return { success: false, message };
  }
}

export async function logoutAction(channelCode: ChannelCode): Promise<void> {
  await removeAuthToken();
  redirect(`/${channelCode}`);
}

/**
 * Read-only — called from Server Components (account layout/pages, nav), not just
 * Server Actions, so it must never try to write the auth cookie: Next.js throws if
 * `cookies().set()/.delete()` runs outside a Server Action or Route Handler, which
 * would otherwise crash every page render for a customer with a stale/expired token
 * instead of just treating them as logged out. Cookie cleanup for a bad token happens
 * lazily on the next real Server Action (login, logout) instead.
 */
export async function fetchCustomerAction(channelCode: ChannelCode) {
  const token = await getAuthToken();
  if (!token) return null;

  try {
    const client = createMedusaClient(channelCode, token);
    const { customer } = await client.store.customer.retrieve();
    return customer;
  } catch {
    return null;
  }
}

export async function updateCustomerAction(
  channelCode: ChannelCode,
  input: { first_name?: string; last_name?: string; phone?: string },
): Promise<ActionResult> {
  try {
    const token = await getAuthToken();
    if (!token) return { success: false, message: 'Not authenticated.' };

    const client = createMedusaClient(channelCode, token);
    await client.store.customer.update(input);
    return { success: true };
  } catch (err: any) {
    const message = err?.errors?.[0]?.message ?? err?.message ?? 'Could not update profile.';
    return { success: false, message };
  }
}

export async function changePasswordAction(
  channelCode: ChannelCode,
  input: { new_password: string },
): Promise<ActionResult> {
  try {
    const token = await getAuthToken();
    if (!token) return { success: false, message: 'Not authenticated.' };

    const client = createMedusaClient(channelCode, token);
    await client.client.fetch(`/store/auth/customer/emailpass/update-password`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { password: input.new_password },
    });
    return { success: true };
  } catch (err: any) {
    const message = err?.errors?.[0]?.message ?? err?.message ?? 'Could not update password.';
    return { success: false, message };
  }
}

export async function createCustomerAddressAction(
  channelCode: ChannelCode,
  input: {
    first_name?: string;
    last_name?: string;
    address_1: string;
    address_2?: string;
    city: string;
    province?: string;
    postal_code?: string;
    country_code: string;
    phone?: string;
  },
): Promise<ActionResult> {
  try {
    const token = await getAuthToken();
    if (!token) return { success: false, message: 'Not authenticated.' };

    const client = createMedusaClient(channelCode, token);
    await client.store.customer.createAddress(input);
    return { success: true };
  } catch (err: any) {
    const message = err?.errors?.[0]?.message ?? err?.message ?? 'Could not save address.';
    return { success: false, message };
  }
}

export async function updateCustomerAddressAction(
  channelCode: ChannelCode,
  addressId: string,
  input: {
    first_name?: string;
    last_name?: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    country_code?: string;
    phone?: string;
  },
): Promise<ActionResult> {
  try {
    const token = await getAuthToken();
    if (!token) return { success: false, message: 'Not authenticated.' };

    const client = createMedusaClient(channelCode, token);
    await client.store.customer.updateAddress(addressId, input);
    return { success: true };
  } catch (err: any) {
    const message = err?.errors?.[0]?.message ?? err?.message ?? 'Could not update address.';
    return { success: false, message };
  }
}

export async function deleteCustomerAddressAction(
  channelCode: ChannelCode,
  addressId: string,
): Promise<ActionResult> {
  try {
    const token = await getAuthToken();
    if (!token) return { success: false, message: 'Not authenticated.' };

    const client = createMedusaClient(channelCode, token);
    await client.store.customer.deleteAddress(addressId);
    return { success: true };
  } catch (err: any) {
    const message = err?.errors?.[0]?.message ?? err?.message ?? 'Could not remove address.';
    return { success: false, message };
  }
}
