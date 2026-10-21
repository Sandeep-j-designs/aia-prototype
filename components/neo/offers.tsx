import React from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { useNeo } from "@/hooks/pages/neo/use-neo";
import { dismissOffer, useNeoOffers } from "@/hooks/pages/neo/use-neo-offers";
import NeoMark from "./common/neo-mark";

type Props = { company: string };

/**
 * Neo's offer, in the list where the moment happened: one line, two buttons,
 * at most one at a time. The action opens a preview (the sign-off, the
 * document) — an offer never changes anything by being accepted.
 */
const NeoOffers = ({ company }: Props) => {
  const offers = useNeoOffers(company);
  const neo = useNeo();
  const router = useRouter();
  const offer = offers[0];
  if (!offer) return null;
  const act = () => {
    if (offer.action.prompt) {
      neo.setOpen(true);
      void neo.startRun(offer.action.prompt);
    } else if (offer.action.href) void router.push(offer.action.href);
  };
  return (
    <div
      role="status"
      className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-pi-brand-border bg-pi-brand-tint px-4 py-3"
    >
      <NeoMark className="h-7 w-7" />
      <p className="min-w-0 flex-1 text-[13px] leading-5 text-pi-body">
        <span className="font-medium text-pi-ink">{offer.title}</span>{" "}
        {offer.detail}
      </p>
      <div className="flex flex-none items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => dismissOffer(offer)}>
          Not now
        </Button>
        <Button size="sm" onClick={act} disabled={!!neo.busy}>
          {offer.action.label}
        </Button>
      </div>
    </div>
  );
};

export default NeoOffers;
