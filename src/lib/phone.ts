// "868 555 1234" -> "18685551234" for WhatsApp links
export const waNumber = (p: string) => { const d = p.replace(/\D/g, ''); return d.length === 7 ? '1868' + d : d.length === 10 ? '1' + d : d; };

export const waLink = (phone: string, text?: string) =>
  `https://wa.me/${waNumber(phone)}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
