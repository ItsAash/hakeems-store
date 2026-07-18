import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Text,
  Button,
  Select,
  toast,
  Drawer,
  Input,
  Label,
  Switch,
  usePrompt,
  StatusBadge,
  Tooltip,
  Skeleton,
} from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import {
  TrianglesMini,
  PlusMini,
  PencilSquare,
  Trash,
  TruckFast,
} from "@medusajs/icons"
import { sdk } from "../../lib/sdk"

type ShippingZoneNode = {
  id: string
  name: string
  code: string
  enabled: boolean
  rate: number | null
  stock_location_id: string
  parent_id: string | null
  children: ShippingZoneNode[]
}

type StockLocation = {
  id: string
  name: string
}

const SHIPPING_ZONES_QUERY_KEY = "shipping-zones"
const STOCK_LOCATIONS_QUERY_KEY = "stock-locations"
const PAGE_SIZE = 999

const ZoneNode = ({
  node,
  depth,
  onEdit,
  onDelete,
  onAddChild,
}: {
  node: ShippingZoneNode
  depth: number
  onEdit: (node: ShippingZoneNode) => void
  onDelete: (node: ShippingZoneNode) => void
  onAddChild: (parent: ShippingZoneNode) => void
}) => {
  return (
    <div>
      <div
        className="flex items-center justify-between py-3 px-4 hover:bg-ui-bg-subtle transition-fg border-b border-ui-border-base last:border-b-0"
        style={{ paddingLeft: 16 + depth * 28 }}
      >
        <div className="flex items-center gap-x-3 min-w-0 flex-1">
          <div className="text-ui-fg-muted shrink-0">
            {node.children.length > 0 ? <TrianglesMini /> : <div className="w-4 h-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-x-2">
              <Text size="small" weight="plus" className="truncate">
                {node.name}
              </Text>
              <StatusBadge color={node.enabled ? "green" : "grey"}>
                {node.enabled ? "Active" : "Disabled"}
              </StatusBadge>
            </div>
            <div className="flex items-center gap-x-4 mt-0.5">
              <Text size="small" className="text-ui-fg-muted">
                {node.code}
              </Text>
              {node.rate !== null && (
                <Text size="small" className="text-ui-fg-muted">
                  {node.rate.toFixed(2)}
                </Text>
              )}
              {node.rate === null && depth > 0 && (
                <Text size="small" className="text-ui-fg-muted">
                  Inherits rate
                </Text>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-x-1 shrink-0">
          <Tooltip content="Add child zone">
            <Button size="small" variant="transparent" onClick={() => onAddChild(node)}>
              <PlusMini />
            </Button>
          </Tooltip>
          <Tooltip content="Edit zone">
            <Button size="small" variant="transparent" onClick={() => onEdit(node)}>
              <PencilSquare />
            </Button>
          </Tooltip>
          <Tooltip content="Delete zone">
            <Button size="small" variant="transparent" onClick={() => onDelete(node)}>
              <Trash />
            </Button>
          </Tooltip>
        </div>
      </div>
      {node.children.map((child) => (
        <ZoneNode
          key={child.id}
          node={child}
          depth={depth + 1}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
        />
      ))}
    </div>
  )
}

const ShippingZonesPage = () => {
  const queryClient = useQueryClient()
  const prompt = usePrompt()

  const [selectedLocationId, setSelectedLocationId] = useState<string>("")

  const [editNode, setEditNode] = useState<ShippingZoneNode | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const [createParent, setCreateParent] = useState<ShippingZoneNode | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createRootOpen, setCreateRootOpen] = useState(false)

  const { data: locationsData, isLoading: locationsLoading } = useQuery({
    queryFn: async () => {
      const response: any = await sdk.client.fetch(
        `/admin/stock-locations?limit=${PAGE_SIZE}`
      )
      return response.stock_locations as StockLocation[]
    },
    queryKey: [STOCK_LOCATIONS_QUERY_KEY],
  })

  const locations = locationsData ?? []
  const firstLocation = locations[0]
  const effectiveLocationId = selectedLocationId || firstLocation?.id || ""

  useEffect(() => {
    if (!selectedLocationId && firstLocation?.id) {
      setSelectedLocationId(firstLocation.id)
    }
  }, [firstLocation?.id, selectedLocationId])

  const {
    data: treeData,
    isLoading: treeLoading,
    isError: treeError,
    error: treeFetchError,
  } = useQuery({
    queryFn: async () => {
      const response: any = await sdk.client.fetch(
        `/admin/shipping-zones?stock_location_id=${effectiveLocationId}`
      )
      return response.shipping_zones as ShippingZoneNode[]
    },
    queryKey: [SHIPPING_ZONES_QUERY_KEY, effectiveLocationId],
    enabled: !!effectiveLocationId,
  })

  const tree = treeData ?? []

  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string
      code: string
      rate: number | null
      enabled: boolean
      parent_id: string | null
    }) => {
      const response: any = await sdk.client.fetch("/admin/shipping-zones", {
        method: "POST",
        body: { ...data, stock_location_id: effectiveLocationId },
      })
      return response.shipping_zone
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHIPPING_ZONES_QUERY_KEY] })
      toast.success("Shipping zone created")
      setCreateOpen(false)
      setCreateRootOpen(false)
      setCreateParent(null)
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create shipping zone")
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string
      name?: string
      code?: string
      rate?: number | null
      enabled?: boolean
    }) => {
      const response: any = await sdk.client.fetch(
        `/admin/shipping-zones/${id}`,
        { method: "POST", body: data }
      )
      return response.shipping_zone
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHIPPING_ZONES_QUERY_KEY] })
      toast.success("Shipping zone updated")
      setEditOpen(false)
      setEditNode(null)
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update shipping zone")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await sdk.client.fetch(`/admin/shipping-zones/${id}`, {
        method: "DELETE",
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHIPPING_ZONES_QUERY_KEY] })
      toast.success("Shipping zone deleted")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete shipping zone")
    },
  })

  const handleDelete = async (node: ShippingZoneNode) => {
    const confirmed = await prompt({
      title: "Delete shipping zone",
      description: `Are you sure you want to delete "${node.name}"?${
        node.children.length > 0 ? " All child zones will also be deleted." : ""
      }`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
    })
    if (confirmed) {
      deleteMutation.mutate(node.id)
    }
  }

  const closeCreate = () => {
    setCreateOpen(false)
    setCreateRootOpen(false)
    setCreateParent(null)
  }

  return (
    <div className="flex flex-col gap-y-3">
      <Container className="divide-y divide-ui-border-base p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading>Shipping Zones</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Manage shipping zone trees per warehouse
            </Text>
          </div>
          <div className="flex items-center gap-x-2">
            <Select
              value={effectiveLocationId}
              onValueChange={setSelectedLocationId}
            >
              <Select.Trigger className="w-[240px]">
                <Select.Value placeholder="Select warehouse..." />
              </Select.Trigger>
              <Select.Content>
                {locationsLoading && (
                  <div className="px-3 py-2">
                    <Text size="small" className="text-ui-fg-muted">
                      Loading...
                    </Text>
                  </div>
                )}
                {!locationsLoading &&
                  locations.map((loc) => (
                    <Select.Item key={loc.id} value={loc.id}>
                      {loc.name}
                    </Select.Item>
                  ))}
              </Select.Content>
            </Select>
            {effectiveLocationId && (
              <Button
                size="small"
                variant="secondary"
                onClick={() => setCreateRootOpen(true)}
              >
                <PlusMini className="mr-1" />
                Add Root Zone
              </Button>
            )}
          </div>
        </div>
      </Container>

      <Container className="overflow-hidden p-0">
        {!effectiveLocationId && (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-y-2">
              <TruckFast className="text-ui-fg-muted" />
              <Text size="small" className="text-ui-fg-muted">
                Select a warehouse to view its shipping zones
              </Text>
            </div>
          </div>
        )}

        {effectiveLocationId && treeLoading && (
          <div className="flex flex-col gap-y-3 p-6">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-6 w-2/3" />
          </div>
        )}

        {effectiveLocationId && treeError && (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-y-2">
              <Text size="small" className="text-ui-fg-error">
                Failed to load shipping zones
              </Text>
              <Text size="small" className="text-ui-fg-muted">
                {(treeFetchError as any)?.message || "Unknown error"}
              </Text>
            </div>
          </div>
        )}

        {effectiveLocationId && !treeLoading && !treeError && tree.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-y-3">
              <TruckFast className="text-ui-fg-muted" />
              <div className="text-center">
                <Text size="small" weight="plus">
                  No shipping zones yet
                </Text>
                <Text size="small" className="text-ui-fg-muted">
                  Create your first root zone to get started
                </Text>
              </div>
              <Button size="small" variant="secondary" onClick={() => setCreateRootOpen(true)}>
                <PlusMini className="mr-1" />
                Create Root Zone
              </Button>
            </div>
          </div>
        )}

        {effectiveLocationId && !treeLoading && !treeError && tree.length > 0 && (
          <div>
            {tree.map((node) => (
              <ZoneNode
                key={node.id}
                node={node}
                depth={0}
                onEdit={(n) => {
                  setEditNode(n)
                  setEditOpen(true)
                }}
                onDelete={handleDelete}
                onAddChild={(parent) => {
                  setCreateParent(parent)
                  setCreateOpen(true)
                }}
              />
            ))}
          </div>
        )}
      </Container>

      <Drawer open={editOpen} onOpenChange={setEditOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Edit Shipping Zone</Drawer.Title>
            <Drawer.Description>
              Update the zone's details and rate
            </Drawer.Description>
          </Drawer.Header>
          {editNode && (
            <ZoneForm
              key={editNode.id}
              mode="edit"
              initialName={editNode.name}
              initialCode={editNode.code}
              initialRate={rateToInput(editNode.rate)}
              initialEnabled={editNode.enabled}
              hasParent={!!editNode.parent_id}
              onSubmit={(data) => {
                updateMutation.mutate({ id: editNode.id, ...data })
              }}
              onCancel={() => setEditOpen(false)}
              isPending={updateMutation.isPending}
            />
          )}
        </Drawer.Content>
      </Drawer>

      <Drawer open={createRootOpen} onOpenChange={setCreateRootOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Create Root Zone</Drawer.Title>
            <Drawer.Description>
              Add a top-level shipping zone for this warehouse
            </Drawer.Description>
          </Drawer.Header>
          <ZoneForm
            key="create-root"
            mode="create"
            initialName=""
            initialCode=""
            initialRate=""
            initialEnabled={true}
            parentName={undefined}
            hasParent={false}
            onSubmit={(data) => {
              createMutation.mutate({ ...data, parent_id: null })
            }}
            onCancel={closeCreate}
            isPending={createMutation.isPending}
          />
        </Drawer.Content>
      </Drawer>

      <Drawer open={createOpen} onOpenChange={setCreateOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Create Child Zone</Drawer.Title>
            <Drawer.Description>
              Add a sub-zone under {createParent?.name}
            </Drawer.Description>
          </Drawer.Header>
          <ZoneForm
            key={createParent?.id ?? "child"}
            mode="create"
            initialName=""
            initialCode=""
            initialRate=""
            initialEnabled={true}
            parentName={createParent?.name}
            hasParent={true}
            onSubmit={(data) => {
              createMutation.mutate({
                ...data,
                parent_id: createParent?.id ?? null,
              })
            }}
            onCancel={closeCreate}
            isPending={createMutation.isPending}
          />
        </Drawer.Content>
      </Drawer>
    </div>
  )
}

const rateToInput = (rate: number | null | undefined): string => {
  if (rate == null) return ""
  return String(rate)
}

const parseRate = (value: string): number | null => {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = parseFloat(trimmed)
  if (isNaN(parsed) || parsed < 0) return null
  return parsed
}

const ZoneForm = ({
  mode,
  initialName,
  initialCode,
  initialRate,
  initialEnabled,
  parentName,
  hasParent,
  onSubmit,
  onCancel,
  isPending,
}: {
  mode: "create" | "edit"
  initialName: string
  initialCode: string
  initialRate: string
  initialEnabled: boolean
  parentName?: string
  hasParent: boolean
  onSubmit: (data: {
    name: string
    code: string
    rate: number | null
    enabled: boolean
  }) => void
  onCancel: () => void
  isPending: boolean
}) => {
  const [name, setName] = useState(initialName)
  const [code, setCode] = useState(initialCode)
  const [rate, setRate] = useState(initialRate)
  const [enabled, setEnabled] = useState(initialEnabled)
  const [triedSubmit, setTriedSubmit] = useState(false)

  const nameError = triedSubmit && !name.trim()
  const codeError = triedSubmit && !code.trim()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setTriedSubmit(true)
    if (!name.trim() || !code.trim()) return
    onSubmit({
      name: name.trim(),
      code: code.trim(),
      rate: parseRate(rate),
      enabled,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">
      <Drawer.Body>
        <div className="flex flex-col gap-y-6">
          {parentName && mode === "create" && (
            <div className="bg-ui-bg-subtle px-3 py-2 rounded-md">
              <Text size="small" className="text-ui-fg-muted">
                Parent: <span className="text-ui-fg-base font-medium">{parentName}</span>
              </Text>
            </div>
          )}

          <div className="flex flex-col gap-y-2">
            <Label size="small" weight="plus">
              Name
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. California"
              aria-invalid={nameError}
            />
            {nameError && (
              <Text size="small" className="text-ui-fg-error">
                Name is required
              </Text>
            )}
          </div>

          <div className="flex flex-col gap-y-2">
            <Label size="small" weight="plus">
              Code
            </Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. US-CA"
              aria-invalid={codeError}
            />
            {codeError && (
              <Text size="small" className="text-ui-fg-error">
                Code is required
              </Text>
            )}
          </div>

          <div className="flex flex-col gap-y-2">
            <Label size="small" weight="plus">
              Rate
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder={
                hasParent ? "Inherit from parent" : "No fixed rate"
              }
            />
            <Text size="small" className="text-ui-fg-muted">
              {hasParent
                ? "Leave empty to inherit rate from parent zone"
                : "Leave empty if this zone has no fixed rate"}
            </Text>
          </div>

          <div className="flex items-center gap-x-2">
            <Switch
              id={`${mode}-enabled`}
              checked={enabled}
              onCheckedChange={setEnabled}
            />
            <Label size="small" weight="plus" htmlFor={`${mode}-enabled`}>
              Zone is active
            </Label>
          </div>
        </div>
      </Drawer.Body>
      <Drawer.Footer>
        <div className="flex items-center gap-x-2">
          <Button size="small" variant="secondary" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="small" type="submit" isLoading={isPending}>
            {mode === "create" ? "Create" : "Save"}
          </Button>
        </div>
      </Drawer.Footer>
    </form>
  )
}

export const config = defineRouteConfig({
  label: "Shipping Zones",
  icon: TruckFast,
})

export default ShippingZonesPage
