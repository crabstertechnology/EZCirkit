'use client';

import React, { useState, useEffect } from 'react';
import { InventoryTransaction } from '@/types/billing';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, History, ArrowDownRight, ArrowUpRight, Wrench, RefreshCw } from 'lucide-react';

export const InventoryLedgerTab: React.FC = () => {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const fetchLedger = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/billing/ledger');
      const data = await res.json();
      if (data.transactions) {
        setTransactions(data.transactions);
      }
    } catch (e) {
      console.error('Failed to fetch ledger:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  const filtered = React.useMemo(() => {
    return transactions.filter((tx) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        tx.productName?.toLowerCase().includes(q) ||
        tx.sku?.toLowerCase().includes(q) ||
        tx.user?.toLowerCase().includes(q) ||
        tx.notes?.toLowerCase().includes(q) ||
        tx.referenceId?.toLowerCase().includes(q);

      const matchType = typeFilter === 'all' || tx.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [transactions, search, typeFilter]);

  const getTypeBadge = (type: string, qty: number) => {
    switch (type) {
      case 'sale':
        return (
          <Badge variant="outline" className="text-rose-600 border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/20 text-[10px] gap-1">
            <ArrowDownRight className="h-3 w-3" /> Sale (-{Math.abs(qty)})
          </Badge>
        );
      case 'return':
        return (
          <Badge variant="outline" className="text-emerald-600 border-emerald-300 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 text-[10px] gap-1">
            <ArrowUpRight className="h-3 w-3" /> Restock / Return (+{qty})
          </Badge>
        );
      case 'manual_adjustment':
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-300 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 text-[10px] gap-1">
            <Wrench className="h-3 w-3" /> Adjustment ({qty > 0 ? `+${qty}` : qty})
          </Badge>
        );
      case 'correction':
        return (
          <Badge variant="outline" className="text-purple-600 border-purple-300 dark:border-purple-900 bg-purple-50 dark:bg-purple-950/20 text-[10px] gap-1">
            <RefreshCw className="h-3 w-3" /> Void Reversal ({qty > 0 ? `+${qty}` : qty})
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            {type} ({qty > 0 ? `+${qty}` : qty})
          </Badge>
        );
    }
  };

  return (
    <Card className="border-border/60 shadow-sm bg-white dark:bg-zinc-950 rounded-2xl">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-black tracking-tight">
                Inventory Transaction Audit Ledger
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Cryptographically signed stock delta records from POS sales, returns, and manual adjustments.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search product, SKU, user, bill..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs h-9 rounded-xl"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 text-xs w-36 rounded-xl">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sale">Sales Only</SelectItem>
                <SelectItem value="return">Returns Only</SelectItem>
                <SelectItem value="manual_adjustment">Manual Edits</SelectItem>
                <SelectItem value="correction">Void Corrections</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={fetchLedger}
              className="h-9 w-9 rounded-xl shrink-0"
              title="Refresh ledger"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-bold w-40">Timestamp</TableHead>
                <TableHead className="text-xs font-bold">Product</TableHead>
                <TableHead className="text-xs font-bold w-28">SKU</TableHead>
                <TableHead className="text-xs font-bold w-40">Action & Delta</TableHead>
                <TableHead className="text-xs font-bold w-36">Operator / User</TableHead>
                <TableHead className="text-xs font-bold">Audit Context / Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-xs text-muted-foreground">
                    Loading inventory transaction ledger...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-xs text-muted-foreground">
                    No stock transaction records found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((tx) => (
                  <TableRow key={tx.id} className="text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                      {new Date(tx.date).toLocaleString('en-IN', {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {tx.productName}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {tx.sku || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {getTypeBadge(tx.type, tx.quantity)}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {tx.user}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate" title={tx.notes}>
                      {tx.notes}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
