import React, { useState } from "react";
import { CloudAlert, CloudDownload, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  GSTR2B_ALLOWED_EXTENSIONS,
  GSTR2B_PORTAL_ENTITY,
  GSTR2B_STATUS_CONFIG,
  GST_FILE_CATEGORIES,
  Gstr2BStatusEnums,
} from "@/config/pages/inbox/gst";
import { gst, monthTitle } from "@/hooks/pages/inbox/use-gst";
import type {
  GstPeriod,
  gstr2BDataStatusType,
  SavedAuthDataResponse,
} from "@/types/pages/inbox/gst";
import { T } from "@/components/inbox/v2/ui";
import PortalAuthCard from "./portal-auth-card";
import { DropZone, StatusItem } from "./sheet-parts";

/**
 * The sheet's GSTR-2B block — production's gstr-2b-section: fetch from the
 * portal or upload the portal's file, never both for one period, and a row
 * per fetch or file showing where it stands.
 */

type Props = {
  company: string;
  gstin: string;
  period: GstPeriod;
  items: gstr2BDataStatusType[];
  savedAuth: SavedAuthDataResponse;
  /** The GSTIN is locked while the portal card is open, as in production. */
  onAuthOpenChange: (open: boolean) => void;
  notify: (message: string, kind?: "success" | "error" | "info") => void;
};

const Gstr2bSection = ({
  company,
  gstin,
  period,
  items,
  savedAuth,
  onAuthOpenChange,
  notify,
}: Props) => {
  const [showAuth, setShowAuth] = useState(false);
  const [fetching, setFetching] = useState(false);

  const hasFetched = items.some((i) => i.entityType === GSTR2B_PORTAL_ENTITY);
  const hasUploaded = items.some(
    (i) => i.entityType === GST_FILE_CATEGORIES.GSTR2B
  );

  const openAuth = (open: boolean) => {
    setShowAuth(open);
    onAuthOpenChange(open);
  };

  const fetch2b = async () => {
    setFetching(true);
    const result = await gst.fetch2b(company, gstin, period);
    setFetching(false);
    if (result === "auth_required") openAuth(true);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className={T.label}>GSTR-2B</span>

      {!showAuth && (
        <>
          <Button
            variant="outline"
            className="w-full text-primary"
            loading={fetching}
            disabled={fetching || hasUploaded}
            onClick={() => void fetch2b()}
          >
            <CloudDownload aria-hidden />
            Fetch GSTR-2B
          </Button>
          <DropZone
            title="Upload GSTR-2B"
            tooltip="Upload the GSTR-2B file exported from the GST portal."
            hint={
              <span className="text-xs font-semibold leading-5 text-secondary-foreground">
                Supports - JSON(Recommended) / .xlsx
              </span>
            }
            extensions={GSTR2B_ALLOWED_EXTENSIONS}
            disabled={fetching || hasFetched}
            onError={(message) => notify(message, "error")}
            onFiles={(files) =>
              files.forEach((file) =>
                gst.upload2b(company, gstin, period, file)
              )
            }
          />
        </>
      )}

      {items.map((item) => {
        const config = GSTR2B_STATUS_CONFIG[item.status];
        const busy = item.status === Gstr2BStatusEnums.IN_PROGRESS;
        const failed = item.status === Gstr2BStatusEnums.EXTRACTION_FAILED;
        const file = item.entityType === GST_FILE_CATEGORIES.GSTR2B;
        return (
          <StatusItem
            key={item.fileStatusUuid}
            icon={failed ? CloudAlert : file ? FileJson : CloudDownload}
            title={file ? (item.fileName ?? "") : monthTitle(item.periodFrom)}
            status={config}
            busy={busy}
            error={failed}
            detail={
              item.errorMessage ??
              (item.status === Gstr2BStatusEnums.EXTRACTION_SUCCESSFUL
                ? `${item.gstr2bLineCount} invoice${item.gstr2bLineCount === 1 ? "" : "s"}`
                : file
                  ? "Reading the file…"
                  : "Fetching from the GST portal…")
            }
            onDelete={
              busy
                ? undefined
                : () => {
                    gst.delete2b(company, item);
                    notify("GSTR-2B data deleted successfully", "success");
                  }
            }
          />
        );
      })}

      {showAuth && (
        <PortalAuthCard
          company={company}
          gstin={gstin}
          savedAuth={savedAuth}
          notify={notify}
          onClose={() => openAuth(false)}
          onVerified={() => void fetch2b()}
        />
      )}
    </div>
  );
};

export default Gstr2bSection;
