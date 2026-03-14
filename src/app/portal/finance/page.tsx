"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Receipt, Download } from 'lucide-react';

export default function FinancePage() {
  const stats = [
    { title: 'Total Revenue', value: '$24,500.00', icon: DollarSign, trend: '+12.5%', up: true },
    { title: 'Total Expenses', value: '$8,200.00', icon: TrendingDown, trend: '-2.1%', up: false },
    { title: 'Net Profit', value: '$16,300.00', icon: TrendingUp, trend: '+24.3%', up: true },
    { title: 'Unpaid Invoices', value: '$3,150.00', icon: Receipt, trend: '4 pending', up: false },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">Financial Center</h1>
          <p className="text-muted-foreground mt-2">Track revenue, expenses, and overall business health.</p>
        </div>
        <div className="flex gap-3">
          <Button className="gap-2">
            <Download className="w-4 h-4" /> Download Report
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
                {stat.trend} {stat.up ? 'from last period' : ''}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-surface border-border">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Reference</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { ref: 'INV-2024-001', cat: 'Sales', date: 'May 20, 2024', amt: '+$2,400', status: 'paid' },
                { ref: 'EXP-9923', cat: 'Cloud Hosting', date: 'May 18, 2024', amt: '-$450', status: 'completed' },
                { ref: 'INV-2024-002', cat: 'Sales', date: 'May 15, 2024', amt: '+$1,200', status: 'pending' },
                { ref: 'EXP-9924', cat: 'Rent', date: 'May 01, 2024', amt: '-$2,500', status: 'completed' },
              ].map((tx, i) => (
                <TableRow key={i} className="border-border">
                  <TableCell className="font-medium">{tx.ref}</TableCell>
                  <TableCell>{tx.cat}</TableCell>
                  <TableCell>{tx.date}</TableCell>
                  <TableCell className={tx.amt.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}>{tx.amt}</TableCell>
                  <TableCell>
                    <Badge variant={tx.status === 'paid' || tx.status === 'completed' ? 'default' : 'outline'} className="capitalize">
                      {tx.status}
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