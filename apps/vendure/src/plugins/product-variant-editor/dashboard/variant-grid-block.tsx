import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Input, api, cn, toast } from '@vendure/dashboard';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouterState } from '@tanstack/react-router';
import { ArrowDownToLine, Loader2, Plus, Sparkles, Wand2 } from 'lucide-react';
import { AddOptionGroupDialog } from './add-option-group-dialog.js';
import {
  addOptionGroupToProductDocument,
  createOptionDocument,
  createOptionGroupDocument,
  createVariantsDocument,
  updateVariantsDocument,
  variantEditorProductDocument,
} from './variant-editor.graphql.js';

type BlockContext = { entity?: { id?: string } | null };

const EDIT_COLS = ['sku', 'price', 'stock', 'enabled'] as const;
type EditCol = (typeof EDIT_COLS)[number];

type Row = {
  key: string;
  optionIds: string[];
  optionLabels: string[];
  variantId: string | null;
  include: boolean;
  sku: string;
  price: string;
  stock: string;
  enabled: boolean;
  orig: { sku: string; price: string; stock: string; enabled: boolean } | null;
};

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const toMajor = (minor: number) => (minor / 100).toFixed(2);
const toMinor = (major: string) => Math.round((parseFloat(major) || 0) * 100);

function cartesian<T>(arrays: T[][]): T[][] {
  return arrays.reduce<T[][]>((acc, cur) => acc.flatMap(a => cur.map(c => [...a, c])), [[]]);
}

