import React from "react";
import { useInventory } from "@/hooks/pages/inbox/use-inventory";
import CreateItem from "./create-item";
import ItemsList from "./items-list";

export type InventoryView = {
  /** "new" for Create Stock Item, an item's id for Edit. Absent: the list. */
  item?: string;
};

type Props = {
  view: InventoryView;
  company: string;
  /** Move within Inventory. Every screen is a URL, so Back works. */
  onNavigate: (view: InventoryView) => void;
  notify: (
    message: string,
    kind?: "success" | "error" | "warning" | "info"
  ) => void;
  /** Real in the app, not built here. */
  onUnbuilt: (what: string) => void;
};

/**
 * Inventory Masters: the Items list and the Create / Edit Stock Item form.
 *
 * Production: pages/inventory-masters/index.tsx and
 * pages/inventory-masters/items/{create,update/[id]}.tsx. Here they are views
 * of one module, picked by the URL (?module=INV[&item=new|<id>]).
 */
const Inventory = ({ view, company, onNavigate, notify }: Props) => {
  const { rows } = useInventory(company);

  if (view.item)
    return (
      <CreateItem
        company={company}
        itemUuid={view.item === "new" ? undefined : view.item}
        onBack={() => onNavigate({})}
        notify={notify}
      />
    );

  return (
    <ItemsList
      company={company}
      rows={rows}
      onCreate={() => onNavigate({ item: "new" })}
      onEdit={(itemUuid) => onNavigate({ item: itemUuid })}
      notify={notify}
    />
  );
};

export default Inventory;
