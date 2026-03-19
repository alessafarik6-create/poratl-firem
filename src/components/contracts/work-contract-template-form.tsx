"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { LIGHT_FORM_CONTROL_CLASS } from "@/lib/light-form-control-classes";
import { CONTRACT_TEMPLATE_PLACEHOLDER_HELP } from "@/lib/contract-template-placeholders";

const FIELD = cn(
  LIGHT_FORM_CONTROL_CLASS,
  "min-h-[44px] md:min-h-10 shadow-sm"
);

const TEXTAREA_FIELD = cn(
  LIGHT_FORM_CONTROL_CLASS,
  "min-h-[200px] resize-y shadow-sm"
);

export type WorkContractTemplateFormProps = {
  disabled: boolean;
  editingId: string | null;
  name: string;
  content: string;
  onNameChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onSubmit: () => void | Promise<void>;
  saving: boolean;
  onCancel?: () => void;
};

/**
 * Formulář šablony SOD. Nativní overflow místo ScrollArea (stabilita uvnitř dialogu).
 */
export function WorkContractTemplateForm({
  disabled,
  editingId,
  name,
  content,
  onNameChange,
  onContentChange,
  onSubmit,
  saving,
  onCancel,
}: WorkContractTemplateFormProps) {
  return (
    <div className="flex-1 min-w-0 flex flex-col min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto h-[50vh] lg:h-[calc(90vh-220px)]">
        <div className="p-6 space-y-4">
          <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-black">
            <span className="font-semibold">
              {editingId ? "Úprava šablony" : "Nová šablona"}
            </span>
            {editingId ? (
              <span className="text-slate-600 ml-2">(ID: {editingId})</span>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="wct-form-name" className="text-black">
              Název šablony
            </Label>
            <Input
              id="wct-form-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="např. Smlouva o dílo – standard"
              disabled={disabled}
              className={FIELD}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wct-form-content" className="text-black">
              Obsah smlouvy
            </Label>
            <Textarea
              id="wct-form-content"
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder="Text smlouvy… Můžete vložit proměnné níže."
              disabled={disabled}
              className={TEXTAREA_FIELD}
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 whitespace-pre-wrap">
            <p className="font-semibold text-black mb-2">Proměnné v textu</p>
            {CONTRACT_TEMPLATE_PLACEHOLDER_HELP}
          </div>
        </div>
      </div>

      <div className="shrink-0 px-6 py-4 border-t border-slate-200 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] border-slate-300 text-black bg-white"
            disabled={disabled || saving}
            onClick={onCancel}
          >
            Zavřít
          </Button>
        ) : null}
        <Button
          type="button"
          className="min-h-[44px] bg-orange-500 hover:bg-orange-600 text-white border-0"
          disabled={disabled || saving}
          onClick={() => void onSubmit()}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Ukládám…
            </>
          ) : editingId ? (
            "Uložit změny"
          ) : (
            "Vytvořit šablonu"
          )}
        </Button>
      </div>
    </div>
  );
}
