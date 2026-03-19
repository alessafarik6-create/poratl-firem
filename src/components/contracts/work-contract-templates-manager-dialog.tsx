"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { Firestore } from "firebase/firestore";
import {
  collection,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCollection, useMemoFirebase } from "@/firebase";
import { Plus } from "lucide-react";
import { WorkContractTemplatesList } from "@/components/contracts/work-contract-templates-list";
import { WorkContractTemplateForm } from "@/components/contracts/work-contract-template-form";
import {
  CONTRACT_TEMPLATES_COLLECTION,
  createContractTemplate,
  updateContractTemplate,
  type ContractTemplateFirestoreDoc,
} from "@/lib/contract-templates-firestore";

export type WorkContractTemplatesManagerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  firestore: Firestore | null;
  companyId: string | null | undefined;
  userId: string | null | undefined;
};

function sortAndFilterTemplates(
  raw: ContractTemplateFirestoreDoc[] | undefined,
  companyId: string | null | undefined
): ContractTemplateFirestoreDoc[] {
  const list = (raw || []) as ContractTemplateFirestoreDoc[];
  return list
    .filter((t) => t.companyId === companyId)
    .slice()
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "cs"));
}

/**
 * Šablony SOD — jediný Dialog. Mazání: inline potvrzení v seznamu (žádný AlertDialog, žádný vnořený modal).
 */
export function WorkContractTemplatesManagerDialog({
  open,
  onOpenChange,
  firestore,
  companyId,
  userId,
}: WorkContractTemplatesManagerDialogProps) {
  const { toast } = useToast();

  const templatesQuery = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return query(
      collection(firestore, CONTRACT_TEMPLATES_COLLECTION),
      where("companyId", "==", companyId)
    );
  }, [firestore, companyId]);

  const {
    data: templatesRaw,
    isLoading: templatesLoading,
    error: templatesError,
  } = useCollection<ContractTemplateFirestoreDoc>(templatesQuery);

  const processedFromFirestore = useMemo(
    () => sortAndFilterTemplates(templatesRaw ?? undefined, companyId),
    [templatesRaw, companyId]
  );

  const [templates, setTemplates] = useState<ContractTemplateFirestoreDoc[]>(
    []
  );

  useEffect(() => {
    setTemplates(processedFromFirestore);
  }, [processedFromFirestore]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formContent, setFormContent] = useState("");
  const [saving, setSaving] = useState(false);

  const [templatePendingDelete, setTemplatePendingDelete] = useState<
    string | null
  >(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (templatesError) {
      console.error("[WorkContractTemplatesManager]", templatesError);
      toast({
        variant: "destructive",
        title: "Chyba načítání šablon",
        description: templatesError.message || "Zkuste to prosím znovu.",
      });
    }
  }, [templatesError, toast]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setFormName("");
    setFormContent("");
  }, []);

  useEffect(() => {
    if (!open) {
      resetForm();
      setTemplatePendingDelete(null);
      setIsDeleting(false);
    }
  }, [open, resetForm]);

  const handleMainOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setTemplatePendingDelete(null);
        setIsDeleting(false);
      }
      onOpenChange(next);
    },
    [onOpenChange]
  );

  async function handleDeleteTemplate(templateId: string) {
    if (!firestore || !companyId) return;
    const row = templates.find((t) => t.id === templateId);
    if (row && row.companyId !== companyId) return;

    try {
      setIsDeleting(true);
      await deleteDoc(doc(firestore, CONTRACT_TEMPLATES_COLLECTION, templateId));
      setTemplates((prev) => prev.filter((item) => item.id !== templateId));
      setTemplatePendingDelete(null);
      if (editingId === templateId) resetForm();
      toast({
        title: "Šablona smazána",
        description: row?.name ?? templateId,
      });
    } catch (error: unknown) {
      console.error("Chyba při mazání šablony:", error);
      const err = error as { message?: string };
      toast({
        variant: "destructive",
        title: "Smazání se nezdařilo",
        description: err?.message || "Zkuste to prosím znovu.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  const startCreate = useCallback(() => {
    resetForm();
  }, [resetForm]);

  const startEdit = useCallback((template: ContractTemplateFirestoreDoc) => {
    setEditingId(template.id);
    setFormName(template.name || "");
    setFormContent(template.content || "");
  }, []);

  const handleSave = async () => {
    if (!firestore || !companyId) {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: "Chybí připojení k databázi nebo firma.",
      });
      return;
    }

    const name = formName.trim();
    if (!name) {
      toast({
        variant: "destructive",
        title: "Chybí název",
        description: "Vyplňte název šablony.",
      });
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateContractTemplate(firestore, editingId, {
          name,
          content: formContent,
        });
        toast({
          title: "Šablona uložena",
          description: `„${name}“ byla aktualizována (updateDoc + updatedAt).`,
        });
      } else {
        await createContractTemplate(firestore, {
          companyId,
          name,
          content: formContent,
          createdBy: userId ?? null,
        });
        toast({
          title: "Šablona vytvořena",
          description: `„${name}“ je k dispozici při tvorbě smlouvy o dílo.`,
        });
      }
      resetForm();
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.error("[WorkContractTemplatesManager] save failed", e);
      toast({
        variant: "destructive",
        title: "Uložení se nezdařilo",
        description: err?.message || "Zkuste to prosím znovu.",
      });
    } finally {
      setSaving(false);
    }
  };

  const disabled = !companyId || !firestore;

  const cancelOrCloseForm = useCallback(() => {
    if (templatePendingDelete !== null) {
      setTemplatePendingDelete(null);
      return;
    }
    onOpenChange(false);
  }, [templatePendingDelete, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleMainOpenChange}>
      <DialogContent className="fixed left-1/2 top-1/2 z-50 w-full max-w-[calc(100vw-2rem)] sm:max-w-5xl max-h-[90vh] min-h-0 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-0 overflow-y-auto overflow-x-hidden rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b border-slate-200">
          <DialogTitle className="text-xl text-black">Šablony SOD</DialogTitle>
          <DialogDescription className="text-slate-600">
            Správa šablon smlouvy o dílo. Kolekce{" "}
            <code className="text-xs bg-slate-100 px-1">contractTemplates</code>, filtr{" "}
            <code className="text-xs bg-slate-100 px-1">companyId</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
          <div className="lg:w-[280px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col min-h-[200px] lg:min-h-0">
            <div className="p-4 flex items-center justify-between gap-2 border-b border-slate-100">
              <span className="text-sm font-semibold text-black">
                Vaše šablony
              </span>
              <Button
                type="button"
                size="sm"
                className="gap-1 bg-orange-500 hover:bg-orange-600 text-white"
                onClick={startCreate}
                disabled={disabled}
              >
                <Plus className="h-4 w-4" /> Nová šablona
              </Button>
            </div>
            <WorkContractTemplatesList
              templates={templates}
              loading={templatesLoading}
              editingId={editingId}
              templatePendingDelete={templatePendingDelete}
              isDeleting={isDeleting}
              disabled={disabled || isDeleting}
              onEdit={startEdit}
              onBeginDelete={setTemplatePendingDelete}
              onConfirmDelete={(id) => void handleDeleteTemplate(id)}
              onCancelPendingDelete={() => setTemplatePendingDelete(null)}
            />
          </div>

          <WorkContractTemplateForm
            disabled={disabled}
            editingId={editingId}
            name={formName}
            content={formContent}
            onNameChange={setFormName}
            onContentChange={setFormContent}
            onSubmit={handleSave}
            saving={saving}
            onCancel={cancelOrCloseForm}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
