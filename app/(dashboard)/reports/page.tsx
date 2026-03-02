"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Package,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

interface ReportSummary {
  totalSettlements: number;
  totalRevenue: number;
  totalExpenses: number;
  totalShortage: number;
  totalActualCash: number;
  totalDeliveries: number;
}

interface StaffBreakdownItem {
  staffId: string;
  staffName: string;
  settlementCount: number;
  totalRevenue: number;
  totalExpenses: number;
  totalShortage: number;
  totalDeliveries: number;
}

interface CylinderBreakdownItem {
  cylinderSize: string;
  totalQuantity: number;
  totalRevenue: number;
}

interface DailyTrendItem {
  date: string;
  revenue: number;
  deliveries: number;
  settlements: number;
}

interface ReportData {
  summary: ReportSummary;
  staffBreakdown: StaffBreakdownItem[];
  cylinderBreakdown: CylinderBreakdownItem[];
  dailyTrends: DailyTrendItem[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

function formatDateStr(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toInputDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));

  const [startDate, setStartDate] = useState(toInputDate(thirtyDaysAgo));
  const [endDate, setEndDate] = useState(toInputDate(today));

  const fetchReport = useCallback(async (start: string, end: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/reports?startDate=${start}&endDate=${end}`
      );
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to fetch report:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(startDate, endDate);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApply = () => {
    fetchReport(startDate, endDate);
  };

  const setPreset = (preset: "today" | "7days" | "30days" | "thisMonth") => {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (preset) {
      case "today":
        start = now;
        break;
      case "7days":
        start = new Date(new Date().setDate(now.getDate() - 7));
        break;
      case "30days":
        start = new Date(new Date().setDate(now.getDate() - 30));
        break;
      case "thisMonth":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const s = toInputDate(start);
    const e = toInputDate(end);
    setStartDate(s);
    setEndDate(e);
    fetchReport(s, e);
  };

  const exportCSV = () => {
    if (!data) return;

    const headers = [
      "Date",
      "Staff",
      "Cylinder Sizes",
      "Revenue",
      "Expenses",
      "Actual Cash",
      "Shortage",
    ];

    // Build rows from staff breakdown and daily trends
    const rows: string[][] = [];

    // Add staff summary rows
    rows.push(["--- Staff Summary ---", "", "", "", "", "", ""]);
    data.staffBreakdown.forEach((staff) => {
      rows.push([
        "",
        staff.staffName,
        `${staff.totalDeliveries} cylinders`,
        staff.totalRevenue.toString(),
        staff.totalExpenses.toString(),
        "",
        staff.totalShortage.toString(),
      ]);
    });

    // Add daily trends
    rows.push(["", "", "", "", "", "", ""]);
    rows.push(["--- Daily Trends ---", "", "", "", "", "", ""]);
    data.dailyTrends.forEach((day) => {
      rows.push([
        day.date,
        "",
        `${day.deliveries} deliveries`,
        day.revenue.toString(),
        "",
        "",
        "",
      ]);
    });

    // Add cylinder breakdown
    rows.push(["", "", "", "", "", "", ""]);
    rows.push(["--- Cylinder Breakdown ---", "", "", "", "", "", ""]);
    data.cylinderBreakdown.forEach((cyl) => {
      rows.push([
        "",
        "",
        `${cyl.cylinderSize} x ${cyl.totalQuantity}`,
        cyl.totalRevenue.toString(),
        "",
        "",
        "",
      ]);
    });

    // Add summary row
    rows.push(["", "", "", "", "", "", ""]);
    rows.push([
      "TOTAL",
      "",
      `${data.summary.totalDeliveries} deliveries`,
      data.summary.totalRevenue.toString(),
      data.summary.totalExpenses.toString(),
      data.summary.totalActualCash.toString(),
      data.summary.totalShortage.toString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `report_${startDate}_to_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const summary = data?.summary;

  const statCards = [
    {
      title: "Total Revenue",
      value: formatCurrency(summary?.totalRevenue || 0),
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      title: "Total Expenses",
      value: formatCurrency(summary?.totalExpenses || 0),
      icon: TrendingDown,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-900/20",
    },
    {
      title: "Total Shortage",
      value: formatCurrency(summary?.totalShortage || 0),
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-900/20",
    },
    {
      title: "Total Deliveries",
      value: summary?.totalDeliveries || 0,
      suffix: "cylinders",
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: "Total Settlements",
      value: summary?.totalSettlements || 0,
      suffix: "records",
      icon: FileText,
      color: "text-violet-600",
      bg: "bg-violet-50 dark:bg-violet-900/20",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Settlement reports and analytics
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Settlement reports and analytics
          </p>
        </div>
        <Button onClick={exportCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Date Range Picker */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="startDate" className="text-sm">
                  Start Date
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-10 w-[170px]"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate" className="text-sm">
                  End Date
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-10 w-[170px]"
                  />
                </div>
              </div>
              <Button onClick={handleApply} className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Apply
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreset("today")}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreset("7days")}
              >
                Last 7 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreset("30days")}
              >
                Last 30 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreset("thisMonth")}
              >
                This Month
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      >
        {statCards.map((card) => (
          <motion.div key={card.title} variants={itemVariants}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-500">{card.title}</p>
                    <p className="text-2xl font-bold mt-1">{card.value}</p>
                    {"suffix" in card && card.suffix && (
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {card.suffix}
                      </p>
                    )}
                  </div>
                  <div className={`${card.bg} p-3 rounded-xl`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Staff Performance Table */}
      <motion.div variants={itemVariants} initial="hidden" animate="show">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Staff Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.staffBreakdown && data.staffBreakdown.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Settlements</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                      <TableHead className="text-right">Shortage</TableHead>
                      <TableHead className="text-right">Deliveries</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.staffBreakdown.map((staff) => (
                      <TableRow key={staff.staffId}>
                        <TableCell className="font-medium">
                          {staff.staffName}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">
                            {staff.settlementCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-emerald-600 font-medium">
                          {formatCurrency(staff.totalRevenue)}
                        </TableCell>
                        <TableCell className="text-right text-amber-600">
                          {formatCurrency(staff.totalExpenses)}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {formatCurrency(staff.totalShortage)}
                        </TableCell>
                        <TableCell className="text-right">
                          {staff.totalDeliveries}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-zinc-500 text-center py-8">
                No staff data for the selected period.
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Cylinder Distribution */}
      <motion.div variants={itemVariants} initial="hidden" animate="show">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cylinder Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.cylinderBreakdown && data.cylinderBreakdown.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {data.cylinderBreakdown.map((cyl) => {
                  const maxQty = Math.max(
                    ...data.cylinderBreakdown.map((c) => c.totalQuantity),
                    1
                  );
                  const pct = (cyl.totalQuantity / maxQty) * 100;

                  return (
                    <div
                      key={cyl.cylinderSize}
                      className="rounded-lg border border-zinc-100 dark:border-zinc-800 p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                          {cyl.cylinderSize}
                        </p>
                        <Badge variant="outline">{cyl.totalQuantity} qty</Badge>
                      </div>
                      <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 mb-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-sm font-medium text-emerald-600">
                        {formatCurrency(cyl.totalRevenue)}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 text-center py-8">
                No cylinder data for the selected period.
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Daily Trends */}
      <motion.div variants={itemVariants} initial="hidden" animate="show">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Trends</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.dailyTrends && data.dailyTrends.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Deliveries</TableHead>
                      <TableHead className="text-right">Settlements</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.dailyTrends.map((day) => (
                      <TableRow key={day.date}>
                        <TableCell className="font-medium">
                          {formatDateStr(day.date)}
                        </TableCell>
                        <TableCell className="text-right text-emerald-600 font-medium">
                          {formatCurrency(day.revenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {day.deliveries}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{day.settlements}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-zinc-500 text-center py-8">
                No daily data for the selected period.
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
