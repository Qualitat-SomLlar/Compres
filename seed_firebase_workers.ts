import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: "json" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

const data = [
  { workerNumber: 1, name: "ELENA LOPEZ CASTRO", gender: "Femení", email: "elopez@somllar.cat" },
  { workerNumber: 4, name: "CAROLINA PALLAS COMPTE", gender: "Femení", email: "cpallas@somllar.cat" },
  { workerNumber: 2, name: "SILVIA LAPORTA IZQUIERDO", gender: "Femení", email: "slaporta@somllar.cat" },
  { workerNumber: 156, name: "ALFREDO FREIXAS RICART", gender: "Masculí", email: "inclusiol3_1@somllar.cat" },
  { workerNumber: 157, name: "ANDONI BILBAO POLO", gender: "Masculí", email: "inclusiol3_3@somllar.cat" },
  { workerNumber: 176, name: "JOSE GUILLERMO RAMIREZ PEÑA", gender: "Masculí", email: "jramirez@somllar.cat" },
  { workerNumber: 80, name: "MONTSERRAT SANCHEZ VELASCO", gender: "Femení", email: "msanchez@somllar.cat" },
  { workerNumber: 97, name: "MARIA OLMOS RUEDA", gender: "Femení", email: "ResPIRbarcelones@somllar.cat" },
  { workerNumber: 112, name: "JULIA ESPADA SILES", gender: "Femení", email: "AlibeiDir@somllar.cat" },
  { workerNumber: 123, name: "JOSELYNE FERNANDA ORTEGA LLENERA", gender: "Femení", email: "habitatges@somllar.cat" },
  { workerNumber: 128, name: "CAROLINA HERRERA GOMEZ", gender: "Femení", email: "justificacions@somllar.cat" },
  { workerNumber: 135, name: "ANNA JUANOLA VAN KEIZERSWAARD", gender: "Femení", email: "respsocialgi@somllar.cat" },
  { workerNumber: 141, name: "JENNIFER TORTOSA MESTRES", gender: "Femení", email: "tec.genere@somllar.cat" },
  { workerNumber: 142, name: "LAURA GAZQUEZ TOLEDO", gender: "Femení", email: "comunicacio@somllar.cat" },
  { workerNumber: 144, name: "PATRICIA GOMEZ FERNANDEZ", gender: "Femení", email: "aprop4@somllar.cat" },
  { workerNumber: 147, name: "ARIAM MAYOR MAGDALENA", gender: "Masculí", email: "amayor@somllar.cat" },
  { workerNumber: 151, name: "ANA MARIA HERNANDEZ TURNE", gender: "Femení", email: "nausica2@somllar.cat" },
  { workerNumber: 155, name: "SANDRA MEMBRIELA CARRO", gender: "Femení", email: "nes3@somllar.cat" },
  { workerNumber: 165, name: "CRISTINA PEREZ DELGADO", gender: "Femení", email: "inclusiol3_4@somllar.cat" },
  { workerNumber: 212, name: "MARTA DEL RIO DIAZ DE LIAÑO", gender: "Femení", email: "direccio@somllar.cat" },
  { workerNumber: 172, name: "LLUIS MAS ALCAZAR", gender: "Masculí", email: "coordtransversals@somllar.cat" },
  { workerNumber: 180, name: "SILVIA MOYA MALAPEIRA", gender: "Femení", email: "alibeipsicologa@somllar.cat" },
  { workerNumber: 184, name: "INGRID ALEJANDRA KRAUSS MILLAN", gender: "Femení", email: "resptecnicagi@somllar.cat" },
  { workerNumber: 187, name: "LAURA MEDINA RASO", gender: "Femení", email: "slltrr_r2@somllar.cat" },
  { workerNumber: 188, name: "ARIADNA TARROS CASAS", gender: "Femení", email: "aprop3@somllar.cat" },
  { workerNumber: 196, name: "MANUELA ALVAREZ OUTUMURO", gender: "Femení", email: "suporteco@somllar.cat" },
  { workerNumber: 199, name: "CELSO PEREZ GRAÑA", gender: "Masculí", email: "apropdir@somllar.cat" },
  { workerNumber: 203, name: "JULIO CESAR CARMONA RODRIGUEZ", gender: "Masculí", email: "digitics@somllar.cat" },
  { workerNumber: 205, name: "BERNADETTE RICART PENA", gender: "Femení", email: "SLLTRR_R3@somllar.cat" },
  { workerNumber: 209, name: "LORENA PARRA CABEZAS", gender: "Femení", email: "desfentnusos1@somllar.cat" },
  { workerNumber: 214, name: "JOAN OLMO GUTIERREZ", gender: "Masculí", email: "aprop1@somllar.cat" },
  { workerNumber: 215, name: "ANA CANUTO OLIVARES", gender: "Femení", email: "aprop2@somllar.cat" },
  { workerNumber: 225, name: "MARIA MESTRE GONZÁLEZ", gender: "Femení", email: "inclusiol3_5@somllar.cat" },
  { workerNumber: 227, name: "RUBÉN CALVENTOS GARCIA", gender: "Masculí", email: "essencial_terrassa2@somllar.cat" },
  { workerNumber: 231, name: "EVELYN ABIGAIL SANCÁN MOSQUERA", gender: "Femení", email: "administracioterrassa@somllar.cat" },
  { workerNumber: 230, name: "NOEMI DE ALDECOA IBAÑEZ", gender: "Femení", email: "nausica@somllar.cat" },
  { workerNumber: 239, name: "ESTHER GARCÍA SALVADOR", gender: "Femení", email: "alibeieduc@somllar.cat" },
  { workerNumber: 240, name: "RUBÉN ANGLÈS REGOS", gender: "Masculí", email: "desfentnusos@somllar.cat" },
  { workerNumber: 242, name: "EVA PIERA CANO", gender: "Femení", email: "epiera@somllar.cat" },
  { workerNumber: 245, name: "JUDIT PARRA CANALS", gender: "Femení", email: "inclusiol3_2@somllar.cat" },
  { workerNumber: 244, name: "ARIADNA FOLCH CASAHUGA", gender: "Femení", email: "tecgenere1@somllar.cat" },
  { workerNumber: 254, name: "AIDA GARCIA ALBA", gender: "Femení", email: "suportjustif@somllar.cat" },
  { workerNumber: 253, name: "AURA VIGUERA SOLER", gender: "Femení", email: "alibeidinam2@somllar.cat" },
  { workerNumber: 259, name: "SARA ALCALA JEREZ", gender: "Femení", email: "talentstrrs@somllar.cat" },
  { workerNumber: 267, name: "MARIA VICTORIA TINTO RIERA", gender: "Femení", email: "assessorament@somllar.cat" },
  { workerNumber: 269, name: "RAÚL OROZCO FERNANDEZ", gender: "Masculí", email: "secretariadq@somllar.cat" },
  { workerNumber: 270, name: "NORMA LIZETH MADRID GOMEZ", gender: "Femení", email: "pirterrassa1@somllar.cat" },
  { workerNumber: 272, name: "MELINA GONZALEZ LINARES", gender: "Femení", email: "him@somllar.cat" },
  { workerNumber: 274, name: "VANESA HASBÚN", gender: "Femení", email: "intermediacio2@somllar.cat" },
  { workerNumber: 278, name: "VANESSA SENDRÓS FERNÁNDEZ", gender: "Femení", email: "tecpersones@somllar.cat" },
  { workerNumber: 280, name: "MÓNICA ABIÁN RUIZ", gender: "Femení", email: "respgenere@somllar.cat" },
  { workerNumber: 282, name: "CARMEN NAVARRO FUENTES", gender: "Femení", email: "desfentnusosbcn@somllar.cat" },
  { workerNumber: 284, name: "ROBERT LÓPEZ RABELO", gender: "Masculí", email: "rlrabelo@somllar.cat" },
  { workerNumber: 285, name: "MARTA CLAVERIA LOPEZ", gender: "Femení", email: "prospectora_maisvo@somllar.cat" },
  { workerNumber: 287, name: "JAMILA ALBEROLA VIZCAÍNO", gender: "Femení", email: "orientadora_maisprat@somllar.cat" },
  { workerNumber: 291, name: "GLORIA FERNÁNDEZ MONTANER", gender: "Femení", email: "alibeidinam1@somllar.cat" },
  { workerNumber: 292, name: "NEUS NAVARRO RODRIGUEZ", gender: "Femení", email: "tec.recerca@somllar.cat" },
  { workerNumber: 293, name: "JÚLIA CASTELLÓ ANTA", gender: "Femení", email: "tcomunicacio@somllar.cat" },
  { workerNumber: 294, name: "PAULA SERRASOLSAS VALLS", gender: "Femení", email: "orientadora_hl@somllar.cat" },
  { workerNumber: 295, name: "ADRIAN NORIEGA TAMARAL", gender: "Masculí", email: "orientacio_st@somllar.cat" },
  { workerNumber: 297, name: "KHADIJA TAGHI ABOUZRA", gender: "Femení", email: "mais_terrassa1@somllar.cat" },
  { workerNumber: 300, name: "ALBA PRAT MARTINEZ", gender: "Femení", email: "integrasat.prat@somllar.cat" },
  { workerNumber: 301, name: "VIOLETA MÉNDEZ GARAU", gender: "Femení", email: "nes2@somllar.cat" },
  { workerNumber: 304, name: "YOHANNY JOSELIN SALAS CHIRINOS", gender: "Femení", email: "suport2admgi@somllar.cat" },
  { workerNumber: 305, name: "GLANY YATDANELYS ROMERO MORALES", gender: "Femení", email: "suport1admgi@somllar.cat" },
  { workerNumber: 306, name: "KARINA BEATRIZ SANTIVAÑEZ ROMAN", gender: "Femení", email: "admingeneral25@somllar.cat" },
  { workerNumber: 307, name: "ISABEL MARTIN HERMOSIN", gender: "Femení", email: "imartin@somllar.cat" },
  { workerNumber: 308, name: "KAREN DAYANA LARGO ARROYAVE", gender: "Femení", email: "admingeneral26@somllar.cat" },
  { workerNumber: 310, name: "MARISOL NDOMI IYANGA", gender: "Femení", email: "auxiliarneteja_bcn@somllar.cat" },
  { workerNumber: 311, name: "TANIA CELINA LIMA GUARDADO", gender: "Femení", email: "recepcioBCN@somllar.cat" },
  { workerNumber: 309, name: "TATIANA LUKINA", gender: "Femení", email: "suport3admgi@somllar.cat" },
  { workerNumber: 314, name: "MALAK EL MALTI GHARRASSI", gender: "Femení", email: "mais_terrassa2@somllar.cat" },
  { workerNumber: 312, name: "ELIZABETH DUARTE CAMPOS", gender: "Femení", email: "auxiliarneteja_terrassa@somllar.cat" },
  { workerNumber: 315, name: "GLORIA PARDO TORRELLA", gender: "Femení", email: "curscatala_sc@somllar.cat" },
  { workerNumber: 317, name: "NOELIA MUÑOZ ORANTES", gender: "Femení", email: "educsat.prat@somllar.cat" },
  { workerNumber: 318, name: "PAULA ZAMORA I ARBÒS", gender: "Femení", email: "mediacio.habitatge@somllar.cat" },
  { workerNumber: 319, name: "HAMZA EL HORMI EL HORMI", gender: "Masculí", email: "nausica4@somllar.cat" },
  { workerNumber: 320, name: "JUDIT BURNIOL GOMEZ", gender: "Femení", email: "nausica5@somllar.cat" },
  { workerNumber: 321, name: "(ALEX) SOFÍA GUIOT OLIVARES", gender: "Femení", email: "tfamiliargenere1@somllar.cat" }
];

async function run() {
  const collectionRef = collection(db, 'workers');
  
  // Clear existing
  const existing = await getDocs(collectionRef);
  const deleteBatch = writeBatch(db);
  existing.docs.forEach(d => {
    deleteBatch.delete(d.ref);
  });
  if (existing.docs.length > 0) {
    await deleteBatch.commit();
  }

  // Insert new
  const addBatch = writeBatch(db);
  for (const w of data) {
    const docRef = doc(collectionRef);
    addBatch.set(docRef, {
      workerNumber: w.workerNumber,
      name: w.name,
      gender: w.gender,
      email: w.email,
      sede: 'Pendent',
      area: 'Pendent',
      createdAt: new Date().toISOString()
    });
  }
  await addBatch.commit();
  console.log("Successfully seeded Firebase workers.");
}

run();
