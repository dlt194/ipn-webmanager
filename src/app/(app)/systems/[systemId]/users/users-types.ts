export type Row = {
  guid: string;
  name: string;
  fullName: string;
  extension: string;
  assignedPackage: string;
  [key: string]: string;
};

export type UserEditState = {
  name: string;
  fullName: string;
  extension: string;
  assignedPackage: string;
  canIntrude: string;
  cannotBeIntruded: string;
  dndExceptions: string;
  doNotDisturb: string;
  expansionType: string;
  flareEnabled: string;
  flare: string;
  forceAccountCode: string;
  idleLinePreference: string;
  loginCode: string;
  mobilityFeatures: string;
  oneXClient: string;
  oneXTelecommuter: string;
  outgoingCallBar: string;
  outOfHoursUserRights: string;
  userRightsTimeProfile: string;
  password: string;
  phoneType: string;
  priority: string;
  receptionist: string;
  remoteWorker: string;
  sipContact: string;
  sipName: string;
  specificBstType: string;
  twinningType: string;
  umsWebServices: string;
  userRights: string;
  voicemailCode: string;
  voicemailEmail: string;
  voicemailOn: string;
  webCollaboration: string;
  xDirectory: string;
};

export const PACKAGE_MAP: Record<number, string> = {
  1: "Basic User",
  2: "Teleworker User",
  3: "Mobile User",
  4: "Power User",
  5: "Office Worker User",
  6: "Not Used",
  7: "Centralized User",
  8: "Non Licensed User",
};

export const TWINNING_OPTIONS = [
  { value: "0", label: "No Twinning" },
  { value: "1", label: "Internal Twinning" },
  { value: "2", label: "Mobile Twinning" },
] as const;

export const EMPTY_EDIT_STATE: UserEditState = {
  name: "",
  fullName: "",
  extension: "",
  assignedPackage: "",
  canIntrude: "false",
  cannotBeIntruded: "false",
  dndExceptions: "",
  doNotDisturb: "false",
  expansionType: "",
  flareEnabled: "false",
  flare: "false",
  forceAccountCode: "false",
  idleLinePreference: "false",
  loginCode: "",
  mobilityFeatures: "false",
  oneXClient: "false",
  oneXTelecommuter: "false",
  outgoingCallBar: "false",
  outOfHoursUserRights: "",
  userRightsTimeProfile: "",
  password: "",
  phoneType: "",
  priority: "",
  receptionist: "false",
  remoteWorker: "false",
  sipContact: "",
  sipName: "",
  specificBstType: "",
  twinningType: "",
  umsWebServices: "false",
  userRights: "",
  voicemailCode: "",
  voicemailEmail: "",
  voicemailOn: "false",
  webCollaboration: "false",
  xDirectory: "false",
};
