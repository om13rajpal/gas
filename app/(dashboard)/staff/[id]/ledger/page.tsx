"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, User } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
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
}

export default function StaffLedgerPage() {
  const { id } = useParams();
  const [staff, setStaff] = useState<StaffInfo | null>(null);
  const [settlements, setSettlements] = useState<LedgerSettlement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/staff/${id}/ledger`)
      .then((r) => r.json())
      .then((data) => {
        setStaff(data.staff);
        setSettlements(data.settlements);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
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
              <div className="text-right">
                <p className="text-sm text-zinc-500">Debt Balance</p>
                <Badge variant={staff.debtBalance > 0 ? "destructive" : "success"} className="text-base px-3 py-1">
                  {formatCurrency(staff.debtBalance)}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900">
                <p className="text-xs text-zinc-500">Total Settlements</p>
                <p className="text-lg font-bold">{settlements.length}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900">
                <p className="text-xs text-zinc-500">Total Revenue</p>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900">
                <p className="text-xs text-zinc-500">Total Shortage</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(totalShortage)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Settlement History */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Settlement History</CardTitle>
          </CardHeader>
          {/* Mobile card view */}
          <CardContent className="block sm:hidden space-y-3">
            {settlements.map((s) => (
              <div
                key={s._id}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
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
              </div>
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
                  <TableRow key={s._id}>
                    <TableCell className="font-medium">{formatDate(s.date)}</TableCell>
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
                      <Badge variant={s.shortage > 0 ? "warning" : "success"}>
                        {s.shortage > 0 ? "Pending" : "Cleared"}
                      </Badge>
                    </TableCell>
                  </TableRow>
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
    </div>
  );
}
