export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export function toURLSearchParams(searchParams: SearchParamsRecord): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') params.set(key, value);
  }
  return params;
}

export function buildToggleHref(basePath: string, searchParams: SearchParamsRecord, valueId: string, isActive: boolean): string {
  const params = toURLSearchParams(searchParams);
  const activeIds = new Set((params.get('facets') ?? '').split(',').filter(Boolean));

  if (isActive) {
    activeIds.delete(valueId);
  } else {
    activeIds.add(valueId);
  }

  if (activeIds.size > 0) {
    params.set('facets', Array.from(activeIds).join(','));
  } else {
    params.delete('facets');
  }
  params.delete('page');

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
