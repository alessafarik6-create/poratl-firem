"use client";

import React, { useState } from "react";
import { useFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Building2,
  Loader2,
  UserPlus,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const { auth, areServicesAvailable } = useFirebase();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const isMobileBrowser = () => {
    if (typeof window === "undefined") return false;
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!areServicesAvailable) {
      toast({
        variant: "destructive",
        title: "Načítání",
        description: "Firebase se ještě načítá. Zkuste to za chvíli.",
      });
      return;
    }

    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Chybějící údaje",
        description: "Prosím zadejte email i heslo.",
      });
      return;
    }

    setLoading(true);

    try {
      await setPersistence(
        auth,
        isMobileBrowser() ? browserLocalPersistence : browserSessionPersistence
      );

      await signInWithEmailAndPassword(auth, email.trim(), password);

      toast({
        title: "Přihlášení úspěšné",
        description: "Vítejte zpět v BizForge.",
      });

      // Na mobilu je spolehlivější plný reload než router.push(),
      // aby se auth stav jistě propsal i po přihlášení.
      window.location.assign("/portal/dashboard");
      return;
    } catch (error) {
      console.error("[LoginPage] login failed", error);

      toast({
        variant: "destructive",
        title: "Chyba přihlášení",
        description: "Neplatný email nebo heslo.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative hidden bg-black lg:block">
        <Image
          src="https://picsum.photos/seed/bizforge-login/1200/1200"
          alt="Login pozadí"
          fill
          className="object-cover opacity-50"
          data-ai-hint="dark abstract orange"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
        <div className="absolute bottom-12 left-12 right-12">
          <h1 className="mb-4 text-4xl font-bold text-white">
            Posílení podnikání s BizForge.
          </h1>
          <p className="text-xl text-muted-foreground">
            Komplexní platforma pro správu firem a provozní dokonalost v
            multi-tenant prostředí.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center bg-background p-8 text-foreground">
        <Card className="w-full max-w-md border-border bg-surface shadow-2xl">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/20">
              <Building2 className="h-7 w-7 text-white" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
                Vítejte zpět
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Zadejte své údaje pro přístup k portálu
              </CardDescription>
            </div>
          </CardHeader>

          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Emailová adresa</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jmeno@firma.cz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-border bg-background text-foreground"
                  autoComplete="email"
                  inputMode="email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Heslo</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-border bg-background text-foreground"
                  autoComplete="current-password"
                  required
                />
              </div>

              <Button
                type="submit"
                className="h-11 w-full bg-primary text-lg font-semibold text-white hover:bg-primary/90"
                disabled={loading || !areServicesAvailable}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : null}
                Přihlásit se
              </Button>
            </CardContent>
          </form>

          <CardFooter className="flex flex-col gap-4">
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Nová firma?
                </span>
              </div>
            </div>

            <Link href="/register" className="w-full">
              <Button
                variant="outline"
                className="w-full h-11 gap-2 border-primary text-primary transition-all hover:bg-primary hover:text-white"
              >
                <UserPlus className="h-4 w-4" /> Registrovat firmu
              </Button>
            </Link>

            <Link href="/admin/login" className="w-full">
              <Button
                variant="ghost"
                className="h-10 w-full gap-2 text-muted-foreground hover:text-foreground"
              >
                <ShieldCheck className="h-4 w-4" /> Globální administrace
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}