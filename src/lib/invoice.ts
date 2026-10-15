import { format } from 'date-fns';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import { TTD } from './money';
import { supabase } from './supabase';
import type { AppointmentBalance, Client, Payment } from './types';

// Printed at the top of every invoice: change these to the salon's real details
const SALON = { name: 'Your Salon', address: 'Street, Town, Trinidad', phone: '868 000 0000', email: '' };

const esc = (s: string | null | undefined) =>
  (s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
const money = (n: number | string) => TTD(Number(n));
const when = (iso: string) => format(new Date(iso), 'EEE d MMM yyyy, h:mm a');

export const invoiceNumber = (a: Pick<AppointmentBalance, 'id' | 'starts_at'>) =>
  `INV-${format(new Date(a.starts_at), 'yyMMdd')}-${a.id.slice(0, 4).toUpperCase()}`;

function page(title: string, body: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    @page { margin: 18mm; }
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #222; font-size: 12px; }
    .top { display: flex; justify-content: space-between; border-bottom: 3px solid #C2185B; padding-bottom: 12px; }
    .salon { font-size: 20px; font-weight: 700; color: #C2185B; }
    .muted { color: #777; }
    h1 { font-size: 22px; margin: 0; text-align: right; }
    .cols { display: flex; justify-content: space-between; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { text-align: left; background: #FCE4EC; padding: 8px; }
    td { padding: 8px; border-bottom: 1px solid #eee; }
    .r { text-align: right; }
    .totals { margin-left: auto; width: 260px; margin-top: 14px; }
    .totals td { border: none; padding: 4px 8px; }
    .due td { font-weight: 700; font-size: 14px; border-top: 2px solid #222; }
    .paid { color: #2E7D32; font-weight: 700; }
    .foot { margin-top: 36px; text-align: center; color: #777; }
  </style></head><body>${body}<p class="foot">Thank you for visiting ${esc(SALON.name)}!</p></body></html>`;
}

function header(title: string, ref: string) {
  return `<div class="top">
    <div><div class="salon">${esc(SALON.name)}</div>
      <div class="muted">${[SALON.address, SALON.phone, SALON.email].filter(Boolean).map(esc).join('<br>')}</div></div>
    <div><h1>${esc(title)}</h1><div class="muted r">${esc(ref)}<br>Issued ${format(new Date(), 'd MMM yyyy')}</div></div>
  </div>`;
}

const billTo = (c: Pick<Client, 'full_name' | 'phone' | 'email'>) =>
  `<div><b>Bill to</b><br>${esc(c.full_name)}${c.phone ? `<br>${esc(c.phone)}` : ''}${c.email ? `<br>${esc(c.email)}` : ''}</div>`;

export function appointmentInvoiceHtml(a: AppointmentBalance, client: Client, payments: Payment[]) {
  const paid = payments.filter((p) => p.status === 'paid');
  const balance = Math.max(0, Number(a.balance));
  return page(`Invoice ${invoiceNumber(a)} - ${a.client_name}`, `
    ${header('INVOICE', invoiceNumber(a))}
    <div class="cols">${billTo(client)}<div class="r"><b>Appointment</b><br>${when(a.starts_at)}<br>Status: ${esc(a.status)}</div></div>
    <table><tr><th>Service</th><th class="r">Amount</th></tr>
      <tr><td>${esc(a.service_name)}${a.notes ? `<br><span class="muted">${esc(a.notes)}</span>` : ''}</td><td class="r">${money(a.price)}</td></tr>
    </table>
    ${paid.length ? `<table><tr><th>Payment received</th><th>Method</th><th class="r">Amount</th></tr>
      ${paid.map((p) => `<tr><td>${p.paid_at ? when(p.paid_at) : ''}${p.reference ? ` · ${esc(p.reference)}` : ''}</td>
        <td>${esc(p.method)}</td><td class="r">${money(p.amount)}</td></tr>`).join('')}</table>` : ''}
    <table class="totals">
      <tr><td>Total</td><td class="r">${money(a.price)}</td></tr>
      <tr><td>Paid</td><td class="r">${money(a.paid)}</td></tr>
      <tr class="due"><td>Balance due</td><td class="r">${balance > 0 ? money(balance) : '<span class="paid">PAID</span>'}</td></tr>
    </table>`);
}

export function clientStatementHtml(client: Client, visits: AppointmentBalance[]) {
  const rows = visits.filter((v) => v.status !== 'cancelled')
    .sort((x, y) => x.starts_at.localeCompare(y.starts_at));
  const total = rows.reduce((t, v) => t + Number(v.price), 0);
  const paid = rows.reduce((t, v) => t + Number(v.paid), 0);
  const owed = rows.reduce((t, v) => t + Math.max(0, Number(v.balance)), 0);
  return page(`Statement - ${client.full_name}`, `
    ${header('STATEMENT', `Account: ${client.full_name}`)}
    <div class="cols">${billTo(client)}<div class="r"><b>${rows.length} visit${rows.length === 1 ? '' : 's'}</b></div></div>
    <table><tr><th>Date</th><th>Invoice</th><th>Service</th><th class="r">Price</th><th class="r">Paid</th><th class="r">Balance</th></tr>
      ${rows.map((v) => `<tr><td>${format(new Date(v.starts_at), 'd MMM yyyy')}</td><td>${invoiceNumber(v)}</td>
        <td>${esc(v.service_name)}${v.status === 'no_show' ? ' <span class="muted">(no-show)</span>' : ''}</td>
        <td class="r">${money(v.price)}</td><td class="r">${money(v.paid)}</td>
        <td class="r">${Number(v.balance) > 0 ? money(v.balance) : '-'}</td></tr>`).join('')}
    </table>
    <table class="totals">
      <tr><td>Total billed</td><td class="r">${money(total)}</td></tr>
      <tr><td>Total paid</td><td class="r">${money(paid)}</td></tr>
      <tr class="due"><td>Balance due</td><td class="r">${owed > 0 ? money(owed) : '<span class="paid">PAID</span>'}</td></tr>
    </table>`);
}

// Phone: render a PDF and open the share sheet (Save to Files, WhatsApp, email...).
// Browser: open the print dialog for the invoice alone, where "Save as PDF" is an option.
async function savePdf(html: string) {
  if (Platform.OS === 'web') {
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0;';
    document.body.appendChild(frame);
    const doc = frame.contentWindow!.document;
    doc.open(); doc.write(html); doc.close();
    // The page title becomes the suggested PDF file name
    const parentTitle = document.title;
    document.title = doc.title;
    frame.contentWindow!.focus();
    frame.contentWindow!.print();
    document.title = parentTitle;
    setTimeout(() => frame.remove(), 1000);
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Save invoice' });
  } else {
    await Print.printAsync({ uri });
  }
}

export async function shareAppointmentInvoice(appointmentId: string) {
  try {
    const ar = await supabase.from('appointment_balances').select('*').eq('id', appointmentId).single();
    if (ar.error) throw ar.error;
    const a = ar.data as AppointmentBalance;
    const [cr, pr] = await Promise.all([
      supabase.from('clients').select('*').eq('id', a.client_id).single(),
      supabase.from('payments').select('*').eq('appointment_id', appointmentId).order('paid_at'),
    ]);
    if (cr.error) throw cr.error;
    if (pr.error) throw pr.error;
    await savePdf(appointmentInvoiceHtml(a, cr.data as Client, (pr.data as Payment[]) ?? []));
  } catch (e: any) {
    Alert.alert("Couldn't make the invoice", e?.message ?? 'Check your internet connection.');
  }
}

export async function shareClientStatement(client: Client, visits: AppointmentBalance[]) {
  try {
    await savePdf(clientStatementHtml(client, visits));
  } catch (e: any) {
    Alert.alert("Couldn't make the statement", e?.message ?? 'Please try again.');
  }
}
