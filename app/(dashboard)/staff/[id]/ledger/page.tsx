"use client";

import { useEffect, useState, Fragment } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, User, Loader2, Banknote } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "@/lib/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface StaffInfo {
  _id: string;
  name: string;
  phone: string;
  address: string;
  debtBalance: number;
}

interface LedgerSettlement {
  _id: string;
  date: string;
  items: Array<{ cylinderSize: string; quantity: number; total: number }>;
  grossRevenue: number;
  addPayment: number;
  reducePayment: number;
  expenses: number;
  expectedCash: number;
  actualCash: number;
  shortage: number;
  denominations?: Array<{ note: number; count: number; total: number }>;
  denominationTotal?: number;
}

interface DebtPaymentRecord {
  _id: string;
  amount: number;
  note: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function StaffLedgerPage() {
  const { id } = useParams();
  const [staff, setStaff] = useState<StaffInfo | null>(null);
  const [settlements, setSettlements] = useState<LedgerSettlement[]>([]);
  const [debtPayments, setDebtPayments] = useState<DebtPaymentRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [paying, setPaying] = useState(false);
  const [expandedSettlement, setExpandedSettlement] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchData = (p: number = page) => {
    setLoading(true);
    fetch(`/api/staff/${id}/ledger?page=${p}&limit=20`)
      .then((r) => r.json())
      .then((data) => {
        setStaff(data.staff);
        setSettlements(data.settlements);
        setDebtPayments(data.debtPayments || []);
        if (data.pagination) setPagination(data.pagination);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData(page);
  }, [id, page]);

  const handlePayDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return;

    setPaying(true);
    const res = await fetch(`/api/staff/${id}/debt-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, note: payNote }),
    });

    if (res.ok) {
      toast({ title: "Payment recorded", description: `${formatCurrency(amount)} debt cleared`, variant: "success" });
      setPayDialogOpen(false);
      setPayAmount("");
      setPayNote("");
      fetchData();
    } else {
      const data = await res.json();
      toast({ title: "Error", description: data.error, variant: "destructive" });
    }
    setPaying(false);
  };

  if (loading && !staff) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!staff) {
    return <div className="text-center py-12 text-zinc-500">Staff member not found</div>;
  }

  const totalRevenue = settlements.reduce((a, s) => a + s.grossRevenue, 0);
  const totalShortage = settlements.reduce((a, s) => a + s.shortage, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/staff">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Staff Ledger</h1>
          <p className="text-zinc-500 text-sm mt-1">Settlement history and debt tracking</p>
        </div>
      </div>

      {/* Staff Info Card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <User className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">{staff.name}</h2>
                <p className="text-sm text-zinc-500">{staff.phone || "No phone"} &bull; {staff.address || "No address"}</p>
              </div>
              <div className="text-right space-y-2">
                <div>
                  <p className="text-sm text-zinc-500">Debt Balance</p>
                  <Badge variant={staff.debtBalance > 0 ? "destructive" : "success"} className="text-base px-3 py-1">
                    {formatCurrency(staff.debtBalance)}
                  </Badge>
                </div>
                {staff.debtBalance > 0 && (
                  <Button size="sm" onClick={() => setPayDialogOpen(true)}>
                    <Banknote className="h-4 w-4" />
                    Pay Debt
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900">
                <p className="text-xs text-zinc-500">Total Settlements</p>
                <p className="text-lg font-bold">{pagination.total}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900">
                <p className="text-xs text-zinc-500">Page Revenue</p>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900">
                <p className="text-xs text-zinc-500">Page Shortage</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(totalShortage)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Debt Payments */}
      {debtPayments.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Debt Payments</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debtPayments.map((p) => (
                    <TableRow key={p._id}>
                      <TableCell className="font-medium">{formatDate(p.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant="success">{formatCurrency(p.amount)}</Badge>
                      </TableCell>
                      <TableCell className="text-zinc-500">{p.note || "\u2014"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Settlement History */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Settlement History</CardTitle>
          </CardHeader>
          {/* Mobile card view */}
          <CardContent className="block sm:hidden space-y-3">
            {settlements.map((s) => (
              <Link key={s._id} href={`/settlements/${s._id}`}>
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={(e) => {
                      if (s.denominations && s.denominations.length > 0) {
                        e.preventDefault();
                        setExpandedSettlement(expandedSettlement === s._id ? null : s._id);
                      }
                    }}
                  >
                    <p className="font-medium">{formatDate(s.date)}</p>
                    <Badge variant={s.shortage > 0 ? "warning" : "success"}>
                      {s.shortage > 0 ? "Pending" : "Cleared"}
                    </Badge>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {s.items.map((item, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px]">
                        {item.quantity}x {item.cylinderSize}
                      </Badge>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <p className="text-xs text-zinc-500">Revenue</p>
                      <p className="font-semibold">{formatCurrency(s.grossRevenue)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Actual</p>
                      <p className="font-semibold">{formatCurrency(s.actualCash)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Shortage</p>
                      <p className={`font-semibold ${s.shortage > 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {formatCurrency(s.shortage)}
                      </p>
                    </div>
                  </div>
                  {expandedSettlement === s._id && s.denominations && s.denominations.length > 0 && (
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <p className="text-xs text-zinc-500 mb-2">Denomination Breakdown</p>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        {s.denominations.map((d, i) => (
                          <div key={i} className="flex justify-between">
                            <span>{formatCurrency(d.note)} x {d.count}</span>
                            <span className="font-medium">{formatCurrency(d.total)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between mt-1 pt-1 border-t border-zinc-100 dark:border-zinc-800 text-xs font-medium">
                        <span>Total</span>
                        <span>{formatCurrency(s.denominationTotal || 0)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            ))}
            {settlements.length === 0 && (
              <div className="text-center py-12 text-zinc-500">
                No settlements found for this staff member
              </div>
            )}
          </CardContent>

          {/* Desktop table view */}
          <CardContent className="hidden sm:block p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Cylinders</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Actual</TableHead>
                  <TableHead>Shortage</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlements.map((s) => (
                  <Fragment key={s._id}>
                    <TableRow
                      className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900"
                      onClick={() => {
                        if (s.denominations && s.denominations.length > 0) {
                          setExpandedSettlement(expandedSettlement === s._id ? null : s._id);
                        }
                      }}
                    >
                      <TableCell className="font-medium">
                        <Link href={`/settlements/${s._id}`} className="hover:underline">
                          {formatDate(s.date)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {s.items.map((item, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">
                              {item.quantity}x {item.cylinderSize}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(s.grossRevenue)}</TableCell>
                      <TableCell>{formatCurrency(s.expectedCash)}</TableCell>
                      <TableCell>{formatCurrency(s.actualCash)}</TableCell>
                      <TableCell>
                        <Badge variant={s.shortage > 0 ? "destructive" : "success"}>
                          {formatCurrency(s.shortage)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge variant={s.shortage > 0 ? "warning" : "success"}>
                            {s.shortage > 0 ? "Pending" : "Cleared"}
                          </Badge>
                          {s.denominations && s.denominations.length > 0 && (
                            <Badge variant="secondary" className="text-[10px]">
                              Denom
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedSettlement === s._id && s.denominations && s.denominations.length > 0 && (
                      <TableRow key={`${s._id}-denom`}>
                        <TableCell colSpan={7} className="bg-zinc-50 dark:bg-zinc-900">
                          <div className="py-2">
                            <p className="text-xs text-zinc-500 mb-2 font-medium">Denomination Breakdown</p>
                            <div className="flex gap-4 flex-wrap text-sm">
                              {s.denominations.map((d, i) => (
                                <span key={i}>
                                  {formatCurrency(d.note)} x {d.count} = <span className="font-medium">{formatCurrency(d.total)}</span>
                                </span>
                              ))}
                              <span className="font-bold">
                                Total: {formatCurrency(s.denominationTotal || 0)}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
                {settlements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-zinc-500">
                      No settlements found for this staff member
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="flex items-center text-sm text-zinc-500">
            Page {page} of {pagination.pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pagination.pages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}

      {/* Pay Debt Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay Debt</DialogTitle>
            <DialogDescription>
              Record a debt payment for {staff.name}. Current debt: {formatCurrency(staff.debtBalance)}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePayDebt} className="space-y-4">
            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input
                type="number"
                min={1}
                max={staff.debtBalance}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                required
                placeholder={`Max: ${formatCurrency(staff.debtBalance)}`}
              />
            </div>
            <div className="space-y-2">
              <Label>Note (Optional)</Label>
              <Input
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                placeholder="Payment note..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPayDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={paying}>
                {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Record Payment
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
