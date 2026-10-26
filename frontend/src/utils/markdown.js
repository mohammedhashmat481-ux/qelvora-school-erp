/**
 * Convert basic markdown strings to HTML safely.
 * Supports headings, bold text, lists, and table formatting.
 * @param {string} mdText - The raw markdown content
 * @returns {string} Safe HTML string
 */
export function mdToHtml(mdText) {
  if (!mdText) return '';
  
  // Prevent HTML injection by escaping raw tags first
  let html = mdText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
    
  const lines = html.split('\n');
  const result = [];
  
  let inList = false;
  let inTable = false;
  let tableHeaders = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
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
      result.push('<br/>');
      continue;
    }
    
    // Handle Headings
    if (line.startsWith('### ')) {
      if (inList) { result.push('</ul>'); inList = false; }
      if (inTable) { result.push('</tbody></table></div>'); inTable = false; }
      result.push(`<h4 class="text-base font-bold text-slate-800 mt-4 mb-2">${line.substring(4)}</h4>`);
      continue;
    }
    if (line.startsWith('## ')) {
      if (inList) { result.push('</ul>'); inList = false; }
      if (inTable) { result.push('</tbody></table></div>'); inTable = false; }
      result.push(`<h3 class="text-lg font-bold text-slate-800 mt-5 mb-3 pb-1 border-b border-slate-200">${line.substring(3)}</h3>`);
      continue;
    }
    if (line.startsWith('# ')) {
      if (inList) { result.push('</ul>'); inList = false; }
      if (inTable) { result.push('</tbody></table></div>'); inTable = false; }
      result.push(`<h2 class="text-xl font-bold text-slate-900 mt-6 mb-4">${line.substring(2)}</h2>`);
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
      // Format bold text inside list item
      content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      result.push(`<li class="text-sm text-slate-700">${content}</li>`);
      continue;
    }
    
    // Handle Numbered List Items
    if (/^\d+\.\s/.test(line)) {
      if (inList) { result.push('</ul>'); inList = false; }
      if (inTable) { result.push('</tbody></table></div>'); inTable = false; }
      
      const dotIndex = line.indexOf('.');
      let content = line.substring(dotIndex + 1).trim();
      content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      result.push(`<div class="flex gap-2 text-sm text-slate-700 my-1.5 pl-2">
        <span class="font-semibold text-slate-600">${line.substring(0, dotIndex + 1)}</span>
        <span>${content}</span>
      </div>`);
      continue;
    }
    
    // Handle Tables
    if (line.startsWith('|')) {
      if (inList) { result.push('</ul>'); inList = false; }
      
      // Split row values and clean empty margins
      const cols = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      
      // Skip separator row (|---|---|)
      if (cols.every(c => c.startsWith('-'))) {
        continue;
      }
      
      if (!inTable) {
        result.push('<div class="overflow-x-auto my-4 border border-slate-200 rounded-lg shadow-sm"><table class="w-full text-left border-collapse text-xs">');
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
    
    // Bold replacements
    line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    result.push(`<p class="text-sm text-slate-600 leading-relaxed my-2">${line}</p>`);
  }
  
  // Close any open tags at the end
  if (inList) result.push('</ul>');
  if (inTable) result.push('</tbody></table></div>');
  
  return result.join('\n');
}
export default mdToHtml;
