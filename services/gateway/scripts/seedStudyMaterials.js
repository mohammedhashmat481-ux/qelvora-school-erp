import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';
import { prisma } from '../src/db/prisma.js';
import { extractPdfText, chunkDocumentText } from '../src/lib/pdf/ragService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../uploads/resources');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Helper to generate sample PDF using pdfkit
async function createSamplePdf(fileName, title, pagesText) {
  const filePath = path.join(uploadDir, fileName);
  const doc = new PDFDocument({ margin: 50 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  pagesText.forEach((content, idx) => {
    if (idx > 0) doc.addPage();
    doc.fontSize(16).text(title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(11).text(content, { align: 'left', lineGap: 4 });
  });

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

async function main() {
  console.log('📚 Seeding sample educational study materials & PYQs into Knowledge Library...');

  const sampleMaterials = [
    {
      fileName: 'NCERT_Class_10_Physics_Electricity.pdf',
      title: 'NCERT Class 10 Physics – Chapter 12: Electricity',
      board: 'CBSE',
      standard: '10th',
      subject: 'Physics',
      chapters: ['Electricity'],
      documentType: 'textbook',
      academicYear: '2024-2025',
      pages: [
        `CHAPTER 12: ELECTRICITY\n\n12.1 ELECTRIC CURRENT AND CIRCUIT\nElectric current is expressed by the amount of charge flowing through a particular area in unit time. If a net charge Q, flows across any cross-section of a conductor in time t, then the current I, through the cross-section is I = Q / t. The SI unit of electric charge is coulomb (C), which is equivalent to the charge contained in nearly 6 x 10^18 electrons. The electric current is expressed by a unit called ampere (A), named after the French scientist, Andre-Marie Ampere.\n\n12.2 ELECTRIC POTENTIAL AND POTENTIAL DIFFERENCE\nElectric potential difference between two points in an electric circuit carrying some current is the work done to move a unit charge from one point to the other. Potential difference (V) between two points = Work done (W) / Charge (Q), that is V = W / Q. The SI unit of electric potential difference is volt (V), named after Alessandro Volta. One volt is the potential difference between two points in a current carrying conductor when 1 joule of work is done to move a charge of 1 coulomb from one point to the other.`,
        `12.3 OHM'S LAW AND RESISTANCE\nIn 1827, a German physicist Georg Simon Ohm found out the relationship between the current I, flowing in a metallic wire and the potential difference across its terminals. The potential difference, V, across the ends of a given metallic wire in an electric circuit is directly proportional to the current flowing through it, provided its temperature remains the same. This is called Ohm's law. In other words, V is proportional to I, or V / I = constant = R, where R is a constant for the given metallic wire at a given temperature and is called its resistance. Its SI unit is ohm, represented by the Greek letter Omega.\n\n12.4 RESISTORS IN SERIES AND PARALLEL\nWhen several resistors are joined in series, the total resistance of the combination Rs equals the sum of their individual resistances: Rs = R1 + R2 + R3. The current through each resistor in series is the same, while the total potential difference is equal to the sum of the potential differences across individual resistors. In a parallel combination of resistors, the reciprocal of the equivalent resistance Rp is equal to the sum of the reciprocals of the individual resistances: 1 / Rp = 1 / R1 + 1 / R2 + 1 / R3. The potential difference across each resistor in parallel is identical and equal to the applied voltage.`
      ]
    },
    {
      fileName: 'CBSE_Class_10_Science_2023_Board_PYQ.pdf',
      title: 'CBSE Class 10 Board Exam 2023 – Previous Year Question Paper (Science)',
      board: 'CBSE',
      standard: '10th',
      subject: 'Physics',
      chapters: ['Electricity', 'Light – Reflection and Refraction'],
      documentType: 'previous_year_paper',
      academicYear: '2022-2023',
      pages: [
        `CENTRAL BOARD OF SECONDARY EDUCATION\nALL INDIA SECONDARY SCHOOL EXAMINATION 2023\nSUBJECT: SCIENCE (THEORY)\n\nSECTION A (1 Mark Questions)\nQ1. A cylindrical conductor of length l and uniform area of cross-section A has resistance R. Another conductor of length 2.5 l and resistance 0.5 R of the same material has area of cross-section:\n(a) 5 A  (b) 2.5 A  (c) 0.5 A  (d) 0.2 A\n\nQ2. Assertion (A): The magnetic field lines around a straight current carrying conductor are in the form of concentric circles.\nReason (R): The direction of magnetic field can be found using the Right Hand Thumb Rule.\n(a) Both (A) and (R) are true and (R) is correct explanation of (A).\n(b) Both (A) and (R) are true but (R) is NOT correct explanation of (A).\n(c) (A) is true, (R) is false.  (d) (A) is false, (R) is true.`,
        `SECTION C & D (3 & 5 Mark Questions)\nQ15. State Ohm's law. Draw a labelled circuit diagram to verify Ohm's law in the laboratory. Mention two precautions to be taken during the experiment. [3 Marks]\n\nQ16. (a) Derive an expression for the equivalent resistance of three resistors connected in parallel.\n(b) An electric lamp of 100 ohms, a toaster of resistance 50 ohms, and a water filter of resistance 500 ohms are connected in parallel to a 220 V source. What is the resistance of an electric iron connected to the same source that takes as much current as all three appliances, and what is the current through it? [5 Marks]`
      ]
    },
    {
      fileName: 'NCERT_Class_10_Physics_Light_Refraction.pdf',
      title: 'NCERT Class 10 Physics – Chapter 10: Light – Reflection and Refraction',
      board: 'CBSE',
      standard: '10th',
      subject: 'Physics',
      chapters: ['Light – Reflection and Refraction'],
      documentType: 'textbook',
      academicYear: '2024-2025',
      pages: [
        `CHAPTER 10: LIGHT – REFLECTION AND REFRACTION\n\n10.1 LAWS OF REFLECTION\n1. The angle of incidence is equal to the angle of reflection.\n2. The incident ray, the normal to the mirror at the point of incidence and the reflected ray, all lie in the same plane.\nThese laws of reflection are applicable to all types of reflecting surfaces including spherical surfaces.\n\n10.2 MIRROR FORMULA AND MAGNIFICATION\nIn a spherical mirror, the distance of the object from its pole is called the object distance (u). The distance of the image from the pole of the mirror is called the image distance (v). The distance of the principal focus from the pole is called the focal length (f). There is a relationship between these three quantities given by the mirror formula: 1 / v + 1 / u = 1 / f. Magnification produced by a spherical mirror gives the relative extent to which the image of an object is magnified: m = Height of image (h') / Height of object (h) = - v / u.`,
        `10.3 REFRACTION OF LIGHT AND SNELL'S LAW\nLight does not travel in the same direction in all media. It appears that when travelling obliquely from one medium to another, the direction of propagation of light in the second medium changes. This phenomenon is known as refraction of light.\n\nLAWS OF REFRACTION:\n1. The incident ray, the refracted ray and the normal to the interface of two transparent media at the point of incidence, all lie in the same plane.\n2. The ratio of sine of angle of incidence to the sine of angle of refraction is a constant, for the light of a given colour and for the given pair of media. This law is also known as Snell's law of refraction: sin i / sin r = constant = n21, where n21 is called the refractive index of the second medium with respect to the first medium.`
      ]
    }
  ];

  for (const item of sampleMaterials) {
    const existing = await prisma.questionPaperResource.findFirst({
      where: { title: item.title }
    });

    if (existing) {
      console.log(`✓ Material "${item.title}" already exists. Skipping.`);
      continue;
    }

    const filePath = await createSamplePdf(item.fileName, item.title, item.pages);
    const stats = fs.statSync(filePath);

    // Extract text & chunk
    const parseResult = await extractPdfText(filePath);
    const chunks = chunkDocumentText(parseResult.pages || [], {
      title: item.title,
      chapter: item.chapters.join(', ')
    });

    await prisma.questionPaperResource.create({
      data: {
        title: item.title,
        board: item.board,
        academicYear: item.academicYear,
        standard: item.standard,
        subject: item.subject,
        chapters: item.chapters,
        documentType: item.documentType,
        fileName: item.fileName,
        filePath,
        fileSize: stats.size,
        status: 'processed',
        extractedText: parseResult.fullText,
        chunks,
        uploaderName: 'Academic Curriculum Coordinator',
        metadata: {
          originalName: item.fileName,
          totalChunks: chunks.length
        }
      }
    });

    console.log(`✅ Seeded: "${item.title}" (${chunks.length} chunks indexed)`);
  }

  console.log('🎉 Knowledge Library sample educational materials successfully established!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
