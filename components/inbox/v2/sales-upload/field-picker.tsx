import React, { useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Info,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Typography from "@/components/common/typography";
import { Tooltip } from "@/components/common/tooltip";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AR_IMPORT_MAX_MAPPING_ENTRIES } from "@/config/pages/inbox/sales-upload";
import { cn } from "@/lib/utils";
import type {
  FieldMappingsPayload,
  MappingConfigPayload,
  MappingEntryCollection,
  MappingFieldGroupSchema,
  MappingFieldSelector,
} from "@/types/pages/inbox/sales-upload";
import {
  buildColumnMappingOptions,
  filterMappingFieldGroups,
  isRequiredNow,
  schemaFieldLabel,
  type MappingFieldOption,
  type VisibleMappingFieldGroup,
} from "@/utils/pages/inbox/sales-upload-mapping";
import { T } from "../ui";

/**
 * The AIA field a spreadsheet column feeds — production's
 * ColumnMappingDropdown (column-mapping-dropdown/index, field-menu,
 * field-option, entry-submenu), ported as it is: a cmdk list in a popover,
 * each group a semibold heading over its fields, Item and Ledger listing
 * their entries — Item 1, Item 2… — each opening to the side, with "Add
 * Item" up to ten and a bin on an added entry nothing uses yet. A field
 * another column feeds carries an ⓘ whose tooltip names the column, and is
 * disabled unless it sums.
 *
 * PROTOTYPE: production's ComboBox shell is inlined here, since the
 * prototype's ComboBox is the Bloocks port without `renderOptions`. The
 * invoice's optional groups follow under "Additional Details", each an
 * entry-style row opening to the side; one the company has switched off
 * says Off and can still be picked from — the page switches it on.
 */

type Props = {
  sourceColumn: string;
  mappingDraft: MappingConfigPayload;
  fieldGroups: MappingFieldGroupSchema[];
  selectedField?: MappingFieldSelector;
  disabled?: boolean;
  onChange: (field: MappingFieldSelector | "") => void;
  onAddEntry: (collection: MappingEntryCollection) => void;
  onRemoveEntry: (collection: MappingEntryCollection, id: string) => void;
};

/** PROTOTYPE: the condition a field is mandatory under, if any. */
type NoteFor = (option: MappingFieldOption) => string | undefined;

/* --------------------------------------------------------- field-option */

const MappingFieldOptionItem = ({
  option,
  selected,
  fieldMappings,
  noteFor,
  onSelect,
  onPointerEnter,
}: {
  option: MappingFieldOption;
  selected: boolean;
  fieldMappings: FieldMappingsPayload;
  noteFor: NoteFor;
  onSelect: (option: MappingFieldOption) => void;
  onPointerEnter?: () => void;
}) => {
  const mappedColumnNames = option.config?.sourceColumns.join(", ") ?? "";
  // PROTOTYPE: a conditional field is starred once its trigger is mapped.
  const required =
    option.requiredAlternative ||
    (typeof option.selector === "string" &&
      isRequiredNow(option.field, fieldMappings));
  const item = (
    <CommandItem
      onPointerEnter={onPointerEnter}
      value={option.value}
      keywords={[option.field.label]}
      disabled={option.disabled}
      onSelect={() => onSelect(option)}
      className="min-w-0 flex-1 cursor-pointer gap-1 px-3 py-2 text-xs data-[disabled=true]:opacity-50"
    >
      <Typography variant="sm" className="leading-[inherit]">
        {option.field.label}
      </Typography>
      {required ? (
        <Typography
          variant="sm"
          aria-hidden="true"
          className="leading-[inherit] text-danger-action"
        >
          *
        </Typography>
      ) : null}
      {selected ? (
        <Check aria-hidden="true" className="ml-auto h-3 w-3 shrink-0" />
      ) : !option.disabled && option.config?.sourceColumns.length ? (
        <Info
          aria-hidden="true"
          className="ml-auto h-3 w-3 shrink-0 text-secondary-foreground"
        />
      ) : option.field.off ? (
        // PROTOTYPE: switched off on its own, in a group that is on.
        <Typography
          variant="sm"
          className="ml-auto leading-[inherit] text-secondary-foreground"
        >
          Off
        </Typography>
      ) : null}
    </CommandItem>
  );
  const note = noteFor(option);
  if (!option.config?.sourceColumns.length && note)
    // PROTOTYPE: the form's note on a conditional field, before and after
    // its trigger is mapped — the star alone doesn't say why.
    return (
      <Tooltip message={note} side="right" align="start">
        <div className="flex items-center">{item}</div>
      </Tooltip>
    );
  return option.config?.sourceColumns.length ? (
    <Tooltip
      message={`This field is mapped to ${mappedColumnNames}.${option.disabled ? " Remove the existing mapping to reselect." : ""}${note ? ` ${note}` : ""}`}
      side="right"
      align="start"
    >
      <div className="flex items-center">
        {item}
        {option.disabled ? (
          <Button
            variant="ghost"
            type="button"
            aria-label={`${option.field.label} mapped to ${mappedColumnNames}`}
            onClick={(event) => event.stopPropagation()}
            className="h-auto p-2 text-secondary-foreground hover:bg-transparent hover:text-secondary-foreground focus-visible:ring-2 focus-visible:ring-primary [&_svg]:size-3"
          >
            <Info aria-hidden="true" className="h-3 w-3" />
          </Button>
        ) : null}
      </div>
    </Tooltip>
  ) : (
    item
  );
};

