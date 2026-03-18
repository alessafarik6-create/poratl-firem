"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useUser,
  useFirestore,
  useDoc,
  useMemoFirebase,
  useCollection,
  useCompany,
} from "@/firebase";
import { storage } from "@/firebase/storage";
import {
  doc,
  collection,
  updateDoc,
  serverTimestamp,
  deleteDoc,
  getDocs,
  getDoc,
  setDoc,
} from "firebase/firestore";
import {
  User,
  ImagePlus,
  Camera,
  Pencil,
  Trash2,
  Calendar,
  Users,
  Clock,
  ChevronLeft,
  Edit2,
  FileText,
  FileStack,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { JobTemplate, JobTemplateValues } from "@/lib/job-templates";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { JobTemplateFormFields } from "@/components/jobs/job-template-form-fields";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

type Segment = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  label: string;
};

type WorkContractForm = {
  templateName: string;
  contractHeader: string;
  mainContractContent: string;
  client: string;
  contractor: string;
  additionalInfo: string;
  depositPercentage: string;
  depositAmount: string;
  bankAccountNumber: string;
};

type WorkContractDoc = {
  id: string;
  jobId?: string;
  contractType?: string;
  templateDocId?: string | null;
  templateName?: string | null;
  contractHeader?: string;
  mainContractContent?: string;
  client?: string;
  contractor?: string;
  additionalInfo?: string;
  depositPercentage?: string | number | null;
  depositAmount?: string | number | null;
  bankAccountNumber?: string | null;
  pdfHtml?: string;
  pdfSavedAt?: any;
  createdAt?: any;
  updatedAt?: any;
};

type JobEditForm = {
  name: string;
  description: string;
  status: string;
  budget: string;
  startDate: string;
  endDate: string;
  measuring: string;
  measuringDetails: string;
  customerId: string;
  assignedEmployeeIdsText: string;
};

type PhotoDoc = {
  id: string;
  imageUrl?: string;
  originalImageUrl?: string;
  annotatedImageUrl?: string;
  storagePath?: string;
  annotatedStoragePath?: string;
  fileName?: string;
  createdAt?: any;
  createdBy?: string;
};

