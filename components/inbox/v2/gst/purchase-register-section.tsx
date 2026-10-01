import React, { useState } from "react";
import { format } from "date-fns";
import { Download, FileSpreadsheet, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PR_ALLOWED_EXTENSIONS,
  PR_FILE_STATUS_CONFIG,
  PR_TEMPLATE_FILE_NAME,
  PR_TEMPLATE_HEADERS,
  PrFileStatusEnums,
} from "@/config/pages/inbox/gst";
import { gst } from "@/hooks/pages/inbox/use-gst";
import type {
  GstPeriod,
  MappingConfig,
  PrFileStatus,
} from "@/types/pages/inbox/gst";
import { downloadText, toCsv } from "@/utils/pages/inbox/gst";
import { T } from "@/components/inbox/v2/ui";
import ColumnsMappingModal from "./columns-mapping-modal";
import { DropZone, StatusItem } from "./sheet-parts";

/**
 * The sheet's Purchase Register block — production's purchase-register
 * section: upload, map the file's columns, then the backend extracts it.
 *
 * Production's multi-file "Upload Summary" modal and its duplicate / conflict
 * modals are not built: one PR file per run is enough to show the flow.
 */

type Props = {
  company: string;
  gstin: string;
  period: GstPeriod;
  files: PrFileStatus[];
  mappings: Record<string, MappingConfig>;
  notify: (message: string, kind?: "success" | "error" | "info") => void;
};

const PurchaseRegisterSection = ({
  company,
  gstin,
  period,
  files,
  mappings,
  notify,
}: Props) => {
  const [mappingFile, setMappingFile] = useState<PrFileStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const mappable = files.filter(
    (f) => f.status === PrFileStatusEnums.MAPPING_REQUIRED
  );

  const upload = (list: File[]) => {
    const added = list.map((file) =>
      gst.uploadPr(company, gstin, period, file)
    );
    // As production: an upload goes straight to its mapping.
    if (added[0]) setMappingFile(added[0]);
  };

  const downloadTemplate = () => {
    downloadText(PR_TEMPLATE_FILE_NAME, toCsv([PR_TEMPLATE_HEADERS]));
  };

  return (
    <div className="flex flex-col gap-2">
      <span className={T.label}>Purchase Register</span>

      {files.map((file) => {
        const config = PR_FILE_STATUS_CONFIG[file.status];
        const failed = file.status === PrFileStatusEnums.EXTRACTION_FAILED;
        const busy = file.status === PrFileStatusEnums.IN_PROGRESS;
        const needsMapping = file.status === PrFileStatusEnums.MAPPING_REQUIRED;
        return (
          <StatusItem
            key={file.fileStatusUuid}
            icon={
              failed || file.status === PrFileStatusEnums.EXTRACTED_PARTIALLY
                ? FileWarning
                : FileSpreadsheet
            }
            title={file.fileName}
            status={config}
            busy={busy}
            error={failed}
            detail={
              file.errorPayload?.error ??
              (file.status === PrFileStatusEnums.EXTRACTION_SUCCESSFUL
                ? `Uploaded ${format(new Date(file.creationDate), "dd MMM yyyy, h:mm a")}`
                : needsMapping
                  ? "Map the file's columns to import it."
                  : busy
                    ? "Extracting invoices…"
                    : undefined)
            }
            onClick={needsMapping ? () => setMappingFile(file) : undefined}
            onRetry={failed ? () => gst.retryPr(company, file) : undefined}
            onDelete={
              config.showDeleteButton
                ? () => {
                    gst.deletePr(company, file);
                    notify(`${file.fileName} removed`, "success");
                  }
                : undefined
            }
          />
        );
      })}

      {mappable.length > 0 && (
        <div className="flex justify-end">
          <Button
            size="sm"
            className="h-7"
            onClick={() => setMappingFile(mappable[0])}
          >
            {mappable.length > 1 ? "Map Files" : "Map File"}
          </Button>
        </div>
      )}

      <DropZone
        stacked
        title="Upload Purchase Registers"
        tooltip="Upload Purchase, Journal and/or Debit/Credit Notes Register. The system will take data in first sheet only."
        hint={
          <>
            <span className="text-xs font-semibold leading-5 text-secondary-foreground">
              Supports {PR_ALLOWED_EXTENSIONS.join(", ")}
            </span>
            <span className="text-caption-1 text-secondary-foreground">
              Size: 20 MB Max
            </span>
          </>
        }
        extensions={PR_ALLOWED_EXTENSIONS}
        onError={(message) => notify(message, "error")}
        onFiles={upload}
      />

      <Button
        variant="link-secondary"
        className="mx-auto h-auto gap-2 py-1 no-underline hover:text-primary hover:no-underline"
        onClick={downloadTemplate}
      >
        <Download className="h-3.5 w-3.5" aria-hidden />
        Download PR Template
      </Button>

      {mappingFile && (
        <ColumnsMappingModal
          open
          fileName={mappingFile.fileName}
          initialMapping={mappings[mappingFile.fileUuid]}
          saving={saving}
          onClose={() => setMappingFile(null)}
          onSave={(mapping) => {
            setSaving(true);
            gst.mapAndImport(company, mappingFile, mapping);
            setSaving(false);
            setMappingFile(null);
          }}
        />
      )}
    </div>
  );
};

export default PurchaseRegisterSection;