export function VariantGridBlock({ context }: { context: BlockContext }) {
  // The variants sub-page does not expose the product via `context.entity`, so fall
  // back to reading the product id from the route (/products/{id}/variants).
  const pathname = useRouterState({ select: s => s.location.pathname });
  const productId = context.entity?.id ?? pathname.match(/products\/([^/]+)\/variants/)?.[1];
  const queryClient = useQueryClient();
  const queryKey = ['variant-editor', productId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => api.query(variantEditorProductDocument, { id: productId! }),
    enabled: !!productId,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey });
  const product = data?.product ?? null;

  const [rows, setRows] = useState<Row[]>([]);
  const [focused, setFocused] = useState<{ row: number; col: EditCol } | null>(null);
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [newValue, setNewValue] = useState<Record<string, string>>({});

  // Rebuild the grid whenever the product structure/variants change (load + after save).
  const variantSignature = product
    ? product.variants.map(v => `${v.id}:${v.sku}:${v.price}:${v.enabled}`).join(',') +
      '|' +
      product.optionGroups.map(g => `${g.id}:${g.options.map(o => o.id).join('.')}`).join(',')
    : '';
  useEffect(() => {
    if (!product) return;
    setRows(buildRows(product));
  }, [product?.id, variantSignature]);

  const createVariants = useMutation({ mutationFn: api.mutate(createVariantsDocument) });
  const updateVariants = useMutation({ mutationFn: api.mutate(updateVariantsDocument) });
  const createOptionGroup = useMutation({ mutationFn: api.mutate(createOptionGroupDocument) });
  const addOptionGroup = useMutation({ mutationFn: api.mutate(addOptionGroupToProductDocument) });
  const createOption = useMutation({ mutationFn: api.mutate(createOptionDocument) });

  const optionGroups = product?.optionGroups ?? [];

  function setCell(rowIdx: number, col: EditCol, value: string | boolean) {
    setRows(prev => prev.map((r, i) => (i === rowIdx ? { ...r, [col]: value } : r)));
  }

  function setInclude(rowIdx: number, include: boolean) {
    setRows(prev => prev.map((r, i) => (i === rowIdx ? { ...r, include } : r)));
  }

  function fillDown(col: EditCol, fromIdx: number) {
    setRows(prev => {
      const value = prev[fromIdx][col];
      return prev.map((r, i) => (i > fromIdx ? { ...r, [col]: value } : r));
    });
  }

  function handlePaste(e: React.ClipboardEvent) {
    if (!focused) return;
    const text = e.clipboardData.getData('text');
    if (!text) return;
    e.preventDefault();
    const lines = text.replace(/\r/g, '').replace(/\n$/, '').split('\n');
    const startCol = EDIT_COLS.indexOf(focused.col);
    setRows(prev => {
      const next = prev.map(r => ({ ...r }));
      lines.forEach((line, r) => {
        line.split('\t').forEach((raw, c) => {
          const rowIdx = focused.row + r;
          const colIdx = startCol + c;
          if (rowIdx >= next.length || colIdx >= EDIT_COLS.length) return;
          const col = EDIT_COLS[colIdx];
          const val = raw.trim();
          if (col === 'enabled') (next[rowIdx] as Row).enabled = /^(true|1|yes|y|enabled)$/i.test(val);
          else (next[rowIdx] as Row)[col] = val;
        });
      });
      return next;
    });
  }

  function autoFillSkus() {
    if (!product) return;
    setRows(prev =>
      prev.map(r =>
        r.sku.trim()
          ? r
          : { ...r, sku: [slug(product.name), ...r.optionLabels.map(slug)].filter(Boolean).join('-') },
      ),
    );
  }

  const newRows = rows.filter(r => !r.variantId);
  const includedNew = newRows.filter(r => r.include);
  const changedRows = rows.filter(
    r =>
      r.variantId &&
      r.orig &&
      (r.sku !== r.orig.sku ||
        r.price !== r.orig.price ||
        r.stock !== r.orig.stock ||
        r.enabled !== r.orig.enabled),
  );

  async function handleSave() {
    if (!product) return;
    const missingSku = includedNew.find(r => !r.sku.trim());
    if (missingSku) {
      toast.error('Every new variant needs a SKU. Use "Auto-fill SKUs" or fill them in.');
      return;
    }
    try {
      if (includedNew.length) {
        await createVariants.mutateAsync({
          input: includedNew.map(r => ({
            productId: product.id,
            translations: [{ languageCode: 'en', name: [product.name, ...r.optionLabels].join(' ') }],
            sku: r.sku.trim(),
            price: toMinor(r.price),
            optionIds: r.optionIds,
            stockOnHand: parseInt(r.stock || '0', 10),
            enabled: r.enabled,
          })),
        });
      }
      if (changedRows.length) {
        await updateVariants.mutateAsync({
          input: changedRows.map(r => ({
            id: r.variantId!,
            sku: r.sku.trim(),
            price: toMinor(r.price),
            enabled: r.enabled,
            stockOnHand: parseInt(r.stock || '0', 10),
          })),
        });
      }
      toast.success(
        `Saved — ${includedNew.length} created, ${changedRows.length} updated`.replace(
          ' 0 created,',
          '',
        ),
      );
      invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save variants');
    }
  }

  async function handleAddValue(groupId: string) {
    const value = (newValue[groupId] ?? '').trim();
    if (!value) return;
    try {
      await createOption.mutateAsync({
        input: {
          productOptionGroupId: groupId,
          code: slug(value),
          translations: [{ languageCode: 'en', name: value }],
        },
      });
      setNewValue(prev => ({ ...prev, [groupId]: '' }));
      invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add value');
    }
  }

  async function handleCreateGroup(name: string, values: string[]) {
    if (!product) return;
    try {
      const created = await createOptionGroup.mutateAsync({
        input: {
          code: slug(name),
          translations: [{ languageCode: 'en', name }],
          options: values.map(v => ({
            code: slug(v),
            translations: [{ languageCode: 'en', name: v }],
          })),
        },
      });
      await addOptionGroup.mutateAsync({
        productId: product.id,
        optionGroupId: created.createProductOptionGroup.id,
      });
      setAddGroupOpen(false);
      invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add option');
    }
  }

  const isSaving = createVariants.isPending || updateVariants.isPending;
  const nothingToSave = includedNew.length === 0 && changedRows.length === 0;

  if (!productId) return null;

  return (
    <div className="space-y-4">
      {/* Options builder */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Options</h3>
          <Button variant="secondary" size="sm" onClick={() => setAddGroupOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Add option
          </Button>
        </div>
        {optionGroups.length === 0 ? (
          <p className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
            No options yet. Add an option like Color or Size to generate variants.
          </p>
        ) : (
          <div className="space-y-2">
            {optionGroups.map(group => (
              <div key={group.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2.5">
                <span className="text-sm font-medium">{group.name}</span>
                <div className="flex flex-wrap gap-1">
                  {group.options.map(option => (
                    <Badge key={option.id} variant="secondary">
                      {option.name}
                    </Badge>
                  ))}
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <Input
                    value={newValue[group.id] ?? ''}
                    placeholder="Add value…"
                    className="h-8 w-32"
                    onChange={e => setNewValue(prev => ({ ...prev, [group.id]: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddValue(group.id);
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={createOption.isPending}
                    onClick={() => handleAddValue(group.id)}
                  >
                    Add
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Variant grid */}
      {optionGroups.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4" /> Variants
              <span className="text-muted-foreground font-normal">({rows.length} combinations)</span>
            </h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={autoFillSkus}>
                <Wand2 className="mr-1.5 h-4 w-4" /> Auto-fill SKUs
              </Button>
            </div>
          </div>

          <p className="text-muted-foreground text-xs">
            Edit cells directly. Hover a cell and click{' '}
            <ArrowDownToLine className="inline h-3 w-3" /> to copy it down the column, or paste
            tab-separated values (e.g. from a spreadsheet) starting at the focused cell. Price is in
            major currency units.
          </p>

          {isLoading ? (
            <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading variants…
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border" onPaste={handlePaste}>
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-muted-foreground text-left text-xs">
                    <th className="w-10 p-2"></th>
                    {optionGroups.map(g => (
                      <th key={g.id} className="p-2 font-medium">
                        {g.name}
                      </th>
                    ))}
                    <th className="p-2 font-medium">SKU</th>
                    <th className="w-28 p-2 font-medium">Price</th>
                    <th className="w-24 p-2 font-medium">Stock</th>
                    <th className="w-20 p-2 font-medium">Enabled</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIdx) => {
                    const isNew = !row.variantId;
                    const dimmed = isNew && !row.include;
                    return (
                      <tr key={row.key} className={cn('border-t', dimmed && 'opacity-40')}>
                        <td className="p-2 text-center">
                          {isNew ? (
                            <input
                              type="checkbox"
                              checked={row.include}
                              title="Create this variant"
                              onChange={e => setInclude(rowIdx, e.target.checked)}
                            />
                          ) : (
                            <span className="bg-primary/60 mx-auto block h-2 w-2 rounded-full" title="Existing variant" />
                          )}
                        </td>
                        {row.optionLabels.map((label, i) => (
                          <td key={i} className="p-2">
                            {label}
                          </td>
                        ))}
                        <EditableCell
                          value={row.sku}
                          onChange={v => setCell(rowIdx, 'sku', v)}
                          onFocus={() => setFocused({ row: rowIdx, col: 'sku' })}
                          onFillDown={() => fillDown('sku', rowIdx)}
                          placeholder="SKU"
                        />
                        <EditableCell
                          value={row.price}
                          onChange={v => setCell(rowIdx, 'price', v)}
                          onFocus={() => setFocused({ row: rowIdx, col: 'price' })}
                          onFillDown={() => fillDown('price', rowIdx)}
                          placeholder="0.00"
                          numeric
                        />
                        <EditableCell
                          value={row.stock}
                          onChange={v => setCell(rowIdx, 'stock', v)}
                          onFocus={() => setFocused({ row: rowIdx, col: 'stock' })}
                          onFillDown={() => fillDown('stock', rowIdx)}
                          placeholder="0"
                          numeric
                        />
                        <td className="p-2">
                          <div className="group relative flex items-center">
                            <input
                              type="checkbox"
                              checked={row.enabled}
                              onFocus={() => setFocused({ row: rowIdx, col: 'enabled' })}
                              onChange={e => setCell(rowIdx, 'enabled', e.target.checked)}
                            />
                            <button
                              type="button"
                              title="Fill down"
                              onClick={() => fillDown('enabled', rowIdx)}
                              className="text-muted-foreground hover:text-foreground ml-1 opacity-0 transition group-hover:opacity-100"
                            >
                              <ArrowDownToLine className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">
              {includedNew.length} to create · {changedRows.length} to update
            </span>
            <Button onClick={handleSave} disabled={isSaving || nothingToSave}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save variants
            </Button>
          </div>
        </div>
      )}

      <AddOptionGroupDialog
        open={addGroupOpen}
        onOpenChange={setAddGroupOpen}
        isPending={createOptionGroup.isPending || addOptionGroup.isPending}
        onCreate={handleCreateGroup}
      />
    </div>
  );
}

function EditableCell({
  value,
  onChange,
  onFocus,
  onFillDown,
  placeholder,
  numeric,
}: {
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onFillDown: () => void;
  placeholder?: string;
  numeric?: boolean;
}) {
  return (
    <td className="p-1.5">
      <div className="group relative">
        <input
          value={value}
          placeholder={placeholder}
          inputMode={numeric ? 'decimal' : undefined}
          onFocus={onFocus}
          onChange={e => onChange(e.target.value)}
          className="border-input bg-background focus:border-primary h-8 w-full rounded border px-2 text-sm outline-none"
        />
        <button
          type="button"
          title="Fill down"
          onClick={onFillDown}
          className="bg-background/90 text-muted-foreground hover:text-foreground absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 opacity-0 transition group-hover:opacity-100"
        >
          <ArrowDownToLine className="h-3.5 w-3.5" />
        </button>
      </div>
    </td>
  );
}

function buildRows(product: {
  name: string;
  optionGroups: { id: string; options: { id: string; name: string }[] }[];
  variants: {
    id: string;
    sku: string;
    price: number;
    enabled: boolean;
    stockLevels: { stockOnHand: number }[];
    options: { id: string }[];
  }[];
}): Row[] {
  const groups = product.optionGroups;
  if (!groups.length) return [];
  const combos = cartesian(groups.map(g => g.options));
  const variantByKey = new Map(
    product.variants.map(v => [[...v.options.map(o => o.id)].sort().join('|'), v]),
  );
  return combos.map(combo => {
    const optionIds = combo.map(o => o.id);
    const key = [...optionIds].sort().join('|');
    const variant = variantByKey.get(key) ?? null;
    const stock = variant ? variant.stockLevels.reduce((s, l) => s + l.stockOnHand, 0) : 0;
    return {
      key,
      optionIds,
      optionLabels: combo.map(o => o.name),
      variantId: variant?.id ?? null,
      include: !variant,
      sku: variant?.sku ?? '',
      price: variant ? toMajor(variant.price) : '',
      stock: variant ? String(stock) : '0',
      enabled: variant ? variant.enabled : true,
      orig: variant
        ? { sku: variant.sku, price: toMajor(variant.price), stock: String(stock), enabled: variant.enabled }
        : null,
    };
  });
}
