import { assertChannel, CHANNELS } from '@/lib/channels';

export default async function CheckoutPage({ params }: { params: Promise<{ channel: string }> }) {
  const { channel: channelParam } = await params;
  const channel = assertChannel(channelParam);
  const isHongKong = channel === 'hongkong';

  return (
    <main className="container split">
      <section>
        <p className="eyebrow">{CHANNELS[channel].name} Checkout</p>
        <h1>Checkout</h1>
        <form action="/api/checkout" method="post" className="form-grid">
          <input type="hidden" name="channel" value={channel} />
          <label>
            Email
            <input name="emailAddress" type="email" required />
          </label>
          <label>
            First name
            <input name="firstName" required />
          </label>
          <label>
            Last name
            <input name="lastName" required />
          </label>
          <label>
            Street address
            <input name="streetLine1" required />
          </label>
          <label>
            District / City
            <input name="province" placeholder={channel === 'nepal' ? 'Kathmandu' : 'Hong Kong Island'} required />
          </label>
          <label>
            Postal code
            <input name="postalCode" defaultValue={channel === 'nepal' ? '44600' : ''} />
          </label>
          <button type="submit">{isHongKong ? 'Continue to Stripe' : 'Place Nepal Test Order'}</button>
        </form>
      </section>
      <aside className="panel">
        <h2>Payment</h2>
        {isHongKong ? (
          <p className="muted">Hong Kong uses Vendure's official Stripe payment plugin. The API route prepares the order and starts payment through Vendure.</p>
        ) : (
          <p className="muted">Nepal checkout is wired to the Fonepay placeholder. Replace it when the Fonepay Vendure payment handler is implemented.</p>
        )}
      </aside>
    </main>
  );
}
