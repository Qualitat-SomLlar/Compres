import { jsPDF } from 'jspdf';
import { PurchaseRequest, Quote, Attachment } from '../types';
import { STATUS_LABELS } from '../constants';

export const exportService = {
  /**
   * Genera i descarrega la Filla de Comanda Oficial en format PDF
   */
  generatePurchaseOrderPDF(
    request: PurchaseRequest,
    quotes: Quote[] = [],
    attachments: Attachment[] = []
  ) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryColor = [227, 6, 19]; // Som Llar / Brand red/orange
    const darkColor = [30, 41, 59];
    const lightSlate = [100, 116, 139];

    // Capçalera
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 210, 45, 'F');

    // Títol de l'entitat
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('SOM LLAR', 15, 20);

    doc.setFontSize(9);
    doc.setTextColor(lightSlate[0], lightSlate[1], lightSlate[2]);
    doc.setFont('helvetica', 'normal');
    doc.text("ASSOCIACIÓ SOM LLAR - GESTIÓ INTEGRAL DE COMPRES", 15, 26);
    doc.text("CIF: G-63024823 | www.somllar.cat", 15, 31);

    // Codi d'expedient destacat
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(request.code || request.id, 195, 20, { align: 'right' });

    doc.setFontSize(9);
    doc.setTextColor(lightSlate[0], lightSlate[1], lightSlate[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data d'emissió: ${new Date().toLocaleDateString('ca-ES')}`, 195, 26, { align: 'right' });
    
    const statusLabel = STATUS_LABELS[request.status]?.label || request.status;
    doc.text(`Estat: ${statusLabel.toUpperCase()}`, 195, 31, { align: 'right' });

    // Línia separadora
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(15, 45, 195, 45);

    let currentY = 55;

    // Bloc 1: Dades Generals de la Compra
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text("1. DADES DE L'EXPEDIENT", 15, currentY);

    currentY += 8;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, currentY, 180, 42, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, currentY, 180, 42, 2, 2, 'S');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text("Tècnic/a Sol·licitant:", 20, currentY + 8);
    doc.text("Àrea d'Imputació:", 20, currentY + 16);
    doc.text("Centre de Destí:", 20, currentY + 24);
    doc.text("Codi Analític:", 20, currentY + 32);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(lightSlate[0], lightSlate[1], lightSlate[2]);
    doc.text(request.requestingTechnicianName || request.createdByUserName || 'N/A', 65, currentY + 8);
    doc.text(request.areaName || request.areaId || 'General', 65, currentY + 16);
    doc.text(request.destinationCenterName || 'Sense centre especificat', 65, currentY + 24);
    doc.text(request.analyticCode || 'N/A', 65, currentY + 32);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text("Tipus de Compra:", 115, currentY + 8);
    doc.text("Nivell d'Urgència:", 115, currentY + 16);
    doc.text("Termini Límit:", 115, currentY + 24);
    doc.text("Concurrència:", 115, currentY + 32);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(lightSlate[0], lightSlate[1], lightSlate[2]);
    doc.text((request.purchaseType || 'Bé').toUpperCase(), 155, currentY + 8);
    doc.text(request.urgency.toUpperCase(), 155, currentY + 16);
    doc.text(request.deadline || 'Sense data límit', 155, currentY + 24);
    doc.text(request.requiresThreeQuotes ? 'Obligatori 3 Pressupostos' : 'Directa', 155, currentY + 32);

    currentY += 50;

    // Bloc 2: Descripció del Bé o Servei
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text("2. DESCRIPCIÓ DE LA COMPRA I JUSTIFICACIÓ", 15, currentY);

    currentY += 7;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text("Descripció del material o servei sol·licitat:", 15, currentY);
    
    currentY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    const splitDesc = doc.splitTextToSize(request.itemDescription || 'Sense descripció', 180);
    doc.text(splitDesc, 15, currentY);
    currentY += (splitDesc.length * 4.5) + 4;

    doc.setFont('helvetica', 'bold');
    doc.text("Memòria justificativa de la necessitat:", 15, currentY);
    currentY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(lightSlate[0], lightSlate[1], lightSlate[2]);
    const splitJust = doc.splitTextToSize(request.justification || 'Sense justificació detallada.', 180);
    doc.text(splitJust, 15, currentY);
    currentY += (splitJust.length * 4.5) + 8;

    // Bloc 3: Proveïdor i Condicions Econòmiques
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text("3. ADJUDICACIÓ I VALORACIÓ ECONÒMICA", 15, currentY);

    currentY += 7;
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(15, currentY, 180, 24, 2, 2, 'F');
    doc.setDrawColor(254, 202, 202);
    doc.roundedRect(15, currentY, 180, 24, 2, 2, 'S');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text("Proveïdor Adjudicatari:", 20, currentY + 8);
    doc.text("Import Estimat Inicial:", 20, currentY + 16);

    doc.setFont('helvetica', 'normal');
    doc.text(request.supplierName || 'Pendent d\'adjudicació', 65, currentY + 8);
    doc.text(`${(request.estimatedAmount || 0).toLocaleString('ca-ES')} €`, 65, currentY + 16);

    doc.setFont('helvetica', 'bold');
    doc.text("IMPORT ADJUDICAT:", 120, currentY + 12);
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    const finalVal = request.finalAmount !== undefined ? request.finalAmount : request.estimatedAmount;
    doc.text(`${finalVal.toLocaleString('ca-ES')} €`, 165, currentY + 12);

    currentY += 34;

    // Bloc 4: Signatures i Validesa
    doc.setFontSize(11);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text("4. REGISTRE DIGITAL DE SIGNATURES I CONFORMITAT", 15, currentY);

    currentY += 8;

    // 3 caixes de firma
    const boxWidth = 56;
    const boxHeight = 32;

    // Coordinació
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, currentY, boxWidth, boxHeight, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text("VALIDACIÓ COORDINACIÓ", 18, currentY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(lightSlate[0], lightSlate[1], lightSlate[2]);
    if (request.coordinationApprovedAt) {
      doc.setTextColor(16, 185, 129);
      doc.text("SIGNAT DIGITALMENT", 18, currentY + 14);
      doc.setTextColor(lightSlate[0], lightSlate[1], lightSlate[2]);
      doc.text(`Data: ${new Date(request.coordinationApprovedAt).toLocaleDateString('ca-ES')}`, 18, currentY + 20);
      doc.text("Estat: Conforme", 18, currentY + 25);
    } else {
      doc.text("Pendent de validació", 18, currentY + 18);
    }

    // Direcció d'Àrea
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(77, currentY, boxWidth, boxHeight, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text("DIRECCIÓ D'ÀREA", 80, currentY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(lightSlate[0], lightSlate[1], lightSlate[2]);
    if (request.areaDirectionApprovedAt) {
      doc.setTextColor(16, 185, 129);
      doc.text("SIGNAT DIGITALMENT", 80, currentY + 14);
      doc.setTextColor(lightSlate[0], lightSlate[1], lightSlate[2]);
      doc.text(`Data: ${new Date(request.areaDirectionApprovedAt).toLocaleDateString('ca-ES')}`, 80, currentY + 20);
      doc.text("Estat: Conforme", 80, currentY + 25);
    } else {
      doc.text("Pendent de validació", 80, currentY + 18);
    }

    // Finances
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(139, currentY, boxWidth, boxHeight, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text("ADM I FINANCES", 142, currentY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(lightSlate[0], lightSlate[1], lightSlate[2]);
    if (request.financeApprovedAt) {
      doc.setTextColor(16, 185, 129);
      doc.text("SIGNAT DIGITALMENT", 142, currentY + 14);
      doc.setTextColor(lightSlate[0], lightSlate[1], lightSlate[2]);
      doc.text(`Data: ${new Date(request.financeApprovedAt).toLocaleDateString('ca-ES')}`, 142, currentY + 20);
      doc.text("Estat: Aprovat / Comptabilitzat", 142, currentY + 25);
    } else {
      doc.text("Pendent d'aprovació", 142, currentY + 18);
    }

    // Peu de pàgina
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("Document oficial generat automàticament des del Portal de Compres Som Llar. Propietat de l'Associació Som Llar.", 105, 287, { align: 'center' });

    // Descarregar PDF
    const fileName = `Comanda_${(request.code || request.id).replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    doc.save(fileName);
  },

  /**
   * Exporta un conjunt de sol·licituds a fitxer Excel (.xlsx) per a administració i finances
   */
  async exportRequestsToExcel(requests: PurchaseRequest[], filename = 'Expedients_Compres_Som_Llar.xlsx') {
    const XLSX = await import('xlsx');

    const data = requests.map(r => ({
      'Codi Expedient': r.code || r.id,
      'Data Sol·licitud': r.createdAt ? new Date(r.createdAt).toLocaleDateString('ca-ES') : '',
      'Estat Actual': STATUS_LABELS[r.status]?.label || r.status,
      'Tècnic Sol·licitant': r.requestingTechnicianName || '',
      'Email Sol·licitant': r.requestingTechnicianEmail || r.createdByUserEmail || '',
      'Àrea': r.areaName || r.areaId || '',
      'Centre Destí': r.destinationCenterName || '',
      'Projecte': r.projectId || '',
      'Codi Analític': r.analyticCode || '',
      'Tipus Compra': r.purchaseType || 'be',
      'Descripció': r.itemDescription || '',
      'Import Estimat (€)': r.estimatedAmount || 0,
      'Import Adjudicat (€)': r.finalAmount !== undefined ? r.finalAmount : (r.estimatedAmount || 0),
      'Proveïdor Adjudicat': r.supplierName || '',
      'Urgència': r.urgency || 'mitjana',
      'Termini': r.deadline || '',
      'Validació Coordinació': r.coordinationApprovedAt ? new Date(r.coordinationApprovedAt).toLocaleDateString('ca-ES') : 'Pendent',
      'Validació Direcció': r.areaDirectionApprovedAt ? new Date(r.areaDirectionApprovedAt).toLocaleDateString('ca-ES') : 'Pendent',
      'Aprovació Finances': r.financeApprovedAt ? new Date(r.financeApprovedAt).toLocaleDateString('ca-ES') : 'Pendent',
      'Data Recepció': r.receivedAt ? new Date(r.receivedAt).toLocaleDateString('ca-ES') : '',
      'Data Tancament': r.closedAt ? new Date(r.closedAt).toLocaleDateString('ca-ES') : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Expedients');

    // Ajust automàtic de columnes
    const colWidths = Object.keys(data[0] || {}).map(k => ({ wch: Math.max(k.length + 2, 14) }));
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, filename);
  }
};
