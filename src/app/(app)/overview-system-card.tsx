import Link from "next/link";

export function OverviewSystemCard(props: {
  id: string;
  name: string;
  host: string;
  totalUsers: number | null;
  licensedCount: number | null;
  lastSyncedAt: string | null;
}) {
  return (
    <Link
      href={`/systems/${props.id}`}
      className="block rounded border p-4 hover:bg-muted/40 transition"
    >
      <div className="text-sm font-medium">{props.name}</div>
      <div className="text-xs text-muted-foreground">{props.host}</div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-muted-foreground">Users</div>
          <div className="text-sm font-semibold">
            {props.totalUsers ?? "—"}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Licensed</div>
          <div className="text-sm font-semibold">
            {props.licensedCount ?? "—"}
          </div>
        </div>
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">
        Last synced: {props.lastSyncedAt ?? "—"}
      </div>
    </Link>
  );
}
