/**
 * Convert basic markdown strings to HTML safely.
 * Supports headings, bold text, lists, and table formatting.
 * @param {string} mdText - The raw markdown content
 * @returns {string} Safe HTML string
 */
export function mdToHtml(mdText) {
  if (!mdText) return '';
  
  // 1. Pre-process: Clean leaked raw HTML banners and normalize non-breaking spaces
  let text = mdText
    .replace(/<div class="mock-warning-banner"[^>]*>.*?<\/div>/gis, '')
    .replace(/<div class="paper-footer"[^>]*>.*?<\/div>/gis, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
    
  const lines = text.split('\n');
  const result = [];
  
  let inList = false;
  let inTable = false;
  let tableHeaders = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // Handle horizontal dividers
    if (line === '---' || line === '***') {
      if (inList) { result.push('</ul>'); inList = false; }
      if (inTable) { result.push('</tbody></table></div>'); inTable = false; }
      result.push('<hr class="my-5 border-t border-slate-300 print:border-black" />');
      continue;
    }

    // Handle empty lines
    if (!line) {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      if (inTable) {
        result.push('</tbody></table></div>');
        inTable = false;
        tableHeaders = [];
      }
      continue;
    }

    // Centered OR choices
    if (line === 'OR' || line === '**OR**' || line.includes('<div align="center"><strong>OR</strong></div>')) {
      if (inList) { result.push('</ul>'); inList = false; }
      result.push('<div class="text-center font-bold text-slate-800 my-3 text-xs tracking-widest uppercase">OR</div>');
      continue;
    }
    
    // Handle Headings (with Examination Section Centering)
    if (line.startsWith('# ')) {
      if (inList) { result.push('</ul>'); inList = false; }
      const heading = line.substring(2).trim();
      result.push(`<h2 class="text-xl font-black text-slate-900 text-center tracking-tight my-2 uppercase print:text-black">${heading}</h2>`);
      continue;
    }
    if (line.startsWith('## ')) {
      if (inList) { result.push('</ul>'); inList = false; }
      const heading = line.substring(3).trim();
      result.push(`<h3 class="text-base font-bold text-slate-800 text-center tracking-wide my-1 uppercase print:text-black">${heading}</h3>`);
      continue;
    }
    if (line.startsWith('### ')) {
      if (inList) { result.push('</ul>'); inList = false; }
      const heading = line.substring(4).trim();
      // Check if it's an examination section header (SECTION A, SECTION B, etc.)
      if (/SECTION\s*[-–]?\s*[A-E]/i.test(heading)) {
        result.push(`<div class="text-center my-6 pt-2">
          <h4 class="text-sm font-black text-slate-900 underline underline-offset-4 tracking-wider uppercase inline-block print:text-black">${heading}</h4>
        </div>`);
      } else {
        result.push(`<h4 class="text-sm font-bold text-slate-800 mt-4 mb-2 print:text-black">${heading}</h4>`);
      }
      continue;
    }
    if (line.startsWith('#### ')) {
      if (inList) { result.push('</ul>'); inList = false; }
      const heading = line.substring(5).trim();
      result.push(`<div class="text-center my-1"><p class="text-xs font-bold text-slate-700 uppercase tracking-wide print:text-black">${heading}</p></div>`);
      continue;
    }
    
    // Handle Bullets
    if (line.startsWith('* ') || line.startsWith('- ')) {
      if (!inList) {
        if (inTable) { result.push('</tbody></table></div>'); inTable = false; }
        result.push('<ul class="list-disc pl-5 space-y-1.5 my-2">');
        inList = true;
      }
      let content = line.substring(2);
      content = content.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 print:text-black">$1</strong>');
      result.push(`<li class="text-xs text-slate-700 print:text-black leading-relaxed">${content}</li>`);
      continue;
    }
    
    // Handle Numbered Question / List Items (e.g. "1. Question text" or "Q1. Question text")
    if (/^(\d+|Q\d+)\.\s/.test(line) || /^\*\*\d+\.\*\*/.test(line) || /^\*\*Q\d+\.\*\*/.test(line)) {
      if (inList) { result.push('</ul>'); inList = false; }
      if (inTable) { result.push('</tbody></table></div>'); inTable = false; }
      
      let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 print:text-black">$1</strong>');
      // Format marks indicator on the right side if present
      formatted = formatted.replace(/\*\[(.*?)\]\*/g, '<span class="float-right font-bold text-slate-700 text-xs ml-2 print:text-black">[$1]</span>');
      
      result.push(`<div class="text-xs text-slate-900 font-medium my-3 leading-relaxed clearfix print:text-black">
        ${formatted}
      </div>`);
      continue;
    }
    
    // Handle Tables
    if (line.startsWith('|')) {
      if (inList) { result.push('</ul>'); inList = false; }
      
      const cols = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      if (cols.every(c => c.startsWith('-'))) {
        continue;
      }
      
      if (!inTable) {
        result.push('<div class="overflow-x-auto my-4 border border-slate-200 rounded-lg shadow-xs"><table class="w-full text-left border-collapse text-xs">');
        result.push('<thead class="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200"><tr>');
        cols.forEach(col => {
          result.push(`<th class="px-4 py-2 border-r border-slate-200 last:border-r-0">${col}</th>`);
        });
        result.push('</tr></thead><tbody class="divide-y divide-slate-100 bg-white">');
        inTable = true;
        tableHeaders = cols;
      } else {
        result.push('<tr class="hover:bg-slate-50/50">');
        cols.forEach(col => {
          result.push(`<td class="px-4 py-2 border-r border-slate-200 last:border-r-0 text-slate-600">${col}</td>`);
        });
        result.push('</tr>');
      }
      continue;
    }
    
    // Regular Paragraph lines
    if (inList) { result.push('</ul>'); inList = false; }
    if (inTable) { result.push('</tbody></table></div>'); inTable = false; }
    
    let lineFormatted = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 print:text-black">$1</strong>');
    lineFormatted = lineFormatted.replace(/\*\[(.*?)\]\*/g, '<span class="float-right font-bold text-slate-700 text-xs ml-2 print:text-black">[$1]</span>');
    
    result.push(`<p class="text-xs text-slate-700 leading-relaxed my-1.5 print:text-black">${lineFormatted}</p>`);
  }
  
  if (inList) result.push('</ul>');
  if (inTable) result.push('</tbody></table></div>');
  
  return result.join('\n');
}
export default mdToHtml;
