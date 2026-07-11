export default {
  routes: [
    {
      method: 'POST',
      path: '/product-references/sync',
      handler: 'product-reference.sync',
      config: {
        auth: false,
      },
    },
  ],
};
