import { useContext } from "react";
import { NeoContext } from "@/components/neo/provider";

/** Neo's runtime, from anywhere under NeoProvider. */
export const useNeo = () => {
  const neo = useContext(NeoContext);
  if (!neo) throw new Error("useNeo must be used inside NeoProvider");
  return neo;
};

/** The same, or null outside the provider — for chrome that may render bare. */
export const useOptionalNeo = () => useContext(NeoContext);
