'use server';

import { redirect } from 'next/navigation';
import type { ChannelCode } from '@/lib/channel';
import { callVendureWithSession, toMutationResult, type MutationResult } from '@/lib/vendure/session-client';
import {
  CreateCustomerAddressDocument,
  DeleteCustomerAddressDocument,
  LoginDocument,
  LogoutDocument,
  RefreshCustomerVerificationDocument,
  RegisterCustomerAccountDocument,
  RequestPasswordResetDocument,
  RequestUpdateCustomerEmailAddressDocument,
  ResetPasswordDocument,
  UpdateCustomerAddressDocument,
  UpdateCustomerDocument,
  UpdateCustomerEmailAddressDocument,
  UpdateCustomerPasswordDocument,
  VerifyCustomerAccountDocument,
  type CreateCustomerAddressMutation,
  type DeleteCustomerAddressMutation,
  type LoginMutation,
  type LogoutMutation,
  type RefreshCustomerVerificationMutation,
  type RegisterCustomerAccountMutation,
  type RequestPasswordResetMutation,
  type RequestUpdateCustomerEmailAddressMutation,
  type ResetPasswordMutation,
  type UpdateCustomerAddressMutation,
  type UpdateCustomerMutation,
  type UpdateCustomerEmailAddressMutation,
  type UpdateCustomerPasswordMutation,
  type VerifyCustomerAccountMutation,
  type CreateAddressInput,
  type UpdateAddressInput,
  type UpdateCustomerInput,
} from '@/lib/vendure/generated';

export async function loginAction(
  channelCode: ChannelCode,
  input: { username: string; password: string; rememberMe?: boolean },
): Promise<MutationResult> {
  const data = await callVendureWithSession<LoginMutation, typeof input>(channelCode, LoginDocument, input);
  return toMutationResult(data.login, ['CurrentUser']);
}

export async function logoutAction(channelCode: ChannelCode): Promise<void> {
  await callVendureWithSession<LogoutMutation, Record<string, never>>(channelCode, LogoutDocument, {});
  redirect(`/${channelCode}`);
}

export async function registerCustomerAccountAction(
  channelCode: ChannelCode,
  input: { firstName: string; lastName: string; emailAddress: string; password: string },
): Promise<MutationResult> {
  const data = await callVendureWithSession<RegisterCustomerAccountMutation, { input: typeof input }>(
    channelCode,
    RegisterCustomerAccountDocument,
    { input },
  );
  return toMutationResult(data.registerCustomerAccount, ['Success']);
}

export async function verifyCustomerAccountAction(
  channelCode: ChannelCode,
  input: { token: string; password?: string },
): Promise<MutationResult> {
  const data = await callVendureWithSession<VerifyCustomerAccountMutation, typeof input>(
    channelCode,
    VerifyCustomerAccountDocument,
    input,
  );
  return toMutationResult(data.verifyCustomerAccount, ['CurrentUser']);
}

export async function refreshCustomerVerificationAction(channelCode: ChannelCode, emailAddress: string): Promise<MutationResult> {
  const data = await callVendureWithSession<RefreshCustomerVerificationMutation, { emailAddress: string }>(
    channelCode,
    RefreshCustomerVerificationDocument,
    { emailAddress },
  );
  return toMutationResult(data.refreshCustomerVerification, ['Success']);
}

export async function requestPasswordResetAction(channelCode: ChannelCode, emailAddress: string): Promise<MutationResult> {
  const data = await callVendureWithSession<RequestPasswordResetMutation, { emailAddress: string }>(
    channelCode,
    RequestPasswordResetDocument,
    { emailAddress },
  );
  return toMutationResult(data.requestPasswordReset, ['Success']);
}

export async function resetPasswordAction(
  channelCode: ChannelCode,
  input: { token: string; password: string },
): Promise<MutationResult> {
  const data = await callVendureWithSession<ResetPasswordMutation, typeof input>(channelCode, ResetPasswordDocument, input);
  return toMutationResult(data.resetPassword, ['CurrentUser']);
}

export async function updateCustomerAction(channelCode: ChannelCode, input: UpdateCustomerInput): Promise<MutationResult> {
  const data = await callVendureWithSession<UpdateCustomerMutation, { input: UpdateCustomerInput }>(
    channelCode,
    UpdateCustomerDocument,
    { input },
  );
  return data.updateCustomer ? { success: true } : { success: false, message: 'Could not update profile.' };
}

export async function updateCustomerPasswordAction(
  channelCode: ChannelCode,
  input: { currentPassword: string; newPassword: string },
): Promise<MutationResult> {
  const data = await callVendureWithSession<UpdateCustomerPasswordMutation, typeof input>(
    channelCode,
    UpdateCustomerPasswordDocument,
    input,
  );
  return toMutationResult(data.updateCustomerPassword, ['Success']);
}

export async function requestUpdateCustomerEmailAddressAction(
  channelCode: ChannelCode,
  input: { password: string; newEmailAddress: string },
): Promise<MutationResult> {
  const data = await callVendureWithSession<RequestUpdateCustomerEmailAddressMutation, typeof input>(
    channelCode,
    RequestUpdateCustomerEmailAddressDocument,
    input,
  );
  return toMutationResult(data.requestUpdateCustomerEmailAddress, ['Success']);
}

export async function updateCustomerEmailAddressAction(channelCode: ChannelCode, token: string): Promise<MutationResult> {
  const data = await callVendureWithSession<UpdateCustomerEmailAddressMutation, { token: string }>(
    channelCode,
    UpdateCustomerEmailAddressDocument,
    { token },
  );
  return toMutationResult(data.updateCustomerEmailAddress, ['Success']);
}

export async function createCustomerAddressAction(channelCode: ChannelCode, input: CreateAddressInput): Promise<MutationResult> {
  const data = await callVendureWithSession<CreateCustomerAddressMutation, { input: CreateAddressInput }>(
    channelCode,
    CreateCustomerAddressDocument,
    { input },
  );
  return data.createCustomerAddress ? { success: true } : { success: false, message: 'Could not save address.' };
}

export async function updateCustomerAddressAction(channelCode: ChannelCode, input: UpdateAddressInput): Promise<MutationResult> {
  const data = await callVendureWithSession<UpdateCustomerAddressMutation, { input: UpdateAddressInput }>(
    channelCode,
    UpdateCustomerAddressDocument,
    { input },
  );
  return data.updateCustomerAddress ? { success: true } : { success: false, message: 'Could not update address.' };
}

export async function deleteCustomerAddressAction(channelCode: ChannelCode, id: string): Promise<MutationResult> {
  const data = await callVendureWithSession<DeleteCustomerAddressMutation, { id: string }>(
    channelCode,
    DeleteCustomerAddressDocument,
    { id },
  );
  return data.deleteCustomerAddress.success
    ? { success: true }
    : { success: false, message: 'Could not remove address.' };
}
