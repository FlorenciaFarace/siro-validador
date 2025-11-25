'use client';

import { useState } from 'react';
import FileUpload from '@/components/FileUpload';

export default function RenditionsTab() {
  const [format, setFormat] = useState<string>('');
  const [channels, setChannels] = useState<string[]>([]);
  const [bpcQuotas, setBpcQuotas] = useState<string[]>([]);
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [onlinePayments, setOnlinePayments] = useState<boolean>(false);
  const [uploaded, setUploaded] = useState<{ file: File; content: string; uploadedAt: Date } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string>('');
  const [brandSendDate, setBrandSendDate] = useState<string>('');
  const [isChannelsOpen, setIsChannelsOpen] = useState<boolean>(false);
  const [barcode, setBarcode] = useState<string>('');
  const [firstDueDate, setFirstDueDate] = useState<string>('');

  // Helpers
  const padLeft = (s: string, len: number, ch: string) => (s ?? '').toString().padStart(len, ch);
  const padRight = (s: string, len: number, ch: string) => (s ?? '').toString().padEnd(len, ch);
  const onlyDigits = (s: string) => (s ?? '').replace(/\D+/g, '');
  const fmtDate = (s: string) => {
    if (!s) return '00000000';
    // Accept YYYY-MM-DD, DD/MM/YYYY, YYYYMMDD
    const clean = s.includes('-') ? s.replace(/-/g, '') : s.includes('/') ? s.split('/').reverse().join('') : s;
    return padLeft(clean.slice(0, 8), 8, '0');
  };
  const extractFirstDueDate = (content?: string) => {
    if (!content) return '';
    const lines = content.split(/\r?\n/).filter((l) => l.trim() !== '');
    if (lines.length === 0) return '';
    // 1) Intentar formato FULL: primer detalle tipo 5 de 280 caracteres
    const fullDetail = lines.find((l) => l.length === 280 && l[0] === '5');
    if (fullDetail) {
      // Full: positions 42-49 (1-indexed) => indexes 41..49 (8 chars)
      if (fullDetail.length >= 49) {
        const candidate = fullDetail.slice(41, 49);
        if (/^\d{8}$/.test(candidate)) return candidate;
        // Fallback: buscar el primer bloque de 8 dígitos que parezca AAAAMMDD (año 19xx/20xx)
        const m = fullDetail.match(/\d{8}/g);
        if (m) {
          const hit = m.find((d) => /^(19|20)\d{6}$/.test(d));
          if (hit) return hit;
        }
      }
    }

    // 2) Intentar formato BÁSICO: primer detalle tipo 1 de 131 caracteres
    const basicDetail = lines.find((l) => l.length === 131 && l[0] === '1');
    if (basicDetail) {
      // Formato básico: 6 dígitos YYMMDD en posiciones 28-33 (1-based) => substring(27, 33)
      const candidate6 = basicDetail.substring(27, 33);
      if (/^\d{6}$/.test(candidate6)) {
        const yy = parseInt(candidate6.slice(0, 2), 10);
        const mm = candidate6.slice(2, 4);
        const dd = candidate6.slice(4, 6);
        const fullYear = yy >= 50 ? 1900 + yy : 2000 + yy;
        return `${fullYear}${mm}${dd}`;
      }
      // En caso de futuras variantes con 8 dígitos AAAAMMDD en las mismas zonas, usar el primer bloque válido
      const m = basicDetail.match(/\d{8}/g);
      if (m) {
        const hit = m.find((d) => /^(19|20)\d{6}$/.test(d));
        if (hit) return hit;
      }
    }

    // 3) Fallback general: buscar cualquier bloque AAAAMMDD en todo el archivo
    const mGlobal = content.match(/\d{8}/g);
    if (mGlobal) {
      const hit = mGlobal.find((d) => /^(19|20)\d{6}$/.test(d));
      if (hit) return hit;
    }

    return '';
  };
  const addDaysYYYYMMDD = (yyyymmdd: string, days: number) => {
    if (!/^[0-9]{8}$/.test(yyyymmdd)) return yyyymmdd;
    const y = parseInt(yyyymmdd.slice(0, 4), 10);
    const m = parseInt(yyyymmdd.slice(4, 6), 10) - 1;
    const d = parseInt(yyyymmdd.slice(6, 8), 10);
    const dt = new Date(Date.UTC(y, m, d));
    dt.setUTCDate(dt.getUTCDate() + days);
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
  };
  const fmtAmount11 = (value: string | number) => {
    const n = typeof value === 'number' ? value : parseFloat((value ?? '0').toString().replace(',', '.'));
    const cents = Math.round((isNaN(n) ? 0 : n) * 100);
    return padLeft(String(cents), 11, '0');
  };
  const randomDigits = (len: number) => {
    let s = '';
    while (s.length < len) {
      s += Math.floor(Math.random() * 10).toString();
    }
    return s.slice(0, len);
  };
  const randomHex = (len: number) => {
    const chars = '0123456789abcdef';
    let s = '';
    while (s.length < len) {
      s += chars[Math.floor(Math.random() * chars.length)];
    }
    return s.slice(0, len);
  };
  const genPaymentId10 = (used: Set<string>) => {
    let id = '';
    let safety = 0;
    do {
      // combinar tiempo + aleatorio y tomar últimos 10 dígitos
      const base = `${Date.now()}${Math.floor(Math.random() * 1e9)}`;
      id = base.replace(/\D/g, '').slice(-10);
      if (id.length < 10) {
        id = (id + randomDigits(10)).slice(-10);
      }
      safety++;
    } while (used.has(id) && safety < 1000);
    used.add(id);
    return id;
  };
  const isCash = (c: string) => ['PF', 'RP', 'PP', 'CE', 'BM', 'BR','ASJ'].includes(c);
  const isCashChannelActive = () => channels.some((c) => isCash(c));
  const parseDebtBaseDetail = () => {
    if (!uploaded?.content) return null;
    const lines = uploaded.content.split(/\r?\n/).filter((l) => l.trim() !== '');

    const full = lines.find((l) => l.length === 280 && l[0] === '5');
    if (full) {
      return {
        mode: 'FULL' as const,
        line: full,
      };
    }

    const basic = lines.find((l) => l.length === 131 && l[0] === '1');
    if (basic) {
      return {
        mode: 'BASIC' as const,
        line: basic,
      };
    }

    return null;
  };
  const normalizeAmount = (value: string, len: number) => {
    const digits = onlyDigits(value || '');
    if (!digits) return padLeft('', len, '0');
    if (digits.length > len) return digits.slice(-len);
    return padLeft(digits, len, '0');
  };
  const parseYYYYMMDDFromDebt = (raw: string, mode: 'FULL' | 'BASIC') => {
    const digits = onlyDigits(raw || '');
    if (!digits) return '';
    if (mode === 'FULL') {
      if (digits.length < 8) return '';
      return digits.slice(0, 8);
    }
    if (digits.length < 6) return '';
    const yy = parseInt(digits.slice(0, 2), 10);
    const mm = digits.slice(2, 4);
    const dd = digits.slice(4, 6);
    if (isNaN(yy)) return '';
    const fullYear = yy >= 50 ? 1900 + yy : 2000 + yy;
    return `${fullYear}${mm}${dd}`;
  };
  const toYYMMDD = (yyyymmdd: string) => {
    if (!/^[0-9]{8}$/.test(yyyymmdd)) return '000000';
    return yyyymmdd.slice(2, 8);
  };
  const daysBetween = (fromYyyymmdd: string, toYyyymmdd: string) => {
    if (!/^[0-9]{8}$/.test(fromYyyymmdd) || !/^[0-9]{8}$/.test(toYyyymmdd)) return '00';
    const fy = parseInt(fromYyyymmdd.slice(0, 4), 10);
    const fm = parseInt(fromYyyymmdd.slice(4, 6), 10) - 1;
    const fd = parseInt(fromYyyymmdd.slice(6, 8), 10);
    const ty = parseInt(toYyyymmdd.slice(0, 4), 10);
    const tm = parseInt(toYyyymmdd.slice(4, 6), 10) - 1;
    const td = parseInt(toYyyymmdd.slice(6, 8), 10);
    const from = Date.UTC(fy, fm, fd);
    const to = Date.UTC(ty, tm, td);
    if (isNaN(from) || isNaN(to)) return '00';
    const diffDays = Math.max(0, Math.round((to - from) / (1000 * 60 * 60 * 24)));
    const s = String(diffDays);
    return padLeft(s.length > 2 ? s.slice(-2) : s, 2, '0');
  };
  const buildUnifiedBarcode = (opts: { channel: string; userBarcode?: string }) => {
    const ch = (opts.channel || '').slice(0, 3);

    if (isCash(ch)) {
      const digits = onlyDigits(opts.userBarcode || '');
      const trimmed = digits.slice(0, 59);
      return padRight(trimmed, 59, '0');
    }

    const parsed = parseDebtBaseDetail();
    if (!parsed) {
      const digits = onlyDigits(opts.userBarcode || '');
      const trimmed = digits.slice(0, 59);
      return padRight(trimmed, 59, '0');
    }

    const { mode, line } = parsed;

    const getSlice = (start: number, end: number) => line.slice(start - 1, end);

    const idUsuarioRaw = mode === 'FULL' ? getSlice(2, 10) : getSlice(9, 17);
    const idCuentaRaw = mode === 'FULL' ? getSlice(11, 20) : getSlice(18, 27);

    const f1Raw = mode === 'FULL' ? getSlice(42, 49) : getSlice(28, 33);
    const f2Raw = mode === 'FULL' ? getSlice(61, 68) : getSlice(46, 51);
    const f3Raw = mode === 'FULL' ? getSlice(80, 87) : getSlice(64, 69);

    const imp1Raw = mode === 'FULL' ? getSlice(50, 60) : getSlice(34, 45);
    const imp2Raw = mode === 'FULL' ? getSlice(69, 79) : getSlice(52, 63);
    const imp3Raw = mode === 'FULL' ? getSlice(88, 98) : getSlice(70, 81);

    const idUsuario = padLeft(onlyDigits(idUsuarioRaw).slice(-9), 9, '0');
    const idCuenta = padLeft(onlyDigits(idCuentaRaw).slice(-10), 10, '0');

    const f1Y = parseYYYYMMDDFromDebt(f1Raw, mode);
    const f2Y = parseYYYYMMDDFromDebt(f2Raw, mode);
    const f3Y = parseYYYYMMDDFromDebt(f3Raw, mode);

    const fecha1 = f1Y ? toYYMMDD(f1Y) : '000000';
    const dias2 = f1Y && f2Y ? daysBetween(f1Y, f2Y) : '00';
    const dias3 = f2Y && f3Y ? daysBetween(f2Y, f3Y) : '00';

    const use0449 = Math.random() < 0.5;

    if (use0449) {
      const imp1 = normalizeAmount(imp1Raw, 8);
      const imp2 = normalizeAmount(imp2Raw, 8);
      const imp3 = normalizeAmount(imp3Raw, 8);

      const emp = '0449';
      const dv1 = '0';
      const dv2 = '0';

      const barra = [
        emp,
        idUsuario,
        fecha1,
        imp1,
        dias2,
        imp2,
        dias3,
        imp3,
        idCuenta,
        dv1,
        dv2,
      ].join('');

      return barra.length === 59 ? barra : padRight(barra.slice(0, 59), 59, '0');
    }

    const imp1 = normalizeAmount(imp1Raw, 7);
    const imp2 = normalizeAmount(imp2Raw, 7);
    const imp3 = normalizeAmount(imp3Raw, 7);

    const emp = '0447';
    const dv1 = '0';
    const dv2 = '0';

    const barra56 = [
      emp,
      idUsuario,
      fecha1,
      imp1,
      dias2,
      imp2,
      dias3,
      imp3,
      idCuenta,
      dv1,
      dv2,
    ].join('');

    const head = barra56.slice(0, 44);
    const tail = barra56.slice(44);
    const barra59 = head + '000' + tail;

    return barra59.length === 59 ? barra59 : padRight(barra59.slice(0, 59), 59, '0');
  };
  const toggleChannel = (channel: string, checked: boolean) => {
    setChannels((prev) => {
      let next = [...prev];

      const add = (c: string) => {
        if (!next.includes(c)) next.push(c);
      };
      const remove = (c: string) => {
        next = next.filter((x) => x !== c);
      };

      if (checked) {
        add(channel);
        if (channel === 'LKV') add('LKO');
        if (channel === 'LKO') add('LKV');
        if (channel === 'PCV') add('PCO');
        if (channel === 'PCO') add('PCV');
      } else {
        remove(channel);
        if (channel === 'LKV') remove('LKO');
        if (channel === 'LKO') remove('LKV');
        if (channel === 'PCV') remove('PCO');
        if (channel === 'PCO') remove('PCV');
      }

      return next;
    });
  };
  const computePaymentDate = (ch: string) => {
    if (ch === 'MC' || ch === 'VS') {
      return fmtDate(brandSendDate);
    }
    if (ch === 'DD+') {
      return fmtDate(firstDueDate);
    }
    // TODO: Para DD+ usar primer vencimiento de la base de deuda cuando esté mapeado
    return fmtDate(paymentDate);
  };
  const addBusinessDays = (date: Date, days: number) => {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    let added = 0;
    while (added < days) {
      d.setUTCDate(d.getUTCDate() + 1);
      const day = d.getUTCDay();
      if (day !== 0 && day !== 6) {
        added++;
      }
    }
    return d;
  };
  const addBusinessDaysYYYYMMDD = (yyyymmdd: string, days: number) => {
    if (!/^\d{8}$/.test(yyyymmdd)) return yyyymmdd;
    const y = parseInt(yyyymmdd.slice(0, 4), 10);
    const m = parseInt(yyyymmdd.slice(4, 6), 10) - 1;
    const d = parseInt(yyyymmdd.slice(6, 8), 10);
    const dt = new Date(Date.UTC(y, m, d));
    const res = addBusinessDays(dt, days);
    const yy = res.getUTCFullYear();
    const mm = String(res.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(res.getUTCDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
  };
  const computeAccreditationDays = (ch: string) => {
    const sf = ['CEF', 'RSF', 'FSF', 'ASF', 'PSF']; // Canales sin factura
    if (ch === 'TQR') return 1; // QR
    if (ch === 'DB') return 1; // Debin
    if (ch === 'TI') return 1; // Transferencia Imputada
    if (ch.startsWith('DD')) return 1; // Débito Directo variantes
    if (ch === 'MC' || ch === 'VS') return 10; // Marcas
    if (ch === 'LK' || ch === 'PC') return 3; // CPE principales
    if (ch === 'LKO' || ch === 'PCO') return 3; // Online
    if (ch === 'BPD') return 3; // Botón Débito
    if (isCash(ch) || sf.includes(ch)) return 3; // Efectivo y sin factura
    return 3; // Default provisional
  };
  const buildUnifiedRecord = (opts: { channel: string; barcodeValue?: string; paymentId: string; quotaMode?: '1' | '2-6' }) => {
    const ch = (opts.channel || '').slice(0, 3);
    const fechaPago = computePaymentDate(ch); // 01-08
    const fechaAcred = addBusinessDaysYYYYMMDD(fechaPago, computeAccreditationDays(ch)); // 09-16
    const fecha1erVto = ch === 'TI' ? '19000101' : fmtDate(firstDueDate || paymentDate); // 17-24
    const importePagado = fmtAmount11(0); // 25-35 (placeholder hasta mapear)
    const idUsuario = padLeft('', 8, '0'); // 36-43
    const idConcepto = padLeft('', 1, '0'); // 44
    const codigoBarras = buildUnifiedBarcode({ channel: ch, userBarcode: opts.barcodeValue }); // 45-103

    // Número de comprobante / id de factura desde base de deuda
    let idComprobante = padRight('', 20, ' '); // 104-123
    if (ch === 'TI' || isCash(ch)) {
      // TI y canales en efectivo siempre en ceros
      idComprobante = padLeft('', 20, '0');
    } else if (uploaded?.content) {
      const lines = uploaded.content.split(/\r?\n/).filter((l) => l.trim() !== '');
      let raw = '';
      let mode: 'FULL' | 'BASIC' | null = null;

      const fullDetail = lines.find((l) => l.length === 280 && l[0] === '5');
      if (fullDetail) {
        // FULL: posiciones 21-40 (1-based)
        raw = fullDetail.slice(20, 40);
        mode = 'FULL';
      } else {
        const basicDetail = lines.find((l) => l.length === 131 && l[0] === '1');
        if (basicDetail) {
          // BÁSICO: posiciones 1-5 (1-based)
          raw = basicDetail.slice(0, 5);
          mode = 'BASIC';
        }
      }

      if (mode === 'FULL') {
        idComprobante = padRight(raw.slice(0, 20), 20, ' ');
      } else if (mode === 'BASIC') {
        const digits = (raw || '').replace(/\D+/g, '').slice(-5); // últimos 5 dígitos
        const last5 = padLeft(digits, 5, '0');
        // 104-118 en ceros, 119-123 últimos 5 dígitos
        idComprobante = padLeft('', 15, '0') + last5;
      }
    }
    const canalCobro = padRight(ch, 3, ' '); // 124-126
    const codRechazo = padRight('', 3, ' '); // 127-129
    const descRechazo = padRight('', 20, ' '); // 130-149

    let cuotas = padRight('', 2, ' '); // 150-151
    let tarjeta = padRight('', 15, ' '); // 152-166

    if (ch === 'BPC') {
      if (opts.quotaMode === '2-6') {
        const n = 2 + Math.floor(Math.random() * 5); // 2..6
        cuotas = padLeft(String(n), 2, '0');
        const brands = ['MASTER', 'VISA', 'CABAL'];
        const brand = brands[Math.floor(Math.random() * brands.length)] || '';
        tarjeta = padRight(brand, 15, ' ');
      } else if (opts.quotaMode === '1') {
        cuotas = '01';
        const brands = ['MASTER', 'VISA', 'CABAL'];
        const brand = brands[Math.floor(Math.random() * brands.length)] || '';
        tarjeta = padRight(brand, 15, ' ');
      }
    }
    const filler = padRight('', 60, ' '); // 167-226
    const idPago = padLeft(onlyDigits(opts.paymentId || ''), 10, '0'); // 227-236 (10 dígitos)

    let idResultado = padRight('', 36, ' '); // 237-272
    let idRefOperacion = padRight('', 100, ' '); // 273-372

    const onlineSimChannels = ['TQR', 'DB', 'BPC', 'BPD'];
    const onlineOrAlwaysChannels = ['LKO', 'PCO'];
    if ((onlinePayments && onlineSimChannels.includes(ch)) || onlineOrAlwaysChannels.includes(ch)) {
      const uuidLike = [
        randomHex(8),
        randomHex(4),
        randomHex(4),
        randomHex(4),
        randomHex(12),
      ].join('-');
      idResultado = padRight(uuidLike, 36, ' ');
      idRefOperacion = padRight('EJEMPLO ID REFERENCIA DE OPERACION', 100, ' ');
    }
    let idClienteExt = padRight('', 15, ' '); // 373-387
    if (isCash(ch) && opts.barcodeValue) {
      const digits = onlyDigits(opts.barcodeValue);
      if (digits.startsWith('0448') && digits.length >= 19) {
        const idClienteExtRaw = digits.slice(4, 19); // posiciones 05-19 de la barra 0448
        idClienteExt = padLeft(idClienteExtRaw.slice(-15), 15, '0');
      }
    }
    const nroTerminal = padRight('', 10, ' '); // 388-397
    const reservado = padRight('', 79, ' '); // 398-476

    const record = [
      fechaPago,
      fechaAcred,
      fecha1erVto,
      importePagado,
      idUsuario,
      idConcepto,
      codigoBarras,
      idComprobante,
      canalCobro,
      codRechazo,
      descRechazo,
      cuotas,
      tarjeta,
      filler,
      idPago,
      idResultado,
      idRefOperacion,
      idClienteExt,
      nroTerminal,
      reservado,
    ].join('');
    return record.length === 476 ? record : padRight(record.slice(0, 476), 476, ' ');
  };

  const handleFileUpload = async (data: { file: File; content: string; uploadedAt: Date }) => {
    setUploaded(data);
    setFirstDueDate(extractFirstDueDate(data?.content));
  };

  const handleGenerate = () => {
    setIsProcessing(true);
    try {
      // Generar registros por canal seleccionado (independiente de la cantidad de filas de la base)
      const selected = channels || [];
      const usedIds = new Set<string>();
      const records: string[] = [];

      selected.forEach((ch) => {
        if (ch === 'BPC') {
          const has1 = bpcQuotas.includes('1');
          const has26 = bpcQuotas.includes('2-6');

          if (has1) {
            const paymentId1 = genPaymentId10(usedIds);
            records.push(
              buildUnifiedRecord({
                channel: ch,
                barcodeValue: isCash(ch) ? barcode : '',
                paymentId: paymentId1,
                quotaMode: '1',
              })
            );
          }

          if (has26) {
            const paymentId2 = genPaymentId10(usedIds);
            records.push(
              buildUnifiedRecord({
                channel: ch,
                barcodeValue: isCash(ch) ? barcode : '',
                paymentId: paymentId2,
                quotaMode: '2-6',
              })
            );
          }

          // Si no hay ninguna cuota seleccionada para BPC, no se genera registro
        } else {
          const paymentId = genPaymentId10(usedIds);
          records.push(buildUnifiedRecord({ channel: ch, barcodeValue: isCash(ch) ? barcode : '', paymentId }));
        }
      });
      setPreview(records.join('\n'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!preview) return;
    const blob = new Blob([preview], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rendicion.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[var(--siro-green)] mb-4">Archivos de Rendición</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Complete el formulario para generar archivos de rendición.
        </p>
      </div>

      <form className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
        {/* Row 1: selects */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Formato</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option value="">Seleccione...</option>
              <option value="ESTANDAR">Estándar</option>
              <option value="ALTERNATIVO">Alternativo</option>
              <option value="EXTENDIDO">Extendido</option>
              <option value="INTEGRADO">Integrado</option>
              <option value="UNIFICADO">Unificado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Canales</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsChannelsOpen((o) => !o)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-left"
              >
                {channels.length
                  ? `${channels.length} canal${channels.length > 1 ? 'es' : ''} seleccionado${channels.length > 1 ? 's' : ''}`
                  : 'Seleccione...'}
              </button>
              {isChannelsOpen && (
                <div className="absolute z-10 mt-1 w-full max-h-64 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                  <div className="p-2 space-y-2">
                    {[
                      { v: 'PF', l: 'PF: Pago Fácil' },
                      { v: 'RP', l: 'RP: Rapipago' },
                      { v: 'PP', l: 'PP: Provincia Pagos' },
                      { v: 'CE', l: 'CE: Cobro Express' },
                      { v: 'BM', l: 'BM: Banco Municipal' },
                      { v: 'BR', l: 'BR: Banco de Córdoba' },
                      { v: 'ASJ', l: 'ASJ: Plus Pagos' },
                      { v: 'LK', l: 'LK: Link Pagos' },
                      { v: 'PC', l: 'PC: Pago Mis Cuentas' },
                      { v: 'MC', l: 'MC: Mastercard' },
                      { v: 'VS', l: 'VS: Visa' },
                      { v: 'MCR', l: 'MCR: Mastercard rechazado' },
                      { v: 'VSR', l: 'VSR: Visa rechazado' },
                      { v: 'DD+', l: 'DD+: Débito Directo' },
                      { v: 'DD-', l: 'DD-: Reversión Débito Directo' },
                      { v: 'DDR', l: 'DDR: Rechazo Débito Directo' },
                      { v: 'BPD', l: 'BPD: Botón de Pagos Débito' },
                      { v: 'BPC', l: 'BPC: Botón de Pagos Crédito' },
                      { v: 'BPR', l: 'BPR: Botón de Pagos Rechazado' },
                      { v: 'CEF', l: 'CEF: Cobro Express sin factura' },
                      { v: 'RSF', l: 'RSF: Rapipago sin factura' },
                      { v: 'FSF', l: 'FSF: Pago Fácil sin factura' },
                      { v: 'ASF', l: 'ASF: Plus Pagos sin factura' },
                      { v: 'PSF', l: 'PSF: Bapro sin factura' },
                      { v: 'PCO', l: 'PCO: PC Online' },
                      { v: 'LKO', l: 'LKO: LK Online' },
                      { v: 'PCV', l: 'PCV: Alta de deuda en PMC en Línea' },
                      { v: 'LKV', l: 'LKV: Alta de deuda en LK Pagos en Línea' },
                      { v: 'TI', l: 'TI: Transferencia Imputada' },
                      { v: 'TQR', l: 'TQR: Pago con QR' },
                      { v: 'QRE', l: 'QRE: QR Estático' },
                      { v: 'DB', l: 'DB: Debin' },
                    ].map((opt) => (
                      <div key={opt.v} className="px-1">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            className="form-checkbox text-[var(--siro-green)] mr-2"
                            checked={channels.includes(opt.v)}
                            onChange={(e) => {
                              toggleChannel(opt.v, e.target.checked);
                            }}
                          />
                          <span className="text-sm text-gray-700">{opt.l}</span>
                        </label>
                        {opt.v === 'BPC' && channels.includes('BPC') && (
                          <div className="mt-2 ml-6 border-l border-gray-200 pl-3">
                            <div className="text-xs font-semibold text-gray-600 mb-1">BPC - Cuotas</div>
                            <label className="flex items-center px-1 mb-1">
                              <input
                                type="checkbox"
                                className="form-checkbox text-[var(--siro-green)] mr-2"
                                checked={bpcQuotas.includes('1')}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setBpcQuotas((prev) => {
                                    if (checked) {
                                      return prev.includes('1') ? prev : [...prev, '1'];
                                    }
                                    return prev.filter((q) => q !== '1');
                                  });
                                }}
                              />
                              <span className="text-xs text-gray-700">1 CUOTA</span>
                            </label>
                            <label className="flex items-center px-1">
                              <input
                                type="checkbox"
                                className="form-checkbox text-[var(--siro-green)] mr-2"
                                checked={bpcQuotas.includes('2-6')}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setBpcQuotas((prev) => {
                                    if (checked) {
                                      return prev.includes('2-6') ? prev : [...prev, '2-6'];
                                    }
                                    return prev.filter((q) => q !== '2-6');
                                  });
                                }}
                              />
                              <span className="text-xs text-gray-700">2 a 6 CUOTAS</span>
                            </label>
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        className="text-sm text-[var(--siro-green)] hover:underline"
                        onClick={() => setIsChannelsOpen(false)}
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 1.5: payment date and extra fields */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Pago</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
            {isCashChannelActive() && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Código de barras</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Ingrese código de barras"
                />
              </div>
            )}
            <div className="mt-3">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  className="form-checkbox text-[var(--siro-green)]"
                  checked={onlinePayments}
                  onChange={(e) => setOnlinePayments(e.target.checked)}
                />
                <span className="ml-2">Pagos en línea</span>
              </label>
            </div>
          </div>
          <div>
            {(channels.includes('MC') || channels.includes('VS')) && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Envío a Marcas</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={brandSendDate}
                  onChange={(e) => setBrandSendDate(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
        

        {/* Upload area */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Subir base de deuda</label>
          <div className="w-full">
            <FileUpload onFileUpload={handleFileUpload} isProcessing={isProcessing} />
          </div>
        </div>

        {/* Generate button */}
        <div className="mb-6">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!uploaded || isProcessing || channels.length === 0 || (isCashChannelActive() && !barcode.trim())}
            className={`px-4 py-2 rounded-md text-white text-sm font-medium ${
              !uploaded || isProcessing || channels.length === 0 || (isCashChannelActive() && !barcode.trim())
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-[var(--siro-green)] hover:bg-[#055a2e]'
            }`}
          >
            Generar
          </button>
        </div>

        {/* Preview */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Previsualización</label>
          <textarea
            className="w-full h-32 border border-gray-300 rounded-md p-3"
            value={preview}
            onChange={(e) => setPreview(e.target.value)}
          />
        </div>

        {/* Download */}
        <div className="text-left">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!preview}
            className={`px-4 py-2 rounded-md text-white text-sm font-medium ${
              preview ? 'bg-[var(--siro-green)] hover:bg-[#055a2e]' : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            Descargar
          </button>
        </div>
      </form>
    </div>
  );
}
