"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FlowLedgerModel } from "@/lib/types";
import { chart, formatUsd, tooltipStyle } from "@/lib/chartTheme";
import { IconCheck } from "../ui/icons";

interface Props {
  ledger: FlowLedgerModel;
}

export default function FlowWaterfall({ ledger }: Props) {
  const node = (id: string) => ledger.nodes.find((n) => n.id === id);
  const gross = node("gross_fees");
  const partner = node("partner_payout");
  const net = node("net_revenue_swept");

  if (!gross || !net) {
    return (
      <div className="card p-5">
        <h3 className="section-title">From gross fees to net revenue</h3>
        <div className="empty-state mt-4">
          <p className="text-[12.5px] font-medium text-ink-muted">USD fee stages are not available</p>
          <p className="mt-1 text-[11.5px] text-ink-faint">Switch to the USD ledger view to see this composition.</p>
        </div>
      </div>
    );
  }

  const grossValue = Number(gross.amount);
  const partnerValue = partner ? Number(partner.amount) : 0;
  const netValue = Number(net.amount);
  const gap = grossValue - partnerValue - netValue;
  const gapPct = grossValue > 0 ? Math.abs(gap / grossValue) * 100 : 0;

  const rows = [
    {
      label: "Gross fees",
      invisible: 0,
      value: grossValue,
      total: grossValue,
      display: `+${formatUsd(grossValue)}`,
      color: chart.accent,
      note: "Starting point",
    },
    {
      label: "Partner payouts",
      invisible: netValue,
      value: partnerValue,
      total: grossValue,
      display: `−${formatUsd(partnerValue)}`,
      color: chart.warmGray,
      note: "Subtracted from gross fees",
    },
    {
      label: "Net revenue swept",
      invisible: 0,
      value: netValue,
      total: netValue,
      display: formatUsd(netValue),
      color: chart.sage,
      note: "Available to protocol wallets",
    },
  ];

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-1 px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="section-title">From gross fees to net revenue</h3>
            <p className="mt-0.5 text-[11px] text-ink-faint">USD fee stages for {ledger.period.toUpperCase()}</p>
          </div>
          <span
            className={`badge ${
              gapPct <= 0.5 ? "border-sage/25 bg-sage-soft text-sage-deep" : "border-ochre/30 bg-ochre-soft text-ochre-deep"
            }`}
          >
            {gapPct <= 0.5 ? <IconCheck className="h-3 w-3" /> : null}
            {gapPct <= 0.5 ? "Reconciles" : `Gap ${formatUsd(Math.abs(gap))}`}
          </span>
        </div>
      </div>

      <div style={{ width: "100%", height: 250 }} className="px-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 24, right: 14, left: 4, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fill: chart.faint, fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: chart.axis }}
              tickMargin={8}
            />
            <YAxis
              tick={{ fill: chart.faint, fontSize: 10.5 }}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(value: number) => formatUsd(value)}
            />
            <Tooltip
              cursor={{ fill: chart.surfaceMuted }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const row = payload[0].payload as (typeof rows)[number];
                return (
                  <div style={tooltipStyle}>
                    <p className="text-[11.5px] font-medium text-ink">{row.label}</p>
                    <p className="tnum mt-1 text-[12px] text-ink-soft">{row.display}</p>
                    <p className="mt-1 text-[10.5px] text-ink-faint">{row.note}</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="invisible" stackId="flow" fill="transparent" isAnimationActive={false} />
            <Bar dataKey="value" stackId="flow" radius={[4, 4, 0, 0]} maxBarSize={70} isAnimationActive={false}>
              {rows.map((row) => (
                <Cell key={row.label} fill={row.color} />
              ))}
              <LabelList
                dataKey="display"
                position="top"
                fill={chart.ink}
                fontSize={10.5}
                fontWeight={500}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="border-t border-line/70 px-4 py-2.5 text-[10.5px] leading-relaxed text-ink-faint sm:px-5">
        Partner payouts and net revenue swept are subtracted from gross fees. Any difference is shown, never forced to
        balance.
      </div>
    </div>
  );
}
