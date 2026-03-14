
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

export default function SettingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  
  const userRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: profile } = useDoc(userRef);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Nastavení</h1>
        <p className="text-muted-foreground mt-2">Spravujte svůj účet a preference organizace.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="bg-surface border border-border w-full justify-start h-12 p-1">
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="organization">Organizace</TabsTrigger>
          <TabsTrigger value="notifications">Oznámení</TabsTrigger>
          <TabsTrigger value="security">Zabezpečení</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card className="bg-surface border-border">
            <CardHeader>
              <CardTitle>Osobní informace</CardTitle>
              <CardDescription>Aktualizujte své jméno a profilové údaje.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Celé jméno</Label>
                  <Input defaultValue={profile?.displayName || ''} placeholder="Jan Novák" className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label>Emailová adresa</Label>
                  <Input defaultValue={user?.email || ''} readOnly className="bg-background opacity-70" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Pracovní pozice</Label>
                <Input placeholder="Provozní manažer" className="bg-background" />
              </div>
              <Button className="w-fit">Uložit změny</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organization" className="mt-6">
          <Card className="bg-surface border-border">
            <CardHeader>
              <CardTitle>Profil organizace</CardTitle>
              <CardDescription>Nakonfigurujte podrobnosti o vaší společnosti.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Název společnosti</Label>
                <Input defaultValue="Nebula Tech Solutions" className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label>Primární doména</Label>
                <Input defaultValue="nebulatech.io" className="bg-background" />
              </div>
              <Separator className="bg-border" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Veřejný profil</Label>
                  <p className="text-xs text-muted-foreground">Umožněte ostatním najít vaši organizaci na platformě.</p>
                </div>
                <Switch />
              </div>
              <Button className="w-fit">Aktualizovat organizaci</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card className="bg-surface border-border">
            <CardHeader>
              <CardTitle>Předvolby oznámení</CardTitle>
              <CardDescription>Vyberte si, jak chcete být upozorňováni na aktivitu.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Emailová oznámení</Label>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label>Upozornění na nové zprávy</Label>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label>Připomenutí docházky</Label>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
