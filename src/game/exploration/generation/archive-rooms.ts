import type { ArchiveArchetype } from "./world-definition";
export interface ArchiveTemplate {
  purpose: string; formerUse: string; humanTrace: string; focalPoint: string;
  width: number; height: number; materialRole: "records" | "service" | "restricted";
}
/** Authored purpose and proportion precede layout. No filler-room pool. */
export const ARCHIVE_TEMPLATES: Record<ArchiveArchetype, ArchiveTemplate> = {
  entrance: { purpose: "Orient at the transfer threshold", formerUse: "Receive sealed admissions records", humanTrace: "A delivery trolley waits beneath a cancelled shift plate", focalPoint: "ARCHIVE transfer lintel", width: 5, height: 3, materialRole: "records" },
  indexing: { purpose: "Read the absent index and release the evidence seal", formerUse: "Authorize retrieval and record every access", humanTrace: "A clean rectangle replaces a numbered drawer", focalPoint: "Indexing machine with a blank index band", width: 5, height: 5, materialRole: "records" },
  "compressed-aisle": { purpose: "Compress the route between tall ranks of records", formerUse: "Store active case files on mobile enamel racks", humanTrace: "One pull handle is polished by repeated use", focalPoint: "A narrow amber passage between filing ribs", width: 3, height: 5, materialRole: "records" },
  "filing-gallery": { purpose: "Reveal institutional scale before returning to a human trace", formerUse: "Sort and stage whole years of records", humanTrace: "The last returned folder remains outside its drawer", focalPoint: "Long numbered filing ranks", width: 7, height: 3, materialRole: "records" },
  "drum-chamber": { purpose: "Establish the missing segment as the return landmark", formerUse: "Mechanically reconcile conflicting versions of one record", humanTrace: "An entire segment was removed with deliberate precision", focalPoint: "An open records drum with one missing segment", width: 7, height: 7, materialRole: "records" },
  retrieval: { purpose: "Confront the existing Riot Recording", formerUse: "Listen to and copy authorized evidence", humanTrace: "An interrupted transcription curls from the retrieval desk", focalPoint: "Tape reader beneath an isolated task lamp", width: 5, height: 3, materialRole: "records" },
  "restricted-evidence": { purpose: "Reward return with a finite evidence cache", formerUse: "Hold originals behind an indexed access seal", humanTrace: "Unaltered files remain visible through the service aperture", focalPoint: "Secure evidence cage and sealed drawers", width: 5, height: 5, materialRole: "restricted" },
  "damaged-storage": { purpose: "Confront the established Broken Floor rescue choice", formerUse: "Carry overflowing storage into the service stack", humanTrace: "A retrieval strap is fixed to the surviving floor edge", focalPoint: "Interrupted filing rail above a fractured floor", width: 5, height: 5, materialRole: "service" },
  secret: { purpose: "Reward careful navigation with a recoverable supply cache", formerUse: "Maintain indexing machinery from behind the public walls", humanTrace: "A worker hid medical supplies behind the removed-files shelf", focalPoint: "A maintenance drawer left fractionally open", width: 3, height: 3, materialRole: "service" },
  exit: { purpose: "Prepare for the existing Archive guardian and descend", formerUse: "Transfer sealed records to the Ward", humanTrace: "A final routing slip bears no recipient", focalPoint: "WARD transfer door and descent", width: 5, height: 3, materialRole: "restricted" },
};
