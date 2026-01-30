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
import { Loader2 } from "lucide-react";

export function UserDeleteDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deleteBusy: boolean;
  deleteError: string | null;
  userName: string | null;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog
      open={props.open}
      onOpenChange={(open) => (!props.deleteBusy ? props.onOpenChange(open) : null)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete user?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove{" "}
            <span className="font-medium text-foreground">
              {props.userName || "this user"}
            </span>
            .
          </AlertDialogDescription>
        </AlertDialogHeader>

        {props.deleteError ? (
          <p className="text-sm text-red-600 whitespace-pre-wrap">
            {props.deleteError}
          </p>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={props.deleteBusy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(e) => {
              e.preventDefault();
              props.onConfirm();
            }}
            disabled={props.deleteBusy}
          >
            {props.deleteBusy ? (
              <>
                <Loader2 className="animate-spin" />
                Deleting
              </>
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
