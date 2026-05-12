import * as XLSX from 'xlsx';

export const importExportService = {
  /**
   * Genera i descarrega una plantilla Excel per a una entitat específica.
   */
  downloadTemplate(entityType: string) {
    let headers: string[] = [];
    let fileName = '';

    switch (entityType) {
      case 'supplier':
        headers = ['Nom', 'NIF', 'Email', 'Telèfon', 'Persona de Contacte', 'Categoria', 'Adreça', 'Ciutat', 'Estat', 'Homologat'];
        fileName = 'plantilla_proveidors.xlsx';
        break;
      case 'worker':
        headers = ['Nom', 'Cognoms', 'Email', 'Àrea', 'Rol Intern', 'Rol Flux', 'Actiu', 'Notificacions'];
        fileName = 'plantilla_treballadors.xlsx';
        break;
      case 'center':
        headers = ['Nom', 'Codi', 'Tipus', 'Adreça', 'Ciutat', 'Àrea', 'Actiu'];
        fileName = 'plantilla_centres.xlsx';
        break;
      case 'analyticCode':
        headers = ['Codi Analític', 'Descripció', 'Projecte', 'Àrea', 'Actiu'];
        fileName = 'plantilla_codis_analitics.xlsx';
        break;
    }

    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
    XLSX.writeFile(wb, fileName);
  },

  /**
   * Processa un fitxer Excel pujat.
   */
  async processFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * Exporta dades a CSV.
   */
  exportToCSV(data: any[], fileName: string) {
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName.endsWith('.csv') ? fileName : `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Exporta dades a XLSX.
   */
  exportToExcel(data: any[], fileName: string) {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dades');
    XLSX.writeFile(wb, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
  }
};
