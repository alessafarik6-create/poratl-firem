
"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search, Filter, Download, UserPlus, Loader2 } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

export default function CustomersPage() {
  const firestore = useFirestore();
  const companyId = 'nebula-tech'; 

  const customersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'companies', companyId, 'customers');
  }, [firestore, companyId]);

  const { data: customers, isLoading } = useCollection(customersQuery);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">Adresář zákazníků</h1>
          <p className="text-muted-foreground mt-2">Spravujte vztahy s klienty a kontaktní informace.</p>
        </div>
        <Button className="gap-2">
          <UserPlus className="w-4 h-4" /> Nový zákazník
        </Button>
      </div>

      <Card className="bg-surface border-border overflow-hidden">
        <div className="p-4 border-b bg-background/30 flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Hledat zákazníky..." className="pl-10 bg-background border-border" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" /> Filtr
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" /> Export
            </Button>
          </div>
        </div>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : customers && customers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="pl-6">Zákazník</TableHead>
                  <TableHead>Kontaktní údaje</TableHead>
                  <TableHead>Firma</TableHead>
                  <TableHead className="pr-6 text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((cust) => (
                  <TableRow key={cust.id} className="border-border hover:bg-muted/30">
                    <TableCell className="pl-6 font-medium">
                      {cust.firstName} {cust.lastName}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span>{cust.email}</span>
                        <span className="text-muted-foreground text-xs">{cust.phone || 'Bez telefonu'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{cust.companyName || '-'}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <Button variant="ghost" size="sm">Detaily</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground">Žádní zákazníci nebyli nalezeni.</p>
              <Button variant="link" className="text-primary mt-2">Přidat prvního zákazníka</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
