import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  Upload, FileSpreadsheet, FileText, FileCog, ArrowRight, ArrowLeft,
  CheckCircle2, AlertTriangle, XCircle, RefreshCw, Loader2, Sparkles, History,
} from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";
import {
  FIELD_LABELS,
  type ColumnMap, type DuplicateStrategy, type NormalizedRow,
  type PatientStatus, type StatusMap, type TargetField, type ValidationReport,
  type DiagnosticSnapshot,
} from "@/lib/types/migration";

export const Route = createFileRoute("/app/importar")({
  component: ImportarPage,
});

// ---------------------------------------------------------------- constants
const FIELD_TOKENS: Record<Exclude<TargetField, "ignore">, string[]> = {
  name: ["nome", "paciente", "patient", "cliente", "nome paciente", "nome completo"],
  phone: ["telefone", "celular", "fone", "phone", "whatsapp", "tel", "cel", "contato", "numero", "mobile"],
  email: ["email", "e-mail", "mail"],
  last_visit_at: ["ultima visita", "ultimo atendimento", "data visita", "last visit", "data ultima consulta"],
  ltv: ["ltv", "valor total", "receita", "total gasto", "total pago", "faturamento", "valor acumulado"],
  status: ["status", "situacao", "estado"],
  source: ["origem", "source", "canal", "indicacao", "como conheceu"],
  tags: ["tags", "etiquetas", "especialidade", "procedimento", "observacoes"],
};

const STATUS_TOKENS: Record<PatientStatus, string[]> = {
  ativo: ["ativo", "active", "alta", "regular", "ok"],
  tratamento: ["tratamento", "em tratamento", "em andamento"],
  inativo: ["inativo", "inactive", "desistiu", "cancelou", "parou", "abandonou"],
  recuperado: ["recuperado", "reativado", "voltou", "retornou"],
};

const FIELD_OPTIONS: TargetField[] = [
  "name", "phone", "email", "status", "last_visit_at", "ltv", "source", "tags", "ignore",
];

const MAX_FILE_BYTES = 50 * 1024 * 1024;

// ---------------------------------------------------------------- helpers
function normalize(s: string): string {
  return (s ?? "").toString().toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9 ]/g, " ").trim();
}

function autoMatch(headers: string[]): ColumnMap {
  const map: ColumnMap = {};
  for (const header of headers) {
    const norm = normalize(header);
    let matched: TargetField = "ignore";
    for (const [field, tokens] of Object.entries(FIELD_TOKENS)) {
      if (tokens.some((t) => norm.includes(normalize(t)))) {
        if (!Object.values(map).includes(field as TargetField)) {
          matched = field as TargetField;
          break;
        }
      }
    }
    map[header] = matched;
  }
  return map;
}

function autoMatchStatus(values: string[]): StatusMap {
  const map: StatusMap = {};
  for (const v of values) {
    const n = normalize(v);
    let matched: PatientStatus = "ativo";
    for (const [status, tokens] of Object.entries(STATUS_TOKENS) as [PatientStatus, string[]][]) {
      if (tokens.some((t) => n.includes(normalize(t)))) { matched = status; break; }
    }
    map[v] = matched;
  }
  return map;
}

function normalizePhone(raw: string): string | null {
  const digits = (raw ?? "").toString().replace(/\D/g, "");
  if (!digits) return null;
  let withDDI = digits;
  if (digits.length === 8) withDDI = "5511" + digits;
  else if (digits.length === 10) withDDI = "55" + digits;
  else if (digits.length === 11) withDDI = "55" + digits;
  if (withDDI.length === 12 || withDDI.length === 13) return "+" + withDDI;
  return null;
}

function titleCase(s: string): string {
  return s.trim().toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

function parseDateBR(raw: string): { iso: string | null; ok: boolean } {
  if (!raw) return { iso: null, ok: true };
  const s = String(raw).trim();
  if (!s) return { iso: null, ok: true };
  // Excel numeric date
  const n = Number(s);
  if (!Number.isNaN(n) && n > 25569 && n < 60000) {
    const d = XLSX.SSF.parse_date_code(n);
    if (d) {
      const iso = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
      return { iso, ok: true };
    }
  }
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) {
    return { iso: `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`, ok: true };
  }
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/))) {
    // ambiguous; treat as DD/MM/YYYY (BR default)
    const dd = parseInt(m[1], 10), mm = parseInt(m[2], 10);
    if (dd > 12) {
      return { iso: `${m[3]}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`, ok: true };
    }
    return { iso: `${m[3]}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`, ok: true };
  }
  return { iso: null, ok: false };
}

