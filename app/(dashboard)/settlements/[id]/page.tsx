"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Loader2,
  Plus,
  Calculator,
  Calendar,
  User,
  Banknote,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DenominationEntry } from "@/components/denomination-entry";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "@/lib/use-toast";

interface SettlementItem {
  cylinderSize: string;
  quantity: number;
  pricePerUnit: number;
  total: number;
}

interface Denomination {
  note: number;
  count: number;
  total: number;
}

interface SettlementData {
  _id: string;
  staff: { _id: string; name: string; phone?: string };
  customer?: { _id: string; name: string; phone?: string };
  date: string;
  items: SettlementItem[];
  grossRevenue: number;
  addPayment: number;
  reducePayment: number;
  expenses: number;
  expectedCash: number;
  actualCash: number;
  shortage: number;
  notes: string;
  denominations: Denomination[];
  denominationTotal: number;
  createdAt: string;
  updatedAt: string;
}

interface InventoryOption {
  cylinderSize: string;
  pricePerUnit: number;
  fullStock: number;
}

interface EditItem {
  cylinderSize: string;
  quantity: number;
}

export default function SettlementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [settlement, setSettlement] = useState<SettlementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inventoryList, setInventoryList] = useState<InventoryOption[]>([]);
  const [editDate, setEditDate] = useState("");
  const [editItems, setEditItems] = useState<EditItem[]>([]);
  const [editAddPayment, setEditAddPayment] = useState(0);
  const [editReducePayment, setEditReducePayment] = useState(0);
  const [editExpenses, setEditExpenses] = useState(0);
  const [editActualCash, setEditActualCash] = useState(0);
  const [editNotes, setEditNotes] = useState("");
  const [editDenominations, setEditDenominations] = useState<Denomination[]>([]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/settlements/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch");
        return r.json();
      })
      .then((data) => {
        setSettlement(data);
      })
      .catch(() => {
        toast({ title: "Error", description: "Settlement not found", variant: "destructive" });
        router.push("/settlements");
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  const startEditing = () => {
    if (!settlement) return;
    // Fetch inventory for edit form
    fetch("/api/inventory")
      .then((r) => r.json())
      .then((inv) => setInventoryList(inv));

    setEditDate(new Date(settlement.date).toISOString().split("T")[0]);
    setEditItems(
      settlement.items.map((item) => ({
        cylinderSize: item.cylinderSize,
        quantity: item.quantity,
      }))
    );
    setEditAddPayment(settlement.addPayment);
    setEditReducePayment(settlement.reducePayment);
    setEditExpenses(settlement.expenses);
    setEditActualCash(settlement.actualCash);
    setEditNotes(settlement.notes);
    setEditDenominations(settlement.denominations.length > 0 ? settlement.denominations : []);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  const getPrice = (size: string) => {
    return inventoryList.find((i) => i.cylinderSize === size)?.pricePerUnit || 0;
  };

  const editGrossRevenue = editItems.reduce(
    (acc, item) => acc + item.quantity * getPrice(item.cylinderSize),
    0
  );
  const editExpectedCash = editGrossRevenue + editAddPayment - editReducePayment - editExpenses;
  const editShortage = Math.max(0, editExpectedCash - editActualCash);

  const addEditItem = () => {
    setEditItems([...editItems, { cylinderSize: "", quantity: 0 }]);
  };

  const removeEditItem = (index: number) => {
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const updateEditItem = (index: number, field: keyof EditItem, value: string | number) => {
    const newItems = [...editItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setEditItems(newItems);
  };

  const selectedSizes = editItems.map((i) => i.cylinderSize).filter(Boolean);

  const getStockWarning = (item: EditItem) => {
    if (!item.cylinderSize || item.quantity <= 0) return null;
    const inv = inventoryList.find((i) => i.cylinderSize === item.cylinderSize);
    if (!inv) return null;
    // Account for the old settlement's items being reversed
    const oldItem = settlement?.items.find((oi) => oi.cylinderSize === item.cylinderSize);
    const availableStock = inv.fullStock + (oldItem?.quantity || 0);
    if (item.quantity > availableStock) {
      return `Only ${availableStock} available after rollback`;
    }
    return null;
  };

  const hasValidItems = editItems.some((i) => i.cylinderSize && i.quantity > 0);

  const handleSave = async () => {
    if (!hasValidItems) {
      toast({
        title: "Validation Error",
        description: "Add at least one cylinder with quantity greater than 0",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/settlements/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: editDate,
          items: editItems.filter((i) => i.cylinderSize && i.quantity > 0),
          addPayment: editAddPayment,
          reducePayment: editReducePayment,
          expenses: editExpenses,
          actualCash: editActualCash,
          notes: editNotes,
          denominations: editDenominations.filter((d) => d.count > 0),
          denominationTotal: editDenominations.reduce((sum, d) => sum + d.total, 0),
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSettlement(updated);
        setEditing(false);
        toast({
          title: "Settlement updated",
          description: "Settlement has been updated with inventory rollback",
          variant: "success",
        });
      } else {
        const data = await res.json().catch(() => null);
        toast({
          title: "Error",
          description: data?.error || "Failed to update settlement",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/settlements/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({
          title: "Settlement deleted",
          description: "Settlement has been deleted and inventory rolled back",
          variant: "success",
        });
        router.push("/settlements");
      } else {
        const data = await res.json().catch(() => null);
        toast({
          title: "Error",
          description: data?.error || "Failed to delete settlement",
          variant: "destructive",
        });
        setDeleting(false);
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
      setDeleting(false);
    }
    setShowDeleteDialog(false);
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-60 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (!settlement) return null;

  // --- EDIT MODE ---
  if (editing) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={cancelEditing}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Settlement</h1>
            <p className="text-zinc-500 text-sm mt-1">
              Staff: {settlement.staff.name} -- Editing will rollback and re-apply inventory
            </p>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Date */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Staff Member</Label>
                <Input value={settlement.staff.name} disabled className="bg-zinc-50 dark:bg-zinc-900" />
                <p className="text-xs text-zinc-400">Staff cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} required />
              </div>
            </CardContent>
          </Card>

          {/* Cylinder Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Cylinders Delivered</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addEditItem}>
                  <Plus className="h-3 w-3" />
                  Add Cylinder
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {editItems.map((item, idx) => {
                const stockWarning = getStockWarning(item);
                const availableSizes = inventoryList.filter(
                  (inv) => inv.cylinderSize === item.cylinderSize || !selectedSizes.includes(inv.cylinderSize)
                );
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-end gap-3">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Size</Label>
                        <Select
                          value={item.cylinderSize}
                          onValueChange={(v) => updateEditItem(idx, "cylinderSize", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableSizes.map((inv) => (
                              <SelectItem key={inv.cylinderSize} value={inv.cylinderSize}>
                                {inv.cylinderSize} -- {formatCurrency(inv.pricePerUnit)} (Stock: {inv.fullStock})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24 space-y-1">
                        <Label className="text-xs">Qty</Label>
                        <Input
                          type="number"
                          min={0}
                          value={item.quantity || ""}
                          onChange={(e) => updateEditItem(idx, "quantity", parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="w-28 text-right">
                        <p className="text-sm font-medium">
                          {formatCurrency(item.quantity * getPrice(item.cylinderSize))}
                        </p>
                      </div>
                      {editItems.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeEditItem(idx)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                    {stockWarning && <p className="text-xs text-amber-600 pl-1">{stockWarning}</p>}
                  </div>
                );
              })}
              <div className="text-right pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-sm text-zinc-500">Gross Revenue</p>
                <p className="text-xl font-bold">{formatCurrency(editGrossRevenue)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Payments & Cash */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payments & Cash</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Add Payment (Extra collected)</Label>
                <Input
                  type="number"
                  min={0}
                  value={editAddPayment || ""}
                  onChange={(e) => setEditAddPayment(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Reduce Payment (Discounts/Returns)</Label>
                <Input
                  type="number"
                  min={0}
                  value={editReducePayment || ""}
                  onChange={(e) => setEditReducePayment(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Expenses</Label>
                <Input
                  type="number"
                  min={0}
                  value={editExpenses || ""}
                  onChange={(e) => setEditExpenses(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Actual Cash Received *</Label>
                <Input
                  type="number"
                  min={0}
                  value={editActualCash || ""}
                  onChange={(e) => setEditActualCash(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </CardContent>
          </Card>

          {/* Denomination Entry */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cash Denomination (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <DenominationEntry
                denominations={editDenominations}
                onChange={setEditDenominations}
                actualCash={editActualCash}
              />
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Input
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Any additional notes..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="bg-zinc-50 dark:bg-zinc-900 border-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Settlement Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="p-3 rounded-lg bg-white dark:bg-zinc-950">
                  <p className="text-xs text-zinc-500">Gross Revenue</p>
                  <p className="text-lg font-bold text-emerald-600">{formatCurrency(editGrossRevenue)}</p>
                </div>
                <div className="p-3 rounded-lg bg-white dark:bg-zinc-950">
                  <p className="text-xs text-zinc-500">Expected Cash</p>
                  <p className="text-lg font-bold">{formatCurrency(editExpectedCash)}</p>
                </div>
                <div className="p-3 rounded-lg bg-white dark:bg-zinc-950">
                  <p className="text-xs text-zinc-500">Actual Cash</p>
                  <p className="text-lg font-bold text-blue-600">{formatCurrency(editActualCash)}</p>
                </div>
                <div className="p-3 rounded-lg bg-white dark:bg-zinc-950">
                  <p className="text-xs text-zinc-500">Shortage</p>
                  <p className={`text-lg font-bold ${editShortage > 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {formatCurrency(editShortage)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={cancelEditing}>
              Cancel
            </Button>
            <Button size="lg" disabled={saving || !hasValidItems} onClick={handleSave}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- VIEW MODE ---
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/settlements">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Settlement Details</h1>
            <p className="text-zinc-500 text-sm mt-1">
              {formatDate(settlement.date)} -- {settlement.staff.name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={startEditing}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Staff</p>
                  <p className="font-medium">{settlement.staff.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                  <Calendar className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Date</p>
                  <p className="font-medium">{formatDate(settlement.date)}</p>
                </div>
              </div>
              {settlement.customer && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                    <User className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Customer</p>
                    <p className="font-medium">{settlement.customer.name}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cylinders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cylinders Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {settlement.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{item.cylinderSize}</Badge>
                    <span className="text-sm text-zinc-500">
                      {item.quantity} x {formatCurrency(item.pricePerUnit)}
                    </span>
                  </div>
                  <span className="font-semibold">{formatCurrency(item.total)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <span className="text-sm text-zinc-500">Gross Revenue</span>
                <span className="text-xl font-bold text-emerald-600">
                  {formatCurrency(settlement.grossRevenue)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card className="bg-zinc-50 dark:bg-zinc-900 border-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="p-3 rounded-lg bg-white dark:bg-zinc-950">
                <p className="text-xs text-zinc-500">Gross Revenue</p>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(settlement.grossRevenue)}</p>
              </div>
              <div className="p-3 rounded-lg bg-white dark:bg-zinc-950">
                <p className="text-xs text-zinc-500">Add Payment</p>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(settlement.addPayment)}</p>
              </div>
              <div className="p-3 rounded-lg bg-white dark:bg-zinc-950">
                <p className="text-xs text-zinc-500">Reduce Payment</p>
                <p className="text-lg font-bold text-orange-600">{formatCurrency(settlement.reducePayment)}</p>
              </div>
              <div className="p-3 rounded-lg bg-white dark:bg-zinc-950">
                <p className="text-xs text-zinc-500">Expenses</p>
                <p className="text-lg font-bold text-amber-600">{formatCurrency(settlement.expenses)}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 mt-3">
              <div className="p-3 rounded-lg bg-white dark:bg-zinc-950">
                <p className="text-xs text-zinc-500">Expected Cash</p>
                <p className="text-lg font-bold">{formatCurrency(settlement.expectedCash)}</p>
              </div>
              <div className="p-3 rounded-lg bg-white dark:bg-zinc-950">
                <p className="text-xs text-zinc-500">Actual Cash</p>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(settlement.actualCash)}</p>
              </div>
              <div className="p-3 rounded-lg bg-white dark:bg-zinc-950">
                <p className="text-xs text-zinc-500">Shortage</p>
                <p
                  className={`text-lg font-bold ${settlement.shortage > 0 ? "text-red-600" : "text-emerald-600"}`}
                >
                  {formatCurrency(settlement.shortage)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Denominations */}
        {settlement.denominations && settlement.denominations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                Cash Denomination
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {settlement.denominations
                  .filter((d) => d.count > 0)
                  .map((d, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="font-mono">
                          {formatCurrency(d.note)}
                        </Badge>
                        <span className="text-sm text-zinc-500">x {d.count}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(d.total)}</span>
                    </div>
                  ))}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <span className="text-sm font-medium">Denomination Total</span>
                  <span className="text-lg font-bold">{formatCurrency(settlement.denominationTotal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {settlement.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{settlement.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Timestamps */}
        <div className="text-xs text-zinc-400 text-right space-y-1">
          <p>Created: {new Date(settlement.createdAt).toLocaleString("en-IN")}</p>
          {settlement.updatedAt !== settlement.createdAt && (
            <p>Updated: {new Date(settlement.updatedAt).toLocaleString("en-IN")}</p>
          )}
        </div>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Settlement</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this settlement? This will reverse the inventory
              changes (restore full stock and subtract empty stock) and reverse any debt added to{" "}
              <strong>{settlement.staff.name}</strong>. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm">
            <p className="font-medium text-red-700 dark:text-red-400">
              Settlement on {formatDate(settlement.date)}
            </p>
            <p className="text-red-600 dark:text-red-400 mt-1">
              Revenue: {formatCurrency(settlement.grossRevenue)} | Shortage:{" "}
              {formatCurrency(settlement.shortage)}
            </p>
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete Settlement
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
