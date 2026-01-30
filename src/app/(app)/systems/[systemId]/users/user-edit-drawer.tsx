"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import * as React from "react";
import { TWINNING_OPTIONS, type UserEditState } from "./users-types";

export function UserEditDrawer(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editSaving: boolean;
  editError: string | null;
  title?: string;
  description?: string;
  submitLabel?: string;
  editState: UserEditState;
  setEditState: React.Dispatch<React.SetStateAction<UserEditState>>;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  confirmLoginCode: string;
  setConfirmLoginCode: (value: string) => void;
  confirmVoicemailCode: string;
  setConfirmVoicemailCode: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  showLoginCode: boolean;
  setShowLoginCode: (value: boolean) => void;
  showVoicemailCode: boolean;
  setShowVoicemailCode: (value: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  packageOptions: { value: string; label: string }[];
  applyPackageRules: (nextPackage: string, prev: UserEditState) => UserEditState;
  isFeatureDisabled: (packageValue: string, key: string) => boolean;
}) {
  const {
    editState,
    editSaving,
    editError,
    confirmPassword,
    confirmLoginCode,
    confirmVoicemailCode,
    showPassword,
    showLoginCode,
    showVoicemailCode,
  } = props;

  function isChecked(value: string) {
    return value === "true";
  }

  function booleanLabel(value: string) {
    return isChecked(value) ? "Yes" : "No";
  }

  function renderBooleanField(
    id: string,
    label: string,
    value: string,
    onChange: (nextValue: "true" | "false") => void,
    disabled = false,
  ) {
    return (
      <div className="flex items-center justify-between gap-4 rounded border px-3 py-2">
        <div className="space-y-1">
          <Label htmlFor={id}>{label}</Label>
          <p className="text-xs text-muted-foreground">{booleanLabel(value)}</p>
        </div>
        <input
          id={id}
          type="checkbox"
          checked={isChecked(value)}
          onChange={(e) => onChange(e.target.checked ? "true" : "false")}
          disabled={editSaving || disabled}
          className="size-4 accent-primary"
        />
      </div>
    );
  }

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md flex h-full flex-col">
        <SheetHeader>
          <SheetTitle>{props.title ?? "Edit user"}</SheetTitle>
          <SheetDescription>
            {props.description ?? "Update user details for this system."}
          </SheetDescription>
        </SheetHeader>

        {editError ? (
          <div className="mx-4 mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {editError}
          </div>
        ) : null}

        <form
          onSubmit={props.onSubmit}
          className="flex flex-1 min-h-0 flex-col"
        >
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6 pt-2">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="edit-fullname">Full Name</Label>
                <Input
                  id="edit-fullname"
                  value={editState.fullName}
                  onChange={(e) =>
                    props.setEditState((prev) => ({
                      ...prev,
                      fullName: e.target.value,
                    }))
                  }
                  autoComplete="off"
                  disabled={editSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-extension">Extension</Label>
                <Input
                  id="edit-extension"
                  value={editState.extension}
                  onChange={(e) =>
                    props.setEditState((prev) => ({
                      ...prev,
                      extension: e.target.value,
                    }))
                  }
                  autoComplete="off"
                  disabled={editSaving}
                />
              </div>

              <div className="space-y-2">
                <Label>Profile</Label>
                <Select
                  value={editState.assignedPackage}
                  onValueChange={(value) =>
                    props.setEditState((prev) =>
                      props.applyPackageRules(value, prev),
                    )
                  }
                  disabled={editSaving}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {props.packageOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Profile Features</Label>
                <div className="space-y-2">
                  {renderBooleanField(
                    "edit-receptionist",
                    "Receptionist",
                    editState.receptionist,
                    (nextValue) =>
                      props.setEditState((prev) => ({
                        ...prev,
                        receptionist: nextValue,
                      })),
                    props.isFeatureDisabled(
                      editState.assignedPackage,
                      "receptionist",
                    ),
                  )}

                  {renderBooleanField(
                    "edit-softphone",
                    "SoftPhone",
                    editState.flareEnabled,
                    (nextValue) =>
                      props.setEditState((prev) => ({
                        ...prev,
                        flareEnabled: nextValue,
                      })),
                    props.isFeatureDisabled(
                      editState.assignedPackage,
                      "flareEnabled",
                    ),
                  )}

                  {renderBooleanField(
                    "edit-onex-portal",
                    "One-X Portal Services",
                    editState.oneXClient,
                    (nextValue) =>
                      props.setEditState((prev) => ({
                        ...prev,
                        oneXClient: nextValue,
                      })),
                    props.isFeatureDisabled(editState.assignedPackage, "oneXClient"),
                  )}

                  {renderBooleanField(
                    "edit-onex-telecommuter",
                    "One-X Telecommuter",
                    editState.oneXTelecommuter,
                    (nextValue) =>
                      props.setEditState((prev) => ({
                        ...prev,
                        oneXTelecommuter: nextValue,
                      })),
                    props.isFeatureDisabled(
                      editState.assignedPackage,
                      "oneXTelecommuter",
                    ),
                  )}

                  {renderBooleanField(
                    "edit-remote-worker",
                    "Remote Worker",
                    editState.remoteWorker,
                    (nextValue) =>
                      props.setEditState((prev) => ({
                        ...prev,
                        remoteWorker: nextValue,
                      })),
                    props.isFeatureDisabled(
                      editState.assignedPackage,
                      "remoteWorker",
                    ),
                  )}

                  {renderBooleanField(
                    "edit-voip-client",
                    "Desktop/VoIP Client",
                    editState.flare,
                    (nextValue) =>
                      props.setEditState((prev) => ({
                        ...prev,
                        flare: nextValue,
                      })),
                    props.isFeatureDisabled(editState.assignedPackage, "flare"),
                  )}

                  {renderBooleanField(
                    "edit-mobile-voip-client",
                    "Mobile VoIP Client",
                    editState.mobilityFeatures,
                    (nextValue) =>
                      props.setEditState((prev) => ({
                        ...prev,
                        mobilityFeatures: nextValue,
                      })),
                    props.isFeatureDisabled(
                      editState.assignedPackage,
                      "mobilityFeatures",
                    ),
                  )}

                  {renderBooleanField(
                    "edit-web-collaboration",
                    "Web Collaboration",
                    editState.webCollaboration,
                    (nextValue) =>
                      props.setEditState((prev) => ({
                        ...prev,
                        webCollaboration: nextValue,
                      })),
                    props.isFeatureDisabled(
                      editState.assignedPackage,
                      "webCollaboration",
                    ),
                  )}
                </div>
              </div>

              <div className="rounded border p-3">
                <p className="text-sm font-medium">Credentials</p>
                <div className="mt-3 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Name</Label>
                    <Input
                      id="edit-name"
                      value={editState.name}
                      onChange={(e) =>
                        props.setEditState((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      autoComplete="off"
                      disabled={editSaving}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-password">Password</Label>
                    <InputGroup>
                      <InputGroupInput
                        id="edit-password"
                        type={showPassword ? "text" : "password"}
                        value={editState.password}
                        onChange={(e) =>
                          props.setEditState((prev) => ({
                            ...prev,
                            password: e.target.value,
                          }))
                        }
                        autoComplete="new-password"
                        disabled={editSaving}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          type="button"
                          onClick={() => props.setShowPassword(!showPassword)}
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? <EyeOff /> : <Eye />}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-confirm-password">
                      Confirm Password
                    </Label>
                    <InputGroup>
                      <InputGroupInput
                        id="edit-confirm-password"
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => props.setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        disabled={editSaving}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          type="button"
                          onClick={() => props.setShowPassword(!showPassword)}
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? <EyeOff /> : <Eye />}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-login-code">Login Code</Label>
                    <InputGroup>
                      <InputGroupInput
                        id="edit-login-code"
                        type={showLoginCode ? "text" : "password"}
                        value={editState.loginCode}
                        onChange={(e) =>
                          props.setEditState((prev) => ({
                            ...prev,
                            loginCode: e.target.value,
                          }))
                        }
                        disabled={editSaving}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          type="button"
                          onClick={() => props.setShowLoginCode(!showLoginCode)}
                          aria-label={
                            showLoginCode
                              ? "Hide login code"
                              : "Show login code"
                          }
                        >
                          {showLoginCode ? <EyeOff /> : <Eye />}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-confirm-login-code">
                      Confirm Login Code
                    </Label>
                    <InputGroup>
                      <InputGroupInput
                        id="edit-confirm-login-code"
                        type={showLoginCode ? "text" : "password"}
                        value={confirmLoginCode}
                        onChange={(e) => props.setConfirmLoginCode(e.target.value)}
                        disabled={editSaving}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          type="button"
                          onClick={() => props.setShowLoginCode(!showLoginCode)}
                          aria-label={
                            showLoginCode
                              ? "Hide login code"
                              : "Show login code"
                          }
                        >
                          {showLoginCode ? <EyeOff /> : <Eye />}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                  </div>
                </div>
              </div>

              {renderBooleanField(
                "edit-can-intrude",
                "Can Intrude",
                editState.canIntrude,
                (nextValue) =>
                  props.setEditState((prev) => ({
                    ...prev,
                    canIntrude: nextValue,
                  })),
              )}

              {renderBooleanField(
                "edit-cannot-be-intruded",
                "Cannot Be Intruded",
                editState.cannotBeIntruded,
                (nextValue) =>
                  props.setEditState((prev) => ({
                    ...prev,
                    cannotBeIntruded: nextValue,
                  })),
              )}

              {renderBooleanField(
                "edit-dnd",
                "Do Not Disturb",
                editState.doNotDisturb,
                (nextValue) =>
                  props.setEditState((prev) => ({
                    ...prev,
                    doNotDisturb: nextValue,
                  })),
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-dnd-exceptions">DND Exceptions</Label>
                <Input
                  id="edit-dnd-exceptions"
                  value={editState.dndExceptions}
                  onChange={(e) =>
                    props.setEditState((prev) => ({
                      ...prev,
                      dndExceptions: e.target.value,
                    }))
                  }
                  disabled={editSaving}
                />
              </div>

              {renderBooleanField(
                "edit-force-account-code",
                "Force Account Code",
                editState.forceAccountCode,
                (nextValue) =>
                  props.setEditState((prev) => ({
                    ...prev,
                    forceAccountCode: nextValue,
                  })),
              )}

              {renderBooleanField(
                "edit-idle-line-preference",
                "Idle Line Preference",
                editState.idleLinePreference,
                (nextValue) =>
                  props.setEditState((prev) => ({
                    ...prev,
                    idleLinePreference: nextValue,
                  })),
              )}

              {renderBooleanField(
                "edit-outgoing-call-bar",
                "Outgoing Call Bar",
                editState.outgoingCallBar,
                (nextValue) =>
                  props.setEditState((prev) => ({
                    ...prev,
                    outgoingCallBar: nextValue,
                  })),
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-out-of-hours-rights">
                  Out Of Hours User Rights
                </Label>
                <Input
                  id="edit-out-of-hours-rights"
                  value={editState.outOfHoursUserRights}
                  onChange={(e) =>
                    props.setEditState((prev) => ({
                      ...prev,
                      outOfHoursUserRights: e.target.value,
                    }))
                  }
                  disabled={editSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-priority">Priority</Label>
                <Input
                  id="edit-priority"
                  value={editState.priority}
                  onChange={(e) =>
                    props.setEditState((prev) => ({
                      ...prev,
                      priority: e.target.value,
                    }))
                  }
                  disabled={editSaving}
                />
              </div>

              <div className="rounded border p-3">
                <p className="text-sm font-medium">SIP Settings</p>
                <div className="mt-3 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit-sip-contact">SIP Contact</Label>
                    <Input
                      id="edit-sip-contact"
                      value={editState.sipContact}
                      onChange={(e) =>
                        props.setEditState((prev) => ({
                          ...prev,
                          sipContact: e.target.value,
                        }))
                      }
                      disabled={editSaving}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-sip-name">SIP Name</Label>
                    <Input
                      id="edit-sip-name"
                      value={editState.sipName}
                      onChange={(e) =>
                        props.setEditState((prev) => ({
                          ...prev,
                          sipName: e.target.value,
                        }))
                      }
                      disabled={editSaving}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Twinning Type</Label>
                <Select
                  value={editState.twinningType}
                  onValueChange={(value) =>
                    props.setEditState((prev) => ({
                      ...prev,
                      twinningType: value,
                    }))
                  }
                  disabled={editSaving}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select twinning type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TWINNING_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-user-rights">User Rights</Label>
                <Input
                  id="edit-user-rights"
                  value={editState.userRights}
                  onChange={(e) =>
                    props.setEditState((prev) => ({
                      ...prev,
                      userRights: e.target.value,
                    }))
                  }
                  disabled={editSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-user-rights-time-profile">
                  User Rights Time Profile
                </Label>
                <Input
                  id="edit-user-rights-time-profile"
                  value={editState.userRightsTimeProfile}
                  onChange={(e) =>
                    props.setEditState((prev) => ({
                      ...prev,
                      userRightsTimeProfile: e.target.value,
                    }))
                  }
                  disabled={editSaving}
                />
              </div>

              <div className="rounded border p-3">
                <p className="text-sm font-medium">Voicemail</p>
                <div className="mt-3 space-y-3">
                  {renderBooleanField(
                    "edit-voicemail-on",
                    "Voicemail On",
                    editState.voicemailOn,
                    (nextValue) =>
                      props.setEditState((prev) => ({
                        ...prev,
                        voicemailOn: nextValue,
                      })),
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="edit-voicemail-code">Voicemail Code</Label>
                    <InputGroup>
                      <InputGroupInput
                        id="edit-voicemail-code"
                        type={showVoicemailCode ? "text" : "password"}
                        value={editState.voicemailCode}
                        onChange={(e) =>
                          props.setEditState((prev) => ({
                            ...prev,
                            voicemailCode: e.target.value,
                          }))
                        }
                        disabled={editSaving}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          type="button"
                          onClick={() =>
                            props.setShowVoicemailCode(!showVoicemailCode)
                          }
                          aria-label={
                            showVoicemailCode
                              ? "Hide voicemail code"
                              : "Show voicemail code"
                          }
                        >
                          {showVoicemailCode ? <EyeOff /> : <Eye />}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-confirm-voicemail-code">
                      Confirm Voicemail Code
                    </Label>
                    <InputGroup>
                      <InputGroupInput
                        id="edit-confirm-voicemail-code"
                        type={showVoicemailCode ? "text" : "password"}
                        value={confirmVoicemailCode}
                        onChange={(e) =>
                          props.setConfirmVoicemailCode(e.target.value)
                        }
                        disabled={editSaving}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          type="button"
                          onClick={() =>
                            props.setShowVoicemailCode(!showVoicemailCode)
                          }
                          aria-label={
                            showVoicemailCode
                              ? "Hide voicemail code"
                              : "Show voicemail code"
                          }
                        >
                          {showVoicemailCode ? <EyeOff /> : <Eye />}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-voicemail-email">Voicemail Email</Label>
                    <Input
                      id="edit-voicemail-email"
                      value={editState.voicemailEmail}
                      onChange={(e) =>
                        props.setEditState((prev) => ({
                          ...prev,
                          voicemailEmail: e.target.value,
                        }))
                      }
                      disabled={editSaving}
                    />
                  </div>

                  {renderBooleanField(
                    "edit-ums-web-services",
                    "UMS Web Services",
                    editState.umsWebServices,
                    (nextValue) =>
                      props.setEditState((prev) => ({
                        ...prev,
                        umsWebServices: nextValue,
                      })),
                  )}
                </div>
              </div>

              {renderBooleanField(
                "edit-x-directory",
                "X Directory",
                editState.xDirectory,
                (nextValue) =>
                  props.setEditState((prev) => ({
                    ...prev,
                    xDirectory: nextValue,
                  })),
              )}

            </div>
          </div>

          <SheetFooter className="border-t bg-background">
            <div className="flex items-center justify-end gap-2 px-4 pb-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={props.onCancel}
                disabled={editSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editSaving}>
                {editSaving ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Saving
                  </>
                ) : (
                  props.submitLabel ?? "Save changes"
                )}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
