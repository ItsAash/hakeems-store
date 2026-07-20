/**
 * Tiny window-event channel between "something was added to the cart" (PDP buy box,
 * quick-add) and the nav's cart drawer, which live in separate React trees. Dispatching
 * an event keeps them decoupled — no context provider threaded through the server layout.
 */
const CART_OPEN_EVENT = 'lopho:cart-open';

export function requestCartOpen() {
  window.dispatchEvent(new Event(CART_OPEN_EVENT));
}

export function onCartOpenRequest(handler: () => void): () => void {
  window.addEventListener(CART_OPEN_EVENT, handler);
  return () => window.removeEventListener(CART_OPEN_EVENT, handler);
}
