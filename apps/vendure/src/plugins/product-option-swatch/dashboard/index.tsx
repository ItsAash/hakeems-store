import { defineDashboardExtension } from '@vendure/dashboard';
import { ColorSwatchPickerComponent } from './components/color-swatch-picker.js';

export default defineDashboardExtension({
  customFormComponents: {
    customFields: [
      {
        id: 'color-picker',
        component: ColorSwatchPickerComponent,
      },
    ],
  },
});
