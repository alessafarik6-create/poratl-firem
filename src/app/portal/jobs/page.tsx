
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Plus, Search, Filter, Clock, Loader2 } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Progress } from '@/components/ui/progress';

export default function JobsPage() {
  const firestore = useFirestore();
  const companyId = 'nebula-tech'; // Assume current tenant

  const jobsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'companies', companyId, 'jobs');
  }, [firestore, companyId]);

  const { data: jobs, isLoading } = useCollection(jobsQuery);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">Job Management</h1>
          <p className="text-muted-foreground mt-2">Track active projects, deadlines, and team assignments.</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> Create New Job
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-surface border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs?.filter(j => j.status !== 'completed').length || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-surface border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs?.filter(j => j.status === 'completed').length || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-surface border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Completion Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.2 days</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-surface border-border">
        <CardHeader>
          <CardTitle>All Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : jobs && jobs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Job Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id} className="border-border">
                    <TableCell className="font-medium">{job.name}</TableCell>
                    <TableCell>
                      <Badge variant={job.status === 'completed' ? 'default' : 'secondary'} className="capitalize">
                        {job.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="w-48">
                      <div className="flex items-center gap-2">
                        <Progress value={job.status === 'completed' ? 100 : 45} className="h-1.5" />
                        <span className="text-[10px] text-muted-foreground">{job.status === 'completed' ? '100%' : '45%'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{job.startDate || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Manage</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              No jobs found. Create your first project to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