export default function JobDetailPage() {
  const { jobId } = useParams();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, "users", user.uid) : null),
    [firestore, user]
  );
  const { data: profile } = useDoc(userRef);

  const companyId = profile?.companyId;
  const { company: companyDoc, companyName: companyNameFromDoc } = useCompany();

  const companyBankAccountNumber = useMemo(() => {
    const c: any = companyDoc;
    return (
      c?.bankAccountNumber ||
      c?.bankAccount ||
      c?.bank_account ||
      c?.accountNumber ||
      c?.ucet ||
      c?.account ||
      c?.iban ||
      c?.IBAN ||
      ""
    );
  }, [companyDoc]);

  const jobRef = useMemoFirebase(
    () =>
      firestore && companyId && jobId
        ? doc(firestore, "companies", companyId, "jobs", jobId as string)
        : null,
    [firestore, companyId, jobId]
  );
  const { data: job, isLoading } = useDoc(jobRef);

  const jobBudgetKc = useMemo(() => {
    const b: any = job?.budget;
    if (b === undefined || b === null || b === "") return null;
    const n = typeof b === "number" ? b : Number(b);
    return Number.isFinite(n) ? n : null;
  }, [job?.budget]);

  const templateRef = useMemoFirebase(
    () =>
      firestore && companyId && job?.templateId
        ? doc(firestore, "companies", companyId, "jobTemplates", job.templateId)
        : null,
    [firestore, companyId, job?.templateId]
  );
  const { data: template } = useDoc(templateRef);

  const isAdmin =
    profile?.role === "owner" ||
    profile?.role === "admin" ||
    profile?.globalRoles?.includes("super_admin");

  const photosColRef = useMemoFirebase(
    () =>
      firestore && companyId && jobId
        ? collection(
            firestore,
            "companies",
            companyId,
            "jobs",
            jobId as string,
            "photos"
          )
        : null,
    [firestore, companyId, jobId]
  );
  const { data: photos } = useCollection(photosColRef);

  const customerId =
    (job as any)?.customerId ||
    (job as any)?.customer_id ||
    (job as any)?.customerID ||
    null;

  const customerRef = useMemoFirebase(
    () =>
      firestore && companyId && customerId
        ? doc(
            firestore,
            "companies",
            companyId,
            "customers",
            customerId
          )
        : null,
    [firestore, companyId, customerId]
  );
  const { data: customer } = useDoc<any>(customerRef);

  const customersColRef = useMemoFirebase(
    () =>
      firestore && companyId
        ? collection(firestore, "companies", companyId, "customers")
        : null,
    [firestore, companyId]
  );
  const { data: customers } = useCollection(customersColRef);

  const workContractTemplatesColRef = useMemoFirebase(
    () =>
      firestore && companyId
        ? collection(
            firestore,
            "companies",
            companyId,
            "workContractTemplates"
          )
        : null,
    [firestore, companyId]
  );
  const {
    data: workContractTemplates,
    isLoading: isWorkContractTemplatesLoading,
  } = useCollection(workContractTemplatesColRef);

  const workContractsColRef = useMemoFirebase(
    () =>
      firestore && companyId && jobId
        ? collection(
            firestore,
            "companies",
            companyId,
            "jobs",
            jobId as string,
            "workContracts"
          )
        : null,
    [firestore, companyId, jobId]
  );
  const { data: workContracts, isLoading: isWorkContractsLoading } =
    useCollection<WorkContractDoc>(workContractsColRef);

  const workContractsForJob = useMemo(() => {
    const list = (workContracts || []) as WorkContractDoc[];
    const filtered = list.filter(
      (c) => !c.contractType || c.contractType === "smlouva_o_dilo"
    );

    const getTime = (t: any) => {
      if (!t) return 0;
      if (typeof t === "number") return t;
      if (typeof t.toMillis === "function") return t.toMillis();
      if (typeof t.toDate === "function") return t.toDate().getTime();
      return 0;
    };

    return filtered
      .slice()
      .sort(
        (a, b) => getTime(b.updatedAt) - getTime(a.updatedAt) ||
          getTime(b.createdAt) - getTime(a.createdAt)
      );
  }, [workContracts]);

  const formatContractDate = useCallback((t: any): string => {
    try {
      if (!t) return "-";
      if (typeof t.toDate === "function") {
        return t.toDate().toLocaleString("cs-CZ");
      }
      if (typeof t === "number") {
        return new Date(t).toLocaleString("cs-CZ");
      }
      return "-";
    } catch {
      return "-";
    }
  }, []);

  const [isUploading, setIsUploading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [photoToEdit, setPhotoToEdit] = useState<PhotoDoc | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const [imageForCanvas, setImageForCanvas] = useState<HTMLImageElement | null>(null);
  const [baseImageLoaded, setBaseImageLoaded] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [currentSegment, setCurrentSegment] = useState<Segment | null>(null);

  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [contractDialogMode, setContractDialogMode] = useState<"view" | "edit">(
    "edit"
  );
  const isContractReadOnly = contractDialogMode === "view";
  const [isContractDirty, setIsContractDirty] = useState(false);
  const [selectedWorkContractTemplateId, setSelectedWorkContractTemplateId] =
    useState<string>("__new__");
  const CONTRACT_DOC_ID_DEFAULT = "smlouva_o_dilo";
  const [activeWorkContractId, setActiveWorkContractId] = useState<string>(
    CONTRACT_DOC_ID_DEFAULT
  );
  const [hasLoadedWorkContract, setHasLoadedWorkContract] = useState(false);
  const [isSavingContract, setIsSavingContract] = useState(false);
  const [contractForm, setContractForm] = useState<WorkContractForm>({
    templateName: "",
    contractHeader: "",
    mainContractContent: "",
    client: "",
    contractor: "",
    additionalInfo: "",
    depositPercentage: "",
    depositAmount: "",
    bankAccountNumber: "",
  });
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const [editJobDialogOpen, setEditJobDialogOpen] = useState(false);
  const [isSavingJobEdit, setIsSavingJobEdit] = useState(false);
  const [jobEditForm, setJobEditForm] = useState<JobEditForm>({
    name: "",
    description: "",
    status: "nová",
    budget: "",
    startDate: "",
    endDate: "",
    measuring: "",
    measuringDetails: "",
    customerId: "",
    assignedEmployeeIdsText: "",
  });
  const [jobEditTemplateValues, setJobEditTemplateValues] =
    useState<JobTemplateValues>({});

  const setCanvasNode = useCallback((node: HTMLCanvasElement | null) => {
    canvasRef.current = node;
    setCanvasReady(!!node);
  }, []);

  const resetAnnotationState = useCallback(() => {
    setImageError(null);
    setImageForCanvas(null);
    setBaseImageLoaded(false);
    setIsDrawing(false);
    setSegments([]);
    setCurrentSegment(null);
  }, []);

  const annotationSource = useMemo(() => {
    if (!photoToEdit) return null;

    return (
      photoToEdit.originalImageUrl ||
      photoToEdit.imageUrl ||
      photoToEdit.annotatedImageUrl ||
      photoToEdit.storagePath ||
      photoToEdit.annotatedStoragePath ||
      null
    );
  }, [photoToEdit]);

  const loadHtmlImage = useCallback(
    (src: string, useCrossOrigin = false): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        if (!src) {
          reject(new Error("Missing image URL."));
          return;
        }

        const img = new Image();

        if (useCrossOrigin) {
          img.crossOrigin = "anonymous";
        }

        const timeout = window.setTimeout(() => {
          reject(new Error("Image load timeout after 15 seconds."));
        }, 15000);

        img.onload = () => {
          window.clearTimeout(timeout);
          resolve(img);
        };

        img.onerror = (e) => {
          window.clearTimeout(timeout);
          console.error("[JobDetailPage] Image load failed", e);
          reject(new Error(`Image load failed for: ${src}`));
        };

        img.src = src;
      });
    },
    []
  );

  const resolveAnnotationImageUrl = useCallback(async (rawValue: string): Promise<string> => {
    const value = rawValue?.trim();
    if (!value) {
      throw new Error("Missing image URL.");
    }

    if (value.startsWith("http://") || value.startsWith("https://")) {
      return value;
    }

    if (value.startsWith("gs://")) {
      const withoutBucket = value.replace(/^gs:\/\/[^/]+\//, "");
      return await getDownloadURL(ref(storage, withoutBucket));
    }

    return await getDownloadURL(ref(storage, value));
  }, []);

  const escapeHtml = (value: string) =>
    value.replace(/[&<>"']/g, (ch) => {
      switch (ch) {
        case "&":
          return "&amp;";
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case '"':
          return "&quot;";
        case "'":
          return "&#039;";
        default:
          return ch;
      }
    });

  const withLineBreaks = (value: string) =>
    escapeHtml(value).replace(/\n/g, "<br/>");

  const deriveCustomerDisplayName = (c: any): string => {
    if (!c) return "";
    return (
      c.companyName ||
      [c.firstName, c.lastName].filter(Boolean).join(" ").trim() ||
      ""
    );
  };

  const deriveClientText = (c: any): string => {
    if (!c) return "";
    const name = deriveCustomerDisplayName(c);
    const address = c.address || "";
    const ico = c.ico ? `IČO: ${c.ico}` : "";
    const dic =
      c.dic || (c as any).DIČ || (c as any).DIC
        ? `DIČ: ${c.dic || (c as any).DIČ || (c as any).DIC}`
        : "";
    const email = c.email ? `Email: ${c.email}` : "";
    const phone = c.phone ? `Telefon: ${c.phone}` : "";
    return [name, address, ico, dic, email, phone].filter(Boolean).join("\n");
  };

  const deriveContractorText = (co: any, coName: string): string => {
    const name = coName || co?.companyName || co?.name || "";
    const address =
      co?.registeredOfficeAddress ||
      co?.registeredOffice ||
      co?.address ||
      co?.sidlo ||
      "";
    const ico = co?.ico ? `IČO: ${co.ico}` : "";
    const dicRaw =
      co?.dic || (co as any).DIČ || (co as any).DIC || (co as any)["dič"] || "";
    const dic = dicRaw ? `DIČ: ${dicRaw}` : "";
    return [name, address, ico, dic].filter(Boolean).join("\n");
  };

  const computeDepositAmountFromPercent = useCallback(
    (percentStr: string): string => {
      if (jobBudgetKc == null) return "";
      const p = Number(String(percentStr).replace(",", "."));
      if (!Number.isFinite(p)) return "";

      const raw = (jobBudgetKc * p) / 100;
      const rounded = Math.round(raw);
      return String(rounded);
    },
    [jobBudgetKc]
  );

  const formatKc = useCallback((amountStr: string): string => {
    const n = Number(String(amountStr).replace(/\s+/g, "").replace(",", "."));
    if (!Number.isFinite(n)) return "";
    return `${Math.round(n).toLocaleString("cs-CZ")} Kč`;
  }, []);

  const applyTemplateVariables = useCallback(
    (input: string, formOverride?: WorkContractForm): string => {
      const today = new Intl.DateTimeFormat("cs-CZ").format(new Date());

      const supplierName =
        companyNameFromDoc ||
        companyDoc?.companyName ||
        (companyDoc as any)?.name ||
        "";
      const supplierAddress =
        (companyDoc as any)?.registeredOfficeAddress ||
        (companyDoc as any)?.registeredOffice ||
        (companyDoc as any)?.address ||
        (companyDoc as any)?.sidlo ||
        "";
      const supplierIco = companyDoc?.ico || "";
      const supplierDicRaw =
        (companyDoc as any)?.dic ||
        (companyDoc as any).DIČ ||
        (companyDoc as any).DIC ||
        (companyDoc as any)["dič"] ||
        "";

      const supplierAutoText = deriveContractorText(
        companyDoc,
        companyNameFromDoc
      );

      const customerName = deriveCustomerDisplayName(customer);
      const customerAddress = customer?.address || "";
      const customerIco = customer?.ico || "";
      const customerDicRaw =
        customer?.dic || (customer as any).DIČ || (customer as any).DIC || "";

      const customerAutoText = deriveClientText(customer);

      const depositPercentage =
        formOverride?.depositPercentage ?? contractForm.depositPercentage;
      const depositAmount =
        formOverride?.depositAmount ?? contractForm.depositAmount;
      const bankAccountNumber =
        formOverride?.bankAccountNumber ?? contractForm.bankAccountNumber;

      const tokenMap: Record<string, string> = {
        "dodavatel.nazev": supplierName,
        "dodavatel.sidlo": supplierAddress,
        "dodavatel.ico": supplierIco ? String(supplierIco) : "",
        "dodavatel.dic": supplierDicRaw ? String(supplierDicRaw) : "",
        dodavatel: supplierAutoText,

        "objednatel.nazev": customerName,
        "objednatel.sidlo": customerAddress,
        "objednatel.ico": customerIco ? String(customerIco) : "",
        "objednatel.dic": customerDicRaw ? String(customerDicRaw) : "",
        objednatel: customerAutoText,

        "zakazka.nazev": job?.name || "",
        "zakazka.id": jobId?.toString() || "",
        datum: today,

        "zaloha.procenta": depositPercentage ? `${depositPercentage} %` : "",
        "zaloha.castka": formatKc(depositAmount),
        "zaloha.ucet": bankAccountNumber || "",
        zaloha: formatKc(depositAmount),
      };

      if (!input) return "";
      return input.replace(
        /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g,
        (match, token) => {
          const v = tokenMap[token];
          return v !== undefined ? v : match;
        }
      );
    },
    [
      companyDoc,
      companyNameFromDoc,
      customer,
      deriveClientText,
      deriveContractorText,
      deriveCustomerDisplayName,
      job?.name,
      jobId,
      contractForm.depositPercentage,
      contractForm.depositAmount,
      contractForm.bankAccountNumber,
      computeDepositAmountFromPercent,
      formatKc,
    ]
  );

  const buildPrefilledContractHeader = useCallback((): string => {
    const jobName = job?.name || "Zakázka";
    const clientName = customer ? deriveCustomerDisplayName(customer) : "";
    const supplierName =
      companyNameFromDoc ||
      companyDoc?.companyName ||
      (companyDoc as any)?.name ||
      "";
    const dateStr = new Intl.DateTimeFormat("cs-CZ").format(new Date());

    return [
      "Smlouva o dílo",
      `Zakázka: ${jobName}`,
      clientName ? `Objednatel: ${clientName}` : "",
      supplierName ? `Dodavatel: ${supplierName}` : "",
      `Datum: ${dateStr}`,
    ]
      .filter(Boolean)
      .join("\n");
  }, [job?.name, customer, companyDoc, companyNameFromDoc]);

  const buildTemplateValuesText = useCallback((): string => {
    if (!template || !job?.templateValues || !Array.isArray(template.sections)) {
      return "";
    }

    const tv = job.templateValues as JobTemplateValues;
    const lines: string[] = [];

    template.sections
      .slice()
      .sort((a: any, b: any) => a.order - b.order)
      .forEach((section: any) => {
        section.fields?.forEach((f: any) => {
          const key = `${section.id}_${f.id}`;
          const value = (tv as any)[key];
          if (
            value === undefined ||
            value === null ||
            value === "" ||
            typeof value === "object"
          ) {
            return;
          }

          const display =
            typeof value === "boolean"
              ? value
                ? "Ano"
                : "Ne"
              : String(value);
          lines.push(`${f.label}: ${display}`);
        });
      });

    return lines.join("\n");
  }, [template, job?.templateValues]);

  const buildJobSpecificationContractBody = useCallback((): string => {
    const popis = job?.description || "";
    const mer = job?.measuring || "";
    const merDet = job?.measuringDetails || "";
    const zamereni = buildTemplateValuesText();

    return [
      "Popis zakázky:",
      popis ? popis : "—",
      "",
      "Měření:",
      mer ? mer : "—",
      merDet ? merDet : "",
      "",
      "Zaměření podle šablony:",
      zamereni ? zamereni : "—",
      "",
      "Platební podmínky (záloha):",
      "• Záloha: {{zaloha.procenta}}",
      "• Částka zálohy: {{zaloha.castka}}",
      "• Číslo účtu: {{zaloha.ucet}}",
    ]
      .filter((l) => l !== "")
      .join("\n");
  }, [job?.description, job?.measuring, job?.measuringDetails, buildTemplateValuesText]);

  const prefillContractFormFromJobAndCustomer = useCallback(() => {
    const clientText = deriveClientText(customer);
    const contractorText = deriveContractorText(companyDoc, companyNameFromDoc);

    setContractForm((prev) => ({
      ...prev,
      contractHeader: prev.contractHeader || buildPrefilledContractHeader(),
      client: prev.client || clientText,
      contractor: prev.contractor || contractorText,
    }));
  }, [
    customer,
    companyDoc,
    companyNameFromDoc,
    buildPrefilledContractHeader,
  ]);

  useEffect(() => {
    if (!contractDialogOpen) return;
    if (isContractDirty) return;
    if (hasLoadedWorkContract) return;
    prefillContractFormFromJobAndCustomer();
  }, [
    contractDialogOpen,
    isContractDirty,
    hasLoadedWorkContract,
    prefillContractFormFromJobAndCustomer,
  ]);

  const openContractDialog = useCallback(async () => {
    if (!firestore || !companyId || !jobId) {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: "Chybí data pro načtení smlouvy.",
      });
      return;
    }

    // Create a new contract version id for each click.
    const newContractId = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    setContractDialogMode("edit");
    setContractDialogOpen(true);
    setHasLoadedWorkContract(true);
    setIsContractDirty(false);

    setActiveWorkContractId(newContractId);
    setSelectedWorkContractTemplateId("__new__");

    const autoClientText = deriveClientText(customer);
    const autoContractorText = deriveContractorText(
      companyDoc,
      companyNameFromDoc
    );

    setContractForm({
      templateName: "",
      contractHeader: buildPrefilledContractHeader(),
      mainContractContent: buildJobSpecificationContractBody(),
      client: autoClientText,
      contractor: autoContractorText,
      additionalInfo: "",
      depositPercentage: "",
      depositAmount: "",
      bankAccountNumber: companyBankAccountNumber,
    });
  }, [
    firestore,
    companyId,
    jobId,
    toast,
    customer,
    companyDoc,
    companyNameFromDoc,
    deriveClientText,
    deriveContractorText,
    buildPrefilledContractHeader,
    buildJobSpecificationContractBody,
  ]);

  const openWorkContract = useCallback(
    async (contractId: string, mode: "view" | "edit") => {
      if (!firestore || !companyId || !jobId) return;

      try {
        const contractRef = doc(
          firestore,
          "companies",
          companyId,
          "jobs",
          jobId as string,
          "workContracts",
          contractId
        );

        const snap = await getDoc(contractRef);
        if (!snap.exists()) {
          toast({
            variant: "destructive",
            title: "Smlouva nenalezena",
            description: "Záznam se nepodařilo načíst.",
          });
          return;
        }

        const data = snap.data() as WorkContractDoc;

        setContractDialogMode(mode);
        setContractDialogOpen(true);
        setActiveWorkContractId(contractId);
        setSelectedWorkContractTemplateId(
          data.templateDocId || "__new__"
        );
        setHasLoadedWorkContract(true);
        setIsContractDirty(false);

        setContractForm({
          templateName: (data.templateName as any) || "",
          contractHeader: (data.contractHeader as any) || "",
          mainContractContent: (data.mainContractContent as any) || "",
          client: (data.client as any) || "",
          contractor: (data.contractor as any) || "",
          additionalInfo: (data.additionalInfo as any) || "",
          depositPercentage: data.depositPercentage != null ? String(data.depositPercentage) : "",
          depositAmount: data.depositAmount != null ? String(data.depositAmount) : "",
          bankAccountNumber: (data.bankAccountNumber as any) || companyBankAccountNumber || "",
        });
      } catch (err: any) {
        console.error("[WorkContract] openWorkContract failed", err);
        toast({
          variant: "destructive",
          title: "Chyba při otevření",
          description: err?.message || "Nepodařilo se načíst smlouvu.",
        });
      }
    },
    [firestore, companyId, jobId, toast]
  );

  const generatePDFFromContractId = useCallback(
    async (contractId: string) => {
      if (!firestore || !companyId || !jobId || !user) {
        toast({
          variant: "destructive",
          title: "Chyba",
          description: "Chybí data pro generování PDF.",
        });
        return;
      }

      try {
        const contractRef = doc(
          firestore,
          "companies",
          companyId,
          "jobs",
          jobId as string,
          "workContracts",
          contractId
        );

        const snap = await getDoc(contractRef);
        if (!snap.exists()) {
          toast({
            variant: "destructive",
            title: "Smlouva nenalezena",
            description: "Záznam se nepodařilo načíst.",
          });
          return;
        }

        const data = snap.data() as WorkContractDoc;
        const form: WorkContractForm = {
          templateName: (data.templateName as any) || "",
          contractHeader: (data.contractHeader as any) || "",
          mainContractContent: (data.mainContractContent as any) || "",
          client: (data.client as any) || "",
          contractor: (data.contractor as any) || "",
          additionalInfo: (data.additionalInfo as any) || "",
          depositPercentage:
            data.depositPercentage != null
              ? String(data.depositPercentage)
              : "",
          depositAmount:
            data.depositAmount != null ? String(data.depositAmount) : "",
          bankAccountNumber:
            (data.bankAccountNumber as any) || companyBankAccountNumber || "",
        };

        const header = applyTemplateVariables(form.contractHeader || "");
        const body = applyTemplateVariables(form.mainContractContent || "");
        const additionalInfo = applyTemplateVariables(
          form.additionalInfo || ""
        );
        const client = applyTemplateVariables(form.client || "");
        const contractor = applyTemplateVariables(form.contractor || "");
        const title = form.templateName || "Smlouva o dílo";

        const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Noto Sans", "Helvetica Neue", sans-serif; margin: 28px; color: #0f172a; }
      .muted { color: #475569; font-size: 12px; margin-bottom: 14px; }
      .header { white-space: normal; font-size: 14px; margin-bottom: 18px; }
      .content { white-space: normal; font-size: 13.5px; line-height: 1.45; }
      .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 28px; }
      .partyTitle { font-weight: 700; margin-bottom: 6px; }
      .partyBox { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; min-height: 120px; }
      @media print { body { margin: 18px; } }
    </style>
  </head>
  <body>
    <div class="muted">Dokument: Smlouva o dílo</div>
    <div class="header">${withLineBreaks(header)}</div>
    <div class="content">${withLineBreaks(body)}</div>
    ${
      additionalInfo?.trim()
        ? `<div class="content" style="margin-top: 18px"><b>Doplňující informace</b><div>${withLineBreaks(additionalInfo)}</div></div>`
        : ""
    }
    <div class="parties">
      <div class="partyBox">
        <div class="partyTitle">Objednatel</div>
        <div>${withLineBreaks(client)}</div>
      </div>
      <div class="partyBox">
        <div class="partyTitle">Dodavatel</div>
        <div>${withLineBreaks(contractor)}</div>
      </div>
    </div>
  </body>
</html>`;

        // Persist the generated document HTML to the job.
        await setDoc(
          contractRef,
          {
            pdfHtml: html,
            pdfSavedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        const w = window.open("", "_blank");
        if (!w) {
          throw new Error(
            "Popup blokováno prohlížečem. Povolit vyskakovací okna."
          );
        }

        w.document.open();
        w.document.write(html);
        w.document.close();
        w.focus();

        setTimeout(() => {
          try {
            w.print();
          } catch (err) {
            console.error("[WorkContract] print failed", err);
          }
        }, 200);

        toast({
          title: "PDF se připravuje",
          description: "Otevřelo se tiskové okno. Uložte jako PDF.",
        });
      } catch (err: any) {
        console.error("[WorkContract] generatePDFFromContractId failed", err);
        toast({
          variant: "destructive",
          title: "Chyba při generování PDF",
          description:
            err?.message || "Nepodařilo se vygenerovat PDF.",
        });
      }
    },
    [firestore, companyId, jobId, user, toast, applyTemplateVariables]
  );

  const deleteWorkContract = useCallback(
    async (contractId: string) => {
      if (!firestore || !companyId || !jobId) return;

      const ok = window.confirm(
        "Opravdu chcete smazat smlouvu o dílo pro tuto zakázku?"
      );
      if (!ok) return;

      try {
        const contractRef = doc(
          firestore,
          "companies",
          companyId,
          "jobs",
          jobId as string,
          "workContracts",
          contractId
        );

        await deleteDoc(contractRef);
        toast({
          title: "Smlouva smazána",
          description: "Záznam byl odstraněn.",
        });

        if (activeWorkContractId === contractId) {
          setContractDialogOpen(false);
        }
      } catch (err: any) {
        console.error("[WorkContract] deleteWorkContract failed", err);
        toast({
          variant: "destructive",
          title: "Chyba při mazání",
          description:
            err?.message || "Nepodařilo se smlouvu smazat.",
        });
      }
    },
    [firestore, companyId, jobId, toast, activeWorkContractId]
  );

  const handleLoadWorkContractTemplate = useCallback(
    (templateId: string) => {
      if (templateId === "__new__") {
        setSelectedWorkContractTemplateId("__new__");
        setIsContractDirty(false);
        setContractForm({
          templateName: "",
          contractHeader: "",
          mainContractContent: "",
          client: "",
          contractor: "",
          additionalInfo: "",
          depositPercentage: "",
          depositAmount: "",
          bankAccountNumber: companyBankAccountNumber,
        });
        return;
      }

      const tmpl = workContractTemplates?.find((t: any) => t.id === templateId);
      if (!tmpl) {
        toast({
          variant: "destructive",
          title: "Nepodařilo se načíst šablonu",
          description: "Šablona nebyla nalezena.",
        });
        return;
      }

      setSelectedWorkContractTemplateId(templateId);
      setIsContractDirty(true);

      const loadedDepositPercentage =
        tmpl.depositPercentage != null ? String(tmpl.depositPercentage) : "";
      const computedDepositAmount =
        computeDepositAmountFromPercent(loadedDepositPercentage);

      setContractForm({
        templateName: tmpl.templateName || "",
        contractHeader: tmpl.contractHeader || "",
        mainContractContent: tmpl.mainContractContent || "",
        client: tmpl.client || "",
        contractor: tmpl.contractor || "",
        additionalInfo: tmpl.additionalInfo || "",
        depositPercentage: loadedDepositPercentage,
        depositAmount:
          computedDepositAmount ||
          (tmpl.depositAmount != null ? String(tmpl.depositAmount) : ""),
        bankAccountNumber:
          (tmpl.bankAccountNumber as any) || companyBankAccountNumber || "",
      });
    },
    [toast, workContractTemplates]
  );

  const toTemplateDocId = (name: string) => {
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    return slug ? `t-${slug}` : `t-${Date.now()}`;
  };

  const saveTemplate = useCallback(async () => {
    if (!firestore || !companyId) {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: "Chybí identifikace organizace.",
      });
      return;
    }

    const trimmedName = contractForm.templateName.trim();
    if (!trimmedName) {
      toast({
        variant: "destructive",
        title: "Chybí název šablony",
        description: "Vyplňte pole „Název šablony“.",
      });
      return;
    }

    const isEditingExistingTemplate =
      selectedWorkContractTemplateId !== "__new__";

    const templateDocId = isEditingExistingTemplate
      ? selectedWorkContractTemplateId
      : toTemplateDocId(trimmedName);
    const templateDocRef = doc(
      firestore,
      "companies",
      companyId,
      "workContractTemplates",
      templateDocId
    );

    setIsSavingTemplate(true);
    try {
      await setDoc(
        templateDocRef,
        {
          id: templateDocId,
          templateName: trimmedName,
          isTemplate: true,
          contractType: "smlouva_o_dilo",
          contractHeader: contractForm.contractHeader,
          mainContractContent: contractForm.mainContractContent,
          client: contractForm.client,
          contractor: contractForm.contractor,
          additionalInfo: contractForm.additionalInfo,
          depositPercentage: contractForm.depositPercentage,
          depositAmount: contractForm.depositAmount,
          bankAccountNumber: contractForm.bankAccountNumber,
          createdBy: user?.uid || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      toast({
        title: "Šablona uložena",
        description: `„${trimmedName}“ je připravena k opětovnému použití.`,
      });
      setSelectedWorkContractTemplateId(templateDocId);
      setIsContractDirty(true);
    } catch (err: any) {
      console.error("[WorkContract] saveTemplate failed", err);
      toast({
        variant: "destructive",
        title: "Chyba při ukládání šablony",
        description: err?.message || "Nepodařilo se uložit šablonu.",
      });
    } finally {
      setIsSavingTemplate(false);
    }
  }, [
    firestore,
    companyId,
    contractForm,
    toast,
    user?.uid,
    selectedWorkContractTemplateId,
  ]);

  const deleteTemplate = useCallback(async () => {
    if (!firestore || !companyId) return;
    if (selectedWorkContractTemplateId === "__new__") return;

    const templateNameForConfirm =
      workContractTemplates?.find(
        (t: any) => t.id === selectedWorkContractTemplateId
      )?.templateName || "";

    const ok = window.confirm(
      `Opravdu chcete smazat šablonu${templateNameForConfirm ? ` „${templateNameForConfirm}“` : ""
      }?`
    );
    if (!ok) return;

    setIsSavingTemplate(true);
    try {
      await deleteDoc(
        doc(
          firestore,
          "companies",
          companyId,
          "workContractTemplates",
          selectedWorkContractTemplateId
        )
      );
      toast({
        title: "Šablona smazána",
        description: templateNameForConfirm
          ? `„${templateNameForConfirm}“ byl odstraněn.`
          : "Šablona byla odstraněna.",
      });

      setSelectedWorkContractTemplateId("__new__");
      setIsContractDirty(false);
      setContractForm({
        templateName: "",
        contractHeader: "",
        mainContractContent: "",
        client: "",
        contractor: "",
        additionalInfo: "",
        depositPercentage: "",
        depositAmount: "",
        bankAccountNumber: companyBankAccountNumber,
      });
    } catch (err: any) {
      console.error("[WorkContract] deleteTemplate failed", err);
      toast({
        variant: "destructive",
        title: "Chyba při mazání šablony",
        description: err?.message || "Nepodařilo se šablonu smazat.",
      });
    } finally {
      setIsSavingTemplate(false);
    }
  }, [
    firestore,
    companyId,
    selectedWorkContractTemplateId,
    toast,
    workContractTemplates,
  ]);

  const buildContractHtmlForForm = useCallback(
    (form: WorkContractForm) => {
      const header = applyTemplateVariables(
        form.contractHeader || "",
        form
      );
      const body = applyTemplateVariables(
        form.mainContractContent || "",
        form
      );
      const additionalInfo = applyTemplateVariables(
        form.additionalInfo || "",
        form
      );
      const client = applyTemplateVariables(form.client || "", form);
      const contractor = applyTemplateVariables(form.contractor || "", form);
      const title = form.templateName || "Smlouva o dílo";

      return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Noto Sans", "Helvetica Neue", sans-serif; margin: 28px; color: #0f172a; }
      .muted { color: #475569; font-size: 12px; margin-bottom: 14px; }
      .header { white-space: normal; font-size: 14px; margin-bottom: 18px; }
      .content { white-space: normal; font-size: 13.5px; line-height: 1.45; }
      .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 28px; }
      .partyTitle { font-weight: 700; margin-bottom: 6px; }
      .partyBox { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; min-height: 120px; }
      @media print { body { margin: 18px; } }
    </style>
  </head>
  <body>
    <div class="muted">Dokument: Smlouva o dílo</div>
    <div class="header">${withLineBreaks(header)}</div>
    <div class="content">${withLineBreaks(body)}</div>
    ${
      additionalInfo?.trim()
        ? `<div class="content" style="margin-top: 18px"><b>Doplňující informace</b><div>${withLineBreaks(additionalInfo)}</div></div>`
        : ""
    }
    <div class="parties">
      <div class="partyBox">
        <div class="partyTitle">Objednatel</div>
        <div>${withLineBreaks(client)}</div>
      </div>
      <div class="partyBox">
        <div class="partyTitle">Dodavatel</div>
        <div>${withLineBreaks(contractor)}</div>
      </div>
    </div>
  </body>
</html>`;
    },
    [applyTemplateVariables]
  );

  const buildContractHtml = useCallback(() => {
    return buildContractHtmlForForm(contractForm);
  }, [buildContractHtmlForForm, contractForm]);

  const upsertWorkContractBase = useCallback(async () => {
    if (!firestore || !companyId || !jobId || !user) {
      throw new Error("Chybí data pro uložení smlouvy.");
    }

    const contractRef = doc(
      firestore,
      "companies",
      companyId,
      "jobs",
      jobId as string,
      "workContracts",
      activeWorkContractId
    );

    const existingSnap = await getDoc(contractRef);

    const payload: Record<string, any> = {
      id: activeWorkContractId,
      jobId: jobId as string,
      isTemplate: false,
      contractType: "smlouva_o_dilo",
      templateDocId:
        selectedWorkContractTemplateId !== "__new__"
          ? selectedWorkContractTemplateId
          : null,
      templateName: contractForm.templateName || null,
      contractHeader: contractForm.contractHeader,
      mainContractContent: contractForm.mainContractContent,
      client: contractForm.client,
      contractor: contractForm.contractor,
      additionalInfo: contractForm.additionalInfo,
      depositPercentage: contractForm.depositPercentage,
      depositAmount: contractForm.depositAmount,
      bankAccountNumber: contractForm.bankAccountNumber,
      updatedAt: serverTimestamp(),
    };

    if (existingSnap.exists()) {
      await updateDoc(contractRef, payload);
    } else {
      await setDoc(contractRef, {
        ...payload,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
    }

    return contractRef;
  }, [
    firestore,
    companyId,
    jobId,
    user,
    activeWorkContractId,
    selectedWorkContractTemplateId,
    contractForm,
  ]);

  const saveContract = useCallback(async () => {
    if (!firestore || !companyId || !jobId) {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: "Chybí data pro uložení smlouvy.",
      });
      return;
    }

    const missing: string[] = [];
    if (!contractForm.contractHeader.trim())
      missing.push("Hlavička smlouvy");
    if (!contractForm.mainContractContent.trim())
      missing.push("Text smlouvy");
    if (!contractForm.client.trim()) missing.push("Objednatel");
    if (!contractForm.contractor.trim()) missing.push("Dodavatel");

    if (missing.length) {
      toast({
        variant: "destructive",
        title: "Nelze uložit smlouvu",
        description: `Chybí: ${missing.join(", ")}`,
      });
      return;
    }

    setIsSavingContract(true);
    try {
      await upsertWorkContractBase();
      toast({
        title: "Smlouva uložena",
        description: "Změny byly uloženy do zakázky.",
      });
      setHasLoadedWorkContract(true);
    } catch (err: any) {
      console.error("[WorkContract] saveContract failed", err);
      toast({
        variant: "destructive",
        title: "Chyba při ukládání",
        description: err?.message || "Nepodařilo se uložit smlouvu.",
      });
    } finally {
      setIsSavingContract(false);
    }
  }, [
    firestore,
    companyId,
    jobId,
    toast,
    contractForm,
    upsertWorkContractBase,
  ]);

  const generatePDF = useCallback(async () => {
    if (!firestore || !companyId || !jobId || !user) {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: "Chybí data pro vygenerování smlouvy.",
      });
      return;
    }

    const missing: string[] = [];
    if (!contractForm.contractHeader.trim())
      missing.push("Hlavička smlouvy");
    if (!contractForm.mainContractContent.trim())
      missing.push("Text smlouvy");
    if (!contractForm.client.trim()) missing.push("Objednatel");
    if (!contractForm.contractor.trim()) missing.push("Dodavatel");

    if (missing.length) {
      toast({
        variant: "destructive",
        title: "Nelze vytvořit PDF",
        description: `Chybí: ${missing.join(", ")}`,
      });
      return;
    }

    setIsGeneratingPdf(true);
    try {
      // 1) Save contract (create/update)
      const contractRef = await upsertWorkContractBase();

      // 2) Generate PDF HTML exactly from current contractForm
      const html = buildContractHtml();

      // Persist generated HTML for the job record as well.
      await setDoc(
        contractRef,
        {
          pdfHtml: html,
          pdfSavedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      const w = window.open("", "_blank");
      if (!w) {
        throw new Error(
          "Popup blokováno prohlížečem. Povolit vyskakovací okna a zkuste znovu."
        );
      }

      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => {
        try {
          w.print();
        } catch (err) {
          console.error("[WorkContract] print failed", err);
        }
      }, 200);

      toast({
        title: "PDF se připravuje",
        description: "Otevřelo se tiskové okno. Uložte jako PDF.",
      });
      setContractDialogOpen(false);
    } catch (err: any) {
      console.error("[WorkContract] generatePDF failed", err);
      toast({
        variant: "destructive",
        title: "Chyba při generování PDF",
        description: err?.message || "Nepodařilo se vytvořit PDF.",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [
    firestore,
    companyId,
    jobId,
    user,
    toast,
    contractForm,
    upsertWorkContractBase,
    buildContractHtml,
  ]);

  useEffect(() => {
    if (!editorOpen) return;
    if (!canvasReady) return;
    if (!canvasRef.current) return;

    if (!annotationSource) {
      setImageError("Nebyla nalezena fotografie pro anotaci.");
      setBaseImageLoaded(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        resetAnnotationState();

        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve())
        );
        if (cancelled) return;

        const resolvedUrl = await resolveAnnotationImageUrl(annotationSource);
        if (cancelled) return;

        let image: HTMLImageElement;

        try {
          image = await loadHtmlImage(resolvedUrl, false);
        } catch {
          image = await loadHtmlImage(resolvedUrl, true);
        }

        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) {
          throw new Error("Canvas is not available.");
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("2D canvas context is not available.");
        }

        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);

        setImageForCanvas(image);
        setBaseImageLoaded(true);
        setImageError(null);
      } catch (error) {
        if (cancelled) return;

        console.error("[JobDetailPage] Image load failed", error);
        setBaseImageLoaded(false);
        setImageForCanvas(null);
        setImageError(
          error instanceof Error
            ? error.message
            : "Fotografii se nepodařilo načíst."
        );
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [
    editorOpen,
    canvasReady,
    annotationSource,
    resolveAnnotationImageUrl,
    loadHtmlImage,
    resetAnnotationState,
  ]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageForCanvas || !baseImageLoaded) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageForCanvas, 0, 0, canvas.width, canvas.height);

    const allSegments = [...segments, ...(currentSegment ? [currentSegment] : [])];

    ctx.strokeStyle = "#ff6b00";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    allSegments.forEach((seg) => {
      ctx.beginPath();
      ctx.moveTo(seg.startX, seg.startY);
      ctx.lineTo(seg.endX, seg.endY);
      ctx.stroke();

      ctx.fillStyle = "#ff6b00";
      ctx.beginPath();
      ctx.arc(seg.startX, seg.startY, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(seg.endX, seg.endY, 4, 0, Math.PI * 2);
      ctx.fill();

      const angle = Math.atan2(seg.endY - seg.startY, seg.endX - seg.startX);
      const arrowLen = 12;

      const drawArrow = (x: number, y: number, ang: number) => {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(
          x - arrowLen * Math.cos(ang - Math.PI / 6),
          y - arrowLen * Math.sin(ang - Math.PI / 6)
        );
        ctx.moveTo(x, y);
        ctx.lineTo(
          x - arrowLen * Math.cos(ang + Math.PI / 6),
          y - arrowLen * Math.sin(ang + Math.PI / 6)
        );
        ctx.stroke();
      };

      drawArrow(seg.startX, seg.startY, angle + Math.PI);
      drawArrow(seg.endX, seg.endY, angle);

      if (seg.label) {
        const midX = (seg.startX + seg.endX) / 2;
        const midY = (seg.startY + seg.endY) / 2;

        const paddingX = 8;
        const paddingY = 6;
        const fontSize = 16;

        ctx.font = `${fontSize}px sans-serif`;
        const textWidth = ctx.measureText(seg.label).width;
        const boxWidth = textWidth + paddingX * 2;
        const boxHeight = fontSize + paddingY * 2;
        const boxX = midX - boxWidth / 2;
        const boxY = midY - boxHeight / 2;

        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

        ctx.fillStyle = "#ffffff";
        ctx.fillText(seg.label, boxX + paddingX, boxY + fontSize + 1);
      }
    });
  }, [imageForCanvas, baseImageLoaded, segments, currentSegment]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const getCanvasCoordsFromClient = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imageForCanvas || !baseImageLoaded) return;

    const pt = getCanvasCoordsFromClient(e.clientX, e.clientY);
    setCurrentSegment({
      startX: pt.x,
      startY: pt.y,
      endX: pt.x,
      endY: pt.y,
      label: "",
    });
    setIsDrawing(true);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentSegment || !imageForCanvas || !baseImageLoaded) return;

    const pt = getCanvasCoordsFromClient(e.clientX, e.clientY);
    setCurrentSegment((prev) =>
      prev
        ? {
            ...prev,
            endX: pt.x,
            endY: pt.y,
          }
        : prev
    );
  };

  const finishSegment = useCallback(() => {
    if (!currentSegment) return;

    const label = window.prompt("Zadejte rozměr (např. 1200 mm):") || "";
    setIsDrawing(false);

    if (!label.trim()) {
      setCurrentSegment(null);
      return;
    }

    setSegments((prev) => [
      ...prev,
      {
        ...currentSegment,
        label: label.trim(),
      },
    ]);
    setCurrentSegment(null);
  }, [currentSegment]);

  const handleCanvasMouseUp = () => {
    if (!isDrawing || !currentSegment || !imageForCanvas || !baseImageLoaded) return;
    finishSegment();
  };

  const handleCanvasMouseLeave = () => {
    if (!isDrawing || !currentSegment || !imageForCanvas || !baseImageLoaded) return;
    finishSegment();
  };

  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!imageForCanvas || !baseImageLoaded) return;
    e.preventDefault();

    const touch = e.touches[0];
    if (!touch) return;

    const pt = getCanvasCoordsFromClient(touch.clientX, touch.clientY);
    setCurrentSegment({
      startX: pt.x,
      startY: pt.y,
      endX: pt.x,
      endY: pt.y,
      label: "",
    });
    setIsDrawing(true);
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentSegment || !imageForCanvas || !baseImageLoaded) return;
    e.preventDefault();

    const touch = e.touches[0];
    if (!touch) return;

    const pt = getCanvasCoordsFromClient(touch.clientX, touch.clientY);
    setCurrentSegment((prev) =>
      prev
        ? {
            ...prev,
            endX: pt.x,
            endY: pt.y,
          }
        : prev
    );
  };

  const handleCanvasTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentSegment || !imageForCanvas || !baseImageLoaded) return;
    e.preventDefault();
    finishSegment();
  };

  const handlePhotoUpload = async (file: File) => {
    if (!companyId || !jobId || !photosColRef || !user) {
      toast({
        variant: "destructive",
        title: "Nelze nahrát fotografii",
        description: "Chybí identifikace zakázky nebo uživatele.",
      });
      return;
    }

    setIsUploading(true);

    try {
      const storagePath = `job-photos/${companyId}/${jobId}/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, file);
      const imageUrl = await getDownloadURL(storageRef);

      const photoDocRef = doc(photosColRef);
      await setDoc(photoDocRef, {
        id: photoDocRef.id,
        imageUrl,
        originalImageUrl: imageUrl,
        storagePath,
        fileName: file.name,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });

      toast({
        title: "Fotografie nahrána",
        description: file.name,
      });
    } catch (err: any) {
      console.error("[JobDetailPage] photo upload failed", err);
      toast({
        variant: "destructive",
        title: "Chyba při nahrávání fotografie",
        description: err?.message || "Fotografii se nepodařilo nahrát.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveAnnotated = async () => {
    if (!baseImageLoaded || !imageForCanvas) {
      toast({
        variant: "destructive",
        title: "Chyba při exportu",
        description: "Základní fotografie není načtena, export nelze provést.",
      });
      return;
    }

    if (!companyId || !jobId || !photoToEdit || !firestore) {
      toast({
        variant: "destructive",
        title: "Chyba při exportu",
        description: "Chybí data pro uložení anotace.",
      });
      return;
    }

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = imageForCanvas.naturalWidth || imageForCanvas.width;
    exportCanvas.height = imageForCanvas.naturalHeight || imageForCanvas.height;

    const ctx = exportCanvas.getContext("2d");
    if (!ctx) {
      toast({
        variant: "destructive",
        title: "Chyba při exportu",
        description: "Nepodařilo se inicializovat plátno pro export.",
      });
      return;
    }

    ctx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.drawImage(imageForCanvas, 0, 0);

    segments.forEach((seg) => {
      ctx.strokeStyle = "#ff6b00";
      ctx.fillStyle = "#ff6b00";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      ctx.moveTo(seg.startX, seg.startY);
      ctx.lineTo(seg.endX, seg.endY);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(seg.startX, seg.startY, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(seg.endX, seg.endY, 4, 0, Math.PI * 2);
      ctx.fill();

      const angle = Math.atan2(seg.endY - seg.startY, seg.endX - seg.startX);
      const arrowLen = 12;

      const drawArrow = (x: number, y: number, ang: number) => {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(
          x - arrowLen * Math.cos(ang - Math.PI / 6),
          y - arrowLen * Math.sin(ang - Math.PI / 6)
        );
        ctx.moveTo(x, y);
        ctx.lineTo(
          x - arrowLen * Math.cos(ang + Math.PI / 6),
          y - arrowLen * Math.sin(ang + Math.PI / 6)
        );
        ctx.stroke();
      };

      drawArrow(seg.startX, seg.startY, angle + Math.PI);
      drawArrow(seg.endX, seg.endY, angle);

      const midX = (seg.startX + seg.endX) / 2;
      const midY = (seg.startY + seg.endY) / 2;

      ctx.font = "20px sans-serif";
      const paddingX = 10;
      const paddingY = 8;
      const textWidth = ctx.measureText(seg.label).width;
      const boxWidth = textWidth + paddingX * 2;
      const boxHeight = 20 + paddingY * 2;
      const boxX = midX - boxWidth / 2;
      const boxY = midY - boxHeight / 2;

      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

      ctx.fillStyle = "#ffffff";
      ctx.fillText(seg.label, boxX + paddingX, boxY + 22);
    });

    exportCanvas.toBlob(
      async (blob) => {
        if (!blob) {
          toast({
            variant: "destructive",
            title: "Chyba při exportu",
            description: "Upravenou fotografii se nepodařilo exportovat.",
          });
          return;
        }

        try {
          const annotatedPath = `${
            photoToEdit.storagePath || `job-photos/${companyId}/${jobId}/${photoToEdit.id}`
          }-annotated.png`;

          const annotatedRef = ref(storage, annotatedPath);
          await uploadBytes(annotatedRef, blob);
          const annotatedUrl = await getDownloadURL(annotatedRef);

          await updateDoc(
            doc(
              firestore,
              "companies",
              companyId,
              "jobs",
              jobId as string,
              "photos",
              photoToEdit.id
            ),
            {
              originalImageUrl: photoToEdit.originalImageUrl || photoToEdit.imageUrl || null,
              annotatedImageUrl: annotatedUrl,
              annotatedStoragePath: annotatedPath,
              updatedAt: serverTimestamp(),
            }
          );

          toast({
            title: "Fotografie upravena",
            description: "Rozměry byly uloženy.",
          });

          setEditorOpen(false);
          setPhotoToEdit(null);
          resetAnnotationState();
        } catch (err) {
          console.error("[JobDetailPage] saving annotated photo failed", err);
          toast({
            variant: "destructive",
            title: "Chyba",
            description: "Upravenou fotografii se nepodařilo uložit.",
          });
        }
      },
      "image/png"
    );
  };

  const handleDeleteJob = async () => {
    if (!companyId || !jobId || !firestore) return;
    if (!window.confirm("Opravdu chcete tuto zakázku smazat včetně fotografií?")) return;

    try {
      const photosCol = collection(
        firestore,
        "companies",
        companyId,
        "jobs",
        jobId as string,
        "photos"
      );
      const snap = await getDocs(photosCol);

      for (const docSnap of snap.docs) {
        const data = docSnap.data() as any;

        if (data.storagePath) {
          try {
            await deleteObject(ref(storage, data.storagePath));
          } catch {}
        }

        if (data.annotatedStoragePath) {
          try {
            await deleteObject(ref(storage, data.annotatedStoragePath));
          } catch {}
        }

        await deleteDoc(docSnap.ref);
      }

      if (jobRef) {
        await deleteDoc(jobRef);
      }

      toast({ title: "Zakázka odstraněna" });
      router.push("/portal/jobs");
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Chyba",
        description: "Zakázku se nepodařilo odstranit.",
      });
    }
  };

  const openEditJobDialog = useCallback(() => {
    if (!isAdmin) {
      toast({
        variant: "destructive",
        title: "Nedostatečná oprávnění",
        description: "Upravit zakázku můžete pouze jako administrátor.",
      });
      return;
    }

    if (!job) return;

    const j = job as any;
    const resolvedCustomerId =
      j.customerId || j.customer_id || j.customerID || "";

    setJobEditForm({
      name: j.name || "",
      description: j.description || "",
      status: j.status || "nová",
      budget: j.budget != null && j.budget !== "" ? String(j.budget) : "",
      startDate: j.startDate || "",
      endDate: j.endDate || "",
      measuring: j.measuring || "",
      measuringDetails: j.measuringDetails || "",
      customerId: resolvedCustomerId || "",
      assignedEmployeeIdsText: Array.isArray(j.assignedEmployeeIds)
        ? j.assignedEmployeeIds.join(", ")
        : "",
    });

    setJobEditTemplateValues((j.templateValues as JobTemplateValues) || {});
    setEditJobDialogOpen(true);
  }, [isAdmin, job, toast]);

  const saveJobEdit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!jobRef) return;
      if (!firestore || !companyId) return;
      if (!isAdmin) {
        toast({
          variant: "destructive",
          title: "Nedostatečná oprávnění",
          description: "Nemáte oprávnění upravit zakázku.",
        });
        return;
      }

      const budgetNumber = (() => {
        if (jobEditForm.budget.trim() === "") return 0;
        const n = Number(jobEditForm.budget);
        return Number.isFinite(n) ? n : 0;
      })();

      const assignedIds = jobEditForm.assignedEmployeeIdsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const selectedCustomer =
        jobEditForm.customerId && customers
          ? (customers.find((c: any) => c.id === jobEditForm.customerId) as any)
          : null;

      const customerName = selectedCustomer
        ? selectedCustomer.companyName ||
          `${selectedCustomer.firstName || ""} ${selectedCustomer.lastName || ""}`.trim()
        : "";
      const customerPhone = selectedCustomer?.phone || "";
      const customerEmail = selectedCustomer?.email || "";

      setIsSavingJobEdit(true);
      try {
        const payload: Record<string, any> = {
          name: jobEditForm.name,
          description: jobEditForm.description,
          status: jobEditForm.status,
          budget: budgetNumber,
          startDate: jobEditForm.startDate,
          endDate: jobEditForm.endDate,
          measuring: jobEditForm.measuring,
          measuringDetails: jobEditForm.measuringDetails,

          customerId: jobEditForm.customerId || null,
          customerName,
          customerPhone,
          customerEmail,
          assignedEmployeeIds: assignedIds,
          updatedAt: serverTimestamp(),
        };

        if (job?.templateId) {
          payload.templateId = job.templateId;
          payload.templateValues = jobEditTemplateValues;
        }

        await updateDoc(jobRef, payload);

        toast({
          title: "Zakázka aktualizována",
          description: `Uloženo: ${jobEditForm.name || "Bez názvu"}`,
        });

        setEditJobDialogOpen(false);
        router.refresh();
      } catch (err: any) {
        console.error("[JobEdit] save failed", err);
        toast({
          variant: "destructive",
          title: "Chyba při ukládání",
          description: err?.message || "Nepodařilo se uložit změny zakázky.",
        });
      } finally {
        setIsSavingJobEdit(false);
      }
    },
    [
      jobRef,
      firestore,
      companyId,
      isAdmin,
      jobEditForm,
      customers,
      job?.templateId,
      jobEditTemplateValues,
      toast,
      router,
    ]
  );

  const handleStatusChange = async (newStatus: string) => {
    if (!jobRef) return;

    try {
      await updateDoc(jobRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Stav aktualizován",
        description: `Zakázka je nyní ve stavu: ${newStatus}`,
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: "Nepodařilo se změnit stav.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Zakázka nenalezena</h2>
        <Button variant="link" onClick={() => router.push("/portal/jobs")}>
          Zpět na seznam
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/portal/jobs")}>
          <ChevronLeft className="w-6 h-6" />
        </Button>

        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="portal-page-title">{job.name}</h1>
            <Badge variant="outline" className="border-primary/30 text-primary">
              ID: {jobId?.toString().substring(0, 8)}
            </Badge>
          </div>
          <p className="text-muted-foreground">Detailní přehled projektu</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <Select value={job.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[180px] bg-surface">
                <SelectValue placeholder="Změnit stav" />
              </SelectTrigger>
              <SelectContent className="bg-surface border-border">
                <SelectItem value="nová">Nová</SelectItem>
                <SelectItem value="rozpracovaná">Rozpracovaná</SelectItem>
                <SelectItem value="čeká">Čeká</SelectItem>
                <SelectItem value="dokončená">Dokončená</SelectItem>
                <SelectItem value="fakturována">Fakturována</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Button
            variant="outline"
            className="gap-2"
            onClick={openEditJobDialog}
          >
            <Edit2 className="w-4 h-4" /> Upravit zakázku
          </Button>

          <Button
            variant="outline"
            className="gap-2"
            onClick={openContractDialog}
          >
            <FileText className="w-4 h-4" /> Vytvořit smlouvu o dílo
          </Button>

          {isAdmin && (
            <Button variant="destructive" className="gap-2" onClick={handleDeleteJob}>
              <Trash2 className="w-4 h-4" /> Smazat
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-surface border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Popis zakázky
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground leading-relaxed">
                {job.description || "K této zakázce nebyl přidán žádný popis."}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-surface border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Měření
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground leading-relaxed">
                {job.measuring || "Žádné poznámky k měření."}
              </p>
              {job.measuringDetails && (
                <p className="mt-2 text-sm text-muted-foreground">{job.measuringDetails}</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-surface border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Smlouvy o dílo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isWorkContractsLoading ? (
                <p className="text-sm text-muted-foreground">Načítání…</p>
              ) : workContractsForJob.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Zatím žádné smlouvy.
                </p>
              ) : (
                <div className="space-y-3">
                  {workContractsForJob.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-lg bg-background/50 border border-border/50 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">
                            {c.templateName ||
                              c.contractHeader?.split("\n")?.[0] ||
                              "Smlouva o dílo"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Uloženo: {formatContractDate(c.updatedAt || c.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          type="button"
                          onClick={() => openWorkContract(c.id, "view")}
                        >
                          Otevřít
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          type="button"
                          onClick={() => openWorkContract(c.id, "edit")}
                        >
                          Upravit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          type="button"
                          onClick={() => generatePDFFromContractId(c.id)}
                        >
                          Generovat PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          type="button"
                          onClick={() => deleteWorkContract(c.id)}
                        >
                          Smazat
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {job.templateId &&
            template &&
            job.templateValues != null &&
            Object.keys(job.templateValues).length > 0 && (
              <Card className="bg-surface border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileStack className="w-5 h-5 text-primary" /> Data šablony:{" "}
                    {(template as JobTemplate).name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(template as JobTemplate).sections?.map((section) => {
                      const fieldsWithValues =
                        section.fields?.filter((f) => {
                          const value = job.templateValues[`${section.id}_${f.id}`];
                          return value !== undefined && value !== "" && value !== null;
                        }) ?? [];

                      if (fieldsWithValues.length === 0) return null;

                      return (
                        <div key={section.id}>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            {section.name}
                          </p>
                          <dl className="space-y-1.5">
                            {fieldsWithValues.map((f) => {
                              const value = job.templateValues[`${section.id}_${f.id}`];
                              return (
                                <div
                                  key={f.id}
                                  className="flex justify-between gap-4 text-sm"
                                >
                                  <dt className="text-muted-foreground">{f.label}</dt>
                                  <dd className="font-medium text-right">
                                    {typeof value === "boolean"
                                      ? value
                                        ? "Ano"
                                        : "Ne"
                                      : String(value)}
                                  </dd>
                                </div>
                              );
                            })}
                          </dl>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

          <Card className="bg-surface border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" /> Časová osa a Pokrok
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm mb-2">
                  <span>Celkový pokrok</span>
                  <span className="font-bold">
                    {job.status === "dokončená" || job.status === "fakturována"
                      ? "100%"
                      : "45%"}
                  </span>
                </div>
                <Progress
                  value={
                    job.status === "dokončená" || job.status === "fakturována"
                      ? 100
                      : 45
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-8 pt-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                    Zahájeno
                  </span>
                  <div className="flex items-center gap-2 font-semibold">
                    <Calendar className="w-4 h-4 text-primary" />
                    {job.startDate || "neuvedeno"}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                    Předpokládané dokončení
                  </span>
                  <div className="flex items-center gap-2 font-semibold">
                    <Calendar className="w-4 h-4 text-primary" />
                    {job.endDate || "neuvedeno"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Přiřazení pracovníci
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {job.assignedEmployeeIds?.map((empId: string, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        <User className="w-4 h-4" />
                      </div>
                      <span className="font-medium">
                        {empId === user?.uid ? "Já" : `Pracovník (${empId.substring(0, 5)})`}
                      </span>
                    </div>
                    <Badge variant="outline">Aktivní</Badge>
                  </div>
                ))}

                {!job.assignedEmployeeIds?.length && (
                  <p className="text-muted-foreground text-sm">
                    Žádní pracovníci nejsou přiřazeni.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="bg-surface border-border">
            <CardHeader>
              <CardTitle>Finanční údaje</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Celkový rozpočet:</span>
                <span className="text-xl font-bold">
                  {job.budget ? `${job.budget.toLocaleString()} Kč` : "-"}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Vyfakturováno:</span>
                <span className="font-semibold text-emerald-500">
                  {job.status === "fakturována"
                    ? `${job.budget?.toLocaleString()} Kč`
                    : "0 Kč"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-border">
            <CardHeader>
              <CardTitle>Poznámky a historie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm space-y-4">
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Zakázka vytvořena</p>
                    <p className="text-xs text-muted-foreground">
                      {job.createdAt?.toDate
                        ? job.createdAt.toDate().toLocaleString("cs-CZ")
                        : "-"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Stav změněn na "{job.status}"</p>
                    <p className="text-xs text-muted-foreground">
                      {job.updatedAt?.toDate
                        ? job.updatedAt.toDate().toLocaleString("cs-CZ")
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImagePlus className="w-5 h-5 text-primary" /> Fotodokumentace
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <label className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      files.forEach((f) => handlePhotoUpload(f));
                    }}
                  />
                  <Button type="button" className="w-full justify-center gap-2 min-h-[44px]" asChild>
                    <span>
                      <ImagePlus className="w-4 h-4" /> Nahrát fotku
                    </span>
                  </Button>
                </label>

                <label className="flex-1 sm:flex-none">
                  <Input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoUpload(file);
                    }}
                  />
                  <Button type="button" className="w-full justify-center gap-2 min-h-[44px]" asChild>
                    <span>
                      <Camera className="w-4 h-4" /> Vyfotit
                    </span>
                  </Button>
                </label>
              </div>

              {isUploading && (
                <p className="text-sm text-muted-foreground">Nahrávání fotografie...</p>
              )}

              {photos && photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photos.map((p: any) => (
                    <div
                      key={p.id}
                      className="relative group rounded-lg overflow-hidden border border-border/40 bg-background"
                    >
                      <img
                        src={p.annotatedImageUrl || p.imageUrl}
                        alt={p.fileName}
                        className="w-full h-32 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="min-h-[36px]"
                          onClick={() => {
                            setPhotoToEdit(p as PhotoDoc);
                            setEditorOpen(true);
                          }}
                        >
                          <Pencil className="w-4 h-4 mr-1" /> Anotovat
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Zatím žádné fotografie.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={editJobDialogOpen}
        onOpenChange={(open) => {
          setEditJobDialogOpen(open);
        }}
      >
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-4xl w-[95vw] sm:w-full max-h-[90vh] flex flex-col">
          <form
            onSubmit={saveJobEdit}
            className="flex flex-col flex-1 min-h-0"
          >
            <DialogHeader className="shrink-0">
              <DialogTitle>Upravit zakázku</DialogTitle>
              <DialogDescription>
                Změňte údaje a uložte je do databáze.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-6 pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Název zakázky</Label>
                  <Input
                    value={jobEditForm.name}
                    onChange={(e) =>
                      setJobEditForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Název projektu"
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Stav</Label>
                  <Select
                    value={jobEditForm.status}
                    onValueChange={(v) =>
                      setJobEditForm((prev) => ({
                        ...prev,
                        status: v,
                      }))
                    }
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Vyberte stav" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nová">Nová</SelectItem>
                      <SelectItem value="rozpracovaná">Rozpracovaná</SelectItem>
                      <SelectItem value="čeká">Čeká</SelectItem>
                      <SelectItem value="dokončená">Dokončená</SelectItem>
                      <SelectItem value="fakturována">Fakturována</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Rozpočet (Kč)</Label>
                  <Input
                    type="number"
                    value={jobEditForm.budget}
                    onChange={(e) =>
                      setJobEditForm((prev) => ({
                        ...prev,
                        budget: e.target.value,
                      }))
                    }
                    placeholder="Např. 150000"
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Zahájeno</Label>
                  <Input
                    type="date"
                    value={jobEditForm.startDate}
                    onChange={(e) =>
                      setJobEditForm((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Předpokládané dokončení</Label>
                  <Input
                    type="date"
                    value={jobEditForm.endDate}
                    onChange={(e) =>
                      setJobEditForm((prev) => ({
                        ...prev,
                        endDate: e.target.value,
                      }))
                    }
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Popis zakázky</Label>
                  <Textarea
                    value={jobEditForm.description}
                    onChange={(e) =>
                      setJobEditForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Popis zakázky"
                    className="bg-background min-h-[120px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Měření</Label>
                  <Textarea
                    value={jobEditForm.measuring}
                    onChange={(e) =>
                      setJobEditForm((prev) => ({
                        ...prev,
                        measuring: e.target.value,
                      }))
                    }
                    placeholder="Text měření"
                    className="bg-background min-h-[120px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Podrobnosti měření</Label>
                  <Textarea
                    value={jobEditForm.measuringDetails}
                    onChange={(e) =>
                      setJobEditForm((prev) => ({
                        ...prev,
                        measuringDetails: e.target.value,
                      }))
                    }
                    placeholder="Další informace k měření"
                    className="bg-background min-h-[120px]"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Zákazník</Label>
                  <Select
                    value={jobEditForm.customerId || "none"}
                    onValueChange={(v) =>
                      setJobEditForm((prev) => ({
                        ...prev,
                        customerId: v === "none" ? "" : v,
                      }))
                    }
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Vyberte zákazníka" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Bez zákazníka</SelectItem>
                      {customers?.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.companyName ||
                            `${c.firstName || ""} ${c.lastName || ""}`.trim() ||
                            "Neznámý zákazník"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Přiřazení zaměstnanci (UID, oddělené čárkou)</Label>
                  <Input
                    value={jobEditForm.assignedEmployeeIdsText}
                    onChange={(e) =>
                      setJobEditForm((prev) => ({
                        ...prev,
                        assignedEmployeeIdsText: e.target.value,
                      }))
                    }
                    placeholder="Např. uid1, uid2"
                    className="bg-background"
                  />
                </div>
              </div>

              {job?.templateId && template && (
                <div className="space-y-3">
                  <Label>Hodnoty šablony</Label>
                  <div className="rounded-md border border-border bg-background/50 p-3">
                    <JobTemplateFormFields
                      template={template as JobTemplate}
                      values={jobEditTemplateValues}
                      onChange={(v) => setJobEditTemplateValues(v)}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-border flex flex-col-reverse sm:flex-row sm:justify-between gap-3 shrink-0 px-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditJobDialogOpen(false)}
                disabled={isSavingJobEdit}
                className="min-h-[44px] w-full sm:w-auto"
              >
                Zrušit
              </Button>

              <Button
                type="submit"
                disabled={isSavingJobEdit}
                className="min-h-[44px] w-full sm:w-auto"
              >
                {isSavingJobEdit ? "Ukládání..." : "Uložit změny"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={contractDialogOpen}
        onOpenChange={(open) => {
          setContractDialogOpen(open);
          if (!open) setIsContractDirty(false);
        }}
      >
        <DialogContent className="max-w-[95vw] w-[95vw] md:w-[760px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {isContractReadOnly ? "Zobrazení smlouvy o dílo" : "Vytvořit smlouvu o dílo"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 pr-1">
            <div className="space-y-2">
              <Label>Načíst šablonu</Label>
              <Select
                value={selectedWorkContractTemplateId}
                onValueChange={(v) => {
                  if (isContractReadOnly) return;
                  handleLoadWorkContractTemplate(v);
                }}
              >
                <SelectTrigger disabled={isContractReadOnly}>
                  <SelectValue
                    placeholder={
                      isWorkContractTemplatesLoading
                        ? "Načítání..."
                        : "Vytvořit od začátku"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__new__">Vytvořit od začátku</SelectItem>
                  {workContractTemplates
                    ?.filter(
                      (t: any) =>
                        !t.contractType || t.contractType === "smlouva_o_dilo"
                    )
                    ?.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.templateName || "Bez názvu"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Název šablony</Label>
              <Input
                value={contractForm.templateName}
                onChange={(e) => {
                  setIsContractDirty(true);
                  setContractForm((prev) => ({
                    ...prev,
                    templateName: e.target.value,
                  }));
                }}
                placeholder="Např. Smlouva o dílo - standard"
                disabled={isContractReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label>Hlavička smlouvy</Label>
              <Textarea
                value={contractForm.contractHeader}
                onChange={(e) => {
                  setIsContractDirty(true);
                  setContractForm((prev) => ({
                    ...prev,
                    contractHeader: e.target.value,
                  }));
                }}
                placeholder="Hlavička smlouvy"
                className="min-h-[120px] resize-y"
                disabled={isContractReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label>Text smlouvy</Label>
              <Textarea
                value={contractForm.mainContractContent}
                onChange={(e) => {
                  setIsContractDirty(true);
                  setContractForm((prev) => ({
                    ...prev,
                    mainContractContent: e.target.value,
                  }));
                }}
                placeholder="Vložte text smlouvy..."
                className="min-h-[260px] resize-y"
                disabled={isContractReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label>Objednatel</Label>
              <Textarea
                value={contractForm.client}
                onChange={(e) => {
                  setIsContractDirty(true);
                  setContractForm((prev) => ({
                    ...prev,
                    client: e.target.value,
                  }));
                }}
                placeholder="Objednatel (firma/jméno + adresa)"
                className="min-h-[120px] resize-y"
                disabled={isContractReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label>Dodavatel</Label>
              <Textarea
                value={contractForm.contractor}
                onChange={(e) => {
                  setIsContractDirty(true);
                  setContractForm((prev) => ({
                    ...prev,
                    contractor: e.target.value,
                  }));
                }}
                placeholder="Zhotovitel (firma + adresa)"
                className="min-h-[120px] resize-y"
                disabled={isContractReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label>Výše zálohy v procentech (%)</Label>
              <Input
                value={contractForm.depositPercentage}
                onChange={(e) => {
                  const nextPercent = e.target.value;
                  const computedAmount = computeDepositAmountFromPercent(
                    nextPercent
                  );

                  setIsContractDirty(true);
                  setContractForm((prev) => ({
                    ...prev,
                    depositPercentage: nextPercent,
                    depositAmount:
                      computedAmount !== ""
                        ? computedAmount
                        : prev.depositAmount,
                  }));
                }}
                placeholder="Např. 30"
                disabled={isContractReadOnly}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label>Částka zálohy (Kč)</Label>
              <Input
                value={contractForm.depositAmount}
                onChange={(e) => {
                  setIsContractDirty(true);
                  setContractForm((prev) => ({
                    ...prev,
                    depositAmount: e.target.value,
                  }));
                }}
                placeholder={jobBudgetKc != null ? "Automaticky se přepočítá" : "Zadejte částku ručně"}
                disabled={isContractReadOnly}
                className="bg-background"
              />
              {jobBudgetKc == null && (
                <p className="text-xs text-muted-foreground mt-1">
                  Rozpočet zakázky není vyplněný, zálohu je potřeba doplnit ručně.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Číslo účtu</Label>
              <Input
                value={contractForm.bankAccountNumber}
                onChange={(e) => {
                  setIsContractDirty(true);
                  setContractForm((prev) => ({
                    ...prev,
                    bankAccountNumber: e.target.value,
                  }));
                }}
                placeholder="Např. 123456789/0300 nebo IBAN"
                disabled={isContractReadOnly}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label>Doplňující informace</Label>
              <Textarea
                value={contractForm.additionalInfo}
                onChange={(e) => {
                  setIsContractDirty(true);
                  setContractForm((prev) => ({
                    ...prev,
                    additionalInfo: e.target.value,
                  }));
                }}
                placeholder="Volitelné doplňující informace (můžete použít i proměnné)"
                className="min-h-[120px] resize-y"
                disabled={isContractReadOnly}
              />
            </div>

            <div className="text-xs text-muted-foreground">
              Podpora proměnných v textu:{" "}
              <code>{"{{dodavatel.nazev}}"}</code>, <code>{"{{dodavatel.ico}}"}</code>,{" "}
              <code>{"{{objednatel.nazev}}"}</code>, <code>{"{{zakazka.nazev}}"}</code>,{" "}
              <code>{"{{datum}}"}</code> (lze i <code>{"{{dodavatel}}"}</code> a{" "}
              <code>{"{{objednatel}}"}</code>).
              <br />
              Záloha: <code>{"{{zaloha.procenta}}"}</code>, <code>{"{{zaloha.castka}}"}</code>,{" "}
              <code>{"{{zaloha.ucet}}"}</code>.
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setContractDialogOpen(false)}
              disabled={isSavingTemplate || isSavingContract || isGeneratingPdf}
              className="min-h-[44px]"
            >
              Zrušit
            </Button>

            <div className="flex gap-2 flex-wrap justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={saveContract}
              disabled={
                isContractReadOnly ||
                isSavingTemplate ||
                isSavingContract ||
                isGeneratingPdf
              }
                className="min-h-[44px]"
              >
                {isSavingContract ? "Ukládání..." : "Uložit smlouvu"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={saveTemplate}
              disabled={
                isContractReadOnly ||
                isSavingTemplate ||
                isSavingContract ||
                isGeneratingPdf
              }
                className="min-h-[44px]"
              >
                {isSavingTemplate
                  ? "Ukládání..."
                  : selectedWorkContractTemplateId !== "__new__"
                  ? "Uložit změny šablony"
                  : "Uložit šablonu"}
              </Button>
              <Button
                type="button"
                onClick={generatePDF}
                disabled={isSavingTemplate || isSavingContract || isGeneratingPdf}
                className="min-h-[44px]"
              >
                {isGeneratingPdf ? "Generování..." : "Generovat PDF"}
              </Button>

              {selectedWorkContractTemplateId !== "__new__" && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={deleteTemplate}
                disabled={
                  isContractReadOnly ||
                  isSavingTemplate ||
                  isSavingContract ||
                  isGeneratingPdf
                }
                  className="min-h-[44px]"
                >
                  Smazat šablonu
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) {
            setPhotoToEdit(null);
            resetAnnotationState();
          }
        }}
      >
        <DialogContent className="max-w-[90vw] w-[95vw] md:w-[90vw] max-h-[90vh] h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Anotace fotografie</DialogTitle>
          </DialogHeader>

          <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
            <p className="text-sm text-muted-foreground">
              Klikněte nebo se dotkněte a táhněte pro nakreslení přímky, poté
              zadejte rozměr. Můžete přidat více rozměrů.
            </p>

            <div className="relative flex-1 overflow-auto border rounded-md bg-black/80 flex items-center justify-center">
              <canvas
                ref={setCanvasNode}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseLeave}
                onTouchStart={handleCanvasTouchStart}
                onTouchMove={handleCanvasTouchMove}
                onTouchEnd={handleCanvasTouchEnd}
                className={`max-w-full max-h-full touch-none ${
                  baseImageLoaded ? "opacity-100" : "opacity-0"
                }`}
              />

              {!baseImageLoaded && !imageError && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground bg-black/40 pointer-events-none">
                  Načítání fotografie...
                </div>
              )}

              {imageError && (
                <div className="absolute inset-0 flex items-center justify-center p-4 text-sm text-red-500 text-center bg-black/70">
                  <div className="space-y-2">
                    <p>{imageError}</p>
                    <p className="break-all text-xs text-muted-foreground">
                      URL: {annotationSource || "neznámé"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center gap-2 pt-2 border-t border-border">
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-[36px]"
                  onClick={() => setSegments((prev) => prev.slice(0, -1))}
                  disabled={!segments.length}
                >
                  Zpět
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-[36px]"
                  onClick={() => {
                    setSegments([]);
                    setCurrentSegment(null);
                  }}
                  disabled={!segments.length}
                >
                  Vymazat vše
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="min-h-[36px]"
                  onClick={() => setEditorOpen(false)}
                >
                  Zrušit
                </Button>

                <Button
                  className="min-h-[36px]"
                  onClick={handleSaveAnnotated}
                  disabled={!baseImageLoaded}
                >
                  Uložit anotaci
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}