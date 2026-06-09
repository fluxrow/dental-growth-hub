import type { ValidationReport, PatientField } from '@/lib/types/migration'

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 8)  return `5511${digits}`
  if (digits.length === 9)  return `5511${digits}`
  if (digits.length === 10) return `55${digits}`
  if (digits.length === 11) return `55${digits}`
  if (digits.length === 12 || digits.length === 13) return digits
  return null
}

function parseDate(raw: string): Date | null {
  if (!raw) return null
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (dmy) return new Date(`${dmy[3].length === 2 ? '20'+dmy[3] : dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`)
  const ymd = raw.match(/^\d{4}-\d{2}-\d{2}/)
  if (ymd) return new Date(raw)
  return null
}

function parseLtv(raw: string): number | null {
  if (!raw) return null
  const cleaned = raw.replace(/R\$|\s/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : Math.max(0, n)
}

export function validateRows(
  rows: Record<string, string>[],
  columnMap: Record<string, PatientField>,
  existingPhones: Set<string>
): { report: ValidationReport; normalized: Array<Record<string, unknown> | null> } {
  const errorRows: ValidationReport['errorRows'] = []
  const warningRows: ValidationReport['warningRows'] = []
  const duplicateRows: ValidationReport['duplicateRows'] = []
  const normalized: Array<Record<string, unknown> | null> = []

  let valid = 0, warnings = 0, duplicates = 0, errors = 0

  const fieldToCol: Record<string, string> = {}
  for (const [col, field] of Object.entries(columnMap)) {
    if (field !== 'ignore') fieldToCol[field] = col
  }

  rows.forEach((row, idx) => {
    const rowNum = idx + 1
    let hasError = false
    let hasWarning = false
    const norm: Record<string, unknown> = {}

    const rawName = String(row[fieldToCol['name']] ?? '').trim()
    if (!rawName || rawName.length < 2) {
      errorRows.push({ row: rowNum, field: 'name', value: rawName, reason: 'Nome obrigatório (mín. 2 caracteres)' })
      hasError = true
    } else {
      norm.name = rawName.replace(/\b\w/g, c => c.toUpperCase())
    }

    const rawPhone = String(row[fieldToCol['phone']] ?? '').trim()
    const normalizedPhone = normalizePhone(rawPhone)
    if (!normalizedPhone) {
      errorRows.push({ row: rowNum, field: 'phone', value: rawPhone, reason: 'Telefone inválido após normalização' })
      hasError = true
    } else if (existingPhones.has(normalizedPhone)) {
      duplicateRows.push({ row: rowNum, existingPatientId: '', phone: normalizedPhone })
      duplicates++
      normalized.push(null)
      return
    } else {
      norm.phone = normalizedPhone
    }

    if (fieldToCol['email']) {
      const rawEmail = String(row[fieldToCol['email']] ?? '').trim().toLowerCase()
      if (rawEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
        warningRows.push({ row: rowNum, field: 'email', value: rawEmail, suggestion: 'Email com formato inválido — será ignorado' })
        hasWarning = true
      } else {
        norm.email = rawEmail || null
      }
    }

    if (fieldToCol['last_visit_at']) {
      const rawDate = String(row[fieldToCol['last_visit_at']] ?? '').trim()
      if (rawDate) {
        const d = parseDate(rawDate)
        if (!d || isNaN(d.getTime())) {
          warningRows.push({ row: rowNum, field: 'last_visit_at', value: rawDate, suggestion: 'Formato de data não reconhecido — será ignorado' })
          hasWarning = true
        } else {
          norm.last_visit_at = d.toISOString()
        }
      }
    }

    if (fieldToCol['ltv']) {
      const rawLtv = String(row[fieldToCol['ltv']] ?? '').trim()
      if (rawLtv) {
        const n = parseLtv(rawLtv)
        if (n === null) {
          warningRows.push({ row: rowNum, field: 'ltv', value: rawLtv, suggestion: 'Valor não reconhecido — será importado como 0' })
          hasWarning = true
          norm.ltv = 0
        } else {
          norm.ltv = n
        }
      }
    }

    if (fieldToCol['status']) {
      norm.status = row[fieldToCol['status']] ?? 'inativo'
    }

    if (fieldToCol['source']) norm.source = row[fieldToCol['source']] ?? null
    if (fieldToCol['tags']) {
      const rawTags = String(row[fieldToCol['tags']] ?? '').trim()
      norm.tags = rawTags ? rawTags.split(/[,;]/).map(t => t.trim()).filter(Boolean) : []
    }

    if (hasError) { errors++; normalized.push(null) }
    else { if (hasWarning) warnings++; else valid++; normalized.push(norm) }
  })

  return {
    report: { total: rows.length, valid, warnings, duplicates, errors, errorRows, warningRows, duplicateRows },
    normalized,
  }
}
