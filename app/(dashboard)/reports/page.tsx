"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Calendar,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Users,
  Minus,
  Banknote,
  User,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { sectionThemes } from "@/lib/theme";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { staggerContainer, fadeUpItem } from "@/lib/animations";

interface CylinderSale {
  cylinderSize: string;
  quantity: number;
  pricePerUnit: number;
  total: number;
}

interface LedgerItem {
  category: string;
  amount: number;
  description?: string;
}

interface Denomination {
  note: number;
  count: number;
  total: number;
}

interface StaffEntry {
  staffName: string;
  items: CylinderSale[];
  grossRevenue: number;
  addOns: LedgerItem[];
  deductions: LedgerItem[];
  totalAddOns: number;
  totalDeductions: number;
  amountExpected: number;
  denominations: Denomination[];
  denominationTotal: number;
  cashDifference: number;
}

interface DailyReport {
  date: string;
  cylinderSales: CylinderSale[];
  additionalItems: LedgerItem[];
  expenses: LedgerItem[];
  grossCylinderRevenue: number;
  totalAdditionalIncome: number;
  grossTotal: number;
  totalExpenses: number;
  netAmount: number;
  staffNames: string[];
  staffEntries?: StaffEntry[];
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatNum(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}

function toInputDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function aggregateByCategory(items: LedgerItem[]): LedgerItem[] {
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(item.category, (map.get(item.category) || 0) + item.amount);
  }
  return Array.from(map.entries()).map(([category, amount]) => ({
    category,
    amount,
  }));
}

