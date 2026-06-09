import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, X, History } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/importar")({
  component: ImportarPage,
});

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXT = ["csv", "xlsx", "xls"];

function ImportarPage() {
  const { user } = useAuth();
  const { data: profileData } = useProfile(user?.id);
  const clinicId = profileData?.clinic?.id ?? null;

  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleFile = useCallback((f: File) => {
    if (f.size > MAX_FILE_BYTES) {
      toast.error("Arquivo muito grande", { description: "Máximo permitido: 50MB." });
      return;
    }
    const ext = f.name.toLowerCase().split(".").pop() ?? "";
    if (!ALLOWED_EXT.includes(ext)) {
      toast.error("Formato não suportado", { description: "Use .csv, .xlsx ou .xls." });
      return;
    }
    setFile(f);
  }, []);

  return (
    <AppShell title="Importar pacientes" subtitle="Migre sua base de pacientes em minutos">
      <div className="max-w-4xl mx-auto space-y-6">
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault(); setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          className={cn(
            "rounded-xl border-2 border-dashed p-12 text-center transition-colors bg-surface",
            drag ? "border-primary bg-primary/5" : "border-border",
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
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <Button className="mt-5" onClick={() => inputRef.current?.click()}>
            Selecionar arquivo
          </Button>
        </div>

        {file && (
          <div className="rounded-xl border border-border bg-surface p-4 flex items-center gap-3">
            <div className="size-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileSpreadsheet className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium truncate">{file.name}</div>
              <div className="text-[11px] text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setFile(null)} aria-label="Remover arquivo">
              <X className="size-4" />
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button disabled>Próximo</Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Wizard em construção</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        <div className="rounded-xl border border-border bg-surface">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
            <History className="size-4 text-muted-foreground" />
            <h3 className="text-[13px] font-semibold">Importações recentes</h3>
          </div>
          {jobsQuery.isLoading ? (
            <p className="px-5 py-6 text-[12px] text-muted-foreground">Carregando…</p>
          ) : !jobsQuery.data || jobsQuery.data.length === 0 ? (
            <p className="px-5 py-6 text-[12px] text-muted-foreground">Nenhuma importação anterior</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Linhas</TableHead>
                  <TableHead className="text-right">Importadas</TableHead>
                  <TableHead className="text-right">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobsQuery.data.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="font-medium truncate max-w-[220px]">
                      {j.source_filename ?? "Importação"}
                    </TableCell>
                    <TableCell><StatusBadge status={j.status} /></TableCell>
                    <TableCell className="text-right tabular-nums">{j.total_rows ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums">{j.imported_rows ?? 0}</TableCell>
                    <TableCell className="text-right text-muted-foreground text-[12px]">
                      {new Date(j.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </AppShell>
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
