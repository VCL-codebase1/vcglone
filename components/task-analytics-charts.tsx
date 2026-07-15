"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const STATUS_COLORS = ["#102B74", "#2563EB", "#B45309", "#7C3AED", "#DC2626", "#047857", "#64748B"];

export function TaskProductivityTrendChart({ data }: { data: Array<{ label: string; assigned: number; completed: number }> }) {
  return <div className="h-72 w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d9e0ea" /><XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} minTickGap={12} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} /><Tooltip cursor={{ fill: "#f7f9fc" }} /><Legend /><Bar name="Assigned" dataKey="assigned" fill="#94A3B8" radius={[4, 4, 0, 0]} /><Bar name="Completed" dataKey="completed" fill="#102B74" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>;
}

export function TaskStatusDistributionChart({ data }: { data: Array<{ name: string; value: number }> }) {
  if (!data.length) return <div className="flex h-72 items-center justify-center text-sm text-muted">No task data for this period.</div>;
  return <div className="h-72 w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={50} outerRadius={85} paddingAngle={2}>{data.map((entry, index) => <Cell key={entry.name} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />)}</Pie><Tooltip /><Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer></div>;
}

export function TaskTeamPerformanceChart({ data }: { data: Array<{ name: string; completed: number; overdue: number }> }) {
  if (!data.length) return <div className="flex h-72 items-center justify-center text-sm text-muted">No team activity for this period.</div>;
  return <div className="h-72 w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={data.slice(0, 10)} margin={{ left: 20, right: 8, top: 8, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#d9e0ea" /><XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} /><YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false} fontSize={11} /><Tooltip cursor={{ fill: "#f7f9fc" }} /><Legend /><Bar name="Completed" dataKey="completed" fill="#047857" radius={[0, 4, 4, 0]} /><Bar name="Overdue" dataKey="overdue" fill="#B45309" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div>;
}

