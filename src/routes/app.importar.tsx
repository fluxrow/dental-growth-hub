import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  Upload, FileSpreadsheet, FileText, FileCog, ArrowRight, ArrowLeft,
  Loader2, History,
} from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/importar")({
  component: ImportarPage,
});

const MAX_FILE_BYTES = 50 * 1024 * 1024;

type Step = 0 | 1;

interface ParsedFile {
  file: File;
  headers: string[];
  rows: Record<string, string>[];
}

function ImportarPage() {
  const { user } = useAuth();
  const { data: profileData } = useProfile(user?.id);
  const clinicId = profileData?.clinic?.id ?? null;

  const [step, setStep] = useState<Step>(0);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
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
    const ext = f.name.toLowerCase().split(".").pop();
    if (!["csv", "xlsx", "xls"].includes(ext ?? "")) {
      toast.error("Formato não suportado", { description: "Use .csv, .xlsx ou .xls." });
      return;
    }
    setParsing(true);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "", raw: false });
      if (!json.length) {
        toast.error("Arquivo vazio ou sem dados");
        return;
      }
      const headers = Object.keys(json[0]);
      setParsed({ file: f, headers, rows: json });
      setStep(1);
    } catch (e) {
      toast.error("Não foi possível ler o arquivo", { description: String((e as Error).message) });
    } finally {
      setParsing(false);
    }
  }, []);

  return (
    <AppShell title="Importar pacientes" subtitle="Migre sua base de pacientes em minutos">
      <div className="max-w-5xl mx-auto space-y-6">
        {step === 0 && (
          <StepHub
            parsing={parsing}
            jobs={jobsQuery.data ?? []}
            onFile={handleFile}
          />
        )}

        {step === 1 && parsed && (
          <StepPreviewPlaceholder
            file={parsed.file}
            headers={parsed.headers}
            totalRows={parsed.rows.length}
            onBack={() => { setStep(0); setParsed(null); }}
            onContinue={() => toast.info("Próximos steps em breve", { description: "Mapeamento, validação e importação." })}
          />
        )}
      </div>
    </AppShell>
  );
}

// ---------------------------------------------------------------- Step 0
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

// ---------------------------------------------------------------- Step 1 placeholder
function StepPreviewPlaceholder({ file, headers, totalRows, onBack, onContinue }: {
  file: File; headers: string[]; totalRows: number;
  onBack: () => void; onContinue: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-6">
        <h3 className="text-[15px] font-semibold">Preview do arquivo: {file.name}</h3>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {totalRows.toLocaleString("pt-BR")} linhas · {headers.length} colunas detectadas
        </p>
        <p className="mt-4 text-[12px] text-muted-foreground">
          Os próximos steps (mapeamento, validação e importação) serão implementados em seguida.
        </p>
      </div>
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}><ArrowLeft className="size-4 mr-2" />Voltar</Button>
        <Button onClick={onContinue}>Continuar<ArrowRight className="size-4 ml-2" /></Button>
      </div>
    </div>
  );
}
