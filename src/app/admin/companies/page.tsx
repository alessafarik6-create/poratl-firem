
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Building2, 
  Search, 
  Filter, 
  MoreVertical, 
  Power, 
  ExternalLink,
  Users,
  Loader2,
  Trash2
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';

export default function AdminCompaniesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const companiesQuery = useMemoFirebase(() => collection(firestore, 'companies'), [firestore]);
  const { data: companies, isLoading } = useCollection(companiesQuery);

  const toggleCompanyStatus = async (companyId: string, currentStatus: boolean) => {
    try {
      const docRef = doc(firestore, 'companies', companyId);
      await updateDoc(docRef, { isActive: !currentStatus });
      toast({ title: "Status aktualizován", description: `Firma byla ${!currentStatus ? 'aktivována' : 'deaktivována'}.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Chyba při aktualizaci" });
    }
  };

  const deleteCompany = async (companyId: string) => {
    if (!confirm('Opravdu chcete tuto firmu a všechna její data TRVALE odstranit?')) return;
    try {
      await deleteDoc(doc(firestore, 'companies', companyId));
      toast({ title: "Firma odstraněna" });
    } catch (error) {
      toast({ variant: "destructive", title: "Chyba při mazání" });
    }
  };

  const filteredCompanies = companies?.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.ico?.includes(searchTerm)
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Správa Organizací</h1>
        <p className="text-muted-foreground mt-2">Přehled všech registrovaných firem na platformě BizForge.</p>
      </div>

      <Card className="bg-surface border-border overflow-hidden">
        <div className="p-4 border-b bg-background/30 flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Hledat firmu nebo IČO..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background border-border" 
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2"><Filter className="w-4 h-4" /> Filtrovat</Button>
          </div>
        </div>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredCompanies && filteredCompanies.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="pl-6">Organizace</TableHead>
                  <TableHead>IČO</TableHead>
                  <TableHead>Vlastník</TableHead>
                  <TableHead>Licence</TableHead>
                  <TableHead>Stav</TableHead>
                  <TableHead className="pr-6 text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map((company) => (
                  <TableRow key={company.id} className="border-border hover:bg-muted/30">
                    <TableCell className="pl-6 font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {company.name?.[0]}
                        </div>
                        <div className="flex flex-col">
                          <span>{company.name}</span>
                          <span className="text-xs text-muted-foreground font-normal">{company.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{company.ico || '-'}</TableCell>
                    <TableCell className="text-xs">{company.ownerUserId?.substring(0, 8)}...</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-primary/30 text-primary capitalize">
                        {company.licenseId || 'Basic'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={company.isActive ? 'default' : 'secondary'}>
                        {company.isActive ? 'Aktivní' : 'Neaktivní'}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-surface border-border">
                          <DropdownMenuLabel>Správa firmy</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => window.open(`/portal/dashboard`, '_blank')}>
                            <ExternalLink className="w-4 h-4 mr-2" /> Otevřít dashboard
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleCompanyStatus(company.id, company.isActive)}>
                            <Power className="w-4 h-4 mr-2" /> {company.isActive ? 'Deaktivovat' : 'Aktivovat'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => deleteCompany(company.id)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Odstranit firmu
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Nebyly nalezeny žádné firmy.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
