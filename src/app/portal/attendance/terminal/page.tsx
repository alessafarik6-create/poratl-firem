
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Square, 
  Clock, 
  Coffee, 
  User, 
  Timer, 
  ChevronRight,
  LogOut,
  Calendar as CalendarIcon,
  Loader2,
  Smartphone,
  Keypad,
  Delete,
  X
} from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection, useAuth } from '@/firebase';
import { doc, collection, serverTimestamp, query, orderBy, limit, where } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

type AttendanceType = 'check_in' | 'break_start' | 'break_end' | 'check_out';

export default function MobileTerminalPage() {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  const [isPinMode, setIsPinMode] = useState(false);
  const [pin, setPin] = useState('');
  const [activeEmployee, setActiveEmployee] = useState<any | null>(null);
  const [currentTime, setCurrentTime] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<AttendanceType | null>(null);
  const [todaySummary, setTodaySummary] = useState({ checkIn: '--:--', checkOut: '--:--', worked: '0h 0m' });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const userRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: profile } = useDoc(userRef);
  const companyId = profile?.companyId;

  // Personal mode query
  const personalAttendanceQuery = useMemoFirebase(() => {
    if (!firestore || !companyId || !user || isPinMode) return null;
    const today = new Date().toISOString().split('T')[0];
    return query(
      collection(firestore, 'companies', companyId, 'attendance'),
      where('employeeId', '==', user.uid),
      where('date', '==', today),
      orderBy('timestamp', 'desc')
    );
  }, [firestore, companyId, user, isPinMode]);

  const { data: todayAttendance } = useCollection(personalAttendanceQuery);

  // PIN mode lookup
  const employeesQuery = useMemoFirebase(() => {
    if (!firestore || !companyId || !isPinMode) return null;
    return collection(firestore, 'companies', companyId, 'employees');
  }, [firestore, companyId, isPinMode]);
  const { data: employees } = useCollection(employeesQuery);

  useEffect(() => {
    if (!isPinMode && todayAttendance && todayAttendance.length > 0) {
      updateAttendanceStatus(todayAttendance);
    }
  }, [todayAttendance, isPinMode]);

  const updateAttendanceStatus = (history: any[]) => {
    const latest = history[0];
    setLastAction(latest.type as AttendanceType);

    const checkInDoc = history.find(a => a.type === 'check_in');
    const checkOutDoc = history.find(a => a.type === 'check_out');

    const formatTime = (ts: any) => ts?.toDate ? ts.toDate().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : '--:--';
    
    setTodaySummary({
      checkIn: formatTime(checkInDoc?.timestamp),
      checkOut: formatTime(checkOutDoc?.timestamp),
      worked: "7h 45m" // Simplification
    });
  };

  const handlePinPress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        lookupEmployee(newPin);
      }
    }
  };

  const handlePinClear = () => {
    setPin('');
    setActiveEmployee(null);
    setLastAction(null);
  };

  const lookupEmployee = (code: string) => {
    if (!employees) return;
    const emp = employees.find(e => e.attendancePin === code);
    if (emp) {
      setActiveEmployee(emp);
      toast({ title: `Vítejte, ${emp.firstName}!`, duration: 2000 });
      // In a real app, we'd fetch today's status for this emp too
    } else {
      setPin('');
      toast({ variant: "destructive", title: "Neplatný PIN", duration: 2000 });
    }
  };

  const handleAction = (type: AttendanceType) => {
    const targetId = isPinMode ? activeEmployee?.id : user?.uid;
    const targetName = isPinMode ? `${activeEmployee?.firstName} ${activeEmployee?.lastName}` : (profile?.displayName || user?.email);

    if (!targetId || !companyId) return;

    const colRef = collection(firestore, 'companies', companyId, 'attendance');
    addDocumentNonBlocking(colRef, {
      employeeId: targetId,
      employeeName: targetName,
      type,
      timestamp: serverTimestamp(),
      date: new Date().toISOString().split('T')[0],
      terminalId: isPinMode ? 'shared-pin-terminal' : 'mobile-web'
    });

    const messages = {
      check_in: 'Příchod zaznamenán',
      break_start: 'Pauza zahájena',
      break_end: 'Pauza ukončena',
      check_out: 'Odchod zaznamenán'
    };

    toast({ title: messages[type], duration: 2000 });

    if (isPinMode) {
      setTimeout(handlePinClear, 1500);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col p-4 md:p-8 max-w-md mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
            <Smartphone className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">BizForge Terminál</h1>
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">{companyId}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="pin-mode" className="text-[10px] font-bold uppercase text-muted-foreground">Režim PIN</Label>
            <Switch id="pin-mode" checked={isPinMode} onCheckedChange={(v) => { setIsPinMode(v); handlePinClear(); }} />
          </div>
          {!isPinMode && (
            <Button variant="ghost" size="sm" onClick={() => signOut(auth)} className="h-7 text-xs text-muted-foreground hover:text-destructive p-0">
              Odhlásit <LogOut className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* Clock Display */}
      <Card className="bg-surface border-primary/20 shadow-2xl mb-6 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
        <CardContent className="pt-6 pb-4 text-center">
          <p className="text-5xl font-mono font-bold text-primary tracking-tighter mb-1">
            {currentTime || '00:00:00'}
          </p>
          <p className="text-sm text-muted-foreground font-medium flex items-center justify-center gap-2">
            <CalendarIcon className="w-3 h-3" /> {currentDate}
          </p>
        </CardContent>
      </Card>

      {isPinMode && !activeEmployee ? (
        <div className="flex-1 flex flex-col items-center">
          <div className="w-full max-w-[280px] space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-bold mb-1">Zadejte svůj PIN</h2>
              <div className="flex justify-center gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`w-4 h-4 rounded-full border-2 border-primary ${pin.length > i ? 'bg-primary' : 'bg-transparent'}`} />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((val) => (
                <Button
                  key={val}
                  variant={val === 'C' || val === 'DEL' ? 'outline' : 'default'}
                  className={`h-16 text-xl font-bold rounded-xl ${val === 'DEL' ? 'text-rose-500 border-rose-500/20' : ''}`}
                  onClick={() => {
                    if (val === 'C') handlePinClear();
                    else if (val === 'DEL') setPin(pin.slice(0, -1));
                    else handlePinPress(val);
                  }}
                >
                  {val === 'DEL' ? <Delete className="w-6 h-6" /> : val}
                </Button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* User Info */}
          <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl bg-surface/50 border border-border">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <User className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">{isPinMode ? `${activeEmployee?.firstName} ${activeEmployee?.lastName}` : (profile?.displayName || user.email)}</p>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xs text-muted-foreground capitalize">{isPinMode ? activeEmployee?.jobTitle : (profile?.role || 'Zaměstnanec')}</p>
              </div>
            </div>
            {isPinMode && (
              <Button variant="ghost" size="icon" onClick={handlePinClear} className="text-muted-foreground"><X className="w-4 h-4" /></Button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 gap-4 mb-6">
            <Button 
              disabled={lastAction === 'check_in' || lastAction === 'break_end'}
              onClick={() => handleAction('check_in')}
              className="h-20 text-xl font-bold rounded-2xl shadow-lg bg-emerald-600 hover:bg-emerald-700 transition-all gap-4"
            >
              <Play className="w-6 h-6 fill-white" /> Přihlásit příchod
            </Button>

            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="outline"
                disabled={lastAction !== 'check_in' && lastAction !== 'break_end'}
                onClick={() => handleAction('break_start')}
                className="h-20 text-lg font-bold rounded-2xl border-amber-500/50 text-amber-500 hover:bg-amber-500/10 gap-2"
              >
                <Coffee className="w-5 h-5" /> Pauza
              </Button>
              <Button 
                variant="outline"
                disabled={lastAction !== 'break_start'}
                onClick={() => handleAction('break_end')}
                className="h-20 text-lg font-bold rounded-2xl border-blue-500/50 text-blue-500 hover:bg-blue-500/10 gap-2"
              >
                <Timer className="w-5 h-5" /> Konec pauzy
              </Button>
            </div>

            <Button 
              variant="destructive"
              disabled={lastAction === 'check_out' || !lastAction || lastAction === 'break_start'}
              onClick={() => handleAction('check_out')}
              className="h-20 text-xl font-bold rounded-2xl shadow-lg transition-all gap-4"
            >
              <Square className="w-6 h-6 fill-white" /> Odhlásit odchod
            </Button>
          </div>

          {/* Daily Summary (Only visible in personal mode for now) */}
          {!isPinMode && (
            <Card className="bg-surface/30 border-border mt-auto">
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Timer className="w-4 h-4 text-primary" /> Dnešní přehled
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-2 pb-6">
                <div className="text-center p-2 rounded-xl bg-background/50 border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Příchod</p>
                  <p className="text-sm font-bold text-emerald-500">{todaySummary.checkIn}</p>
                </div>
                <div className="text-center p-2 rounded-xl bg-background/50 border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Odchod</p>
                  <p className="text-sm font-bold text-rose-500">{todaySummary.checkOut}</p>
                </div>
                <div className="text-center p-2 rounded-xl bg-background/50 border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Odpracováno</p>
                  <p className="text-sm font-bold text-primary">{todaySummary.worked}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!isPinMode && (
        <Button variant="link" onClick={() => router.push('/portal/dashboard')} className="text-xs text-muted-foreground mt-4">
          Zpět do portálu <ChevronRight className="w-3 h-3 ml-1" />
        </Button>
      )}
    </div>
  );
}