export default function ReportsPage() {
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();

  const [startDate, setStartDate] = useState(toInputDate(today));
  const [endDate, setEndDate] = useState(toInputDate(today));
  const [activePreset, setActivePreset] = useState<string>("today");

  const fetchDailyReports = useCallback(async (start: string, end: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/reports/daily?startDate=${start}&endDate=${end}`
      );
      const json = await res.json();
      setDailyReports(json.dailyReports || []);
    } catch (err) {
      console.error("Failed to fetch daily reports:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDailyReports(startDate, endDate);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApply = () => {
    setActivePreset("");
    fetchDailyReports(startDate, endDate);
  };

  const setPreset = (preset: "today" | "7days" | "30days" | "thisMonth") => {
    const now = new Date();
    let start: Date;
    const end: Date = now;

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
    setActivePreset(preset);
    fetchDailyReports(s, e);
  };

  const navigateDays = (direction: number) => {
    const daysDiff =
      Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1;
    const shift = daysDiff * direction;
    const newStart = new Date(startDate);
    const newEnd = new Date(endDate);
    newStart.setDate(newStart.getDate() + shift);
    newEnd.setDate(newEnd.getDate() + shift);
    const s = toInputDate(newStart);
    const e = toInputDate(newEnd);
    setStartDate(s);
    setEndDate(e);
    setActivePreset("");
    fetchDailyReports(s, e);
  };

  // Period totals
  const periodTotals = dailyReports.reduce(
    (acc, r) => ({
      grossRevenue: acc.grossRevenue + r.grossCylinderRevenue,
      addOns: acc.addOns + r.totalAdditionalIncome,
      expenses: acc.expenses + r.totalExpenses,
      net: acc.net + r.netAmount,
      cylinders:
        acc.cylinders +
        r.cylinderSales.reduce((s, c) => s + c.quantity, 0),
    }),
    { grossRevenue: 0, addOns: 0, expenses: 0, net: 0, cylinders: 0 }
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={<BookOpen className="h-5 w-5" />}
          title="Daily Khata"
          subtitle="Daily settlement ledger"
          gradient={sectionThemes.reports.gradient}
        />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        icon={<BookOpen className="h-5 w-5" />}
        title="Daily Khata"
        subtitle="Daily settlement ledger"
        gradient={sectionThemes.reports.gradient}
      />

      {/* Date Controls */}
      <Card>
        <CardContent className="p-3 sm:p-5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 h-9 w-9"
                onClick={() => navigateDays(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex flex-1 items-center gap-2 min-w-0">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1 min-w-0 text-sm h-9"
                />
                <span className="text-zinc-400 text-sm shrink-0">to</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex-1 min-w-0 text-sm h-9"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 h-9 w-9"
                onClick={() => navigateDays(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {(["today", "7days", "30days", "thisMonth"] as const).map((preset) => {
                const labels = { today: "Today", "7days": "7 Days", "30days": "30 Days", thisMonth: "This Month" };
                return (
                  <Button
                    key={preset}
                    variant={activePreset === preset ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7 px-2 sm:text-sm sm:h-8 sm:px-3"
                    onClick={() => setPreset(preset)}
                  >
                    {labels[preset]}
                  </Button>
                );
              })}
              <Button
                size="sm"
                className="text-xs h-7 px-2 sm:text-sm sm:h-8 sm:px-3 ml-auto"
                onClick={handleApply}
              >
                <BarChart3 className="h-3.5 w-3.5 mr-1" />
                Go
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Period Summary Bar */}
      {dailyReports.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2.5 sm:p-3">
            <p className="text-[10px] sm:text-xs text-zinc-400 uppercase tracking-wider font-semibold">Revenue</p>
            <p className="text-sm sm:text-lg font-bold text-emerald-600 mt-0.5">
              {formatCurrency(periodTotals.grossRevenue)}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2.5 sm:p-3">
            <p className="text-[10px] sm:text-xs text-zinc-400 uppercase tracking-wider font-semibold">Add Ons</p>
            <p className="text-sm sm:text-lg font-bold text-blue-600 mt-0.5">
              {formatCurrency(periodTotals.addOns)}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2.5 sm:p-3">
            <p className="text-[10px] sm:text-xs text-zinc-400 uppercase tracking-wider font-semibold">Expenses</p>
            <p className="text-sm sm:text-lg font-bold text-red-600 mt-0.5">
              {formatCurrency(periodTotals.expenses)}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2.5 sm:p-3">
            <p className="text-[10px] sm:text-xs text-zinc-400 uppercase tracking-wider font-semibold">Cylinders</p>
            <p className="text-sm sm:text-lg font-bold mt-0.5">
              {formatNum(periodTotals.cylinders)}
            </p>
          </div>
        </div>
      )}

      {/* Daily Ledger Entries */}
      {dailyReports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-10 w-10 mx-auto mb-3 text-zinc-300" />
            <p className="text-zinc-500 text-sm">
              No settlements found for this period.
            </p>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {dailyReports.map((report) => (
            <DailyLedgerCard key={report.date} report={report} />
          ))}
        </motion.div>
      )}
    </div>
  );
}

// ─── Daily Ledger Card Component ───

function DailyLedgerCard({ report }: { report: DailyReport }) {
  const [expanded, setExpanded] = useState(true);
  const aggExpenses = aggregateByCategory(report.expenses);
  const aggAddOns = aggregateByCategory(report.additionalItems);
  const totalCylinders = report.cylinderSales.reduce(
    (s, c) => s + c.quantity,
    0
  );
  const hasMultipleStaff = (report.staffEntries?.length || 0) > 1;

  return (
    <motion.div variants={fadeUpItem}>
      <Card className="overflow-hidden">
        {/* Date Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-3 sm:px-5 py-3 bg-gradient-to-r from-zinc-50 to-zinc-100/50 dark:from-zinc-900 dark:to-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 shrink-0">
              <Calendar className="h-4 w-4" />
            </div>
            <div className="text-left min-w-0">
              <p className="font-bold text-sm sm:text-base truncate">
                {formatDateHeader(report.date)}
              </p>
              {report.staffNames.length > 0 && (
                <p className="text-[11px] sm:text-xs text-zinc-400 truncate">
                  <Users className="h-3 w-3 inline mr-1" />
                  {report.staffNames.join(", ")}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="text-right">
              <p className="text-xs text-zinc-400">Net</p>
              <p
                className={`text-sm sm:text-base font-bold ${
                  report.netAmount >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {formatCurrency(report.netAmount)}
              </p>
            </div>
            <ChevronRight
              className={`h-4 w-4 text-zinc-400 transition-transform ${
                expanded ? "rotate-90" : ""
              }`}
            />
          </div>
        </button>

        {expanded && (
          <CardContent className="p-0">
            {/* Day Summary: Sales | Expenses */}
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 dark:divide-zinc-800">
              {/* LEFT: Sales & Income */}
              <div className="p-3 sm:p-4 space-y-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                    Sales & Income
                  </p>
                </div>

                {/* Additional Items */}
                {aggAddOns.length > 0 && (
                  <div className="space-y-1">
                    {aggAddOns.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-zinc-600 dark:text-zinc-400 truncate mr-2">
                          {item.category}
                        </span>
                        <span className="font-medium text-blue-600 tabular-nums shrink-0">
                          {formatNum(item.amount)}
                        </span>
                      </div>
                    ))}
                    <div className="border-b border-dashed border-zinc-200 dark:border-zinc-700 my-1" />
                  </div>
                )}

                {/* Cylinder Sales */}
                {report.cylinderSales.map((cyl, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400 tabular-nums">
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {cyl.quantity}
                      </span>
                      <span className="mx-1 text-zinc-400">&times;</span>
                      <span>{formatNum(cyl.pricePerUnit)}</span>
                    </span>
                    <span className="font-semibold tabular-nums shrink-0">
                      {formatNum(cyl.total)}
                    </span>
                  </div>
                ))}

                {/* Totals */}
                <div className="border-t border-zinc-200 dark:border-zinc-700 pt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Gross Total</span>
                    <span className="font-bold tabular-nums">{formatNum(report.grossTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-red-600">
                    <span className="flex items-center gap-1">
                      <Minus className="h-3 w-3" />
                      Expenses
                    </span>
                    <span className="font-bold tabular-nums">{formatNum(report.totalExpenses)}</span>
                  </div>
                  <div className="border-t border-zinc-300 dark:border-zinc-600 pt-1.5">
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="font-bold">Net Amount</span>
                      <span
                        className={`font-bold tabular-nums ${
                          report.netAmount >= 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {formatCurrency(report.netAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: Expenses */}
              <div className="p-3 sm:p-4 space-y-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">
                    Expenses
                  </p>
                </div>

                {aggExpenses.length > 0 ? (
                  <>
                    {aggExpenses.map((exp, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-zinc-600 dark:text-zinc-400 truncate mr-2">
                          {exp.category}
                        </span>
                        <span className="font-medium text-red-600 tabular-nums shrink-0">
                          {formatNum(exp.amount)}
                        </span>
                      </div>
                    ))}
                    <div className="border-t border-zinc-200 dark:border-zinc-700 pt-2">
                      <div className="flex justify-between text-sm font-bold">
                        <span>Total</span>
                        <span className="text-red-600 tabular-nums">
                          {formatNum(report.totalExpenses)}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-zinc-400 italic">No expenses recorded</p>
                )}

                {/* Cylinder summary badges */}
                <div className="pt-2 flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="text-xs">
                    {totalCylinders} cylinders
                  </Badge>
                  {(() => {
                    const sizeMap = new Map<string, number>();
                    for (const cyl of report.cylinderSales) {
                      sizeMap.set(cyl.cylinderSize, (sizeMap.get(cyl.cylinderSize) || 0) + cyl.quantity);
                    }
                    return Array.from(sizeMap.entries()).map(([size, qty]) => (
                      <Badge key={size} variant="secondary" className="text-xs">
                        {size}: {qty}
                      </Badge>
                    ));
                  })()}
                </div>
              </div>
            </div>

            {/* Per-Staff Breakdown */}
            {report.staffEntries && report.staffEntries.length > 0 && (
              <div className="border-t border-zinc-200 dark:border-zinc-800">
                <div className="px-3 sm:px-5 py-2 bg-zinc-50/50 dark:bg-zinc-900/30 border-b border-zinc-200 dark:border-zinc-800">
                  <p className="text-xs font-semibold text-violet-600 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Staff Breakdown {hasMultipleStaff && `(${report.staffEntries.length} staff)`}
                  </p>
                </div>

                <div className="p-3 sm:p-4 space-y-3">
                  {report.staffEntries.map((entry, idx) => (
                    <StaffEntrySection key={idx} entry={entry} showName={hasMultipleStaff || report.staffEntries!.length === 1} />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </motion.div>
  );
}

// ─── Staff Entry Section ───

function StaffEntrySection({
  entry,
  showName,
}: {
  entry: StaffEntry;
  showName: boolean;
}) {
  const totalCylinders = entry.items.reduce((s, i) => s + i.quantity, 0);
  const aggAddOns = aggregateByCategory(entry.addOns);
  const aggDeductions = aggregateByCategory(entry.deductions);

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* Staff Name Header */}
      {showName && (
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-violet-50/60 dark:bg-violet-950/20 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400">
              <User className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-sm sm:text-base">{entry.staffName}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {totalCylinders} cyl
          </Badge>
        </div>
      )}

      {/* Staff details in a responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 dark:divide-zinc-800">
        {/* Cylinder Sales */}
        <div className="p-3 sm:p-3.5 space-y-1">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Cylinders</p>
          {entry.items.map((item, i) => (
            <div key={i} className="flex justify-between text-xs sm:text-sm">
              <span className="text-zinc-500 tabular-nums">
                {item.quantity} &times; {formatNum(item.pricePerUnit)}
              </span>
              <span className="font-medium tabular-nums">{formatNum(item.total)}</span>
            </div>
          ))}
          {aggAddOns.length > 0 && (
            <>
              <div className="border-b border-dashed border-zinc-200 dark:border-zinc-700 my-1" />
              {aggAddOns.map((a, i) => (
                <div key={i} className="flex justify-between text-xs sm:text-sm">
                  <span className="text-blue-600 truncate mr-1">{a.category}</span>
                  <span className="font-medium text-blue-600 tabular-nums">{formatNum(a.amount)}</span>
                </div>
              ))}
            </>
          )}
          {aggDeductions.length > 0 && (
            <>
              <div className="border-b border-dashed border-zinc-200 dark:border-zinc-700 my-1" />
              {aggDeductions.map((d, i) => (
                <div key={i} className="flex justify-between text-xs sm:text-sm">
                  <span className="text-red-600 truncate mr-1">{d.category}</span>
                  <span className="font-medium text-red-600 tabular-nums">{formatNum(d.amount)}</span>
                </div>
              ))}
            </>
          )}
          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-1 mt-1">
            <div className="flex justify-between text-xs sm:text-sm font-bold">
              <span>Expected</span>
              <span className="tabular-nums">{formatCurrency(entry.amountExpected)}</span>
            </div>
          </div>
        </div>

        {/* Denominations */}
        <div className="p-3 sm:p-3.5 space-y-1">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Banknote className="h-3 w-3" />
            Cash Denominations
          </p>
          {entry.denominations.length > 0 ? (
            <>
              {/* Denomination table header */}
              <div className="flex justify-between text-[10px] text-zinc-400 uppercase tracking-wider pb-0.5 border-b border-zinc-100 dark:border-zinc-800">
                <span className="w-12">Note</span>
                <span className="w-10 text-center">&times;</span>
                <span className="text-right flex-1">Total</span>
              </div>
              {entry.denominations
                .filter((d) => d.count > 0)
                .sort((a, b) => b.note - a.note)
                .map((d, i) => (
                  <div key={i} className="flex justify-between text-xs sm:text-sm">
                    <span className="text-zinc-500 w-12 tabular-nums">{formatNum(d.note)}</span>
                    <span className="text-zinc-400 w-10 text-center tabular-nums">{d.count}</span>
                    <span className="font-medium tabular-nums text-right flex-1">{formatNum(d.total)}</span>
                  </div>
                ))}
              <div className="border-t border-zinc-200 dark:border-zinc-700 pt-1 mt-1">
                <div className="flex justify-between text-xs sm:text-sm font-bold">
                  <span>Cash Total</span>
                  <span className="tabular-nums text-emerald-600">
                    {formatCurrency(entry.denominationTotal)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-zinc-400 italic">No denominations</p>
          )}
        </div>

        {/* Summary */}
        <div className="p-3 sm:p-3.5 space-y-1.5">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Summary</p>
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-zinc-500">Gross Revenue</span>
            <span className="font-medium tabular-nums">{formatCurrency(entry.grossRevenue)}</span>
          </div>
          {entry.totalAddOns > 0 && (
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-blue-600">+ Add Ons</span>
              <span className="font-medium text-blue-600 tabular-nums">{formatCurrency(entry.totalAddOns)}</span>
            </div>
          )}
          {entry.totalDeductions > 0 && (
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-red-600">- Deductions</span>
              <span className="font-medium text-red-600 tabular-nums">{formatCurrency(entry.totalDeductions)}</span>
            </div>
          )}
          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-1">
            <div className="flex justify-between text-xs sm:text-sm font-bold">
              <span>Expected</span>
              <span className="tabular-nums">{formatCurrency(entry.amountExpected)}</span>
            </div>
          </div>
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-zinc-500">Cash Received</span>
            <span className="font-medium tabular-nums text-emerald-600">
              {formatCurrency(entry.denominationTotal)}
            </span>
          </div>
          {entry.cashDifference !== 0 && (
            <div className="flex justify-between text-xs sm:text-sm">
              <span className={entry.cashDifference > 0 ? "text-red-600" : "text-emerald-600"}>
                {entry.cashDifference > 0 ? "Shortage" : "Excess"}
              </span>
              <span
                className={`font-bold tabular-nums ${
                  entry.cashDifference > 0 ? "text-red-600" : "text-emerald-600"
                }`}
              >
                {formatCurrency(Math.abs(entry.cashDifference))}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
