"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface Denomination {
  note: number;
  count: number;
  total: number;
}

interface DenominationEntryProps {
  denominations: Denomination[];
  onChange: (denominations: Denomination[]) => void;
  actualCash?: number;
}

const NOTES = [2000, 500, 200, 100, 50, 20, 10];

export function DenominationEntry({ denominations, onChange, actualCash }: DenominationEntryProps) {
  const denominationTotal = denominations.reduce((sum, d) => sum + d.total, 0);
  const mismatch = actualCash !== undefined && actualCash > 0 && denominationTotal > 0 && denominationTotal !== actualCash;

  const handleCountChange = (note: number, count: number) => {
    const updated = NOTES.map((n) => {
      if (n === note) {
        return { note: n, count, total: n * count };
      }
      const existing = denominations.find((d) => d.note === n);
      return existing || { note: n, count: 0, total: 0 };
    });
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        {NOTES.map((note) => {
          const denom = denominations.find((d) => d.note === note);
          const count = denom?.count || 0;
          const subtotal = note * count;

          return (
            <div key={note} className="flex items-center gap-3">
              <div className="w-16 text-right">
                <Badge variant="secondary" className="font-mono text-xs">
                  {formatCurrency(note)}
                </Badge>
              </div>
              <span className="text-zinc-400 text-sm">x</span>
              <Input
                type="number"
                min={0}
                value={count || ""}
                onChange={(e) => handleCountChange(note, parseInt(e.target.value) || 0)}
                className="w-20 text-center"
                placeholder="0"
              />
              <span className="text-zinc-400 text-sm">=</span>
              <span className="w-24 text-right text-sm font-medium">
                {formatCurrency(subtotal)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
        <Label className="text-sm font-medium">Denomination Total</Label>
        <span className={`text-lg font-bold ${mismatch ? "text-amber-600" : "text-emerald-600"}`}>
          {formatCurrency(denominationTotal)}
        </span>
      </div>

      {mismatch && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Denomination total ({formatCurrency(denominationTotal)}) does not match actual cash ({formatCurrency(actualCash!)}).
            Difference: {formatCurrency(Math.abs(denominationTotal - actualCash!))}
          </p>
        </div>
      )}
    </div>
  );
}
