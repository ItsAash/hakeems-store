const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const SYNC_SECRET = process.env.HAKEEMS_SYNC_SECRET || 'replace-with-shared-secret';
async function main() {
    const response = await fetch(`${STRAPI_URL}/api/product-references/sync`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Hakeems-Sync-Secret': SYNC_SECRET,
        },
        body: JSON.stringify({
            action: 'upsert',
            products: [
                {
                    vendureId: 'seed-hk-box-tee',
                    title: 'Hakeems Box Tee',
                    handle: 'hakeems-box-tee',
                    thumbnailUrl: 'https://placehold.co/900x1200/111111/f7f7f7?text=Hakeems+Box+Tee',
                    channel: 'both',
                },
            ],
        }),
    });
    if (!response.ok) {
        throw new Error(`Strapi seed sync failed: ${response.status} ${await response.text()}`);
    }
    console.log(await response.json());
    console.log('Seeded Product Reference. Create the demo Event in Strapi Admin and attach this reference.');
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