function parseLTV(raw: string): { value: number; warning?: string } {
  if (raw == null || raw === "") return { value: 0 };
  const s = String(raw).replace(/R\$\s*/gi, "").replace(/\./g, "").replace(/,/g, ".").trim();
  const n = parseFloat(s);
  if (Number.isNaN(n)) return { value: 0, warning: "Valor não reconhecido, importado como 0" };
  if (n < 0) return { value: 0, warning: "Valor negativo, importado como 0" };
  return { value: n };
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

// ---------------------------------------------------------------- page
type Step = 0 | 1 | 2 | 3 | 4 | 5;

function ImportarPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profileData } = useProfile(user?.id);
  const clinicId = profileData?.clinic?.id ?? null;

  const [step, setStep] = useState<Step>(0);
  const [file, setFile] = useState<File | null>(null);
  const [sourceType, setSourceType] = useState<"csv" | "xlsx">("xlsx");
  const [headers, setHeaders] = useState<string[]>([]);
  const [allRows, setAllRows] = useState<Record<string, unknown>[]>([]);
  const [columnMap, setColumnMap] = useState<ColumnMap>({});
  const [statusMap, setStatusMap] = useState<StatusMap>({});
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>("skip");
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [normalized, setNormalized] = useState<NormalizedRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<DiagnosticSnapshot | null>(null);
  const [parsing, setParsing] = useState(false);

  const jobsQuery = useQuery({
    queryKey: ["migration_jobs", clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("migration_jobs")
        .select("id, source_filename, status, total_rows, imported_rows, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const handleFile = useCallback(async (f: File) => {
    if (f.size > MAX_FILE_BYTES) {
      toast.error("Arquivo muito grande", { description: "Máximo permitido: 50MB." });
      return;
    }
    setParsing(true);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
      if (!json.length) {
        toast.error("Arquivo vazio ou sem dados");
        setParsing(false);
        return;
      }
      const hdrs = Object.keys(json[0]);
      setFile(f);
      setSourceType(f.name.toLowerCase().endsWith(".csv") ? "csv" : "xlsx");
      setHeaders(hdrs);
      setAllRows(json);
      setColumnMap(autoMatch(hdrs));
      setStep(1);
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível ler o arquivo", { description: String((e as Error).message) });
    } finally {
      setParsing(false);
    }
  }, []);

  // when entering step 2, refresh auto-match (no-op if already mapped)
  useEffect(() => {
    if (step === 2 && headers.length && Object.keys(columnMap).length === 0) {
      setColumnMap(autoMatch(headers));
    }
  }, [step, headers, columnMap]);

  // status column unique values
  const statusColHeader = useMemo(() => {
    return Object.entries(columnMap).find(([, f]) => f === "status")?.[0] ?? null;
  }, [columnMap]);
  const statusUniqueValues = useMemo(() => {
    if (!statusColHeader) return [];
    const set = new Set<string>();
    for (const r of allRows) {
      const v = String(r[statusColHeader] ?? "").trim();
      if (v) set.add(v);
      if (set.size >= 20) break;
    }
    return Array.from(set);
  }, [statusColHeader, allRows]);

  useEffect(() => {
    if (statusUniqueValues.length && Object.keys(statusMap).length === 0) {
      setStatusMap(autoMatchStatus(statusUniqueValues));
    }
  }, [statusUniqueValues, statusMap]);

  // ---------- validation ----------
  const runValidation = useCallback(async () => {
    if (!clinicId) return;
    setStep(3);
    // load existing phones for duplicate detection
    const { data: existing } = await supabase
      .from("pacientes")
      .select("id, phone")
      .not("phone", "is", null);
    const phoneIndex = new Map<string, string>();
    (existing ?? []).forEach((p) => { if (p.phone) phoneIndex.set(p.phone, p.id); });

    const norms: NormalizedRow[] = [];
    const rep: ValidationReport = {
      total: allRows.length, valid: 0, warnings: 0, duplicates: 0, errors: 0,
      errorRows: [], warningRows: [], duplicateRows: [],
    };
    const inFilePhones = new Set<string>();

    allRows.forEach((raw, idx) => {
      const rowNum = idx + 2; // header + 1-indexed
      const data: NormalizedRow["data"] = {};
      const warnings: string[] = [];
      let error: NormalizedRow["error"] | undefined;
      let duplicateOf: string | undefined;

      for (const [header, field] of Object.entries(columnMap)) {
        if (field === "ignore") continue;
        const value = raw[header];
        const sv = value == null ? "" : String(value);
        if (field === "name") {
          const t = sv.trim();
          if (!t || t.length < 2) {
            error = { field: "name", reason: "Nome vazio ou muito curto" };
          } else {
            data.name = titleCase(t);
          }
        } else if (field === "phone") {
          const p = normalizePhone(sv);
          if (!p) {
            error = { field: "phone", reason: `Telefone inválido: "${sv}"` };
          } else {
            data.phone = p;
          }
        } else if (field === "email") {
          const t = sv.trim();
          if (t && !isValidEmail(t)) {
            warnings.push(`Email inválido: "${t}"`);
            rep.warningRows.push({ row: rowNum, field: "email", value: t, suggestion: "Email será importado sem validação" });
          } else if (t) {
            data.email = t;
          }
        } else if (field === "status") {
          data.status = statusMap[sv.trim()] ?? "ativo";
        } else if (field === "last_visit_at") {
          const r = parseDateBR(sv);
          if (!r.ok) {
            warnings.push(`Data não reconhecida: "${sv}"`);
            rep.warningRows.push({ row: rowNum, field: "last_visit_at", value: sv, suggestion: "Importada como vazia" });
            data.last_visit_at = null;
          } else {
            data.last_visit_at = r.iso;
          }
        } else if (field === "ltv") {
          const r = parseLTV(sv);
          if (r.warning) {
            warnings.push(r.warning);
            rep.warningRows.push({ row: rowNum, field: "ltv", value: sv, suggestion: r.warning });
          }
          data.ltv = r.value;
        } else if (field === "source") {
          data.source = sv.trim() || null;
        } else if (field === "tags") {
          data.tags = sv ? sv.split(/[,;|]/).map((t) => t.trim()).filter(Boolean) : null;
        }
      }

      // required check if not already errored
      if (!error) {
        if (!data.name) error = { field: "name", reason: "Coluna Nome não mapeada" };
        else if (!data.phone) error = { field: "phone", reason: "Coluna Telefone não mapeada" };
      }

      let status: NormalizedRow["status"];
      if (error) {
        status = "error";
        rep.errors += 1;
        rep.errorRows.push({ row: rowNum, field: error.field, value: String(raw[Object.keys(raw).find((k) => columnMap[k] === error!.field) ?? ""] ?? ""), reason: error.reason });
      } else if (data.phone && (phoneIndex.has(data.phone) || inFilePhones.has(data.phone))) {
        status = "duplicate";
        duplicateOf = phoneIndex.get(data.phone) ?? "in-file";
        rep.duplicates += 1;
        rep.duplicateRows.push({ row: rowNum, existingPatientId: duplicateOf, phone: data.phone });
      } else if (warnings.length) {
        status = "warning";
        rep.warnings += 1;
      } else {
        status = "valid";
        rep.valid += 1;
      }
      if (data.phone && status !== "duplicate") inFilePhones.add(data.phone);

      norms.push({ rowNumber: rowNum, status, data, warnings, error, duplicateOf, raw });
    });

    setNormalized(norms);
    setReport(rep);
  }, [allRows, clinicId, columnMap, statusMap]);

  // ---------- import ----------
  const runImport = useCallback(async () => {
    if (!clinicId || !user || !report) return;
    setStep(4);
    setProgress(0); setImportedCount(0); setSkippedCount(0); setErrorCount(0);

    const validationReportJson = JSON.parse(JSON.stringify(report));
    const columnMapJson = JSON.parse(JSON.stringify(columnMap));

    const { data: job, error: jobErr } = await supabase
      .from("migration_jobs")
      .insert({
        clinic_id: clinicId,
        source_type: sourceType,
        source_filename: file?.name ?? "import",
        status: "importing",
        total_rows: allRows.length,
        column_map: columnMapJson,
        validation_report: validationReportJson,
        duplicate_strategy: duplicateStrategy,
        created_by: user.id,
        started_at: new Date().toISOString(),
        detected_headers: headers,
      })
      .select("id")
      .single();

    if (jobErr || !job) {
      toast.error("Falha ao criar job de importação", { description: jobErr?.message });
      setStep(3);
      return;
    }
    setJobId(job.id);

    const toProcess = normalized.filter((n) => n.status === "valid" || n.status === "warning" || (n.status === "duplicate" && duplicateStrategy === "update"));
    const batches: NormalizedRow[][] = [];
    for (let i = 0; i < toProcess.length; i += 100) batches.push(toProcess.slice(i, i + 100));

    let imported = 0, skipped = report.duplicates && duplicateStrategy === "skip" ? report.duplicates : 0, errors = report.errors;
    setSkippedCount(skipped); setErrorCount(errors);

    for (const batch of batches) {
      const jobRowsPayload: Array<Record<string, unknown>> = [];

      for (const n of batch) {
        try {
          const payload = {
            clinic_id: clinicId,
            name: n.data.name!,
            phone: n.data.phone!,
            email: n.data.email ?? null,
            status: (n.data.status ?? "ativo") as PatientStatus,
            last_visit_at: n.data.last_visit_at ?? null,
            ltv: n.data.ltv ?? 0,
            source: n.data.source ?? null,
            tags: n.data.tags ?? null,
            imported_from_job: job.id,
            imported_at: new Date().toISOString(),
          };

          let patientId: string | null = null;
          if (n.status === "duplicate" && n.duplicateOf && n.duplicateOf !== "in-file") {
            const { data: upd, error: uerr } = await supabase
              .from("pacientes")
              .update(payload)
              .eq("id", n.duplicateOf)
              .select("id").single();
            if (uerr) throw uerr;
            patientId = upd?.id ?? null;
          } else {
            const { data: ins, error: ierr } = await supabase
              .from("pacientes")
              .insert(payload)
              .select("id").single();
            if (ierr) throw ierr;
            patientId = ins?.id ?? null;
          }
          imported += 1;
          jobRowsPayload.push({
            clinic_id: clinicId, job_id: job.id, row_number: n.rowNumber,
            raw_data: n.raw, normalized: n.data, status: "imported", patient_id: patientId,
          });
        } catch (e) {
          errors += 1;
          jobRowsPayload.push({
            clinic_id: clinicId, job_id: job.id, row_number: n.rowNumber,
            raw_data: n.raw, normalized: n.data, status: "error",
            error_message: (e as Error).message,
          });
        }
      }

      if (jobRowsPayload.length) {
        await supabase.from("migration_job_rows").insert(jobRowsPayload);
      }

      setImportedCount(imported);
      setErrorCount(errors);
      const processed = (batches.indexOf(batch) + 1) * 100;
      const pct = Math.min(100, Math.round((Math.min(processed, toProcess.length) / Math.max(toProcess.length, 1)) * 100));
      setProgress(pct);

      await supabase.from("migration_jobs").update({
        progress_pct: pct, imported_rows: imported, skipped_rows: skipped, error_rows: errors,
      }).eq("id", job.id);
    }

    await supabase.from("migration_jobs").update({
      status: "done", progress_pct: 100, completed_at: new Date().toISOString(),
    }).eq("id", job.id);

    // diagnostic
    const { data: diag, error: derr } = await supabase.rpc("calculate_and_save_diagnostic", {
      p_clinic_id: clinicId, p_triggered_by: "migration", p_job_id: job.id,
    });
    if (derr) {
      console.error(derr);
    } else if (diag) {
      setDiagnostic(diag as unknown as DiagnosticSnapshot);
    }

    setStep(5);
    toast.success("Importação concluída", { description: `${imported} pacientes importados.` });
  }, [allRows.length, clinicId, columnMap, duplicateStrategy, file?.name, headers, normalized, report, sourceType, user]);

  // ---------- render ----------
  return (
    <AppShell title="Importar pacientes" subtitle="Migre sua base de pacientes em minutos">
      <div className="max-w-5xl mx-auto space-y-6">
        <Stepper current={step} />

        {step === 0 && (
          <StepHub
            parsing={parsing}
            jobs={jobsQuery.data ?? []}
            onFile={handleFile}
          />
        )}

        {step === 1 && (
          <StepPreview
            headers={headers}
            rows={allRows.slice(0, 10)}
            total={allRows.length}
            onBack={() => { setStep(0); setFile(null); setHeaders([]); setAllRows([]); setColumnMap({}); }}
            onContinue={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <StepMapping
            headers={headers}
            map={columnMap}
            onChange={(h, v) => setColumnMap({ ...columnMap, [h]: v })}
            statusUnique={statusUniqueValues}
            statusMap={statusMap}
            onStatusChange={(k, v) => setStatusMap({ ...statusMap, [k]: v })}
            onBack={() => setStep(1)}
            onValidate={runValidation}
          />
        )}

        {step === 3 && report && (
          <StepValidation
            report={report}
            duplicateStrategy={duplicateStrategy}
            onStrategy={setDuplicateStrategy}
            onBack={() => setStep(2)}
            onImport={runImport}
          />
        )}

        {step === 3 && !report && (
          <div className="rounded-xl border border-border bg-surface p-12 text-center">
            <Loader2 className="size-6 mx-auto animate-spin text-primary" />
            <p className="mt-3 text-[13px] text-muted-foreground">Validando linhas…</p>
          </div>
        )}

        {step === 4 && (
          <StepImporting
            progress={progress}
            imported={importedCount}
            total={normalized.filter((n) => n.status === "valid" || n.status === "warning" || (n.status === "duplicate" && duplicateStrategy === "update")).length}
          />
        )}

        {step === 5 && (
          <StepDone
            imported={importedCount}
            skipped={skippedCount}
            errors={errorCount}
            diagnostic={diagnostic}
            onDashboard={() => navigate({ to: "/app" })}
            onRestart={() => { setStep(0); setFile(null); setHeaders([]); setAllRows([]); setColumnMap({}); setStatusMap({}); setReport(null); setNormalized([]); setProgress(0); setJobId(null); setDiagnostic(null); }}
          />
        )}
      </div>
    </AppShell>
  );
}

// ---------------------------------------------------------------- stepper
function Stepper({ current }: { current: Step }) {
  const steps = ["Upload", "Preview", "Mapear", "Validar", "Importar", "Pronto"];
  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2 shrink-0">
          <div className={cn(
            "size-7 rounded-full flex items-center justify-center text-[11px] font-semibold",
            i < current ? "bg-success text-success-foreground" :
            i === current ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            {i < current ? <CheckCircle2 className="size-4" /> : i + 1}
          </div>
          <span className={cn("text-[12px] font-medium", i === current ? "text-foreground" : "text-muted-foreground")}>{s}</span>
          {i < steps.length - 1 && <div className="w-6 h-px bg-border" />}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- step 0
function StepHub({ parsing, jobs, onFile }: {
  parsing: boolean;
  jobs: Array<{ id: string; source_filename: string | null; status: string; total_rows: number | null; imported_rows: number | null; created_at: string }>;
  onFile: (f: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault(); setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        className={cn(
          "rounded-xl border-2 border-dashed p-12 text-center transition-colors bg-surface",
          drag ? "border-primary bg-primary/5" : "border-border"
        )}
      >
        <div className="mx-auto size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <Upload className="size-6" />
        </div>
        <h3 className="mt-4 text-[15px] font-semibold">Arraste seu arquivo ou clique para selecionar</h3>
        <p className="mt-1 text-[12px] text-muted-foreground">CSV, XLSX ou XLS — até 50MB</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
        <Button className="mt-5" onClick={() => inputRef.current?.click()} disabled={parsing}>
          {parsing ? <><Loader2 className="size-4 mr-2 animate-spin" />Lendo…</> : "Selecionar arquivo"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ShortcutCard icon={FileSpreadsheet} title="Excel" desc=".xlsx, .xls" onClick={() => inputRef.current?.click()} />
        <ShortcutCard icon={FileText} title="CSV" desc="Valores separados por vírgula" onClick={() => inputRef.current?.click()} />
        <ShortcutCard icon={FileCog} title="Google Sheets" desc="Em breve" disabled />
      </div>

      <div className="rounded-xl border border-border bg-surface">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
          <History className="size-4 text-muted-foreground" />
          <h3 className="text-[13px] font-semibold">Importações recentes</h3>
        </div>
        {jobs.length === 0 ? (
          <p className="px-5 py-6 text-[12px] text-muted-foreground">Nenhuma importação ainda.</p>
        ) : (
          <ul className="divide-y divide-border">
            {jobs.map((j) => (
              <li key={j.id} className="px-5 py-3 flex items-center gap-3">
                <FileSpreadsheet className="size-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{j.source_filename ?? "Importação"}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(j.created_at).toLocaleString("pt-BR")} · {j.imported_rows ?? 0} importados
                  </div>
                </div>
                <StatusBadge status={j.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ShortcutCard({ icon: Icon, title, desc, onClick, disabled }: {
  icon: typeof Upload; title: string; desc: string; onClick?: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-xl border border-border bg-surface p-4 text-left flex items-center gap-3 transition-colors",
        disabled ? "opacity-50 cursor-not-allowed" : "hover:border-primary/40 hover:bg-primary/5"
      )}
    >
      <div className="size-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="size-5" />
      </div>
      <div>
        <div className="text-[13px] font-semibold">{title}</div>
        <div className="text-[11px] text-muted-foreground">{desc}</div>
      </div>
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    done: { label: "Concluído", cls: "bg-success/15 text-success border-success/30" },
    importing: { label: "Importando", cls: "bg-primary/15 text-primary border-primary/30" },
    error: { label: "Erro", cls: "bg-destructive/15 text-destructive border-destructive/30" },
    validated: { label: "Validado", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
    uploaded: { label: "Enviado", cls: "bg-muted text-muted-foreground border-border" },
  };
  const v = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground border-border" };
  return <Badge variant="outline" className={cn("text-[10.5px] border", v.cls)}>{v.label}</Badge>;
}

// ---------------------------------------------------------------- step 1
function StepPreview({ headers, rows, total, onBack, onContinue }: {
  headers: string[]; rows: Record<string, unknown>[]; total: number;
  onBack: () => void; onContinue: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-semibold">Pré-visualização</h3>
            <p className="text-[12px] text-muted-foreground">{total.toLocaleString("pt-BR")} linhas · {headers.length} colunas</p>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-surface overflow-auto">
        <table className="w-full text-[12px]">
          <thead className="bg-muted/40 sticky top-0">
            <tr>
              {headers.map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-border">
                {headers.map((h) => (
                  <td key={h} className="px-3 py-2 whitespace-nowrap text-foreground/85">{String(r[h] ?? "")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}><ArrowLeft className="size-4 mr-2" />Voltar</Button>
        <Button onClick={onContinue}>Continuar<ArrowRight className="size-4 ml-2" /></Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- step 2
function StepMapping({
  headers, map, onChange, statusUnique, statusMap, onStatusChange, onBack, onValidate,
}: {
  headers: string[];
  map: ColumnMap;
  onChange: (h: string, v: TargetField) => void;
  statusUnique: string[];
  statusMap: StatusMap;
  onStatusChange: (k: string, v: PatientStatus) => void;
  onBack: () => void;
  onValidate: () => void;
}) {
  const hasName = Object.values(map).includes("name");
  const hasPhone = Object.values(map).includes("phone");
  const canContinue = hasName && hasPhone;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h3 className="text-[14px] font-semibold">Mapeie suas colunas</h3>
          <span className="text-[11.5px] text-muted-foreground">Detectamos automaticamente — ajuste se necessário</span>
        </div>
        <table className="w-full text-[13px]">
          <thead className="bg-muted/30">
            <tr>
              <th className="px-4 py-2 text-left font-semibold">Coluna na planilha</th>
              <th className="px-4 py-2 text-left font-semibold">Campo DentalFlux</th>
            </tr>
          </thead>
          <tbody>
            {headers.map((h) => (
              <tr key={h} className="border-t border-border">
                <td className="px-4 py-2 font-medium">{h}</td>
                <td className="px-4 py-2">
                  <Select value={map[h] ?? "ignore"} onValueChange={(v) => onChange(h, v as TargetField)}>
                    <SelectTrigger className="h-8 w-64"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FIELD_OPTIONS.map((f) => (
                        <SelectItem key={f} value={f}>{FIELD_LABELS[f]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {statusUnique.length > 0 && (
        <div className="rounded-xl border border-border bg-surface">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-[13px] font-semibold">Valores de Status</h3>
            <p className="text-[11.5px] text-muted-foreground">Mapeie os status da sua planilha para os do DentalFlux</p>
          </div>
          <table className="w-full text-[13px]">
            <tbody>
              {statusUnique.map((v) => (
                <tr key={v} className="border-t border-border">
                  <td className="px-4 py-2 font-medium">{v}</td>
                  <td className="px-4 py-2">
                    <Select value={statusMap[v] ?? "ativo"} onValueChange={(nv) => onStatusChange(v, nv as PatientStatus)}>
                      <SelectTrigger className="h-8 w-48"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="tratamento">Em tratamento</SelectItem>
                        <SelectItem value="inativo">Inativo</SelectItem>
                        <SelectItem value="recuperado">Recuperado</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!canContinue && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-[12px] text-amber-700 dark:text-amber-400">
          Mapeie ao menos as colunas <strong>Nome</strong> e <strong>Telefone</strong> para continuar.
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}><ArrowLeft className="size-4 mr-2" />Voltar</Button>
        <Button onClick={onValidate} disabled={!canContinue}>Validar<ArrowRight className="size-4 ml-2" /></Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- step 3
function StepValidation({
  report, duplicateStrategy, onStrategy, onBack, onImport,
}: {
  report: ValidationReport;
  duplicateStrategy: DuplicateStrategy;
  onStrategy: (s: DuplicateStrategy) => void;
  onBack: () => void;
  onImport: () => void;
}) {
  const importable = report.valid + report.warnings + (duplicateStrategy === "update" ? report.duplicates : 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CountCard icon={CheckCircle2} label="Válidas" value={report.valid} cls="text-success bg-success/10" />
        <CountCard icon={AlertTriangle} label="Avisos" value={report.warnings} cls="text-amber-600 bg-amber-500/10" />
        <CountCard icon={RefreshCw} label="Duplicadas" value={report.duplicates} cls="text-primary bg-primary/10" />
        <CountCard icon={XCircle} label="Erros" value={report.errors} cls="text-destructive bg-destructive/10" />
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <h4 className="text-[13px] font-semibold mb-3">Para registros duplicados</h4>
        <RadioGroup value={duplicateStrategy} onValueChange={(v) => onStrategy(v as DuplicateStrategy)}>
          <div className="flex items-center gap-2"><RadioGroupItem value="skip" id="skip" /><Label htmlFor="skip" className="text-[13px]">Ignorar (manter cadastro existente)</Label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="update" id="update" /><Label htmlFor="update" className="text-[13px]">Atualizar com os dados da planilha</Label></div>
        </RadioGroup>
      </div>

      <Accordion type="multiple" className="rounded-xl border border-border bg-surface">
        {report.errors > 0 && (
          <AccordionItem value="errors" className="border-0">
            <AccordionTrigger className="px-5 text-[13px]">Ver {report.errors} erros</AccordionTrigger>
            <AccordionContent className="px-5 pb-4">
              <ul className="space-y-1.5 text-[12px] max-h-72 overflow-auto">
                {report.errorRows.slice(0, 200).map((e, i) => (
                  <li key={i} className="flex gap-2"><span className="text-muted-foreground tabular-nums w-12">L.{e.row}</span><span className="font-medium">{e.field}:</span><span className="text-muted-foreground">{e.reason}</span></li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        )}
        {report.warnings > 0 && (
          <AccordionItem value="warnings" className="border-t border-border">
            <AccordionTrigger className="px-5 text-[13px]">Ver {report.warnings} avisos</AccordionTrigger>
            <AccordionContent className="px-5 pb-4">
              <ul className="space-y-1.5 text-[12px] max-h-72 overflow-auto">
                {report.warningRows.slice(0, 200).map((w, i) => (
                  <li key={i} className="flex gap-2"><span className="text-muted-foreground tabular-nums w-12">L.{w.row}</span><span className="font-medium">{w.field}:</span><span className="text-muted-foreground">{w.suggestion}</span></li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}><ArrowLeft className="size-4 mr-2" />Voltar</Button>
        <Button onClick={onImport} disabled={importable === 0}>
          Importar {importable.toLocaleString("pt-BR")} pacientes<ArrowRight className="size-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function CountCard({ icon: Icon, label, value, cls }: {
  icon: typeof CheckCircle2; label: string; value: number; cls: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className={cn("size-8 rounded-md flex items-center justify-center", cls)}>
        <Icon className="size-4" />
      </div>
      <div className="mt-3 text-[22px] font-semibold tabular-nums">{value.toLocaleString("pt-BR")}</div>
      <div className="text-[11.5px] text-muted-foreground">{label}</div>
    </div>
  );
}

// ---------------------------------------------------------------- step 4
function StepImporting({ progress, imported, total }: { progress: number; imported: number; total: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-10 text-center">
      <Loader2 className="size-8 mx-auto animate-spin text-primary" />
      <h3 className="mt-4 text-[16px] font-semibold">Importando pacientes…</h3>
      <p className="mt-1 text-[13px] text-muted-foreground">
        {imported.toLocaleString("pt-BR")} de {total.toLocaleString("pt-BR")} pacientes
      </p>
      <div className="mt-6 max-w-md mx-auto">
        <Progress value={progress} />
        <div className="mt-2 text-[11px] text-muted-foreground tabular-nums">{progress}%</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- step 5
function StepDone({ imported, skipped, errors, diagnostic, onDashboard, onRestart }: {
  imported: number; skipped: number; errors: number;
  diagnostic: DiagnosticSnapshot | null;
  onDashboard: () => void; onRestart: () => void;
}) {
  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-success/30 bg-success/5 p-6 text-center">
        <div className="mx-auto size-12 rounded-full bg-success/15 text-success flex items-center justify-center">
          <CheckCircle2 className="size-6" />
        </div>
        <h3 className="mt-4 text-[18px] font-semibold">Importação concluída!</h3>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {imported.toLocaleString("pt-BR")} adicionados · {skipped.toLocaleString("pt-BR")} ignorados · {errors.toLocaleString("pt-BR")} com erro
        </p>
      </div>

      {diagnostic && (
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h3 className="text-[14px] font-semibold">Diagnóstico da clínica</h3>
          </div>
          <div className="mt-4 text-center">
            <div className="text-[12px] text-muted-foreground">Potencial recuperável</div>
            <div className="text-[36px] font-semibold tracking-tight tabular-nums text-primary">
              {fmt(Number(diagnostic.total_recoverable ?? 0))}
            </div>
            <div className="text-[12px] text-muted-foreground">Score de saúde: <span className="font-semibold text-foreground">{diagnostic.health_score}/100</span></div>
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            <DiagItem color="bg-destructive" label={`${diagnostic.inactive_patients} pacientes inativos`} value={fmt(Number(diagnostic.inactive_recovery_est ?? 0))} />
            <DiagItem color="bg-amber-500" label={`${diagnostic.stalled_opps_count} oportunidades paradas`} value={fmt(Number(diagnostic.stalled_opps_value ?? 0))} />
            <DiagItem color="bg-primary" label="Cobranças pendentes" value={fmt(Number(diagnostic.pending_charges_value ?? 0))} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 justify-center">
        <Button variant="outline" onClick={onRestart}>Importar outro arquivo</Button>
        <Button onClick={onDashboard}>Ir para o Dashboard<ArrowRight className="size-4 ml-2" /></Button>
      </div>
    </div>
  );
}

function DiagItem({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-2">
        <span className={cn("size-2 rounded-full", color)} />
        <span className="text-[12px] text-muted-foreground">{label}</span>
      </div>
      <div className="mt-1 text-[16px] font-semibold tabular-nums">{value}</div>
    </div>
  );
}
