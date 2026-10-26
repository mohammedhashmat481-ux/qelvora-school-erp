import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:8000/api';

async function testLargePdfUpload() {
  console.log('🧪 Testing PDF Upload with expanded 150MB limit...\n');

  // 1. Admin login
  const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'admin@school.com',
    password: 'password123'
  });
  const token = loginRes.data.token || loginRes.data.data?.token;
  console.log('✅ Admin logged in.');

  // 2. Generate a valid minimal PDF buffer with padding to simulate >30MB (e.g. 32MB)
  // A valid minimal PDF header and trailer
  console.log('2. Generating a 32MB PDF test file (exceeding old 25MB limit)...');
  const tempPdfPath = path.resolve('services/gateway/scripts/test_large_32mb.pdf');
  
  const pdfHeader = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 50 >>\nstream\nBT /F1 12 Tf 100 700 Td (High Capacity 150MB PDF Document Test) Tj ET\nendstream\nendobj\n');
  const targetSize = 32 * 1024 * 1024; // 32 MB
  const paddingSize = targetSize - pdfHeader.length - 100;
  const padding = Buffer.alloc(paddingSize, '% PADDING FOR LARGE PDF FILE TEST\n');
  const pdfTrailer = Buffer.from('\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000198 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n300\n%%EOF\n');

  const fullPdf = Buffer.concat([pdfHeader, padding, pdfTrailer]);
  fs.writeFileSync(tempPdfPath, fullPdf);
  console.log(`✅ Generated test PDF: ${(fullPdf.length / (1024 * 1024)).toFixed(2)} MB`);

  // 3. Upload to /api/paper/resources/upload
  console.log('3. Uploading 32MB PDF to /api/paper/resources/upload...');
  const form = new FormData();
  form.append('file', fs.createReadStream(tempPdfPath));
  form.append('title', 'Large Textbook Reference 32MB');
  form.append('board', 'CBSE');
  form.append('standard', '10th');
  form.append('subject', 'Physics');
  form.append('documentType', 'textbook');
  form.append('academicYear', '2024-2025');
  form.append('chapters', JSON.stringify(['Electricity', 'Optics']));

  try {
    const uploadRes = await axios.post(`${BASE_URL}/paper/resources/upload`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`
      },
      timeout: 120000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    console.log('✅ Upload succeeded! Response:', uploadRes.data.message);
    console.log('   Resource ID:', uploadRes.data.data?.id);
    console.log('   Stored File Size:', (uploadRes.data.data?.fileSize / (1024 * 1024)).toFixed(2), 'MB');
  } catch (err) {
    console.error('❌ Upload failed:', err.response?.data || err.message);
    throw err;
  } finally {
    if (fs.existsSync(tempPdfPath)) {
      fs.unlinkSync(tempPdfPath);
      console.log('🧹 Cleaned up temporary test file.');
    }
  }

  console.log('\n🎉 150MB UPLOAD SYSTEM TEST PASSED SUCCESSFULLY!');
}

testLargePdfUpload().catch(err => {
  console.error('Fatal error in test:', err);
  process.exit(1);
});
