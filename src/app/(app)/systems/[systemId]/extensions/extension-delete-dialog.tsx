"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ExtensionDeleteDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deleteBusy: boolean;
  extensionValue: string | null;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={props.open} onOpenChange={props.onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete extension?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove the extension
            {props.extensionValue ? ` ${props.extensionValue}` : ""} from the
            system.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={props.deleteBusy}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={props.onConfirm}
            disabled={props.deleteBusy}
          >
            {props.deleteBusy ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
