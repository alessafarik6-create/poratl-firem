"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContractTemplateFirestoreDoc } from "@/lib/contract-templates-firestore";

export type WorkContractTemplatesListProps = {
  templates: ContractTemplateFirestoreDoc[];
  loading: boolean;
  editingId: string | null;
  /** ID řádku ve stavu inline potvrzení smazání (bez druhého modalu). */
  templatePendingDelete: string | null;
  isDeleting: boolean;
  disabled: boolean;
  onEdit: (template: ContractTemplateFirestoreDoc) => void;
  /** Po kliknutí na Smazat — pouze otevře inline potvrzení. */
  onBeginDelete: (templateId: string) => void;
  onConfirmDelete: (templateId: string) => void;
  onCancelPendingDelete: () => void;
};

/**
 * Seznam šablon SOD uvnitř jednoho Dialogu. Potvrzení smazání je inline na řádku (žádný AlertDialog).
 * key={template.id}
 */
export function WorkContractTemplatesList({
  templates,
  loading,
  editingId,
  templatePendingDelete,
  isDeleting,
  disabled,
  onEdit,
  onBeginDelete,
  onConfirmDelete,
  onCancelPendingDelete,
}: WorkContractTemplatesListProps) {
  return (
    <div className="flex-1 min-h-0 h-[220px] lg:h-auto overflow-y-auto">
      <div className="p-2 space-y-1">
        {loading ? (
          <div className="flex justify-center py-8 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <p className="text-sm text-slate-500 px-2 py-4">
            Zatím nemáte žádnou šablonu. Klikněte na „Nová šablona“.
          </p>
        ) : (
          templates.map((template) => {
            const isPending = templatePendingDelete === template.id;
            return (
              <div
                key={template.id}
                className={cn(
                  "rounded-lg border p-2 flex flex-col gap-2 bg-white",
                  editingId === template.id
                    ? "border-orange-400 bg-orange-50"
                    : "border-slate-200",
                  isPending && "border-red-300 bg-red-50/50"
                )}
              >
                <button
                  type="button"
                  className="text-left text-sm font-medium text-black line-clamp-2"
                  onClick={() => onEdit(template)}
                  disabled={disabled || isPending}
                >
                  {template.name || "Bez názvu"}
                </button>

                {isPending ? (
                  <div className="flex flex-col gap-2 pt-1">
                    <p className="text-xs text-slate-800 font-medium">
                      Opravdu smazat tuto šablonu?
                    </p>
                    <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="flex-1 min-h-[40px] bg-red-600 text-white hover:bg-red-700"
                        disabled={disabled || isDeleting}
                        onClick={() => onConfirmDelete(template.id)}
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                            <span>Mažu…</span>
                          </>
                        ) : (
                          "Potvrdit smazání"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 min-h-[40px] border-slate-300 text-black bg-white"
                        disabled={disabled || isDeleting}
                        onClick={onCancelPendingDelete}
                      >
                        Zrušit
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 min-h-[40px] border-slate-300 text-black bg-white hover:bg-slate-50"
                      onClick={() => onEdit(template)}
                      disabled={disabled}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1 shrink-0" aria-hidden />
                      Upravit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 min-h-[40px] border-red-200 text-red-700 bg-white hover:bg-red-50"
                      disabled={disabled}
                      onClick={() => onBeginDelete(template.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1 shrink-0" aria-hidden />
                      Smazat
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
