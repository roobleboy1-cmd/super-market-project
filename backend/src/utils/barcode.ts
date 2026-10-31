export interface BarcodeLabelData {
  productName: string;
  sku: string;
  barcode: string;
  price: number;
  currency: string;
  categoryName?: string;
}

export function generateBarcodeLabelSvg(data: BarcodeLabelData): string {
  // Generates a standard SVG printable barcode label
  const { productName, sku, barcode, price, currency } = data;
  
  // Basic mock bar pattern based on barcode chars for SVG rendering
  let bars = '';
  let x = 20;
  for (let i = 0; i < barcode.length; i++) {
    const charCode = barcode.charCodeAt(i);
    const width = (charCode % 3) + 1.5;
    const isBar = i % 2 === 0 || charCode % 2 === 0;
    if (isBar) {
      bars += `<rect x="${x}" y="35" width="${width}" height="40" fill="#000000" />\n`;
    }
    x += width + 1.5;
  }

  const svgWidth = Math.max(x + 20, 240);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="110" viewBox="0 0 ${svgWidth} 110" style="background:#ffffff; border:1px dashed #ccc; font-family:sans-serif;">
  <text x="${svgWidth / 2}" y="16" font-size="12" font-weight="bold" text-anchor="middle" fill="#111">${escapeXml(productName.substring(0, 28))}</text>
  <text x="${svgWidth / 2}" y="30" font-size="10" text-anchor="middle" fill="#555">SKU: ${escapeXml(sku)}</text>
  <g>${bars}</g>
  <text x="${svgWidth / 2}" y="88" font-size="11" font-family="monospace" letter-spacing="2" text-anchor="middle" fill="#000">${escapeXml(barcode)}</text>
  <text x="${svgWidth / 2}" y="103" font-size="13" font-weight="bold" text-anchor="middle" fill="#008000">${currency} ${price.toFixed(2)}</text>
</svg>
  `.trim();
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
