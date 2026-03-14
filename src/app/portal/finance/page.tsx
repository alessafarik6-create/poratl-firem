
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Receipt, Download } from 'lucide-react';

export default function FinancePage() {
  const stats = [
    { title: 'Celkové příjmy', value: '24 500,00 Kč', icon: DollarSign, trend: '+12.5%', up: true },
    { title: 'Celkové výdaje', value: '8 200,00 Kč', icon: TrendingDown, trend: '-2.1%', up: false },
    { title: 'Čistý zisk', value: '16 300,00 Kč', icon: TrendingUp, trend: '+24.3%', up: true },
    { title: 'Neuhrazené faktury', value: '3 150,00 Kč', icon: Receipt, trend: '4 čekající', up: false },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">Finanční centrum</h1>
          <p className="text-muted-foreground mt-2">Sledujte příjmy, výdaje a celkové zdraví podniku.</p>
        </div>
        <div className="flex gap-3">
          <Button className="gap-2">
            <Download className="w-4 h-4" /> Stáhnout report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="bg-surface border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.up ? 'text-emerald-500' : 'text-rose-500'}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className={`text-xs mt-1 ${stat.up ? 'text-emerald-500' : 'text-rose-500'}`}>
                {stat.trend} {stat.up ? 'oproti min. období' : ''}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-surface border-border">
        <CardHeader>
          <CardTitle>Nedávné transakce</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Reference</TableHead>
                <TableHead>Kategorie</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Částka</TableHead>
                <TableHead>Stav</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { ref: 'INV-2024-001', cat: 'Prodej', date: '20.05.2024', amt: '+2 400 Kč', status: 'zaplaceno' },
                { ref: 'EXP-9923', cat: 'Cloud Hosting', date: '18.05.2024', amt: '-450 Kč', status: 'dokončeno' },
                { ref: 'INV-2024-002', cat: 'Prodej', date: '15.05.2024', amt: '+1 200 Kč', status: 'čekající' },
                { ref: 'EXP-9924', cat: 'Nájem', date: '01.05.2024', amt: '-2 500 Kč', status: 'dokončeno' },
              ].map((tx, i) => (
                <TableRow key={i} className="border-border">
                  <TableCell className="font-medium">{tx.ref}</TableCell>
                  <TableCell>{tx.cat}</TableCell>
                  <TableCell>{tx.date}</TableCell>
                  <TableCell className={tx.amt.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}>{tx.amt}</TableCell>
                  <TableCell>
                    <Badge variant={tx.status === 'zaplaceno' || tx.status === 'dokončeno' ? 'default' : 'outline'} className="capitalize">
                      {tx.status === 'zaplaceno' ? 'Zaplaceno' : tx.status === 'dokončeno' ? 'Dokončeno' : 'Čekající'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
