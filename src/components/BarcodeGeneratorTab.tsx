'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  BarcodeFormat,
  BarcodeFormData,
  BarcodeMode,
  BarcodeResult,
  BARCODE_FORMAT_META,
  INITIAL_BARCODE_FORM,
  DueDateEntry,
} from '@/types/barcode';
import {
  buildBarcodeResult,
  validateBarcodeForm,
  BarcodeFormErrors,
  generateRandomClientId,
  daysBetween,
} from '@/utils/barcodeBuilder';

// ─────────────────────────────────────────────────────────────────────────────
// BarcodeRenderer – renders the barcode SVG via JsBarcode (client-only)
// ─────────────────────────────────────────────────────────────────────────────

interface BarcodeRendererProps {
  data: string;
  symbology: 'I2of5' | 'Code128';
  onError?: (err: string) => void;
}

function BarcodeRenderer({ data, symbology, onError }: BarcodeRendererProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    // Dynamic import keeps JsBarcode out of the SSR bundle
    import('jsbarcode').then(({ default: JsBarcode }) => {
      try {
        // Map symbology to JsBarcode format string
        const formatMap: Record<string, string> = {
          I2of5: 'ITF',     // Interleaved 2 of 5
          Code128: 'CODE128',
        };
        JsBarcode(svgRef.current, data, {
          format: formatMap[symbology] ?? 'CODE128',
          displayValue: true,
          fontSize: 14,
          textMargin: 6,
          height: 80,
          margin: 10,
          background: '#ffffff',
          lineColor: '#000000',
          font: 'monospace',
          textAlign: 'center',
        });
      } catch (e: unknown) {
        onError?.(e instanceof Error ? e.message : String(e));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, symbology]);

  return <svg ref={svgRef} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// DueDateRow – one row with date + amount inputs
// ─────────────────────────────────────────────────────────────────────────────

interface DueDateRowProps {
  label: string;
  entry: DueDateEntry;
  previous?: DueDateEntry;
  dateError?: string;
  amountError?: string;
  maxAmountDisplay: string;
  onChange: (updated: DueDateEntry) => void;
  disabled?: boolean;
}

function DueDateRow({
  label,
  entry,
  previous,
  dateError,
  amountError,
  maxAmountDisplay,
  onChange,
  disabled,
}: DueDateRowProps) {
  // Compute days between previous due and this one for live preview
  const daysPreview =
    previous?.date && entry.date ? daysBetween(previous.date, entry.date) : null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* Date field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} – Fecha de Vencimiento
        </label>
        <input
          type="date"
          disabled={disabled}
          value={entry.date}
          onChange={(e) => onChange({ ...entry, date: e.target.value })}
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--siro-green)] transition-colors ${
            dateError ? 'border-red-400 bg-red-50' : 'border-gray-300'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        />
        {dateError && <p className="mt-1 text-xs text-red-600">{dateError}</p>}
        {daysPreview !== null && !dateError && (
          <p className="mt-1 text-xs text-gray-500">
            {daysPreview} día{daysPreview !== 1 ? 's' : ''} después del vencimiento anterior
          </p>
        )}
      </div>

      {/* Amount field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} – Importe (hasta {maxAmountDisplay})
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
            $
          </span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            disabled={disabled}
            value={entry.amount}
            onChange={(e) => onChange({ ...entry, amount: e.target.value })}
            className={`w-full pl-7 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--siro-green)] transition-colors ${
              amountError ? 'border-red-400 bg-red-50' : 'border-gray-300'
            } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>
        {amountError && <p className="mt-1 text-xs text-red-600">{amountError}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BarcodeGeneratorTab – main component
// ─────────────────────────────────────────────────────────────────────────────

export default function BarcodeGeneratorTab() {
  const [form, setForm] = useState<BarcodeFormData>({ ...INITIAL_BARCODE_FORM });
  const [errors, setErrors] = useState<BarcodeFormErrors>({});
  const [result, setResult] = useState<BarcodeResult | null>(null);
  const [buildError, setBuildError] = useState<string>('');
  const [renderError, setRenderError] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const meta = BARCODE_FORMAT_META[form.format];

  // ── Reset result whenever form changes ──
  useEffect(() => {
    setResult(null);
    setBuildError('');
    setRenderError('');
  }, [form]);

  // ── Format change: also reset client ID if maxLength differs ──
  const handleFormatChange = useCallback(
    (newFormat: BarcodeFormat) => {
      const newMeta = BARCODE_FORMAT_META[newFormat];
      const currentMeta = BARCODE_FORMAT_META[form.format];
      setForm((prev) => ({
        ...prev,
        format: newFormat,
        // Clear client ID if max length changes to avoid silent truncation
        clientId:
          newMeta.clientIdMaxLength !== currentMeta.clientIdMaxLength ? '' : prev.clientId,
        // Reset due3 if new format only supports 2 due dates
        due3: newMeta.dueDates < 3 ? { date: '', amount: '' } : prev.due3,
      }));
      setErrors({});
    },
    [form.format],
  );

  // ── Auto-generate client ID ──
  const handleGenerateClientId = () => {
    const id = generateRandomClientId(meta.clientIdMaxLength);
    setForm((prev) => ({ ...prev, clientId: id }));
  };

  // ── Due entry update helpers ──
  const updateDue =
    (key: 'due1' | 'due2' | 'due3') => (updated: DueDateEntry) =>
      setForm((prev) => ({ ...prev, [key]: updated }));

  // ── Form submission ──
  const handleGenerate = () => {
    const validationErrors = validateBarcodeForm(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      const res = buildBarcodeResult(form);
      setResult(res);
      setBuildError('');
    } catch (e: unknown) {
      setBuildError(e instanceof Error ? e.message : String(e));
      setResult(null);
    }
  };

  // ── Copy to clipboard ──
  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.numericString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Download helpers ──
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const baseFilename = `codigo-barras-${form.format}-${result?.numericString ?? 'siro'}`;

  /** Returns the rendered SVG element, or null if not available. */
  const getRenderedSvg = (): SVGSVGElement | null =>
    svgContainerRef.current?.querySelector('svg') ?? null;

  /** Serializes the SVG element to a string. */
  const serializeSvg = (svg: SVGSVGElement): string =>
    new XMLSerializer().serializeToString(svg);

  /**
   * Converts the barcode SVG to an offscreen canvas.
   * Resolves with the canvas, or rejects on error.
   */
  const svgToCanvas = (svg: SVGSVGElement): Promise<HTMLCanvasElement> =>
    new Promise((resolve, reject) => {
      // Clone so we can force explicit px dimensions
      const cloned = svg.cloneNode(true) as SVGSVGElement;
      const bbox = svg.getBoundingClientRect();
      const w = Math.ceil(bbox.width)  || 600;
      const h = Math.ceil(bbox.height) || 200;
      cloned.setAttribute('width',  String(w));
      cloned.setAttribute('height', String(h));

      const svgBlob = new Blob([new XMLSerializer().serializeToString(cloned)], {
        type: 'image/svg+xml;charset=utf-8',
      });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // 2× for retina-quality PNG
        canvas.width  = w * 2;
        canvas.height = h * 2;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas);
      };
      img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
      img.src = url;
    });

  // – SVG –
  const handleDownloadSVG = () => {
    const svg = getRenderedSvg();
    if (!svg) return;
    const blob = new Blob([serializeSvg(svg)], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href     = url;
    a.download = `${baseFilename}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // – PNG –
  const handleDownloadPNG = async () => {
    const svg = getRenderedSvg();
    if (!svg) return;
    try {
      const canvas = await svgToCanvas(svg);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = `${baseFilename}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (e) {
      console.error('PNG export error', e);
    }
  };

  // – PDF –
  const handleDownloadPDF = async () => {
    const svg = getRenderedSvg();
    if (!svg) return;
    try {
      const canvas  = await svgToCanvas(svg);
      const imgData = canvas.toDataURL('image/png');
      // 2× canvas dimensions → actual mm at 96 dpi (1 px ≈ 0.2646 mm), /2 for retina
      const pxW  = canvas.width  / 2;
      const pxH  = canvas.height / 2;
      const mmW  = pxW * 0.2646;
      const mmH  = pxH * 0.2646;

      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: mmW > mmH ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [mmW, mmH],
      });
      doc.addImage(imgData, 'PNG', 0, 0, mmW, mmH);
      doc.save(`${baseFilename}.pdf`);
    } catch (e) {
      console.error('PDF export error', e);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="bg-white rounded-xl shadow-sm border border-[var(--siro-light-gray)] p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 bg-[var(--siro-green)] rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 6h1M4 10h1M4 14h1M4 18h1M8 6h1M8 10h1M8 14h1M8 18h1M12 6h4M12 10h4M12 14h4M12 18h4M18 6h2M18 10h2M18 14h2M18 18h2" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[var(--siro-green)]">Generador de Códigos de Barras</h2>
            <p className="text-sm text-gray-500 mt-1">
              Genera códigos de barras SIRO en los formatos{' '}
              <strong>0444/0447, 0448 y 0449</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* ── Form card ── */}
      <div className="bg-white rounded-xl shadow-sm border border-[var(--siro-light-gray)] p-6 space-y-6">

        {/* ── Row 1: Format + Mode ── */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

          {/* Format selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Formato de Código de Barras
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['0444', '0447', '0448', '0449'] as BarcodeFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => handleFormatChange(fmt)}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    form.format === fmt
                      ? 'bg-[var(--siro-green)] text-white border-[var(--siro-green)]'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-[var(--siro-green)] hover:text-[var(--siro-green)]'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
            {/* Format info pill */}
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-[var(--siro-light-gray)] text-gray-600">
                {meta.symbology === 'I2of5' ? 'Interleaved 2 of 5' : 'Code 128'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-[var(--siro-light-gray)] text-gray-600">
                {meta.totalDigits} dígitos totales
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-[var(--siro-light-gray)] text-gray-600">
                Hasta {meta.maxAmountDisplay} por vto.
              </span>
            </div>
          </div>

          {/* Mode selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Modalidad
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['CLOSED', 'OPEN'] as BarcodeMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, mode: m }))}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    form.mode === m
                      ? 'bg-[var(--siro-green)] text-white border-[var(--siro-green)]'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-[var(--siro-green)] hover:text-[var(--siro-green)]'
                  }`}
                >
                  {m === 'CLOSED' ? '🔒 Cerrada' : '🔓 Abierta'}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {form.mode === 'CLOSED'
                ? 'Incluye fechas y montos de vencimiento.'
                : 'Sin vencimiento ni monto; el pagador elige el importe.'}
            </p>
          </div>
        </div>

        {/* ── Row 2: Client ID + Convention ID ── */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

          {/* Client ID */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              ID Cliente
              <span className="ml-1 text-xs font-normal text-gray-400">
                (hasta {meta.clientIdMaxLength} dígitos)
              </span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={meta.clientIdMaxLength}
                placeholder={'0'.repeat(meta.clientIdMaxLength)}
                value={form.clientId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    clientId: e.target.value.replace(/\D/g, '').slice(0, meta.clientIdMaxLength),
                  }))
                }
                className={`flex-1 px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--siro-green)] transition-colors ${
                  errors.clientId ? 'border-red-400 bg-red-50' : 'border-gray-300'
                }`}
              />
              <button
                type="button"
                onClick={handleGenerateClientId}
                title="Generar ID aleatorio"
                className="px-3 py-2 bg-[var(--siro-orange)] text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                Aleatorio
              </button>
            </div>
            {errors.clientId && (
              <p className="mt-1 text-xs text-red-600">{errors.clientId}</p>
            )}
            {form.clientId && (
              <p className="mt-1 text-xs text-gray-400">
                Se completará con ceros a la izquierda:{' '}
                <code className="font-mono">
                  {form.clientId.padStart(meta.clientIdMaxLength, '0')}
                </code>
              </p>
            )}
          </div>

          {/* Convention ID */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              ID Convenio / N° Empresa
              <span className="ml-1 text-xs font-normal text-gray-400">(10 dígitos, otorgado por Banco Roela)</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={10}
              placeholder="0000000000"
              value={form.conventionId}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  conventionId: e.target.value.replace(/\D/g, '').slice(0, 10),
                }))
              }
              className={`w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--siro-green)] transition-colors ${
                errors.conventionId ? 'border-red-400 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.conventionId && (
              <p className="mt-1 text-xs text-red-600">{errors.conventionId}</p>
            )}
          </div>
        </div>

        {/* ── Due dates / amounts section (CLOSED only) ── */}
        {form.mode === 'CLOSED' && (
          <div className="space-y-4">
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                Vencimientos e Importes
              </h3>

              {/* 1st due date – always shown */}
              <div className="bg-[var(--siro-light-gray)] rounded-lg p-4 mb-3">
                <p className="text-xs font-semibold text-[var(--siro-green)] uppercase tracking-wide mb-3">
                  1er Vencimiento *
                </p>
                <DueDateRow
                  label="1er Vencimiento"
                  entry={form.due1}
                  dateError={errors.due1Date}
                  amountError={errors.due1Amount}
                  maxAmountDisplay={meta.maxAmountDisplay}
                  onChange={updateDue('due1')}
                />
              </div>

              {/* 2nd due date */}
              <div className="bg-[var(--siro-light-gray)] rounded-lg p-4 mb-3">
                <p className="text-xs font-semibold text-[var(--siro-green)] uppercase tracking-wide mb-3">
                  2do Vencimiento{' '}
                  <span className="text-gray-400 normal-case font-normal">(opcional)</span>
                </p>
                <DueDateRow
                  label="2do Vencimiento"
                  entry={form.due2}
                  previous={form.due1}
                  dateError={errors.due2Date}
                  amountError={errors.due2Amount}
                  maxAmountDisplay={meta.maxAmountDisplay}
                  onChange={updateDue('due2')}
                />
              </div>

              {/* 3rd due date – only for formats supporting 3 */}
              {meta.dueDates === 3 && (
                <div className="bg-[var(--siro-light-gray)] rounded-lg p-4">
                  <p className="text-xs font-semibold text-[var(--siro-green)] uppercase tracking-wide mb-3">
                    3er Vencimiento{' '}
                    <span className="text-gray-400 normal-case font-normal">(opcional)</span>
                  </p>
                  <DueDateRow
                    label="3er Vencimiento"
                    entry={form.due3}
                    previous={form.due2}
                    dateError={errors.due3Date}
                    amountError={errors.due3Amount}
                    maxAmountDisplay={meta.maxAmountDisplay}
                    onChange={updateDue('due3')}
                    disabled={!form.due2.date}
                  />
                  {!form.due2.date && (
                    <p className="mt-2 text-xs text-amber-600">
                      Complete el 2do vencimiento para habilitar el 3er vencimiento.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Generate button ── */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleGenerate}
            className="px-6 py-2.5 bg-[var(--siro-green)] text-white font-semibold text-sm rounded-lg hover:opacity-90 active:opacity-80 transition-opacity shadow-sm"
          >
            Generar Código de Barras
          </button>
        </div>

        {/* Build error */}
        {buildError && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            <strong>Error al generar:</strong> {buildError}
          </div>
        )}
      </div>

      {/* ── Result card ── */}
      {result && (
        <div className="bg-white rounded-xl shadow-sm border border-[var(--siro-light-gray)] p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[var(--siro-green)]">
              Código de Barras Generado
            </h3>
            <span className="text-xs px-2 py-1 bg-[var(--siro-light-gray)] rounded text-gray-600">
              {result.symbology === 'I2of5' ? 'Interleaved 2 of 5' : 'Code 128'} · {result.format}
            </span>
          </div>

          {/* Barcode visual */}
          <div
            ref={svgContainerRef}
            className="flex justify-center items-center bg-white border border-gray-200 rounded-lg p-4 overflow-x-auto"
          >
            {renderError ? (
              <p className="text-sm text-red-600">{renderError}</p>
            ) : (
              <BarcodeRenderer
                data={result.numericString}
                symbology={result.symbology}
                onError={setRenderError}
              />
            )}
          </div>

          {/* Numeric string + details */}
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Cadena numérica completa ({result.numericString.length} dígitos)</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 block bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm font-mono tracking-wider break-all">
                  {result.numericString}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`flex-shrink-0 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    copied
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {copied ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            {/* Breakdown table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--siro-light-gray)]">
                    <th className="text-left px-3 py-2 text-gray-600 font-semibold rounded-tl-lg">Campo</th>
                    <th className="text-left px-3 py-2 text-gray-600 font-semibold">Valor</th>
                    <th className="text-right px-3 py-2 text-gray-600 font-semibold rounded-tr-lg">Posición</th>
                  </tr>
                </thead>
                <tbody>
                  <BarcodeBreakdownRows result={result} form={form} />
                </tbody>
              </table>
            </div>

            {/* Download */}
            <div className="flex items-center justify-end gap-2 flex-wrap">
              <span className="text-xs text-gray-400 mr-1">Descargar como:</span>
              <button
                type="button"
                onClick={handleDownloadSVG}
                className="px-4 py-2 text-xs font-semibold text-[var(--siro-green)] border border-[var(--siro-green)] rounded-lg hover:bg-[var(--siro-green)] hover:text-white transition-colors"
              >
                SVG
              </button>
              <button
                type="button"
                onClick={handleDownloadPNG}
                className="px-4 py-2 text-xs font-semibold text-[var(--siro-green)] border border-[var(--siro-green)] rounded-lg hover:bg-[var(--siro-green)] hover:text-white transition-colors"
              >
                PNG
              </button>
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="px-4 py-2 text-xs font-semibold text-[var(--siro-green)] border border-[var(--siro-green)] rounded-lg hover:bg-[var(--siro-green)] hover:text-white transition-colors"
              >
                PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Info card ── */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-blue-800">
        <p className="font-semibold mb-2">ℹ️ Consideraciones importantes</p>
        <ul className="space-y-1 list-disc list-inside text-xs">
          <li>Los formatos <strong>0444/0447</strong> utilizan el estándar <strong>Interleaved 2 of 5</strong>.</li>
          <li>Los formatos <strong>0448/0449</strong> utilizan el estándar <strong>Code 128</strong>.</li>
          <li>El tamaño óptimo de impresión es <strong>8 cm a 10 cm</strong> de ancho.</li>
        </ul>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BarcodeBreakdownRows – renders the field breakdown table rows
// ─────────────────────────────────────────────────────────────────────────────

interface BarcodeBreakdownRowsProps {
  result: BarcodeResult;
  form: BarcodeFormData;
}

function BarcodeBreakdownRows({ result, form }: BarcodeBreakdownRowsProps) {
  const s = result.numericString;
  const meta = BARCODE_FORMAT_META[result.format];

  const Row = ({
    field,
    value,
    pos,
    highlight,
  }: {
    field: string;
    value: string;
    pos: string;
    highlight?: boolean;
  }) => (
    <tr className={`border-b border-gray-100 ${highlight ? 'bg-amber-50' : 'hover:bg-gray-50'}`}>
      <td className="px-3 py-1.5 text-gray-600">{field}</td>
      <td className="px-3 py-1.5 font-mono text-gray-900">{value}</td>
      <td className="px-3 py-1.5 text-right text-gray-400">{pos}</td>
    </tr>
  );

  if (result.format === '0444' || result.format === '0447') {
    // 56 digits: 4+9+6+7+2+7+2+7+10+1+1
    return (
      <>
        <Row field="Empresa de servicio" value={s.slice(0, 4)} pos="01–04" />
        <Row field="ID Cliente" value={s.slice(4, 13)} pos="05–13" />
        {form.mode === 'CLOSED' ? (
          <>
            <Row field="Fecha 1er vto. (AAMMDD)" value={s.slice(13, 19)} pos="14–19" />
            <Row field="Importe 1er vto." value={s.slice(19, 26)} pos="20–26" />
            <Row
              field={`Días al 2do vto. (${form.due1.date && form.due2.date ? daysBetween(form.due1.date, form.due2.date) + ' días' : '—'})`}
              value={s.slice(26, 28)}
              pos="27–28"
            />
            <Row field="Importe 2do vto." value={s.slice(28, 35)} pos="29–35" />
            <Row
              field={`Días al 3er vto. (${form.due2.date && form.due3.date ? daysBetween(form.due2.date, form.due3.date) + ' días' : '—'})`}
              value={s.slice(35, 37)}
              pos="36–37"
            />
            <Row field="Importe 3er vto." value={s.slice(37, 44)} pos="38–44" />
          </>
        ) : (
          <Row field="Relleno ceros (modalidad abierta)" value={s.slice(13, 44)} pos="14–44" />
        )}
        <Row field="ID Convenio" value={s.slice(44, 54)} pos="45–54" />
        <Row field="Dígito verificador 1" value={s.slice(54, 55)} pos="55" highlight />
        <Row field="Dígito verificador 2" value={s.slice(55, 56)} pos="56" highlight />
      </>
    );
  }

  if (result.format === '0449') {
    // 59 digits: 4+9+6+8+2+8+2+8+10+1+1
    return (
      <>
        <Row field="Empresa de servicio" value={s.slice(0, 4)} pos="01–04" />
        <Row field="ID Cliente" value={s.slice(4, 13)} pos="05–13" />
        {form.mode === 'CLOSED' ? (
          <>
            <Row field="Fecha 1er vto. (AAMMDD)" value={s.slice(13, 19)} pos="14–19" />
            <Row field="Importe 1er vto." value={s.slice(19, 27)} pos="20–27" />
            <Row
              field={`Días al 2do vto. (${form.due1.date && form.due2.date ? daysBetween(form.due1.date, form.due2.date) + ' días' : '—'})`}
              value={s.slice(27, 29)}
              pos="28–29"
            />
            <Row field="Importe 2do vto." value={s.slice(29, 37)} pos="30–37" />
            <Row
              field={`Días al 3er vto. (${form.due2.date && form.due3.date ? daysBetween(form.due2.date, form.due3.date) + ' días' : '—'})`}
              value={s.slice(37, 39)}
              pos="38–39"
            />
            <Row field="Importe 3er vto." value={s.slice(39, 47)} pos="40–47" />
          </>
        ) : (
          <Row field="Relleno ceros (modalidad abierta)" value={s.slice(13, 47)} pos="14–47" />
        )}
        <Row field="ID Convenio" value={s.slice(47, 57)} pos="48–57" />
        <Row field="Dígito verificador 1" value={s.slice(57, 58)} pos="58" highlight />
        <Row field="Dígito verificador 2" value={s.slice(58, 59)} pos="59" highlight />
      </>
    );
  }

  if (result.format === '0448') {
    // 59 digits: 4+15+6+10+2+10+10+1+1
    return (
      <>
        <Row field="Empresa de servicio" value={s.slice(0, 4)} pos="01–04" />
        <Row field="ID Cliente" value={s.slice(4, 19)} pos="05–19" />
        {form.mode === 'CLOSED' ? (
          <>
            <Row field="Fecha 1er vto. (AAMMDD)" value={s.slice(19, 25)} pos="20–25" />
            <Row field="Importe 1er vto." value={s.slice(25, 35)} pos="26–35" />
            <Row
              field={`Días al 2do vto. (${form.due1.date && form.due2.date ? daysBetween(form.due1.date, form.due2.date) + ' días' : '—'})`}
              value={s.slice(35, 37)}
              pos="36–37"
            />
            <Row field="Importe 2do vto." value={s.slice(37, 47)} pos="38–47" />
          </>
        ) : (
          <Row field="Relleno ceros (modalidad abierta)" value={s.slice(19, 47)} pos="20–47" />
        )}
        <Row field="ID Convenio" value={s.slice(47, 57)} pos="48–57" />
        <Row field="Dígito verificador 1" value={s.slice(57, 58)} pos="58" highlight />
        <Row field="Dígito verificador 2" value={s.slice(58, 59)} pos="59" highlight />
      </>
    );
  }

  return null;
}
