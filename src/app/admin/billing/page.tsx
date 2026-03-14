
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Download, 
  Search, 
  Filter, 
  Loader2,
  CheckCircle2,
  Clock,
  ExternalLink
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';

export default function AdminBillingPage() {
  const firestore = useFirestore();

  const billingQuery = useMemoFirebase(() => query(collection(firestore, 'platform_invoices'), orderBy('dueDate', 'desc'), limit(100)), [firestore]);
  const { data: invoices, isLoading } = useCollection(billingQuery);

  const stats = [
    { title: 'Očekávané příjmy', value: '284 500 Kč', color: 'text-primary' },
    { title: 'Uhrazené faktury', value: '192 400 Kč', color: 'text-emerald-500' },
    { title: 'Po splatnosti', value: '12 800 Kč', color: 'text-rose-500' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">Fakturace Platformy</h1>
          <p className="text-muted-foreground mt-2">Správa poplatků a faktur vystavených klientským organizacím.</p>
        </div>
        <Button className="gap-2 shadow-lg shadow-primary/20">
          <CreditCard className="w-4 h-4" /> Generovat faktury
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="bg-surface border-border">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle></CardHeader>
            <CardContent><div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-surface border-border overflow-hidden">
        <div className="p-4 border-b bg-background/30 flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Hledat firmu nebo ID faktury..." className="pl-10 bg-background border-border" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2"><Filter className="w-4 h-4" /> Filtr</Button>
            <Button variant="outline" size="sm" className="gap-2"><Download className="w-4 h-4" /> Export CSV</Button>
          </div>
        </div>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : invoices && invoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="pl-6">Číslo faktury</TableHead>
                  <TableHead>Firma</TableHead>
                  <TableHead>Splatnost</TableHead>
                  <TableHead className="text-right">Částka</TableHead>
                  <TableHead>Stav</TableHead>
                  <TableHead className="pr-6 text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id} className="border-border hover:bg-muted/30">
                    <TableCell className="pl-6 font-bold">{inv.id.substring(0, 8).toUpperCase()}</TableCell>
                    <TableCell>{inv.organizationId}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        {inv.dueDate}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {inv.amount?.toLocaleString()} Kč
                    </TableCell>
                    <TableCell>
                      <Badge variant={inv.status === 'paid' ? 'default' : 'outline'}>
                        {inv.status === 'paid' ? 'Zaplaceno' : 'Čeká'}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Button variant="ghost" size="icon" title="Detail"><ExternalLink className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <p>V tomto období nebyly vystaveny žádné faktury.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
