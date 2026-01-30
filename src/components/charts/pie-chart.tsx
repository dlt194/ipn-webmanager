"use client";

import * as React from "react";
import {
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";

export type PieDatum = {
  name: string;
  value: number;
  color?: string;
};

function DefaultTooltip(props: TooltipProps<number, string>) {
  const { active, payload } = props;
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0]?.payload as PieDatum | undefined;
  if (!item) return null;

  return (
    <div className="rounded border bg-background px-2 py-1 text-xs shadow-sm">
      <div className="font-medium">{item.name}</div>
      <div className="text-muted-foreground">{item.value}</div>
    </div>
  );
}

export function PieChartInteractive(props: {
  data: PieDatum[];
  ariaLabel?: string;
  valueFormatter?: (value: number) => string;
  className?: string;
}) {
  const formatter = React.useCallback(
    (value: number) =>
      props.valueFormatter ? props.valueFormatter(value) : String(value),
    [props.valueFormatter],
  );

  const tooltipContent = React.useCallback(
    (tooltipProps: TooltipProps<number, string>) => {
      const { active, payload } = tooltipProps;
      if (!active || !payload || payload.length === 0) return null;
      const item = payload[0]?.payload as PieDatum | undefined;
      if (!item) return null;
      return (
        <div className="rounded border bg-background px-2 py-1 text-xs shadow-sm">
          <div className="font-medium">{item.name}</div>
          <div className="text-muted-foreground">
            {formatter(item.value)}
          </div>
        </div>
      );
    },
    [formatter],
  );

  return (
    <div
      className={cn("pie-chart rounded-full", props.className)}
      aria-label={props.ariaLabel}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={props.data}
            dataKey="value"
            nameKey="name"
            outerRadius="100%"
            innerRadius="55%"
            stroke="transparent"
          >
            {props.data.map((entry, index) => (
              <Cell key={`cell-${entry.name}-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={tooltipContent ?? DefaultTooltip} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
