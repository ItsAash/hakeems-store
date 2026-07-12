import { defineDashboardExtension } from '@vendure/dashboard';
import { MapPinned } from 'lucide-react';
import { ShippingZonesPage } from './shipping-zones-page.js';

export default defineDashboardExtension({
  navSections: [
    {
      id: 'shipping-zones-section',
      title: 'Shipping',
      icon: MapPinned,
      order: 260,
    },
  ],
  routes: [
    {
      path: '/shipping-zones',
      component: () => <ShippingZonesPage />,
      navMenuItem: {
        sectionId: 'shipping-zones-section',
        id: 'shipping-zones',
        title: 'Shipping Zones',
        url: '/shipping-zones',
      },
      loader: () => ({ breadcrumb: 'Shipping Zones' }),
    },
  ],
});
