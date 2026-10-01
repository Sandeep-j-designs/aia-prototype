import React, { useEffect, useRef, useState } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { AlertCircle, ArrowLeft, ArrowRight, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";
import { gst } from "@/hooks/pages/inbox/use-gst";
import type { SavedAuthDataResponse } from "@/types/pages/inbox/gst";
import { Field, T } from "@/components/inbox/v2/ui";

/**
 * Portal Authentication — production's portal-auth-card: username, then the
 * OTP sent to the GSTIN's mobile, or the "API access is disabled" card when
 * the portal refuses.
 *
 * Simulated: any six digits verify; the username "noapi" stands in for a
 * GSTIN whose API access is switched off on the portal.
 */

type Props = {
  company: string;
  gstin: string;
  savedAuth: SavedAuthDataResponse;
  onClose: () => void;
  /** Verified: fetch the 2B. */
  onVerified: () => void;
  notify: (message: string, kind?: "success" | "error" | "info") => void;
};

const API_DISABLED_TEXT =
  "Enable API access on the GST portal, then return here and retry.";

const PortalAuthCard = ({
  company,
  gstin,
  savedAuth,
  onClose,
  onVerified,
  notify,
}: Props) => {
  const [screen, setScreen] = useState<"details" | "otp" | "error">("details");
  const [username, setUsername] = useState(savedAuth.username);
  const [saveDetails, setSaveDetails] = useState(savedAuth.isSaved);
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (screen === "otp") otpRef.current?.focus();
  }, [screen]);

  const requestOtp = async () => {
    setSending(true);
    const ok = await gst.requestOtp(company, username, saveDetails);
    setSending(false);
    if (!ok) return setScreen("error");
    notify("OTP sent successfully.", "success");
    setOtp("");
    setOtpError(null);
    setScreen("otp");
  };

  const verify = async () => {
    setVerifying(true);
    const ok = await gst.verifyOtp(company, otp);
    setVerifying(false);
    if (!ok) return setOtpError("Failed to Generate OTP. Please try again.");
    notify("OTP verified successfully.", "success");
    onVerified();
    onClose();
  };

  const back = (
    <Button
      variant="link-secondary"
      onClick={() => setScreen("details")}
      className="mx-auto h-auto gap-2 py-1 no-underline hover:text-primary hover:no-underline"
    >
      <ArrowLeft aria-hidden />
      Back to Details
    </Button>
  );

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-gray bg-background">
      <div className="flex items-center justify-between border-b border-neutral-gray bg-section py-1 pl-4 pr-1">
        <span className="text-sm font-medium text-primary">
          Portal Authentication
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close Portal Authentication"
          className="text-secondary-foreground"
          onClick={onClose}
        >
          <X />
        </Button>
      </div>

      <div className="p-4">
        {screen === "details" ? (
          <form
            className="flex flex-col gap-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (username.trim()) void requestOtp();
            }}
          >
            <Field label="Username" htmlFor="gst-portal-username">
              <Input
                id="gst-portal-username"
                placeholder="Username"
                value={username}
                autoComplete="username"
                onChange={(e) => setUsername(e.target.value)}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={saveDetails}
                onCheckedChange={(checked) => setSaveDetails(checked === true)}
              />
              Save details for future use
            </label>
            <Button
              type="submit"
              className="w-full"
              loading={sending}
              disabled={!username.trim() || sending}
            >
              Request OTP
              <ArrowRight aria-hidden />
            </Button>
          </form>
        ) : screen === "otp" ? (
          <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-3 text-center">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-accent text-primary">
              <Lock className="h-[18px] w-[18px]" aria-hidden />
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground">
                Enter OTP
              </span>
              <span className={T.sub}>Sent to mobile linked to</span>
              <span className="text-xs font-medium text-foreground">
                {gstin}
              </span>
            </div>
            <InputOTP
              ref={otpRef}
              maxLength={6}
              value={otp}
              pattern={REGEXP_ONLY_DIGITS}
              onChange={(next) => {
                setOtp(next);
                setOtpError(null);
              }}
              onComplete={() => undefined}
              aria-label="One-time password"
            >
              <InputOTPGroup className="gap-2">
                {Array.from({ length: 6 }, (_, i) => (
                  <InputOTPSlot
                    key={i}
                    index={i}
                    className="h-10 w-9 rounded-md border border-input text-base font-semibold text-primary first:rounded-md first:border-l last:rounded-md"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
            {otpError ? (
              <p className="text-xs text-destructive-foreground">{otpError}</p>
            ) : null}
            <p className={cn(T.sub, "text-[10px] leading-4")}>
              Didn&apos;t receive code?
              <Button
                variant="link"
                className="h-auto px-1 py-0 text-[10px] leading-4"
                onClick={() => void requestOtp()}
                disabled={sending}
              >
                Resend
              </Button>
            </p>
            <Button
              className="w-full"
              loading={verifying}
              disabled={otp.length !== 6 || verifying}
              onClick={() => void verify()}
            >
              Verify &amp; Fetch Data
            </Button>
            {back}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive-foreground/25 bg-destructive p-3"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 flex-none text-destructive-foreground"
                aria-hidden
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-destructive-foreground">
                  GST API access is disabled
                </span>
                <span className="text-xs leading-5 text-destructive-foreground">
                  {API_DISABLED_TEXT}
                </span>
              </div>
            </div>
            <Button asChild className="w-full">
              <a
                href="https://www.gst.gov.in"
                target="_blank"
                rel="noopener noreferrer"
              >
                Go to GST Portal
              </a>
            </Button>
            {back}
          </div>
        )}
      </div>
    </div>
  );
};

export default PortalAuthCard;
