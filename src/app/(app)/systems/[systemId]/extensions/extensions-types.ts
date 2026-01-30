export type ExtensionRow = {
  guid: string;
  id: string;
  extension: string;
  typeInfo: string;
  callerDisplayType: string;
  module: string;
  port: string;
  location: string;
  [key: string]: string;
};

export type ExtensionEditState = {
  guid: string;
  id: string;
  extension: string;
  typeInfo: string;
  callerDisplayType: string;
  module: string;
  port: string;
  location: string;
};

export const EMPTY_EXTENSION_EDIT_STATE: ExtensionEditState = {
  guid: "",
  id: "",
  extension: "",
  typeInfo: "",
  callerDisplayType: "",
  module: "",
  port: "",
  location: "",
};

export const TYPE_INFO_LABELS: Record<string, string> = {
  "0": "Normal",
  "1": "H.323",
  "2": "ADMM (Avaya DECT Mobility)",
  "3": "SIP",
  "4": "D100",
};

export const CALLER_DISPLAY_LABELS: Record<string, string> = {
  "0": "Off",
  "1": "On",
  "2": "UK",
  "3": "UK20",
  "4": "DTMFA",
  "5": "DTMFB",
  "6": "DTMFC",
  "7": "FSKA",
  "8": "FSKB",
  "9": "FSKC",
  "10": "FSKD",
  "11": "DTMFD",
  "12": "DTMFE",
  "13": "DTMFF",
  "14": "DTMFG",
  "15": "DTMFH",
  "16": "DTMFI",
  "17": "DTMFJ",
  "18": "FSKE",
  "19": "FSKF",
  "20": "FSKG",
  "21": "FSKH",
  "22": "FSKI",
  "23": "FSKJ",
};
