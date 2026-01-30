export type LicenseRow = {
  guid: string;
  licenseKey: string;
  source: string;
  type: string;
  status: string;
  quantity: string;
  freeInstances: string;
  expiryDate: string;
  mode: string;
  displayName: string;
  [key: string]: string;
};

export const SOURCE_LABELS: Record<string, string> = {
  "0": "Local",
  "1": "WebLM",
  "2": "MappedLocal",
  "3": "MappedRemote",
  "4": "MappedVirtual",
};

export const STATUS_LABELS: Record<string, string> = {
  "0": "INVALID",
  "1": "VALID",
  "2": "EXPIRED",
  "3": "TOKENEXPIRED",
  "4": "UNKNOWN",
  "5": "DORMANT",
  "6": "OBSOLETE",
};

export const MODE_LABELS: Record<string, string> = {
  "0": "UNKNOWN",
  "1": "ADI",
  "2": "PLDS",
  "3": "VIRTUAL",
};
