"use client";

import React from 'react';
import { 
  Users, 
  Briefcase, 
  Clock, 
  Wallet,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function CompanyDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();

  // In a real multi-tenant app, we'd get the current company from the route or user context
  // For this prototype, we'll assume the user is part of 'nebula-tech' or find their first company_role
  // Since we don't have the current company ID in the URL, we'll use a placeholder or look it up
  const companyId = 'nebula-tech'; 

  const userRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: profile } = useDoc(userRef);

  const jobsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'companies', companyId, 'jobs');
  }, [firestore, companyId]);

  const { data: jobs, isLoading: isJobsLoading } = useCollection(jobsQuery);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">Good morning, {profile?.displayName || user?.email?.split('@')[0]}</h1>
          <p className="text-muted-foreground mt-2">Here's your organization's performance for today.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Calendar className="w-4 h-4" /> Schedule
          </Button>
          <Button className="gap-2">
            <Briefcase className="w-4 h-4" /> New Job
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-surface border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Employees</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42 / 45</div>
            <p className="text-xs text-muted-foreground mt-1">3 on leave today</p>
          </CardContent>
        </Card>
        <Card className="bg-surface border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Managed in {companyId}</p>
          </CardContent>
        </Card>
        <Card className="bg-surface border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Attendance</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94%</div>
            <p className="text-xs text-muted-foreground mt-1">2 late arrivals</p>
          </CardContent>
        </Card>
        <Card className="bg-surface border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Rev</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$12,450</div>
            <p className="text-xs text-emerald-500 mt-1">+15% from last month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-surface border-border">
            <CardHeader>
              <CardTitle>Ongoing Projects</CardTitle>
              <CardDescription>Performance of active jobs in {companyId}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isJobsLoading ? (
                <div className="flex justify-center p-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : jobs && jobs.length > 0 ? (
                jobs.map((job) => (
                  <div key={job.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold">{job.name}</h4>
                        <p className="text-xs text-muted-foreground">{job.status}</p>
                      </div>
                      <Badge variant={job.status === 'completed' ? 'default' : 'secondary'} className="capitalize">
                        {job.status}
                      </Badge>
                    </div>
                    <Progress value={job.status === 'completed' ? 100 : 45} className="flex-1" />
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No active jobs found for this organization.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="bg-surface border-border">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="outline" className="justify-start w-full">Employee Check-in Log</Button>
              <Button variant="outline" className="justify-start w-full">Generate Invoice</Button>
              <Button variant="outline" className="justify-start w-full">Approve Time-off</Button>
              <Button variant="outline" className="justify-start w-full">Upload Documents</Button>
            </CardContent>
          </Card>

          <Card className="bg-surface border-border">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { user: 'Sarah J.', action: 'Checked in', time: '5m ago' },
                { user: 'Mike T.', action: 'Completed Job #23', time: '1h ago' },
                { user: 'Accountant', action: 'Uploaded Tax Doc', time: '3h ago' },
                { user: 'System', action: 'Plan Renewed', time: '1d ago' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <div className="mt-0.5 w-2 h-2 rounded-full bg-primary" />
                  <div>
                    <span className="font-semibold">{item.user}</span> {item.action}
                    <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
