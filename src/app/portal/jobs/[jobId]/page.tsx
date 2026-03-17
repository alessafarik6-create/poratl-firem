"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useUser,
  useFirestore,
  useDoc,
  useMemoFirebase,
  useCollection,
} from "@/firebase";
import { storage } from "@/firebase/storage";
import {
  doc,
  collection,
  updateDoc,
  serverTimestamp,
  deleteDoc,
  getDocs,
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
import type { JobTemplate } from "@/lib/job-templates";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

  const jobRef = useMemoFirebase(
    () =>
      firestore && companyId && jobId
        ? doc(firestore, "companies", companyId, "jobs", jobId as string)
        : null,
    [firestore, companyId, jobId]
  );
  const { data: job, isLoading } = useDoc(jobRef);

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

        <div className="flex gap-2">
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

          <Button variant="outline" className="gap-2">
            <Edit2 className="w-4 h-4" /> Upravit
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