import { defineDashboardExtension } from '@vendure/dashboard';
import { Warehouse } from 'lucide-react';
import { StockOverviewPage } from './stock-overview-page.js';

export default defineDashboardExtension({
  navSections: [
    {
      id: 'stock-management',
      title: 'Stock',
      icon: Warehouse,
      order: 250,
    },
  ],
  routes: [
    {
      path: '/stock-overview',
      component: route => <StockOverviewPage route={route} />,
      navMenuItem: {
        sectionId: 'stock-management',
        id: 'stock-overview',
        title: 'Stock Overview',
        url: '/stock-overview',
      },
      loader: () => ({ breadcrumb: 'Stock Overview' }),
    },
  ],
});
