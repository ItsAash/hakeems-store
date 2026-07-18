import Medusa from '@medusajs/js-sdk';
import type { ChannelCode } from '@/lib/channel';
import { MEDUSA_BACKEND_URL, getMedusaConfig } from '@/lib/medusa/config';

export function createMedusaClient(channelCode: ChannelCode, token?: string): Medusa {
  const config = getMedusaConfig(channelCode);
  const client = new Medusa({
    baseUrl: MEDUSA_BACKEND_URL,
    publishableKey: config.publishableApiKey,
    auth: { type: 'jwt', jwtTokenStorageMethod: 'memory' },
  });
  if (token) {
    client.client.setToken(token);
  }
  return client;
}
