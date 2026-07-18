import { MedusaService } from "@medusajs/framework/utils"
import ShippingZoneNode from "./models/shipping-zone-node"

type FlatNode = {
  id: string
  name: string
  code: string
  enabled: boolean
  rate: number | null
  stock_location_id: string
  parent_id: string | null
}

type TreeNode = FlatNode & {
  children: TreeNode[]
}

const normalize = (s?: string | null) => s?.toLowerCase().trim() ?? ""

class ShippingZoneModuleService extends MedusaService({
  ShippingZoneNode,
}) {
  buildTree(flat: FlatNode[]): TreeNode[] {
    const map = new Map<string, TreeNode>()
    const roots: TreeNode[] = []

    for (const node of flat) {
      map.set(node.id, { ...node, children: [] })
    }

    for (const node of flat) {
      const treeNode = map.get(node.id)!
      if (node.parent_id && map.has(node.parent_id)) {
        map.get(node.parent_id)!.children.push(treeNode)
      } else {
        roots.push(treeNode)
      }
    }

    return roots
  }

  async getTreeForStockLocation(stockLocationId: string): Promise<TreeNode[]> {
    const flat = await this.listShippingZoneNodes({
      stock_location_id: stockLocationId,
    })
    return this.buildTree(flat as unknown as FlatNode[])
  }

  // The cheapest rate defined anywhere in a subtree — used when an intermediate
  // node (e.g. a city) is matched but carries no rate of its own, so an order that
  // can't be resolved to a specific leaf still gets charged rather than shipped free.
  private minDescendantRate(node: TreeNode): number | null {
    let min: number | null = null
    const visit = (n: TreeNode) => {
      if (n.enabled && n.rate !== null) {
        min = min === null ? n.rate : Math.min(min, n.rate)
      }
      n.children.forEach(visit)
    }
    node.children.forEach(visit)
    return min
  }

  // Resolve a concrete rate for a matched node: its own rate, else the cheapest
  // rate below it, else the nearest ancestor with a rate.
  private resolveNodeRate(node: TreeNode, byId: Map<string, TreeNode>): number | null {
    if (node.rate !== null) {
      return node.rate
    }
    const descendant = this.minDescendantRate(node)
    if (descendant !== null) {
      return descendant
    }
    let current: TreeNode | null = node.parent_id ? byId.get(node.parent_id) ?? null : null
    while (current) {
      if (current.rate !== null) {
        return current.rate
      }
      current = current.parent_id ? byId.get(current.parent_id) ?? null : null
    }
    return null
  }

  async resolveRate(
    address: { province?: string | null; city?: string | null; area?: string | null },
    stockLocationId: string,
    fallbackRate: number
  ): Promise<number> {
    const flat = (await this.listShippingZoneNodes({
      stock_location_id: stockLocationId,
      enabled: true,
    })) as unknown as FlatNode[]

    if (flat.length === 0) {
      return fallbackRate
    }

    const tree = this.buildTree(flat)
    const byId = new Map<string, TreeNode>()
    const indexTree = (nodes: TreeNode[]) => {
      for (const n of nodes) {
        byId.set(n.id, n)
        indexTree(n.children)
      }
    }
    indexTree(tree)

    // The root node represents the country, which is already implied by the stock
    // location, so address matching (province → city → area) starts at its children.
    const singleRoot = tree.length === 1
    let matched: TreeNode | null = singleRoot ? tree[0] : null
    let currentLevel = singleRoot ? tree[0].children : tree

    for (const value of [address.province, address.city, address.area]) {
      const needle = normalize(value)
      if (!needle) {
        break
      }
      const child = currentLevel.find((n) => n.enabled && normalize(n.name) === needle)
      if (!child) {
        break
      }
      matched = child
      currentLevel = child.children
    }

    if (!matched) {
      return fallbackRate
    }

    const rate = this.resolveNodeRate(matched, byId)
    return rate ?? fallbackRate
  }
}

export default ShippingZoneModuleService
