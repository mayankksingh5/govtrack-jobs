import { Agent, fetch as undiciFetch } from 'undici';
import { inflateSync } from 'node:zlib';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PDF_TIMEOUT_MS = 30_000;
const PDF_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/125.0 Safari/537.36';
const insecurePdfAgent = new Agent({ connect: { rejectUnauthorized: false } });
const FIELD_COUNT = 14;

function isPdfUrl(url) {
  try {
    return /\.pdf(?:$|[/?#])/i.test(new URL(url).pathname + new URL(url).search);
  } catch {
    return /\.pdf(?:$|[?#])/i.test(String(url));
  }
}

async function parsePdfNotification({ jobId, url, sourceName, title, insecureTLS = false }) {
  const outputUrl = new URL(`./parsed-notifications/${jobId}.json`, import.meta.url);
  try {
    const cached = JSON.parse(await readFile(outputUrl, 'utf8'));
    return {
      success: true,
      cached: true,
      confidence: cached.extraction_confidence ?? 0,
      log: makeLog(jobId, url, 'Cached', 'Success', cached.extraction_confidence ?? 0),
    };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      return {
        success: false,
        cached: false,
        confidence: 0,
        log: makeLog(jobId, url, 'Not Attempted', 'Failure', 0, error.message),
      };
    }
  }

  let buffer;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), PDF_TIMEOUT_MS);
    try {
      const response = await undiciFetch(url, {
        signal: ctrl.signal,
        redirect: 'follow',
        dispatcher: insecureTLS ? insecurePdfAgent : undefined,
        headers: {
          'user-agent': PDF_UA,
          accept: 'application/pdf,*/*;q=0.8',
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      buffer = Buffer.from(await response.arrayBuffer());
      if (!buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
        throw new Error('Response is not a PDF');
      }
    } finally {
      clearTimeout(timer);
    }
    console.log(`PDF Download Success: job=${jobId} url=${url}`);
  } catch (error) {
    console.error(`PDF Download Failure: job=${jobId} url=${url} error=${error.message}`);
    return {
      success: false,
      cached: false,
      confidence: 0,
      log: makeLog(jobId, url, 'Failure', 'Not Attempted', 0, error.message),
    };
  }

  try {
    const text = extractPdfText(buffer);
    if (text.trim().length < 40) {
      throw new Error('No readable text found; PDF may be scanned or use an unsupported font encoding');
    }

    const { fields, confidence } = extractNotificationFields(text, { sourceName, title });
    const output = {
      job_id: jobId,
      notification_url: url,
      ...fields,
      extraction_confidence: confidence,
      parsed_at: new Date().toISOString(),
    };
    await mkdir(dirname(fileURLToPath(outputUrl)), { recursive: true });
    await writeFile(outputUrl, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    console.log(`Parse Success: job=${jobId}`);
    console.log(`Extraction Confidence: ${confidence}%`);
    return {
      success: true,
      cached: false,
      confidence,
      log: makeLog(jobId, url, 'Success', 'Success', confidence),
    };
  } catch (error) {
    console.error(`Parse Failure: job=${jobId} error=${error.message}`);
    console.log('Extraction Confidence: 0%');
    return {
      success: false,
      cached: false,
      confidence: 0,
      log: makeLog(jobId, url, 'Success', 'Failure', 0, error.message),
    };
  }
}

function extractPdfText(buffer) {
  const binary = buffer.toString('latin1');
  const chunks = [];
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let streamMatch;

  while ((streamMatch = streamRe.exec(binary))) {
    const dictionary = binary.slice(Math.max(0, streamMatch.index - 600), streamMatch.index);
    let stream = Buffer.from(streamMatch[1], 'latin1');
    if (/\/FlateDecode\b/.test(dictionary)) {
      try {
        stream = inflateSync(stream);
      } catch {
        continue;
      }
    }
    chunks.push(extractTextOperators(stream.toString('latin1')));
  }

  if (!chunks.some((chunk) => chunk.trim())) {
    chunks.push(extractTextOperators(binary));
  }
  return chunks.join('\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function extractTextOperators(content) {
  const output = [];
  const textBlocks = content.match(/BT[\s\S]*?ET/g) || [content];
  for (const block of textBlocks) {
    const tokenRe = /\(((?:\\.|[^\\)])*)\)\s*(?:Tj|'|")|\[((?:\\.|[^\]])*)\]\s*TJ|<([0-9a-fA-F]+)>\s*Tj/g;
    let match;
    while ((match = tokenRe.exec(block))) {
      if (match[1] != null) output.push(decodePdfString(match[1]));
      else if (match[2] != null) {
        const parts = [...match[2].matchAll(/\(((?:\\.|[^\\)])*)\)|<([0-9a-fA-F]+)>/g)];
        output.push(
          parts
            .map((part) =>
              part[1] != null ? decodePdfString(part[1]) : decodeHexString(part[2])
            )
            .join('')
        );
      } else if (match[3]) output.push(decodeHexString(match[3]));
    }
  }
  return output.filter(Boolean).join('\n');
}

function decodePdfString(value) {
  const bytes = [];
  for (let index = 0; index < value.length; index++) {
    if (value[index] !== '\\') {
      bytes.push(value.charCodeAt(index) & 0xff);
      continue;
    }
    const next = value[++index];
    if (next == null) break;
    const escaped = { n: 10, r: 13, t: 9, b: 8, f: 12 };
    if (escaped[next] != null) bytes.push(escaped[next]);
    else if (/[0-7]/.test(next)) {
      let octal = next;
      while (octal.length < 3 && /[0-7]/.test(value[index + 1] || '')) {
        octal += value[++index];
      }
      bytes.push(parseInt(octal, 8));
    } else if (next !== '\n' && next !== '\r') bytes.push(next.charCodeAt(0) & 0xff);
  }
  return decodeTextBytes(Buffer.from(bytes));
}

function decodeHexString(hex) {
  const padded = hex.length % 2 ? `${hex}0` : hex;
  return decodeTextBytes(Buffer.from(padded, 'hex'));
}

function decodeTextBytes(bytes) {
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    const chars = [];
    for (let index = 2; index + 1 < bytes.length; index += 2) {
      chars.push(String.fromCharCode(bytes.readUInt16BE(index)));
    }
    return chars.join('');
  }
  return bytes.toString('latin1');
}

function extractNotificationFields(text, context = {}) {
  const clean = text.replace(/\r/g, '\n').replace(/[ \t]+/g, ' ');
  let matched = 0;
  const capture = (patterns, maxLength = 240) => {
    for (const pattern of patterns) {
      const match = clean.match(pattern);
      const value = match?.[1]?.replace(/\s+/g, ' ').trim();
      if (value) {
        matched++;
        return value.slice(0, maxLength);
      }
    }
    return null;
  };

  const fields = {
    organization: capture([
      /(?:organization|organisation|name of (?:the )?organization)\s*[:\-]\s*([^\n]{3,160})/i,
    ]),
    post_name: capture([
      /(?:name of (?:the )?post|post name|recruitment to the post of)\s*[:\-]?\s*([^\n]{3,180})/i,
    ]),
    advertisement_number: capture([
      /(?:advertisement|advt\.?|notification)\s*(?:no\.?|number)?\s*[:\-]\s*([A-Z0-9()[\]\/._-]{2,80})/i,
    ]),
    total_vacancies: capture([
      /(?:total\s+(?:number of\s+)?vacanc(?:y|ies)|number of posts|total posts)\s*[:\-]\s*(\d[\d,]*)/i,
    ], 30),
    application_start_date: capture([
      /(?:application start date|opening date|online application starts?|commencement of online application)\s*[:\-]\s*([^\n]{4,60})/i,
    ], 60),
    last_date_to_apply: capture([
      /(?:last date (?:to apply|for (?:submission|receipt)[^:\n]*)|closing date|application end date)\s*[:\-]\s*([^\n]{4,80})/i,
    ], 80),
    exam_date: capture([
      /(?:date of (?:the )?(?:written )?exam(?:ination)?|exam date)\s*[:\-]\s*([^\n]{4,80})/i,
    ], 80),
    age_limit: capture([
      /(?:age limit|age as on [^:\n]+|maximum age|minimum age)\s*[:\-]\s*([^\n]{3,180})/i,
    ]),
    age_relaxation: capture([
      /(?:age relaxation|relaxation in (?:upper )?age limit)\s*[:\-]\s*([^\n]{3,240})/i,
    ]),
    application_fee: capture([
      /(?:application fee|examination fee|fee payable)\s*[:\-]\s*([^\n]{2,220})/i,
    ]),
    eligibility: capture([
      /(?:eligibility|educational qualification|essential qualification)\s*[:\-]\s*([^\n]{4,300})/i,
    ], 300),
    selection_process: capture([
      /(?:selection process|mode of selection|method of selection)\s*[:\-]\s*([^\n]{4,260})/i,
    ], 260),
    salary_pay_level: capture([
      /(?:salary|pay scale|pay level|scale of pay|remuneration)\s*[:\-]\s*([^\n]{3,180})/i,
    ]),
    official_website: capture([
      /(?:official website|website)\s*[:\-]\s*(https?:\/\/[^\s<>"')\]]+)/i,
      /\b(https?:\/\/(?:www\.)?[a-z0-9.-]+\.(?:gov\.in|nic\.in|org\.in|co\.in|in)\b[^\s<>"')\]]*)/i,
    ]),
  };

  if (!fields.organization && context.sourceName) fields.organization = context.sourceName;
  if (!fields.post_name && context.title) fields.post_name = context.title;

  return {
    fields,
    confidence: Math.round((matched / FIELD_COUNT) * 100),
  };
}

function makeLog(jobId, url, downloadStatus, parseStatus, confidence, error = null) {
  return {
    job_id: jobId,
    pdf_url: url,
    pdf_download: downloadStatus,
    parse: parseStatus,
    extraction_confidence: confidence,
    error,
    timestamp: new Date().toISOString(),
  };
}

export {
  extractNotificationFields,
  extractPdfText,
  isPdfUrl,
  parsePdfNotification,
};
