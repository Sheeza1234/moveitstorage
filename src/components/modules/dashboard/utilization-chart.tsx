"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const MOCK_MONTHLY_UTILIZATION = [
  { month: "May", occupied: 9800, reserved: 1800, available: 12900 },
  { month: "Jun", occupied: 11200, reserved: 2000, available: 11300 },
  { month: "Jul", occupied: 12500, reserved: 2200, available: 9800 },
  { month: "Aug", occupied: 13400, reserved: 2100, available: 9000 },
  { month: "Sep", occupied: 14100, reserved: 2300, available: 8100 },
  { month: "Oct", occupied: 14600, reserved: 2400, available: 7500 },
];

export function UtilizationChart() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Storage Utilization Trend</CardTitle>
        <CardDescription>
          6-Month historical square footage allocation trend across MoveIt facilities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={MOCK_MONTHLY_UTILIZATION} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorOccupied" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="colorReserved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="colorAvailable" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748B" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748B" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0F172A",
                  borderColor: "#1E293B",
                  borderRadius: "8px",
                  color: "#FFFFFF",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="occupied"
                name="Occupied SQ.FT"
                stackId="1"
                stroke="#EF4444"
                fillOpacity={1}
                fill="url(#colorOccupied)"
              />
              <Area
                type="monotone"
                dataKey="reserved"
                name="Reserved SQ.FT"
                stackId="1"
                stroke="#3B82F6"
                fillOpacity={1}
                fill="url(#colorReserved)"
              />
              <Area
                type="monotone"
                dataKey="available"
                name="Available SQ.FT"
                stackId="1"
                stroke="#10B981"
                fillOpacity={1}
                fill="url(#colorAvailable)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