/* -------------------------------------------------------- entry-submenu */

const MappingEntrySubmenu = ({
  label,
  options,
  visibleOptions,
  status,
  statusTone,
  selectedValue,
  fieldMappingsFor,
  noteFor,
  onSelect,
  onDelete,
  open,
  onOpenChange,
}: {
  label: string;
  options: MappingFieldOption[];
  visibleOptions: MappingFieldOption[];
  /** PROTOTYPE: an optional group's row says Off instead of a count. */
  status?: string;
  /** PROTOTYPE: red while the group still owes a conditional field. */
  statusTone?: "danger";
  selectedValue?: string;
  fieldMappingsFor: (option: MappingFieldOption) => FieldMappingsPayload;
  noteFor: NoteFor;
  onSelect: (option: MappingFieldOption) => void;
  onDelete?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  // Hover keeps search focused; click/keyboard transfers focus to the submenu.
  const openedByPointer = useRef(false);
  const commandRef = useRef<HTMLDivElement>(null);
  const openSubmenu = () => {
    openedByPointer.current = false;
    onOpenChange(true);
    commandRef.current?.focus();
  };
  const initialActiveOption =
    visibleOptions.find(
      (option) => option.value === selectedValue && !option.disabled
    ) ?? visibleOptions.find((option) => !option.disabled);
  let mappedFieldCount = 0;
  for (const option of options) {
    if (option.config?.sourceColumns.length) mappedFieldCount++;
  }
  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={onOpenChange} modal={false}>
        <PopoverTrigger asChild>
          <CommandItem
            value={label}
            onPointerEnter={(event) => {
              if (event.pointerType === "touch") return;
              openedByPointer.current = true;
              onOpenChange(true);
            }}
            onClick={(event) => {
              event.preventDefault();
              openSubmenu();
            }}
            onSelect={openSubmenu}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                event.preventDefault();
                event.stopPropagation();
                openSubmenu();
              }
            }}
            className="min-w-0 flex-1 cursor-pointer px-3 py-2 text-xs"
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            <Typography variant="sm" className="leading-[inherit]">
              {label}
            </Typography>
            <Typography
              variant="sm"
              className={cn(
                "ml-auto leading-[inherit] text-secondary-foreground",
                statusTone === "danger" && "text-danger-action"
              )}
            >
              {status ??
                (mappedFieldCount
                  ? `${mappedFieldCount}/${options.length} Mapped`
                  : "Unused")}
            </Typography>
            <ChevronRight className="h-3 w-3 shrink-0" />
          </CommandItem>
        </PopoverTrigger>
        <PopoverContent
          onOpenAutoFocus={(event) => {
            if (openedByPointer.current) event.preventDefault();
          }}
          onCloseAutoFocus={(event) => {
            if (openedByPointer.current) event.preventDefault();
          }}
          aria-label={`${label} fields`}
          side="right"
          align="start"
          sideOffset={4}
          className="w-44 border-panel-border p-0 shadow-floating-panel"
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              onOpenChange(false);
            }
          }}
        >
          <Command
            ref={commandRef}
            label={`${label} fields`}
            defaultValue={initialActiveOption?.value}
            tabIndex={0}
            className="outline-none [&_[cmdk-item]]:py-1 [&_[cmdk-item]]:leading-[22px]"
          >
            <CommandList aria-label={`${label} fields`}>
              <CommandEmpty>No fields found.</CommandEmpty>
              <CommandGroup className="p-0">
                {visibleOptions.map((option) => (
                  <MappingFieldOptionItem
                    key={option.value}
                    option={option}
                    selected={selectedValue === option.value}
                    fieldMappings={fieldMappingsFor(option)}
                    noteFor={noteFor}
                    onSelect={(field) => {
                      onOpenChange(false);
                      onSelect(field);
                    }}
                  />
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {onDelete ? (
        <Button
          variant="ghost"
          type="button"
          aria-label={`Delete ${label}`}
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          onKeyDown={(event) => event.stopPropagation()}
          className="h-auto bg-danger-action/10 p-1.5 text-danger-action hover:bg-danger-action/20 hover:text-danger-action focus-visible:ring-2 focus-visible:ring-primary [&_svg]:size-3"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      ) : null}
    </div>
  );
};

/* ----------------------------------------------------------- field-menu */

const MappingFieldMenu = ({
  groups,
  allGroups,
  mappingDraft,
  noteFor,
  selectedValue,
  onSelect,
  disabled,
}: {
  groups: VisibleMappingFieldGroup[];
  allGroups: { id: string; options: MappingFieldOption[] }[];
  mappingDraft: MappingConfigPayload;
  noteFor: NoteFor;
  selectedValue?: string;
  onSelect: (option: MappingFieldOption) => void;
  disabled?: boolean;
}) => {
  const [openEntryId, setOpenEntryId] = useState<string | null>(null);
  const header = groups.filter((g) => !g.additional);
  const additional = groups.filter((g) => g.additional);
  // Header and optional-group fields read the flat mappings; an entry's own.
  const fieldMappingsFor = (option: MappingFieldOption) =>
    typeof option.selector === "string"
      ? mappingDraft.fieldMappings
      : (mappingDraft[option.selector.collection]?.find(
          (e) =>
            typeof option.selector !== "string" &&
            e.id === option.selector.entryId
        )?.fields ?? {});
  const submenu = (
    id: string,
    label: string,
    options: MappingFieldOption[],
    visibleOptions: MappingFieldOption[],
    extra: {
      status?: string;
      statusTone?: "danger";
      onDelete?: () => void;
    } = {}
  ) => (
    <MappingEntrySubmenu
      key={id}
      open={openEntryId === id}
      onOpenChange={(open) => setOpenEntryId(open ? id : null)}
      label={label}
      options={options}
      visibleOptions={visibleOptions}
      selectedValue={selectedValue}
      fieldMappingsFor={fieldMappingsFor}
      noteFor={noteFor}
      onSelect={onSelect}
      {...extra}
    />
  );
  const heading = (label: string, action?: React.ReactNode) => (
    <div
      onPointerEnter={() => setOpenEntryId(null)}
      className="flex items-center justify-between py-1 text-xs font-semibold text-foreground"
    >
      <Typography variant="sm" weight="semibold">
        {label}
      </Typography>
      {action}
    </div>
  );
  return (
    <>
      {header.map((group) => (
        <div
          key={group.id}
          className="border-b border-neutral-gray px-3 py-1 last:border-0"
        >
          {heading(
            group.label,
            group.entries && group.collection ? (
              <Button
                variant="ghost"
                type="button"
                disabled={disabled || group.isAtEntryLimit}
                title={
                  group.isAtEntryLimit
                    ? `Maximum ${AR_IMPORT_MAX_MAPPING_ENTRIES} ${group.collection}`
                    : undefined
                }
                onClick={group.onAdd}
                onKeyDown={(event) => event.stopPropagation()}
                className="h-auto gap-1 p-0 text-primary hover:bg-transparent hover:text-primary [&_svg]:size-3"
              >
                <Plus className="h-3 w-3" />
                <Typography variant="sm" weight="medium">
                  Add {group.label}
                </Typography>
              </Button>
            ) : null
          )}
          <CommandGroup className="p-0">
            {group.options.map((option) => (
              <MappingFieldOptionItem
                onPointerEnter={() => setOpenEntryId(null)}
                key={option.value}
                option={option}
                selected={option.value === selectedValue}
                fieldMappings={mappingDraft.fieldMappings}
                noteFor={noteFor}
                onSelect={onSelect}
              />
            ))}
            {group.entries?.map((entry) =>
              submenu(
                entry.id,
                entry.label,
                entry.options,
                entry.visibleOptions,
                {
                  onDelete: entry.onDelete,
                }
              )
            )}
          </CommandGroup>
        </div>
      ))}
      {additional.length > 0 && (
        <div className="border-b border-neutral-gray px-3 py-1 last:border-0">
          {heading("Additional Details")}
          <CommandGroup className="p-0">
            {additional.map((group) => {
              const full =
                allGroups.find((g) => g.id === group.id)?.options ??
                group.options;
              // Mandatory now that their trigger is mapped, and not yet fed.
              const owed = full.filter(
                (o) =>
                  isRequiredNow(o.field, mappingDraft.fieldMappings) &&
                  !o.config?.sourceColumns.length
              ).length;
              return submenu(group.id, group.label, full, group.options, {
                status: group.off
                  ? "Off"
                  : owed
                    ? `${owed} Required`
                    : undefined,
                statusTone: !group.off && owed ? "danger" : undefined,
              });
            })}
          </CommandGroup>
        </div>
      )}
    </>
  );
};

/* -------------------------------------------------------------- picker */

const FieldPicker = ({
  sourceColumn,
  mappingDraft,
  fieldGroups,
  selectedField,
  disabled,
  onChange,
  onAddEntry,
  onRemoveEntry,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { options, groups, selectedValue } = buildColumnMappingOptions({
    mappingDraft,
    fieldGroups,
    sourceColumn,
    selectedField,
    onAddEntry,
    onRemoveEntry,
    disabled,
  });
  const visible = filterMappingFieldGroups(groups, search);
  const noteFor: NoteFor = ({ field }) =>
    field.requiredWhen &&
    `Required once ${schemaFieldLabel(fieldGroups, field.requiredWhen)} is mapped.`;
  const current = options.find((o) => o.value === selectedValue);

  return (
    <Popover
      open={open}
      modal={false}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <div className="relative flex min-w-0 flex-1">
        <PopoverTrigger asChild disabled={disabled}>
          <Button
            variant="outline"
            className={cn(
              // The ComboBox's field trigger, so the column reads the same.
              "h-8 min-w-0 flex-1 justify-between gap-2 border-input bg-background px-3 font-normal text-foreground hover:border-input-hover hover:bg-background disabled:pointer-events-auto disabled:cursor-not-allowed",
              "data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-ring/30",
              T.cell
            )}
          >
            <span
              className={cn(
                "min-w-0 truncate",
                // Room for the clear button, which sits before the chevron.
                current && "mr-6",
                !current && "text-secondary-foreground"
              )}
            >
              {current?.label ?? "Select..."}
            </span>
            <ChevronDown
              className={cn(
                "size-4 flex-none text-secondary-foreground transition-transform duration-150",
                open && "-rotate-180"
              )}
              aria-hidden
            />
          </Button>
        </PopoverTrigger>
        {current && !disabled && (
          // ComboBox's clear: the column goes back to unmapped.
          <button
            type="button"
            aria-label="Clear selection"
            onClick={() => onChange("")}
            className="absolute right-8 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-secondary-foreground hover:text-primary"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
      {/* Production's ComboBox content with the dropdown's wrapperClassName. */}
      <PopoverContent
        align="start"
        className="w-80 min-w-fit rounded-md border-panel-border p-0 px-1 shadow-floating-panel"
      >
        <Command
          shouldFilter={false}
          onKeyDown={(event) => {
            if (event.key !== "ArrowRight") return;
            const submenu = event.currentTarget.querySelector<HTMLElement>(
              '[cmdk-item][data-selected="true"][aria-haspopup="dialog"]'
            );
            if (submenu) {
              event.preventDefault();
              submenu.click();
            }
          }}
        >
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search..."
            className="font-normal text-secondary-foreground placeholder:text-secondary-foreground"
            wrapperClassName="!border-neutral-gray"
          />
          <CommandList>
            {!visible.length && (
              <CommandEmpty className="text-secondary-foreground">
                No fields found.
              </CommandEmpty>
            )}
            <MappingFieldMenu
              groups={visible}
              allGroups={groups}
              mappingDraft={mappingDraft}
              noteFor={noteFor}
              selectedValue={selectedValue}
              onSelect={(option) => {
                onChange(option.selector);
                setOpen(false);
                setSearch("");
              }}
              disabled={disabled}
            />
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default FieldPicker;
