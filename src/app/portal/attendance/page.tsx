
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection } from 'firebase/firestore';

export default function AttendancePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [activeShift, setActiveShift] = useState(false);
  const [currentTime, setCurrentTime] = useState<string | null>(null);

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);
  
  const userRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: profile } = useDoc(userRef);

  const attendanceQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'companies', 'nebula-tech', 'attendance');
  }, [firestore, user]);

  const { data: historyData, isLoading: isHistoryLoading } = useCollection(attendanceQuery);

  const history = [
    { date: '20.05.2024', in: '09:02', out: '17:30', total: '8h 28m', status: 'Přítomen' },
    { date: '19.05.2024', in: '08:55', out: '18:15', total: '9h 20m', status: 'Přesčas' },
    { date: '18.05.2024', in: '09:15', out: '17:00', total: '7h 45m', status: 'Nedostatek' },
    { date: '17.05.2024', in: '-', out: '-', total: '-', status: 'Nepřítomen' },
  ];

  const isAdmin = profile?.globalRoles?.includes('super_admin') || profile?.globalRoles?.includes('admin');

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Docházka a sledování času</h1>
          <p className="text-muted-foreground mt-2">Spravujte svou denní pracovní dobu a směny.</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-mono font-bold">{currentTime || '--:--'}</p>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="bg-surface border-border flex flex-col justify-between">
          <CardHeader>
            <CardTitle>Aktuální stav</CardTitle>
            <CardDescription>Začněte nebo ukončete svou denní směnu</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center py-8">
            <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center mb-6 ${activeShift ? 'border-primary animate-pulse' : 'border-muted'}`}>
              <Clock className={`w-12 h-12 ${activeShift ? 'text-primary' : 'text-muted'}`} />
            </div>
            <div className="text-center mb-8">
              <h3 className="text-xl font-bold">{activeShift ? 'Jste v práci' : 'Jste odhlášeni'}</h3>
              <p className="text-muted-foreground">{activeShift ? 'Směna začala v 09:12' : 'Připraveni začít den?'}</p>
            </div>
            <Button 
              size="lg" 
              className={`w-full h-14 text-lg font-bold transition-all ${activeShift ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'}`}
              onClick={() => setActiveShift(!activeShift)}
            >
              {activeShift ? (
                <> <Square className="w-5 h-5 mr-2 fill-white" /> Ukončit směnu </>
              ) : (
                <> <Play className="w-5 h-5 mr-2 fill-white" /> Začít směnu nyní </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 bg-surface border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Nedávná historie</CardTitle>
              <CardDescription>Vaše záznamy za posledních 7 dní</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarIcon className="w-4 h-4" /> Vlastní rozsah
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Datum</TableHead>
                  <TableHead>Příchod</TableHead>
                  <TableHead>Odchod</TableHead>
                  <TableHead>Celkem hodin</TableHead>
                  <TableHead>Stav</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((row, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell className="font-medium">{row.date}</TableCell>
                    <TableCell>{row.in}</TableCell>
                    <TableCell>{row.out}</TableCell>
                    <TableCell>{row.total}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === 'Přesčas' ? 'default' : row.status === 'Nepřítomen' ? 'destructive' : 'secondary'}>
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <Card className="bg-surface border-border">
          <CardHeader>
            <CardTitle>Přehled docházky týmu</CardTitle>
            <CardDescription>Pohled v reálném čase na členy týmu aktuálně na směně</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { name: 'Alex Thompson', role: 'Vedoucí vývoje', status: 'active' },
                { name: 'Sára Millerová', role: 'Designérka', status: 'active' },
                { name: 'Jan Novák', role: 'Manažer', status: 'offline' },
                { name: 'Emílie Chenová', role: 'Účetní', status: 'active' },
              ].map((emp, i) => (
                <div key={i} className="p-4 border border-border rounded-lg bg-background/40 flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${emp.status === 'active' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-muted'}`} />
                  <div>
                    <p className="font-semibold text-sm">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">{emp.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
