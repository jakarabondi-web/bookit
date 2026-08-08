import { Badge } from "@/components/ui/badge";
import { SEGMENT_LABEL, type Segment } from "@/server/services/crm-service";

/** Segment chips carry a word as well as a tone — never colour alone. */
const TONE: Record<Segment, React.ComponentProps<typeof Badge>["tone"]> = {
  CHAMPION: "brand",
  LOYAL: "success",
  BIG_SPENDER: "brand",
  PROMISING: "info",
  NEW: "info",
  AT_RISK: "warning",
  LAPSED: "neutral",
};

export function SegmentBadge({ segment }: { segment: Segment }) {
  return <Badge tone={TONE[segment]}>{SEGMENT_LABEL[segment]}</Badge>;
}
