"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, FileText, Eye } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
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

interface SettlementRow {
  _id: string;
  staff: { _id: string; name: string };
  date: string;
  items: Array<{ cylinderSize: string; quantity: number }>;
  grossRevenue: number;
  expenses: number;
  expectedCash: number;
  actualCash: number;
  shortage: number;
}

export default function SettlementsPage() {
  const [data, setData] = useState<{ settlements: SettlementRow[]; total: number; pages: number }>({
    settlements: [],
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/settlements?page=${page}&limit=15`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Settlements</h1>
          <p className="text-zinc-500 text-sm mt-1">{data.total} total settlements</p>
        </div>
        <Link href="/settlements/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Settlement
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="block sm:hidden space-y-3">
            {data.settlements.map((s) => (
              <Link key={s._id} href={`/settlements/${s._id}`}>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{s.staff.name}</p>
                      <p className="text-xs text-zinc-500">{formatDate(s.date)}</p>
                    </div>
                    <Badge variant={s.shortage > 0 ? "destructive" : "success"}>
                      {formatCurrency(s.shortage)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1 flex-wrap">
                      {s.items.map((item, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">
                          {item.quantity}x {item.cylinderSize}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm font-semibold text-emerald-600">{formatCurrency(s.grossRevenue)}</p>
                  </div>
                </motion.div>
              </Link>
            ))}
            {data.settlements.length === 0 && (
              <div className="text-center py-12 text-zinc-500">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No settlements yet
              </div>
            )}
          </div>

          {/* Desktop table view */}
          <Card className="hidden sm:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Cylinders</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Expenses</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>Shortage</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.settlements.map((s) => (
                    <motion.tr
                      key={s._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-zinc-100 dark:border-zinc-800"
                    >
                      <TableCell className="font-medium">
                        <Link href={`/settlements/${s._id}`} className="hover:underline">
                          {formatDate(s.date)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/staff/${s.staff._id}/ledger`} className="hover:underline">
                          {s.staff.name}
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
                      <TableCell>{formatCurrency(s.expenses)}</TableCell>
                      <TableCell>{formatCurrency(s.expectedCash)}</TableCell>
                      <TableCell>{formatCurrency(s.actualCash)}</TableCell>
                      <TableCell>
                        <Badge variant={s.shortage > 0 ? "destructive" : "success"}>
                          {formatCurrency(s.shortage)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/settlements/${s._id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </motion.tr>
                  ))}
                  {data.settlements.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-zinc-500">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        No settlements yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {data.pages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="flex items-center text-sm text-zinc-500">
            Page {page} of {data.pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
