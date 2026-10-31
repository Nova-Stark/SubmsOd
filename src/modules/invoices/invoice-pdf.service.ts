import PDFDocument from 'pdfkit';
import { GenerateInvoicePdfRequest } from './invoice.types';
import { MoneyUtil } from '../../utils/money';

export class InvoicePdfService {
  /**
   * Generates a professional printable PDF for a finalized invoice.
   * Returns a Buffer containing the raw PDF bytes.
   */
  static async generate(data: GenerateInvoicePdfRequest): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
          info: {
            Title: `Invoice ${data.invoiceNumber}`,
            Author: 'Brightloop Subscription Management',
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err: Error) => reject(err));

        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const currency = data.currency || 'INR';

        // ── Header ──
        doc.fontSize(22).font('Helvetica-Bold').text('INVOICE', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica').fillColor('#555555')
          .text('Brightloop Subscription Management', { align: 'center' });
        doc.moveDown(1.5);

        // ── Invoice Metadata ──
        const metaY = doc.y;
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000')
          .text('Invoice Number:', 50, metaY)
          .font('Helvetica').text(data.invoiceNumber, 160, metaY);

        doc.font('Helvetica-Bold').text('Issue Date:', 50, metaY + 18)
          .font('Helvetica').text(data.issueDate, 160, metaY + 18);

        doc.font('Helvetica-Bold').text('Due Date:', 50, metaY + 36)
          .font('Helvetica').text(data.dueDate, 160, metaY + 36);

        // ── Customer Info ──
        doc.font('Helvetica-Bold').text('Bill To:', 350, metaY);
        doc.font('Helvetica').text(data.customer.name, 350, metaY + 18);
        doc.text(data.customer.email, 350, metaY + 36);
        if (data.customer.address) {
          doc.text(data.customer.address, 350, metaY + 54);
        }
        if (data.customer.taxId) {
          doc.text(`Tax ID: ${data.customer.taxId}`, 350, metaY + (data.customer.address ? 72 : 54));
        }

        doc.y = metaY + 100;
        doc.moveDown(1);

        // ── Divider ──
        const divY = doc.y;
        doc.moveTo(50, divY).lineTo(50 + pageWidth, divY).strokeColor('#CCCCCC').stroke();
        doc.moveDown(0.5);

        // ── Table Header ──
        const tableTop = doc.y;
        const colX = {
          item: 50,
          qty: 280,
          unitPrice: 340,
          amount: 440,
        };

        doc.fontSize(9).font('Helvetica-Bold').fillColor('#333333');
        doc.text('ITEM', colX.item, tableTop);
        doc.text('QTY', colX.qty, tableTop);
        doc.text('UNIT PRICE', colX.unitPrice, tableTop);
        doc.text('AMOUNT', colX.amount, tableTop);

        doc.moveDown(0.3);
        const headerLine = doc.y;
        doc.moveTo(50, headerLine).lineTo(50 + pageWidth, headerLine).strokeColor('#CCCCCC').stroke();
        doc.moveDown(0.3);

        // ── Line Items ──
        doc.font('Helvetica').fontSize(9).fillColor('#000000');
        for (const line of data.lines) {
          const y = doc.y;
          doc.text(line.productName, colX.item, y, { width: 220 });
          doc.text(String(line.quantity), colX.qty, y);
          doc.text(MoneyUtil.format(line.unitPrice, currency), colX.unitPrice, y);
          doc.text(MoneyUtil.format(line.lineAmount, currency), colX.amount, y);
          doc.moveDown(0.8);
        }

        // ── Totals Section ──
        doc.moveDown(0.5);
        const totalsLine = doc.y;
        doc.moveTo(50, totalsLine).lineTo(50 + pageWidth, totalsLine).strokeColor('#CCCCCC').stroke();
        doc.moveDown(0.8);

        const labelX = 340;
        const valX = 440;

        doc.font('Helvetica').fontSize(10);
        doc.text('Subtotal:', labelX, doc.y);
        doc.text(MoneyUtil.format(data.subtotal, currency), valX, doc.y - doc.currentLineHeight());
        doc.moveDown(0.5);

        if (data.discountTotal > 0) {
          doc.fillColor('#CC0000').text('Discount:', labelX, doc.y);
          doc.text(`-${MoneyUtil.format(data.discountTotal, currency)}`, valX, doc.y - doc.currentLineHeight());
          doc.fillColor('#000000').moveDown(0.5);
        }

        if (data.taxTotal > 0) {
          doc.text('Tax:', labelX, doc.y);
          doc.text(MoneyUtil.format(data.taxTotal, currency), valX, doc.y - doc.currentLineHeight());
          doc.moveDown(0.5);
        }

        doc.moveDown(0.3);
        const finalLine = doc.y;
        doc.moveTo(labelX - 10, finalLine).lineTo(50 + pageWidth, finalLine).strokeColor('#000000').lineWidth(1.5).stroke();
        doc.moveDown(0.5);

        doc.font('Helvetica-Bold').fontSize(13).fillColor('#000000');
        doc.text('TOTAL:', labelX, doc.y);
        doc.text(MoneyUtil.format(data.finalTotal, currency), valX, doc.y - doc.currentLineHeight());
        doc.moveDown(2);

        // ── Notes ──
        if (data.notes) {
          doc.font('Helvetica-Bold').fontSize(10).text('Notes:', 50, doc.y);
          doc.font('Helvetica').fontSize(9).text(data.notes, 50, doc.y + 2, {
            width: pageWidth,
          });
          doc.moveDown(1);
        }

        // ── Footer ──
        doc.fontSize(8).font('Helvetica').fillColor('#999999')
          .text(
            'Generated by Brightloop Subscription Management System',
            50,
            doc.page.height - 50,
            { align: 'center', width: pageWidth }
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
