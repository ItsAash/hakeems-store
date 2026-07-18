'use client';

import { useEffect, useRef, useState } from 'react';
import { formatPrice } from '@/lib/format';
import type { ZoneNode } from '@/lib/medusa/checkout-actions';

export type { ZoneNode };

function isLeaf(node: ZoneNode): boolean {
  return node.children.length === 0;
}

function findPath(nodes: ZoneNode[], targetId: string, trail: ZoneNode[] = []): ZoneNode[] | null {
  for (const node of nodes) {
    const nextTrail = [...trail, node];
    if (node.id === targetId) return nextTrail;
    const childPath = findPath(node.children, targetId, nextTrail);
    if (childPath) return childPath;
  }
  return null;
}

/** Resolves a leaf zone id back to the province/city/area names the fulfillment
 * provider matches against (see shipping-zone-fulfillment's calculatePrice, which
 * reads address.province → address.city → address.address_2 in that order). */
export function resolveZoneAddressFields(
  zones: ZoneNode[],
  leafId: string | null,
): { province?: string; city?: string; area?: string } {
  if (!leafId) return {};
  const topLevel = zones[0]?.children ?? [];
  const path = findPath(topLevel, leafId);
  if (!path) return {};
  const [province, city, area] = path;
  return { province: province?.name, city: city?.name, area: area?.name };
}

/**
 * Cascading zone selector (region → city → area, however deep a given branch goes) sourced
 * from the channel's shipping-zone tree (apps/medusa's shipping-zone module). Only leaf zones
 * carry a rate, so every level is required — the customer must drill all the way down to a
 * leaf before a zone counts as selected; `onChange` only ever fires with a real id once that
 * leaf is reached, `null` otherwise, so a parent form can gate submission on it. The selected
 * leaf's ancestry (via `resolveZoneAddressFields`) is what actually gets written to the
 * cart's shipping address — this component only tracks the id.
 */
export function ShippingZonePicker({
  zones,
  value,
  onChange,
  currencyCode,
}: {
  /** Root node(s) as returned by the query — the root itself (country) is implied by the
   * channel and isn't shown; its `children` are the top-level picker options. */
  zones: ZoneNode[];
  value: string | null;
  onChange: (zoneId: string | null) => void;
  currencyCode: string;
}) {
  const root = zones[0];
  const topLevel = root?.children ?? [];

  const [path, setPath] = useState<ZoneNode[]>(() => (value ? (findPath(topLevel, value) ?? []) : []));

  // Tracks the last value *this component* emitted via onChange, so the resync effect below
  // can tell "the parent changed value out from under us" apart from "we just emitted null
  // because the customer picked a non-leaf node mid-drill-down" (don't resync — that would
  // wipe the path the customer is actively building, resetting the picker back to the root
  // every time they change a non-final level).
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    setPath(value ? (findPath(topLevel, value) ?? []) : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, root?.id]);

  if (topLevel.length === 0) return null;

  const levels: ZoneNode[][] = [];
  let options = topLevel;
  for (let level = 0; options.length > 0; level++) {
    levels.push(options);
    const chosen = path[level];
    if (!chosen) break;
    options = chosen.children;
  }

  const selectAtLevel = (level: number, nodeId: string) => {
    const options = levels[level] ?? [];
    const node = options.find((option) => option.id === nodeId);
    const nextPath = node ? [...path.slice(0, level), node] : path.slice(0, level);
    setPath(nextPath);
    // Only a fully-resolved leaf counts as a selected zone.
    const deepest = nextPath.at(-1);
    const nextValue = deepest && isLeaf(deepest) ? deepest.id : null;
    lastEmitted.current = nextValue;
    onChange(nextValue);
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xs tracking-[0.1em] text-[var(--color-ink-muted)] uppercase">Delivery Zone</h3>
      {levels.map((options, level) => {
        const selectedId = path[level]?.id ?? '';
        return (
          <div key={level} className="flex flex-col gap-1.5">
            <label htmlFor={`shipping-zone-level-${level}`} className="text-xs text-[var(--color-ink-muted)]">
              {level === 0 ? 'Region' : `Area within ${path[level - 1]?.name ?? 'this region'}`}
            </label>
            <select
              id={`shipping-zone-level-${level}`}
              required
              value={selectedId}
              onChange={(event) => selectAtLevel(level, event.target.value)}
              className="border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-2.5 text-sm text-[var(--color-ink)]"
            >
              <option value="">Select…</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                  {option.rate != null ? ` — ${formatPrice(Math.round(option.rate * 100), currencyCode)}` : ''}
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}
