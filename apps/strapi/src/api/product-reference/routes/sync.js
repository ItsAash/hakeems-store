"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
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
