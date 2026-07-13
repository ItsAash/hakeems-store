'use server';

export type NewsletterResult = { success: boolean; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Newsletter opt-in. Validates the address server-side and returns a result the form
 * renders inline. The wiring is complete end-to-end; connect your provider where noted.
 *
 * TODO: persist the subscriber — e.g. call your ESP (Klaviyo/Mailchimp) API or create a
 * Vendure customer with an "accepts marketing" flag. Until then this is a no-op accept.
 */
export async function subscribeToNewsletterAction(email: string): Promise<NewsletterResult> {
  const trimmed = email.trim();
  if (!EMAIL_RE.test(trimmed)) {
    return { success: false, message: 'Please enter a valid email address.' };
  }
  return { success: true, message: 'You’re on the list — welcome to Hakeems.' };
}
