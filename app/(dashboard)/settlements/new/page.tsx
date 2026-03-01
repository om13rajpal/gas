"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Trash2, Loader2, Calculator } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/lib/use-toast";
import { DenominationEntry } from "@/components/denomination-entry";

interface StaffOption {
  _id: string;
  name: string;
}

interface InventoryOption {
  cylinderSize: string;
  pricePerUnit: number;
  fullStock: number;
}

interface SettlementItem {
  cylinderSize: string;
  quantity: number;
}

export default function NewSettlementPage() {
  const router = useRouter();
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryOption[]>([]);
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<SettlementItem[]>([{ cylinderSize: "", quantity: 0 }]);
  const [addPayment, setAddPayment] = useState(0);
  const [reducePayment, setReducePayment] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [actualCash, setActualCash] = useState(0);
  const [notes, setNotes] = useState("");
  const [denominations, setDenominations] = useState<{ note: number; count: number; total: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/staff").then((r) => r.json()),
      fetch("/api/inventory").then((r) => r.json()),
    ]).then(([s, i]) => {
      setStaffList(s);
      setInventoryList(i);
    });
  }, []);

  const getPrice = (size: string) => {
    return inventoryList.find((i) => i.cylinderSize === size)?.pricePerUnit || 0;
  };

  const grossRevenue = items.reduce((acc, item) => {
    return acc + item.quantity * getPrice(item.cylinderSize);
  }, 0);

  const expectedCash = grossRevenue + addPayment - reducePayment - expenses;
  const shortage = Math.max(0, expectedCash - actualCash);

  const addItem = () => {
    setItems([...items, { cylinderSize: "", quantity: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof SettlementItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const hasValidItems = items.some((i) => i.cylinderSize && i.quantity > 0);
  const canSubmit = !!staffId && hasValidItems;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    if (!canSubmit) return;

    setSaving(true);
    const res = await fetch("/api/settlements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        staffId,
        date,
        items: items.filter((i) => i.cylinderSize && i.quantity > 0),
        addPayment,
        reducePayment,
        expenses,
        actualCash,
        notes,
        denominations: denominations.filter((d) => d.count > 0),
        denominationTotal: denominations.reduce((sum, d) => sum + d.total, 0),
      }),
    });

    if (res.ok) {
      toast({ title: "Settlement created", description: "New settlement has been recorded", variant: "success" });
      router.push("/settlements");
    } else {
      toast({ title: "Error", description: "Failed to create settlement", variant: "destructive" });
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/settlements">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Settlement</h1>
          <p className="text-zinc-500 text-sm mt-1">Record a daily settlement entry</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Staff & Date */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Staff Member *</Label>
                <Select value={staffId} onValueChange={setStaffId}>
                  <SelectTrigger className={attempted && !staffId ? "border-red-400" : ""}>
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffList.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {attempted && !staffId && (
                  <p className="text-xs text-red-500">Please select a staff member</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
            </CardContent>
          </Card>

          {/* Cylinder Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Cylinders Delivered</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-3 w-3" />
                  Add Cylinder
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-end gap-3">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Size</Label>
                    <Select
                      value={item.cylinderSize}
                      onValueChange={(v) => updateItem(idx, "cylinderSize", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryList.map((inv) => (
                          <SelectItem key={inv.cylinderSize} value={inv.cylinderSize}>
                            {inv.cylinderSize} — {formatCurrency(inv.pricePerUnit)} (Stock: {inv.fullStock})
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
                      onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="w-28 text-right">
                    <p className="text-sm font-medium">
                      {formatCurrency(item.quantity * getPrice(item.cylinderSize))}
                    </p>
                  </div>
                  {items.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
              <div className="text-right pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-sm text-zinc-500">Gross Revenue</p>
                <p className="text-xl font-bold">{formatCurrency(grossRevenue)}</p>
              </div>
              {attempted && !hasValidItems && (
                <p className="text-xs text-red-500">Add at least one cylinder with quantity greater than 0</p>
              )}
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
                  value={addPayment || ""}
                  onChange={(e) => setAddPayment(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Reduce Payment (Discounts/Returns)</Label>
                <Input
                  type="number"
                  min={0}
                  value={reducePayment || ""}
                  onChange={(e) => setReducePayment(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Expenses</Label>
                <Input
                  type="number"
                  min={0}
                  value={expenses || ""}
                  onChange={(e) => setExpenses(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Actual Cash Received *</Label>
                <Input
                  type="number"
                  min={0}
                  value={actualCash || ""}
                  onChange={(e) => setActualCash(parseFloat(e.target.value) || 0)}
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
                denominations={denominations}
                onChange={setDenominations}
                actualCash={actualCash}
              />
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                  <p className="text-lg font-bold text-emerald-600">{formatCurrency(grossRevenue)}</p>
                </div>
                <div className="p-3 rounded-lg bg-white dark:bg-zinc-950">
                  <p className="text-xs text-zinc-500">Expected Cash</p>
                  <p className="text-lg font-bold">{formatCurrency(expectedCash)}</p>
                </div>
                <div className="p-3 rounded-lg bg-white dark:bg-zinc-950">
                  <p className="text-xs text-zinc-500">Actual Cash</p>
                  <p className="text-lg font-bold text-blue-600">{formatCurrency(actualCash)}</p>
                </div>
                <div className="p-3 rounded-lg bg-white dark:bg-zinc-950">
                  <p className="text-xs text-zinc-500">Shortage</p>
                  <p className={`text-lg font-bold ${shortage > 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {formatCurrency(shortage)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3">
            {attempted && !canSubmit && (
              <p className="text-sm text-red-500 mr-auto">
                {!staffId ? "Select a staff member" : "Add cylinders with quantity > 0"}
              </p>
            )}
            <Link href="/settlements">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" size="lg" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create Settlement
            </Button>
          </div>
        </motion.div>
      </form>
    </div>
  );
}
