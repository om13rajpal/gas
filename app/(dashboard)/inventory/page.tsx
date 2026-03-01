"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Package, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/lib/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface InventoryItem {
  _id: string;
  cylinderSize: string;
  fullStock: number;
  emptyStock: number;
  pricePerUnit: number;
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<InventoryItem>>({});
  const [saving, setSaving] = useState(false);

  const fetchInventory = () => {
    fetch("/api/inventory")
      .then((r) => r.json())
      .then(setInventory)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchInventory(); }, []);

  const handleEdit = (item: InventoryItem) => {
    setEditing(item._id);
    setEditValues({
      fullStock: item.fullStock,
      emptyStock: item.emptyStock,
      pricePerUnit: item.pricePerUnit,
    });
  };

  const handleSave = async (cylinderSize: string) => {
    setSaving(true);
    await fetch("/api/inventory", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cylinderSize, ...editValues }),
    });
    setEditing(null);
    setSaving(false);
    toast({ title: "Inventory updated", description: `${cylinderSize} cylinder stock updated`, variant: "success" });
    fetchInventory();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage cylinder stock and prices</p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Package className="h-3 w-3" />
          {inventory.reduce((a, i) => a + i.fullStock + i.emptyStock, 0)} total cylinders
        </Badge>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid gap-4 sm:grid-cols-2"
      >
        {inventory.map((item, idx) => (
          <motion.div
            key={item._id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      <Package className="h-4 w-4" />
                    </div>
                    {item.cylinderSize} Cylinder
                  </CardTitle>
                  {editing !== item._id ? (
                    <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                      Edit
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleSave(item.cylinderSize)}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      Save
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {editing === item._id ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <Label className="text-xs">Full Stock</Label>
                      <Input
                        type="number"
                        value={editValues.fullStock ?? ""}
                        onChange={(e) => setEditValues({ ...editValues, fullStock: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Empty Stock</Label>
                      <Input
                        type="number"
                        value={editValues.emptyStock ?? ""}
                        onChange={(e) => setEditValues({ ...editValues, emptyStock: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Price per Unit</Label>
                      <Input
                        type="number"
                        value={editValues.pricePerUnit ?? ""}
                        onChange={(e) => setEditValues({ ...editValues, pricePerUnit: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                      <p className="text-xs text-zinc-500 mb-1">Full</p>
                      <p className="text-xl font-bold text-emerald-600">{item.fullStock}</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                      <p className="text-xs text-zinc-500 mb-1">Empty</p>
                      <p className="text-xl font-bold text-amber-600">{item.emptyStock}</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800">
                      <p className="text-xs text-zinc-500 mb-1">Price</p>
                      <p className="text-xl font-bold">{formatCurrency(item.pricePerUnit)}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
