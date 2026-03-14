
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Receipt, 
  Download, 
  Loader2,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon
} from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, orderBy, limit } from 'firebase/firestore';
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  Pie, 
  PieChart,
  Line,
  LineChart,
  CartesianGrid,
  Legend
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

export default function FinancePage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: profile } = useDoc(userRef);
  const companyId = profile?.companyId || 'nebula-tech';

  // Načtení dat pro výpočty
  const jobsQuery = useMemoFirebase(() => companyId ? collection(firestore, 'companies', companyId, 'jobs') : null, [firestore, companyId]);
  const employeesQuery = useMemoFirebase(() => companyId ? collection(firestore, 'companies', companyId, 'employees') : null, [firestore, companyId]);
  const attendanceQuery = useMemoFirebase(() => companyId ? collection(firestore, 'companies', companyId, 'attendance') : null, [firestore, companyId]);
  const financeQuery = useMemoFirebase(() => companyId ? query(collection(firestore, 'companies', companyId, 'finance'), orderBy('date', 'desc'), limit(20)) : null, [firestore, companyId]);

  const { data: jobs, isLoading: isJobsLoading } = useCollection(jobsQuery);
  const { data: employees } = useCollection(employeesQuery);
  const { data: attendance } = useCollection(attendanceQuery);
  const { data: financeRecords, isLoading: isFinanceLoading } = useCollection(financeQuery);

  // Finanční výpočty
  const stats = useMemo(() => {
    if (!jobs || !employees || !attendance) return null;

    // 1. Příjmy (Budgety dokončených zakázek)
    const totalRevenue = jobs.reduce((sum, job) => sum + (Number(job.budget) || 0), 0);
    const completedRevenue = jobs
      .filter(j => j.status === 'dokončená' || j.status === 'fakturována')
      .reduce((sum, job) => sum + (Number(job.budget) || 0), 0);

    // 2. Náklady na zaměstnance (Sazba * Odpracované hodiny)
    // Pro zjednodušení v prototypu: počítáme odpracované sekundy z check-in/out a násobíme hodinovou sazbou
    let totalEmployeeCosts = 0;
    
    // Seskupení docházky podle zaměstnanců
    const attendanceByEmployee: Record<string, any[]> = {};
    attendance.forEach(a => {
      if (!attendanceByEmployee[a.employeeId]) attendanceByEmployee[a.employeeId] = [];
      attendanceByEmployee[a.employeeId].push(a);
    });

    Object.entries(attendanceByEmployee).forEach(([empId, records]) => {
      const emp = employees.find(e => e.id === empId);
      const hourlyRate = Number(emp?.hourlyRate) || 500; // Fallback sazba

      // Velmi zjednodušený výpočet hodin pro prototyp (každý check-in počítáme jako 8h pro demo)
      const checkIns = records.filter(r => r.type === 'check_in').length;
      totalEmployeeCosts += checkIns * 8 * hourlyRate;
    });

    const profit = totalRevenue - totalEmployeeCosts;

    return {
      revenue: totalRevenue,
      completedRevenue,
      costs: totalEmployeeCosts,
      profit,
      activeJobs: jobs.filter(j => j.status !== 'dokončená' && j.status !== 'fakturována').length
    };
  }, [jobs, employees, attendance]);

  const chartData = [
    { name: 'Leden', revenue: 45000, costs: 32000 },
    { name: 'Únor', revenue: 52000, costs: 35000 },
    { name: 'Březen', revenue: 48000, costs: 31000 },
    { name: 'Duben', revenue: 61000, costs: 42000 },
    { name: 'Květen', revenue: stats?.revenue || 55000, costs: stats?.costs || 38000 },
  ];

  const pieData = [
    { name: 'Mzdy', value: stats?.costs || 400, fill: 'hsl(var(--primary))' },
    { name: 'Provoz', value: 15000, fill: 'hsl(var(--secondary))' },
    { name: 'Marketing', value: 8000, fill: 'hsl(var(--muted))' },
  ];

  if (isJobsLoading || isFinanceLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">Finanční centrum</h1>
          <p className="text-muted-foreground mt-2">Komplexní přehled ekonomiky firmy {companyId}.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Exportovat PDF
          </Button>
          <Button className="gap-2 shadow-lg shadow-primary/20">
            <Receipt className="w-4 h-4" /> Nový doklad
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-surface border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Celkový obrat</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.revenue.toLocaleString()} Kč</div>
            <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +12.5% oproti min. měsíci
            </p>
          </CardContent>
        </Card>
        <Card className="bg-surface border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Náklady (mzdy + režie)</CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.costs.toLocaleString()} Kč</div>
            <p className="text-xs text-muted-foreground mt-1">Odhad na základě docházky</p>
          </CardContent>
        </Card>
        <Card className="bg-surface border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Čistý zisk</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats?.profit.toLocaleString()} Kč</div>
            <p className="text-xs text-emerald-500 mt-1">Marže cca 35%</p>
          </CardContent>
        </Card>
        <Card className="bg-surface border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aktivní zakázky</CardTitle>
            <BarChartIcon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeJobs}</div>
            <p className="text-xs text-muted-foreground mt-1">V realizaci</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-surface border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Vývoj příjmů a nákladů
            </CardTitle>
            <CardDescription>Srovnání měsíční výkonnosti firmy</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(value) => `${value / 1000}k`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--surface))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" name="Příjmy" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="costs" name="Náklady" stroke="hsl(var(--rose-500))" strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-surface border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-primary" /> Struktura nákladů
            </CardTitle>
            <CardDescription>Rozdělení výdajů podle kategorií</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--surface))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-surface border-border">
        <CardHeader>
          <CardTitle>Poslední finanční pohyby</CardTitle>
          <CardDescription>Přehled faktur a výdajů v rámci workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Referenční číslo</TableHead>
                <TableHead>Kategorie</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Částka</TableHead>
                <TableHead>Stav</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {financeRecords && financeRecords.length > 0 ? (
                financeRecords.map((record) => (
                  <TableRow key={record.id} className="border-border hover:bg-muted/30">
                    <TableCell className="font-medium">{record.referenceId || 'INV-TEMP'}</TableCell>
                    <TableCell>{record.category || 'Zakázka'}</TableCell>
                    <TableCell>{record.date || 'Dnes'}</TableCell>
                    <TableCell className={record.type === 'revenue' ? 'text-emerald-500 font-bold' : 'text-rose-500'}>
                      {record.type === 'revenue' ? '+' : '-'}{record.amount?.toLocaleString()} Kč
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {record.status || 'Dokončeno'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                // Dummy data pro naplnění prázdné tabulky v prototypu
                [
                  { ref: 'INV-2024-001', cat: 'Zakázka #12', date: '20.05.2024', amt: 24500, type: 'revenue' },
                  { ref: 'EXP-9923', cat: 'Server Hosting', date: '18.05.2024', amt: 1200, type: 'expense' },
                  { ref: 'EXP-9924', cat: 'Kancelářské potřeby', date: '15.05.2024', amt: 3400, type: 'expense' },
                  { ref: 'INV-2024-002', cat: 'Zakázka #08', date: '10.05.2024', amt: 18000, type: 'revenue' },
                ].map((tx, i) => (
                  <TableRow key={i} className="border-border hover:bg-muted/30">
                    <TableCell className="font-medium">{tx.ref}</TableCell>
                    <TableCell>{tx.cat}</TableCell>
                    <TableCell>{tx.date}</TableCell>
                    <TableCell className={tx.type === 'revenue' ? 'text-emerald-500 font-bold' : 'text-rose-500'}>
                      {tx.type === 'revenue' ? '+' : '-'}{tx.amt.toLocaleString()} Kč
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-emerald-600">Zaplaceno</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
