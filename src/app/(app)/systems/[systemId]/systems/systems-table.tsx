"use client";

import type { SystemRow } from "./systems-types";

function renderVoicemailType(value: string) {
  if (value === "1") return "Voicemail Lite/Pro";
  return value;
}

export function SystemsTable(props: { rows: SystemRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-muted-foreground">
          <tr className="border-b">
            <th className="py-2 text-left">Name</th>
            <th className="py-2 text-left">Version</th>
            <th className="py-2 text-left">LAN1 IP</th>
            <th className="py-2 text-left">LAN2 IP</th>
            <th className="py-2 text-left">Voicemail Type</th>
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row) => (
            <tr key={row.guid || row.name} className="border-b last:border-0">
              <td className="py-2">{row.name}</td>
              <td className="py-2">{row.version}</td>
              <td className="py-2">{row.lan1IpAddress}</td>
              <td className="py-2">{row.lan2IpAddress}</td>
              <td className="py-2">{renderVoicemailType(row.voicemailType)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
