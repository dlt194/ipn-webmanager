"use client";

import type { LicenseRow } from "./licenses-types";

export function LicensesTable(props: {
  rows: LicenseRow[];
  renderSource: (value: string) => string;
  renderStatus: (value: string) => string;
  renderMode: (value: string) => string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-muted-foreground">
          <tr className="border-b">
            <th className="py-2 text-left">Display Name</th>
            <th className="py-2 text-left">License Key</th>
            <th className="py-2 text-left">Status</th>
            <th className="py-2 text-left">Source</th>
            <th className="py-2 text-left">Mode</th>
            <th className="py-2 text-left">Type</th>
            <th className="py-2 text-left">Quantity</th>
            <th className="py-2 text-left">Free</th>
            <th className="py-2 text-left">Expiry</th>
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row) => (
            <tr key={row.guid || row.licenseKey} className="border-b last:border-0">
              <td className="py-2">{row.displayName}</td>
              <td className="py-2">{row.licenseKey}</td>
              <td className="py-2">{props.renderStatus(row.status)}</td>
              <td className="py-2">{props.renderSource(row.source)}</td>
              <td className="py-2">{props.renderMode(row.mode)}</td>
              <td className="py-2">{row.type}</td>
              <td className="py-2">{row.quantity}</td>
              <td className="py-2">{row.freeInstances}</td>
              <td className="py-2">{row.expiryDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
