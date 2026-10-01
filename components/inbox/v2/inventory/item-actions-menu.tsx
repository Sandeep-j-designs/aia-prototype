import React from "react";
import { Edit2, Ellipsis, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isSyncInProgress } from "@/hooks/pages/inbox/use-inventory";

type Props = {
  name: string;
  syncStatus: string;
  onEdit: () => void;
  onDelete: () => void;
  notify: (message: string, kind?: "warning") => void;
};

/**
 * production's components/inventory-masters/item-actions-menu.tsx: Edit and
 * Delete, each refusing with a warning while the item's sync state forbids it.
 */
const ItemActionsMenu = ({
  name,
  syncStatus,
  onEdit,
  onDelete,
  notify,
}: Props) => {
  const isSynced = syncStatus === "synced";
  const isInProgress = isSyncInProgress(syncStatus);

  const handleEdit = () => {
    if (isInProgress) {
      notify("Cannot edit an item while sync is in progress", "warning");
      return;
    }
    onEdit();
  };

  const handleDelete = () => {
    if (isSynced || isInProgress) {
      notify(
        isSynced
          ? "Cannot delete a synced item"
          : "Cannot delete an item while sync is in progress",
        "warning"
      );
      return;
    }
    onDelete();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for ${name}`}
          className="w-7 text-secondary-foreground"
        >
          <Ellipsis className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={handleEdit}>
            <Edit2 className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={handleDelete}
            className="text-destructive-foreground focus:text-destructive-foreground"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ItemActionsMenu;
