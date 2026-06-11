    // ==================== CONSTANTS ====================
    const MAX_FILE_SIZE = 60 * 1024 * 1024;
    const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024;
    const STREAMING_FILE_THRESHOLD = 5 * 1024 * 1024;  // 5MB — use streaming
    const CHUNK_SIZE = 512 * 1024;
    const STREAM_CHUNK_SIZE = 2 * 1024 * 1024;  // 2MB chunks for File.slice()
    const MAX_REGEX_TIME = 2000;
    const YIELD_INTERVAL = 50;
	const MAX_SAMPLE_ROWS = 500;
	const MAX_VALUES_PER_COLUMN = 200;
	const DETECT_SAMPLE_SIZE = 30;
	const XLSX_MAX_CELL_LENGTH = 32767;

    function truncateCellValue(value) {
        if (!value || typeof value !== 'string') return value;
        if (value.length <= XLSX_MAX_CELL_LENGTH) return value;
        return value.substring(0, XLSX_MAX_CELL_LENGTH);
    }

    // ==================== ENCODING HELPERS ====================
    /**
     * Detects file encoding from byte array.
     * Checks BOM first, then UTF-8 byte sequence validity, falls back to windows-1251.
     */
    function detectEncoding(bytes) {
        if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) return 'utf-8';
        if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) return 'utf-16le';
        if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) return 'utf-16be';
        // Check if valid UTF-8
        var i = 0;
        var nonAsciiCount = 0;
        var utf8InvalidCount = 0;
        while (i < bytes.length && i < 8192) {
            var b = bytes[i];
            if (b < 0x80) { i++; continue; }
            nonAsciiCount++;
            if ((b & 0xE0) === 0xC0) {
                if (i + 1 >= bytes.length || (bytes[i+1] & 0xC0) !== 0x80) utf8InvalidCount++;
                i += 2;
            } else if ((b & 0xF0) === 0xE0) {
                if (i + 2 >= bytes.length || (bytes[i+1] & 0xC0) !== 0x80 || (bytes[i+2] & 0xC0) !== 0x80) utf8InvalidCount++;
                i += 3;
            } else if ((b & 0xF8) === 0xF0) {
                if (i + 3 >= bytes.length || (bytes[i+1] & 0xC0) !== 0x80 || (bytes[i+2] & 0xC0) !== 0x80 || (bytes[i+3] & 0xC0) !== 0x80) utf8InvalidCount++;
                i += 4;
            } else {
                utf8InvalidCount++;
                i++;
            }
        }
        if (nonAsciiCount > 0 && utf8InvalidCount === 0) return 'utf-8';
        if (nonAsciiCount > 0 && utf8InvalidCount > nonAsciiCount * 0.3) return 'windows-1251';
        return 'utf-8';
    }

    /**
     * Decode byte array to string using specified encoding.
     * Strips UTF-8 BOM if present.
     */
    function decodeBytes(bytes, encoding) {
        var enc = encoding || 'utf-8';
        var start = 0;
        if (enc === 'utf-8' && bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) start = 3;
        try {
            var decoder = new TextDecoder(enc, { fatal: false });
            return decoder.decode(bytes.slice(start));
        } catch(e) {
            // Fallback for browsers without windows-1251 support
            if (enc === 'windows-1251') {
                return decodeCp1251(bytes.slice(start));
            }
            var fallback = new TextDecoder('utf-8', { fatal: false });
            return fallback.decode(bytes.slice(start));
        }
    }

    /**
     * Manual CP1251 (Windows-1251) decoder for browsers without TextDecoder support.
     */
    function decodeCp1251(bytes) {
        var map = {
            128:'\u0402',129:'\u0403',130:'\u201A',131:'\u0453',132:'\u201E',133:'\u2026',134:'\u2020',135:'\u2021',
            136:'\u20AC',137:'\u2030',138:'\u0409',139:'\u2039',140:'\u040A',141:'\u040C',142:'\u040B',143:'\u040F',
            144:'\u0452',145:'\u2018',146:'\u2019',147:'\u201C',148:'\u201D',149:'\u2022',150:'\u2013',151:'\u2014',
            152:'\u20AC',153:'\u2122',154:'\u0459',155:'\u203A',156:'\u045A',157:'\u045C',158:'\u045B',159:'\u045F',
            160:'\u00A0',161:'\u040E',162:'\u045E',163:'\u0408',164:'\u00A4',165:'\u0490',166:'\u00A6',167:'\u00A7',
            168:'\u0401',169:'\u00A9',170:'\u0404',171:'\u00AB',172:'\u00AC',173:'\u00AD',174:'\u00AE',175:'\u0407',
            176:'\u00B0',177:'\u00B1',178:'\u0406',179:'\u0456',180:'\u0491',181:'\u00B5',182:'\u00B6',183:'\u00B7',
            184:'\u0451',185:'\u2116',186:'\u0454',187:'\u00BB',188:'\u0458',189:'\u0405',190:'\u0455',191:'\u0457',
            192:'\u0410',193:'\u0411',194:'\u0412',195:'\u0413',196:'\u0414',197:'\u0415',198:'\u0416',199:'\u0417',
            200:'\u0418',201:'\u0419',202:'\u041A',203:'\u041B',204:'\u041C',205:'\u041D',206:'\u041E',207:'\u041F',
            208:'\u0420',209:'\u0421',210:'\u0422',211:'\u0423',212:'\u0424',213:'\u0425',214:'\u0426',215:'\u0427',
            216:'\u0428',217:'\u0429',218:'\u042A',219:'\u042B',220:'\u042C',221:'\u042D',222:'\u042E',223:'\u042F',
            224:'\u0430',225:'\u0431',226:'\u0432',227:'\u0433',228:'\u0434',229:'\u0435',230:'\u0436',231:'\u0437',
            232:'\u0438',233:'\u0439',234:'\u043A',235:'\u043B',236:'\u043C',237:'\u043D',238:'\u043E',239:'\u043F',
            240:'\u0440',241:'\u0441',242:'\u0442',243:'\u0443',244:'\u0444',245:'\u0445',246:'\u0446',247:'\u0447',
            248:'\u0448',249:'\u0449',250:'\u044A',251:'\u044B',252:'\u044C',253:'\u044D',254:'\u044E',255:'\u044F'
        };
        var result = '';
        for (var i = 0; i < bytes.length; i++) {
            var b = bytes[i];
            if (b < 128) result += String.fromCharCode(b);
            else result += (map[b] || '\uFFFD');
        }
        return result;
    }

    /**
     * Encode string to byte array using specified encoding.
     * Only UTF-8 and windows-1251 are supported.
     */
    function encodeString(str, encoding) {
        var enc = encoding || 'utf-8';
        if (enc === 'utf-8') {
            var encoder = new TextEncoder();
            return encoder.encode(str);
        }
        if (enc === 'windows-1251') return encodeCp1251(str);
        // Default: UTF-8
        var encoder = new TextEncoder();
        return encoder.encode(str);
    }

    /**
     * Manual CP1251 encoder.
     */
    function encodeCp1251(str) {
        var reverseMap = {};
        var fwdMap = {
            '\u0402':128,'\u0403':129,'\u201A':130,'\u0453':131,'\u201E':132,'\u2026':133,'\u2020':134,'\u2021':135,
            '\u20AC':136,'\u2030':137,'\u0409':138,'\u2039':139,'\u040A':140,'\u040C':141,'\u040B':142,'\u040F':143,
            '\u0452':144,'\u2018':145,'\u2019':146,'\u201C':147,'\u201D':148,'\u2022':149,'\u2013':150,'\u2014':151,
            '\u0459':154,'\u203A':155,'\u045A':156,'\u045C':157,'\u045B':158,'\u045F':159,
            '\u00A0':160,'\u040E':161,'\u045E':162,'\u0408':163,'\u00A4':164,'\u0490':165,'\u00A6':166,'\u00A7':167,
            '\u0401':168,'\u00A9':169,'\u0404':170,'\u00AB':171,'\u00AC':172,'\u00AD':173,'\u00AE':174,'\u0407':175,
            '\u00B0':176,'\u00B1':177,'\u0406':178,'\u0456':179,'\u0491':180,'\u00B5':181,'\u00B6':182,'\u00B7':183,
            '\u0451':184,'\u2116':185,'\u0454':186,'\u00BB':187,'\u0458':188,'\u0405':189,'\u0455':190,'\u0457':191,
            '\u0410':192,'\u0411':193,'\u0412':194,'\u0413':195,'\u0414':196,'\u0415':197,'\u0416':198,'\u0417':199,
            '\u0418':200,'\u0419':201,'\u041A':202,'\u041B':203,'\u041C':204,'\u041D':205,'\u041E':206,'\u041F':207,
            '\u0420':208,'\u0421':209,'\u0422':210,'\u0423':211,'\u0424':212,'\u0425':213,'\u0426':214,'\u0427':215,
            '\u0428':216,'\u0429':217,'\u042A':218,'\u042B':219,'\u042C':220,'\u042D':221,'\u042E':222,'\u042F':223,
            '\u0430':224,'\u0431':225,'\u0432':226,'\u0433':227,'\u0434':228,'\u0435':229,'\u0436':230,'\u0437':231,
            '\u0438':232,'\u0439':233,'\u043A':234,'\u043B':235,'\u043C':236,'\u043D':237,'\u043E':238,'\u043F':239,
            '\u0440':240,'\u0441':241,'\u0442':242,'\u0443':243,'\u0444':244,'\u0445':245,'\u0446':246,'\u0447':247,
            '\u0448':248,'\u0449':249,'\u044A':250,'\u044B':251,'\u044C':252,'\u044D':253,'\u044E':254,'\u044F':255
        };
        for (var k in fwdMap) reverseMap[k] = fwdMap[k];
        var bytes = new Uint8Array(str.length);
        for (var i = 0; i < str.length; i++) {
            var ch = str.charCodeAt(i);
            if (ch < 128) bytes[i] = ch;
            else bytes[i] = reverseMap[String.fromCharCode(ch)] || 0x3F; // '?' for unmapped
        }
        return bytes;
    }

    /**
     * Create Blob preserving original file encoding.
     * For UTF-8: adds BOM. For windows-1251: raw bytes.
     */
    function createBlobWithEncoding(text, encoding) {
        var bytes = encodeString(text, encoding);
        if (encoding === 'utf-8') {
            var bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
            var combined = new Uint8Array(bom.length + bytes.length);
            combined.set(bom);
            combined.set(bytes, bom.length);
            return new Blob([combined], { type: 'text/plain;charset=utf-8' });
        }
        return new Blob([bytes], { type: 'text/plain;charset=' + encoding });
    }

    /**
     * Read entire file as text with encoding auto-detection.
     * Returns { text: string, encoding: string }
     */
    async function readFileAsTextWithEncoding(file) {
        var bytes = new Uint8Array(await file.arrayBuffer());
        var encoding = detectEncoding(bytes);
        var text = decodeBytes(bytes, encoding);
        return { text: text, encoding: encoding };
    }

    // ==================== GZIP / TAR HELPERS ====================
    // v5.7.55: GZIP compression/decompression for TAR.GZ and single-file GZ archives
    async function gunzipBuffer(buffer) {
        if (typeof DecompressionStream !== 'undefined') {
            var ds = new DecompressionStream('gzip');
            var writer = ds.writable.getWriter();
            writer.write(new Uint8Array(buffer));
            writer.close();
            return await new Response(ds.readable).arrayBuffer();
        }
        try {
            var response = new Response(buffer, { headers: { 'Content-Encoding': 'gzip' } });
            return await response.arrayBuffer();
        } catch(e) {
            throw new Error('Браузер не поддерживает распаковку gzip. Используйте Chrome/Edge/Firefox последних версий.');
        }
    }
    async function gzipBuffer(buffer) {
        if (typeof CompressionStream !== 'undefined') {
            var cs = new CompressionStream('gzip');
            var writer = cs.writable.getWriter();
            writer.write(new Uint8Array(buffer));
            writer.close();
            return await new Response(cs.readable).arrayBuffer();
        }
        throw new Error('Браузер не поддерживает сжатие gzip. Используйте Chrome/Edge/Firefox последних версий.');
    }
    // v5.7.55: Simple TAR parser / writer (POSIX ustar subset)
    function parseTar(buffer) {
        var view = new Uint8Array(buffer);
        var files = [];
        var offset = 0;
        var len = buffer.byteLength;
        while (offset + 512 <= len) {
            var allZero = true;
            for (var k = 0; k < 512; k++) { if (view[offset + k] !== 0) { allZero = false; break; } }
            if (allZero) {
                if (offset + 1024 <= len) {
                    var allZero2 = true;
                    for (var k2 = 0; k2 < 512; k2++) { if (view[offset + 512 + k2] !== 0) { allZero2 = false; break; } }
                    if (allZero2) break;
                }
            }
            var name = '';
            for (var i = 0; i < 100; i++) {
                var c = view[offset + i];
                if (c === 0) break;
                name += String.fromCharCode(c);
            }
            var sizeStr = '';
            for (var i = 124; i < 136; i++) {
                var c = view[offset + i];
                if (c === 0 || c === 32) break;
                sizeStr += String.fromCharCode(c);
            }
            var size = parseInt(sizeStr, 8) || 0;
            var typeFlag = String.fromCharCode(view[offset + 156] || 0);
            if ((typeFlag === '0' || typeFlag === '\0' || typeFlag === '') && name) {
                var dataEnd = offset + 512 + size;
                if (dataEnd > len) dataEnd = len;
                files.push({ name: name, data: buffer.slice(offset + 512, dataEnd), size: size });
            }
            offset += 512 + Math.ceil(size / 512) * 512;
        }
        return files;
    }
    function createTar(files) {
        var totalSize = 0;
        for (var i = 0; i < files.length; i++) {
            totalSize += 512 + Math.ceil(files[i].size / 512) * 512;
        }
        totalSize += 1024;
        var buf = new ArrayBuffer(totalSize);
        var view = new Uint8Array(buf);
        var offset = 0;
        for (var i = 0; i < files.length; i++) {
            var f = files[i];
            var name = f.name;
            if (name.length > 99) name = name.slice(-99);
            for (var j = 0; j < 100; j++) view[offset + j] = (j < name.length) ? name.charCodeAt(j) : 0;
            var mode = '0000644';
            for (var j = 0; j < 8; j++) view[offset + 100 + j] = mode.charCodeAt(j);
            view[offset + 108] = 0;
            for (var j = 0; j < 16; j++) view[offset + 108 + j] = 0;
            var size = f.size || 0;
            var sizeOct = size.toString(8);
            while (sizeOct.length < 11) sizeOct = '0' + sizeOct;
            for (var j = 0; j < 11; j++) view[offset + 124 + j] = sizeOct.charCodeAt(j);
            view[offset + 135] = 0;
            view[offset + 136] = 32;
            var mtime = Math.floor(Date.now() / 1000).toString(8);
            while (mtime.length < 11) mtime = '0' + mtime;
            for (var j = 0; j < 11; j++) view[offset + 136 + j] = mtime.charCodeAt(j);
            view[offset + 147] = 0;
            view[offset + 148] = 32;
            for (var j = 0; j < 8; j++) view[offset + 148 + j] = 32;
            view[offset + 156] = 48;
            for (var j = 0; j < 100; j++) view[offset + 157 + j] = 0;
            var ustar = 'ustar  ';
            for (var j = 0; j < 8; j++) view[offset + 257 + j] = ustar.charCodeAt(j);
            for (var j = 0; j < 64; j++) view[offset + 265 + j] = 0;
            for (var j = 0; j < 16; j++) view[offset + 329 + j] = 0;
            for (var j = 0; j < 155; j++) view[offset + 345 + j] = 0;
            for (var j = 0; j < 12; j++) view[offset + 500 + j] = 0;
            var sum = 0;
            for (var j = 0; j < 512; j++) sum += view[offset + j];
            var sumOct = sum.toString(8);
            while (sumOct.length < 6) sumOct = '0' + sumOct;
            for (var j = 0; j < 6; j++) view[offset + 148 + j] = sumOct.charCodeAt(j);
            view[offset + 154] = 0;
            view[offset + 155] = 32;
            var dataView = new Uint8Array(f.data);
            view.set(dataView, offset + 512);
            offset += 512 + Math.ceil(dataView.length / 512) * 512;
        }
        for (var i = offset; i < totalSize; i++) view[i] = 0;
        return buf;
    }
    async function processGzFile(file, fileName, changes, progressCallback, softMode) {
        var buffer = await file.arrayBuffer();
        if (progressCallback) progressCallback(10);
        var decompressed = await gunzipBuffer(buffer);
        if (progressCallback) progressCallback(30);
        buffer = null;
        var ext = fileName.split('.').pop().toLowerCase();
        var isTarGz = fileName.toLowerCase().endsWith('.tar.gz') || fileName.toLowerCase().endsWith('.tgz');
        if (isTarGz) {
            return await processTarBytes(decompressed, fileName, changes, progressCallback, softMode);
        }
        var bytes = new Uint8Array(decompressed);
        var encoding = detectEncoding(bytes);
        var textContent = decodeBytes(bytes, encoding);
        if (progressCallback) progressCallback(50);
        var masked;
        if (textContent.length > 50000) {
            masked = await maskTextChunked(textContent, fileName, changes, progressCallback ? function(p){ progressCallback(50 + p * 0.5); } : null, softMode);
        } else {
            masked = await maskTextAsync(textContent, fileName, changes, softMode);
        }
        if (progressCallback) progressCallback(90);
        var maskedBlob = createBlobWithEncoding(masked, encoding);
        var maskedBuf = await maskedBlob.arrayBuffer();
        var compressed = await gzipBuffer(maskedBuf);
        if (progressCallback) progressCallback(100);
        return new Blob([compressed], { type: 'application/gzip' });
    }
    async function processTarBytes(buffer, fileName, changes, progressCallback, softMode) {
        var files = parseTar(buffer);
        if (progressCallback) progressCallback(20);
        var totalEntries = files.length;
        var processedCount = 0;
        var supportedExts = ['docx','xlsx','xlsb','pptx','ppt','txt','csv','json','xml','log','sql','yaml','yml','ini','md','tar','gz'];
        var MAX_ARCHIVE_FILES = 150;
        if (files.length > MAX_ARCHIVE_FILES) {
            showNotification('Архив TAR содержит ' + files.length + ' файлов. Обработаны первые ' + MAX_ARCHIVE_FILES + ' файлов.', 'warning');
            files = files.slice(0, MAX_ARCHIVE_FILES);
        }
        var outFiles = [];
        for (var i = 0; i < files.length; i++) {
            var f = files[i];
            var path = f.name;
            var ext = path.split('.').pop().toLowerCase();
            var outData;
            if (supportedExts.indexOf(ext) !== -1 && f.size > 0) {
                var entryChanges = [];
                var blob = new Blob([f.data]);
                if (ext === 'docx') {
                    outData = await processDocxStreamed(blob, path, entryChanges, null, softMode);
                    outData = await outData.arrayBuffer();
                } else if (ext === 'xlsx' || ext === 'xlsb') {
                    outData = await processXlsxStreamed(blob, path, ext, entryChanges, null, softMode);
                    outData = await outData.arrayBuffer();
                } else if (ext === 'pptx') {
                    outData = await processPptxStreamed(blob, path, entryChanges, null, softMode);
                    outData = await outData.arrayBuffer();
                } else {
                    var bytes = new Uint8Array(f.data);
                    var encoding = detectEncoding(bytes);
                    var textContent = decodeBytes(bytes, encoding);
                    if (textContent.length > 50000) {
                        var textBlob = new Blob([bytes], { type: 'application/octet-stream' });
                        outData = await processTextFileStreamed(textBlob, path, entryChanges, null, softMode);
                        outData = await outData.arrayBuffer();
                    } else {
                        var masked = await maskTextAsync(textContent, path, entryChanges, softMode);
                        outData = await createBlobWithEncoding(masked, encoding).arrayBuffer();
                    }
                }
                if (entryChanges.length > 0) {
                    changes.push.apply(changes, entryChanges.map(function(c) {
                        return Object.assign({}, c, { archivePath: path, fileName: fileName + ' → ' + path });
                    }));
                }
                outFiles.push({ name: path, data: outData, size: outData.byteLength });
            } else {
                outFiles.push({ name: path, data: f.data, size: f.size });
            }
            processedCount++;
            if (progressCallback) progressCallback(20 + (processedCount / totalEntries) * 70);
            f.data = null;
            await new Promise(function(resolve) { setTimeout(resolve, 0); });
        }
        if (progressCallback) progressCallback(90);
        var tarBuf = createTar(outFiles);
        outFiles.forEach(function(f){ f.data = null; });
        outFiles = null;
        files = null;
        if (progressCallback) progressCallback(100);
        return new Blob([tarBuf], { type: 'application/x-tar' });
    }
    async function processTarFile(file, fileName, changes, progressCallback, softMode) {
        var buffer = await file.arrayBuffer();
        return await processTarBytes(buffer, fileName, changes, progressCallback, softMode);
    }

    // ==================== CSV PROCESSING ====================
    /**
     * Parse a CSV line respecting quoted fields.
     * Handles commas inside quotes and escaped quotes.
     */
    function parseCsvLine(line, delimiter) {
        delimiter = delimiter || ',';
        var fields = [];
        var current = '';
        var inQuotes = false;
        for (var i = 0; i < line.length; i++) {
            var ch = line.charAt(i);
            if (inQuotes) {
                if (ch === '"') {
                    if (i + 1 < line.length && line.charAt(i + 1) === '"') {
                        current += '"';
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    current += ch;
                }
            } else {
                if (ch === '"') {
                    inQuotes = true;
                } else if (ch === delimiter) {
                    fields.push(current);
                    current = '';
                } else {
                    current += ch;
                }
            }
        }
        fields.push(current);
        return fields;
    }

    /**
     * Join fields into a CSV line, quoting when necessary.
     */
    function joinCsvLine(fields, delimiter) {
        delimiter = delimiter || ',';
        return fields.map(function(f) {
            var s = String(f === undefined || f === null ? '' : f);
            if (s.indexOf(delimiter) !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1 || s.indexOf('\r') !== -1) {
                return '"' + s.replace(/"/g, '""') + '"';
            }
            return s;
        }).join(delimiter);
    }

    /**
     * Detect CSV delimiter from header line.
     */
    function detectCsvDelimiter(headerLine) {
        var semi = (headerLine.match(/;/g) || []).length;
        var comma = (headerLine.match(/,/g) || []).length;
        return semi > comma ? ';' : ',';
    }

    /**
    // ==================== ARCHIVE PROCESSING ====================
    /**
     * Process a ZIP archive: unpack, mask supported files, repack back to ZIP.
     * Preserves folder structure. Non-supported files copied as-is.
     */
    /**
     * Mask CSV text preserving header line.
     * v5.7.60: First line (header) is preserved, rest is masked.
     */
    async function maskCsvWithHeader(textContent, fileName, entryChanges, softMode) {
        var lines = textContent.split(/\r?\n/);
        if (lines.length === 0) return textContent;
        var header = lines[0];
        var bodyLines = lines.slice(1);
        var bodyText = bodyLines.join('\n');
        var maskedBody = await maskTextAsync(bodyText, fileName, entryChanges, softMode);
        return header + '\n' + maskedBody;
    }

    async function processZipFile(file, fileName, changes, progressCallback, softMode) {
        var zip = await JSZip.loadAsync(file);
        var newZip = new JSZip();
        var entries = [];
        zip.forEach(function(relativePath, zipEntry) {
            if (!relativePath.endsWith('/')) {
                entries.push({ path: relativePath, entry: zipEntry });
            }
        });

        var MAX_ARCHIVE_FILES = 150; // v5.7.62: prevent OOM
        if (entries.length > MAX_ARCHIVE_FILES) {
            showNotification('Архив ZIP содержит ' + entries.length + ' файлов. Обработаны первые ' + MAX_ARCHIVE_FILES + ' файлов.', 'warning');
            entries = entries.slice(0, MAX_ARCHIVE_FILES);
        }
        var totalEntries = entries.length;
        var processedCount = 0;
        var supportedExts = ['docx','xlsx','xlsb','pptx','ppt','txt','csv','json','xml','log','sql','yaml','yml','ini','md'];

        for (var i = 0; i < entries.length; i++) {
            var e = entries[i];
            var path = e.path;
            var ext = path.split('.').pop().toLowerCase();

            if (supportedExts.indexOf(ext) !== -1) {
                var entryChanges = [];
                var blob;

                if (ext === 'docx') {
                    var content = await e.entry.async('blob');
                    blob = await processDocxStreamed(content, path, entryChanges, null, softMode);
                } else if (ext === 'xlsx' || ext === 'xlsb') {
                    var content = await e.entry.async('blob');
                    blob = await processXlsxStreamed(content, path, ext, entryChanges, null, softMode);
                } else if (ext === 'pptx') {
                    var content = await e.entry.async('blob');
                    blob = await processPptxStreamed(content, path, entryChanges, null, softMode);
                } else {
                    var bytes = await e.entry.async('uint8array');
                    var encoding = detectEncoding(bytes);
                    var textContent = decodeBytes(bytes, encoding);

                    if (ext === 'csv') {
                        var masked = await maskCsvWithHeader(textContent, path, entryChanges, softMode);
                        blob = createBlobWithEncoding(masked, encoding);
                    } else if (textContent.length > 50000) {
                        var blobSrc = new Blob([bytes], { type: 'application/octet-stream' });
                        blob = await processTextFileStreamed(blobSrc, path, entryChanges, null, softMode);
                    } else {
                        var masked = await maskTextAsync(textContent, path, entryChanges, softMode);
                        blob = createBlobWithEncoding(masked, encoding);
                    }
                }

                if (entryChanges.length > 0) {
                    changes.push.apply(changes, entryChanges.map(function(c) {
                        return Object.assign({}, c, { archivePath: path, fileName: fileName + ' → ' + path });
                    }));
                }

                newZip.file(path, blob, {
                    compression: 'DEFLATE',
                    compressionOptions: { level: 6 },
                    date: new Date(1980, 0, 1)
                });
                // v5.7.62: Memory cleanup after each file to prevent OOM
                blob = null; content = null; bytes = null; textContent = null; masked = null; entryChanges = null;
            } else {
                var binContent = await e.entry.async('uint8array');
                var isAlreadyCompressed = /\.(jpeg|jpg|png|gif|bmp|emf|wmf|bin|mp3|mp4|wav|wmv|avi|zip|gz|7z|rar)$/i.test(path);
                newZip.file(path, binContent, {
                    compression: isAlreadyCompressed ? 'STORE' : 'DEFLATE',
                    compressionOptions: { level: 6 },
                    date: new Date(1980, 0, 1)
                });
            }

            processedCount++;
            if (progressCallback) progressCallback((processedCount / totalEntries) * 100);
            if (i % 3 === 0) await new Promise(function(resolve) { setTimeout(resolve, 5); });
        }

        var blob = await newZip.generateAsync({
            type: 'blob',
            mimeType: 'application/zip',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });
        return blob;
    }

    /**
     * Process a 7z archive: unpack via libarchive.js, mask supported files, repack to ZIP.
     * Requires libarchive.js in vendor/ folder. Output is ZIP (7z creation in browser requires 7z-wasm).
     */
    async function process7zFile(file, fileName, changes, progressCallback, softMode) {
        // libarchive.js v2.0.0+ required. Files needed in vendor/libarchive.js/:
        //   - main.js (or dist/libarchive.js)
        //   - dist/worker-bundle.js
        // Download: https://github.com/nika-begiashvili/libarchivejs/releases
        if (typeof Archive === 'undefined' || !Archive.open || !Archive.write) {
            throw new Error(
                'Для обработки 7z установите libarchive.js v2.0.0+: скачайте релиз с ' +
                'https://github.com/nika-begiashvili/libarchivejs/releases и положите ' +
                'папку libarchive.js (с main.js и dist/worker-bundle.js) в vendor/'
            );
        }

        await Archive.init({ workerUrl: 'vendor/libarchive.js/dist/worker-bundle.js' });
        var archive = await Archive.open(file);
        var filesObj = await archive.extractFiles();

        var paths = Object.keys(filesObj);
        var MAX_ARCHIVE_FILES = 150; // v5.7.62: prevent OOM
        if (paths.length > MAX_ARCHIVE_FILES) {
            showNotification('Архив 7z содержит ' + paths.length + ' файлов. Обработаны первые ' + MAX_ARCHIVE_FILES + ' файлов.', 'warning');
            paths = paths.slice(0, MAX_ARCHIVE_FILES);
        }

        var totalEntries = paths.length;
        var processedCount = 0;
        var supportedExts = ['docx','xlsx','xlsb','pptx','ppt','txt','csv','json','xml','log','sql','yaml','yml','ini','md'];
        var archiveFiles = [];

        for (var i = 0; i < paths.length; i++) {
            var path = paths[i];
            var entryFile = filesObj[path];
            var ext = path.split('.').pop().toLowerCase();
            var outBlob;

            if (supportedExts.indexOf(ext) !== -1) {
                var entryChanges = [];

                if (ext === 'docx') {
                    outBlob = await processDocxStreamed(entryFile, path, entryChanges, null, softMode);
                } else if (ext === 'xlsx' || ext === 'xlsb') {
                    outBlob = await processXlsxStreamed(entryFile, path, ext, entryChanges, null, softMode);
                } else if (ext === 'pptx') {
                    outBlob = await processPptxStreamed(entryFile, path, entryChanges, null, softMode);
                } else {
                    var bytes = new Uint8Array(await entryFile.arrayBuffer());
                    var encoding = detectEncoding(bytes);
                    var textContent = decodeBytes(bytes, encoding);

                    if (ext === 'csv') {
                        var masked = await maskCsvWithHeader(textContent, path, entryChanges, softMode);
                        outBlob = createBlobWithEncoding(masked, encoding);
                    } else if (textContent.length > 50000) {
                        outBlob = await processTextFileStreamed(entryFile, path, entryChanges, null, softMode);
                    } else {
                        var masked = await maskTextAsync(textContent, path, entryChanges, softMode);
                        outBlob = createBlobWithEncoding(masked, encoding);
                    }
                }

                if (entryChanges.length > 0) {
                    changes.push.apply(changes, entryChanges.map(function(c) {
                        return Object.assign({}, c, { archivePath: path, fileName: fileName + ' → ' + path });
                    }));
                }
            } else {
                outBlob = entryFile;
            }

            archiveFiles.push({ file: outBlob, pathname: path });

            processedCount++;
            if (progressCallback) progressCallback((processedCount / totalEntries) * 100);
            if (i % 3 === 0) await new Promise(function(resolve) { setTimeout(resolve, 5); });
        }

        // Try to create 7z archive back via libarchive.js
        try {
            var resultFile = await Archive.write({
                files: archiveFiles,
                outputFileName: 'masked_' + fileName,
                compression: 'lzma',
                format: '7zip',
                passphrase: null
            });
            return new Blob([await resultFile.arrayBuffer()], { type: 'application/x-7z-compressed' });
        } catch (e) {
            console.warn('7z creation failed, falling back to ZIP:', e);
            var newZip = new JSZip();
            for (var j = 0; j < archiveFiles.length; j++) {
                var af = archiveFiles[j];
                var isAlreadyCompressed = /\.(jpeg|jpg|png|gif|bmp|emf|wmf|bin|mp3|mp4|wav|wmv|avi|zip|gz|7z|rar)$/i.test(af.pathname);
                newZip.file(af.pathname, af.file, {
                    compression: isAlreadyCompressed ? 'STORE' : 'DEFLATE',
                    compressionOptions: { level: 6 },
                    date: new Date(1980, 0, 1)
                });
            }
            var blob = await newZip.generateAsync({
                type: 'blob',
                mimeType: 'application/zip',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            });
            showNotification('Архив 7z перепакован в ZIP (libarchive.js не смог создать 7z: ' + e.message + ')', 'warning');
            return blob;
        }
    }

// ==================== STREAMING HELPERS ====================
    /**
     * Reads a Blob slice as text using FileReader with optional encoding.
     * @param {Blob} blob — slice of the file
     * @param {string} encoding — encoding to use (default: utf-8)
     * @returns {Promise<string>}
     */
    function readBlobAsText(blob, encoding) {
        return new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onload = function(e) {
                var result = e.target.result;
                if (encoding && encoding !== 'utf-8') {
                    try {
                        var bytes = new Uint8Array(reader.result);
                        resolve(decodeBytes(bytes, encoding));
                        return;
                    } catch(err) {}
                }
                resolve(result);
            };
            reader.onerror = function(e) { reject(e); };
            if (encoding && encoding !== 'utf-8') {
                reader.readAsArrayBuffer(blob);
            } else {
                reader.readAsText(blob);
            }
        });
    }

    /**
     * Process a large text file using File.slice() — memory-efficient streaming
     * Splits file into STREAM_CHUNK_SIZE chunks, masks each, assembles result
     * @param {File} file — original File object
     * @param {string} fileName — display name
     * @param {Array} changes — accumulator for mask changes
     * @param {Function} progressCallback — fn(percent)
     * @returns {Promise<Blob>}
     */
    async function processTextFileStreamed(file, fileName, changes, progressCallback, softMode) {
        // Detect encoding from first 8KB of file
        var headerBytes = new Uint8Array(await file.slice(0, Math.min(file.size, 8192)).arrayBuffer());
        var fileEncoding = detectEncoding(headerBytes);

        var totalSize = file.size;
        var offset = 0;
        var processedByteParts = []; // Store Uint8Array parts
        var chunkIndex = 0;
        var totalChunks = Math.ceil(totalSize / STREAM_CHUNK_SIZE);
        var carryOver = '';
        var startTime = Date.now();

        while (offset < totalSize) {
            var end = Math.min(offset + STREAM_CHUNK_SIZE, totalSize);
            var slice = file.slice(offset, end);
            var text = await readBlobAsText(slice, fileEncoding);

            if (carryOver) { text = carryOver + text; carryOver = ''; }

            var isLastChunk = (end >= totalSize);
            var textToProcess = text;
            if (!isLastChunk) {
                var lastNewline = text.lastIndexOf('\n');
                var lastCR = text.lastIndexOf('\r');
                var splitPos = Math.max(lastNewline, lastCR);
                if (splitPos > text.length * 0.5) {
                    textToProcess = text.substring(0, splitPos + 1);
                    carryOver = text.substring(splitPos + 1);
                }
            }

            var maskedText;
            if (textToProcess.length > 50000) {
                maskedText = await maskTextChunked(textToProcess, fileName, changes, null, softMode);
            } else {
                maskedText = await maskTextAsync(textToProcess, fileName, changes, softMode);
            }

            // Encode masked text back to original encoding bytes
            processedByteParts.push(encodeString(maskedText, fileEncoding));

            text = null; textToProcess = null; maskedText = null;

            offset = end - (carryOver ? carryOver.length : 0);
            chunkIndex++;

            if (progressCallback) {
                progressCallback(Math.min(95, (chunkIndex / totalChunks) * 95));
            }

            if (chunkIndex % 3 === 0) {
                await new Promise(function(resolve) { setTimeout(resolve, 5); });
            }

            if (Date.now() - startTime > 600000) {
                console.warn('Streaming timeout for file:', fileName);
                break;
            }
        }

        if (carryOver) {
            var maskedCarry = await maskTextAsync(carryOver, fileName, changes);
            processedByteParts.push(encodeString(maskedCarry, fileEncoding));
        }

        if (progressCallback) progressCallback(98);

        // Calculate total byte length and combine
        var totalByteLen = processedByteParts.reduce(function(sum, part) { return sum + part.length; }, 0);
        var bomSize = (fileEncoding === 'utf-8') ? 3 : 0;
        var combined = new Uint8Array(bomSize + totalByteLen);
        var pos = 0;
        if (bomSize === 3) {
            combined[0] = 0xEF; combined[1] = 0xBB; combined[2] = 0xBF;
            pos = 3;
        }
        for (var i = 0; i < processedByteParts.length; i++) {
            combined.set(processedByteParts[i], pos);
            pos += processedByteParts[i].length;
        }
        processedByteParts = [];

        var mimeType = (fileEncoding === 'utf-8') ? 'text/plain;charset=utf-8' : 'text/plain;charset=windows-1251';
        var finalBlob = new Blob([combined], { type: mimeType });

        if (progressCallback) progressCallback(100);
        return finalBlob;
    }

    async function processDocxStreamed(file, fileName, changes, progressCallback, softMode) {
        var arrayBuffer = await file.arrayBuffer();
        if (progressCallback) progressCallback(5);

        var zip = await JSZip.loadAsync(arrayBuffer);
        if (progressCallback) progressCallback(15);

        var docXmlEntry = zip.file('word/document.xml');
        if (docXmlEntry) {
            var docXml = await docXmlEntry.async('string');
            if (progressCallback) progressCallback(25);
            // For very large document.xml, use streamed node processing
            var maskedXml;
            if (docXml.length > 20000) {
                maskedXml = await maskDocxXmlStreamed(docXml, fileName, changes, function(p) {
                    if (progressCallback) progressCallback(25 + p * 0.25);
                });
            } else {
                maskedXml = await maskDocxXmlAsync(docXml, fileName, changes, function(p) {
                    if (progressCallback) progressCallback(25 + p * 0.25);
                });
            }
            zip.file('word/document.xml', maskedXml, { compression: 'DEFLATE', compressionOptions: { level: 6 } });
        }
        if (progressCallback) progressCallback(55);

        // Process headers/footers with streaming
        var headerFooterFiles = zip.file(/^word\/(header|footer)\d+\.xml$/);
        for (var i = 0; i < headerFooterFiles.length; i++) {
            var hfFile = headerFooterFiles[i];
            var hfXml = await hfFile.async('string');
            var maskedHf;
            if (hfXml.length > 20000) {
                maskedHf = await maskDocxXmlStreamed(hfXml, fileName, changes, null, softMode);
            } else {
                maskedHf = maskDocxXml(hfXml, fileName, changes, softMode);
            }
            zip.file(hfFile.name, maskedHf, { compression: 'DEFLATE', compressionOptions: { level: 6 } });
            if (i % 2 === 0) await new Promise(function(resolve) { setTimeout(resolve, 5); });
        }
        if (progressCallback) progressCallback(75);

        // Notes
        var noteFiles = zip.file(/^word\/(footnotes|endnotes)\.xml$/);
        for (var i = 0; i < noteFiles.length; i++) {
            var noteFile = noteFiles[i];
            var noteXml = await noteFile.async('string');
            var maskedNote = maskDocxXml(noteXml, fileName, changes, softMode);
            zip.file(noteFile.name, maskedNote, { compression: 'DEFLATE', compressionOptions: { level: 6 } });
        }
        if (progressCallback) progressCallback(85);

        // Settings & metadata
        var settingsXml = zip.file('word/settings.xml');
        if (settingsXml) {
            var settingsContent = await settingsXml.async('string');
            if (state.removeMetadata) {
                settingsContent = settingsContent.replace(/<w:defaultTabStop[^>]*\/>/g, '');
                settingsContent = settingsContent.replace(/<w:trackRevisions[^>]*\/>/g, '');
            }
            zip.file('word/settings.xml', settingsContent, { compression: 'DEFLATE', compressionOptions: { level: 6 } });
        }

        // Обработка гиперссылок в .rels файлах
        var relsFiles = zip.file(/\.rels$/);
        for (var r = 0; r < relsFiles.length; r++) {
            var relFile = relsFiles[r];
            var relContent = await relFile.async('string');
            var relChanges = [];
            var maskedRelContent = relContent.replace(/Target="([^"]+)"/g, function(match, url) {
                if (!url || url.length < 3) return match;
                var urlChanges = [];
                var masked = maskText(url, fileName, urlChanges, false);
                if (urlChanges.length > 0) {
                    relChanges.push.apply(relChanges, urlChanges.map(function(c){ return Object.assign({}, c, { source: 'rels hyperlink' }); }));
                    return 'Target="' + masked + '"';
                }
                return match;
            });
            if (relChanges.length > 0) {
                changes.push.apply(changes, relChanges);
                zip.file(relFile.name, maskedRelContent, { compression: 'DEFLATE', compressionOptions: { level: 6 } });
            }
        }

        if (state.removeMetadata) {
            var coreXml = zip.file('docProps/core.xml');
            if (coreXml) {
                zip.file('docProps/core.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"></cp:coreProperties>');
            }
            var appXml = zip.file('docProps/app.xml');
            if (appXml) {
                zip.file('docProps/app.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>MaskingTool</Application></Properties>');
            }
            var customXml = zip.file('docProps/custom.xml');
            if (customXml) zip.remove('docProps/custom.xml');
        }
        if (progressCallback) progressCallback(90);

        // Generate with streaming to avoid loading entire zip into memory
        var blob = await zip.generateAsync({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            compression: 'DEFLATE',
            compressionOptions: { level: 9 }
        });
        if (progressCallback) progressCallback(100);
        return blob;
    }

    /**
     * Streamed version of DOCX XML masking for very large XML documents
     * Processes text nodes in batches to avoid splitting huge strings
     */
    async function maskDocxXmlStreamed(xmlContent, fileName, changes, progressCallback, softMode) {
        // Split by tags but keep them
        var parts = xmlContent.split(/(<[^>]+>)/g);
        var totalParts = parts.length;
        var batchSize = 500;
        var resultParts = new Array(parts.length);

        for (var i = 0; i < parts.length; i += batchSize) {
            var end = Math.min(i + batchSize, totalParts);
            for (var j = i; j < end; j++) {
                var part = parts[j];
                if (!part.startsWith('<') && part.trim().length > 0) {
                    var maskedPart = await maskTextAsync(part, fileName, changes, softMode);
                    resultParts[j] = maskedPart;
                } else if (part.startsWith('<') && !part.startsWith('</') && !part.endsWith('/>')) {
                    var attrMasked = await maskDocxAttributesAsync(part, fileName, changes, softMode);
                    resultParts[j] = attrMasked;
                } else {
                    resultParts[j] = part;
                }
            }

            // Report progress
            if (progressCallback && i % 2000 === 0) {
                progressCallback((Math.min(i + batchSize, totalParts) / totalParts) * 100);
            }

            // Yield every batch
            await new Promise(function(resolve) { setTimeout(resolve, 0); });
        }

        if (progressCallback) progressCallback(100);
        return resultParts.join('');
    }

    /**
     * Process a large XLSX file with per-sheet streaming and column typing
     */
    
    // isDateTimeCell is defined above

async function processXlsxStreamed(file, fileName, ext, changes, progressCallback, softModeOverride) {
        // Clear caches from previous file processing
        columnTypeCache.clear();

        // XLSX files must be read as a whole due to ZIP structure,
        // but we can process sheets sequentially with yielding
        var data = await file.arrayBuffer();
        if (progressCallback) progressCallback(10);
        // v5.7.53: Yield before XLSX.read to prevent "page not responding" on large files
        await new Promise(function(resolve){ setTimeout(resolve, 0); });
        // v5.7.53: Optimized read — removed cellStyles (slow), added skips for formulas/numberformats
        var wb = XLSX.read(data, { type: 'array', cellStyles: false, cellFormula: false, cellNF: false, cellDates: false, bookDeps: false, bookFiles: false });
        if (progressCallback) progressCallback(20);

		// Reset self-detected columns
		state.selfDetectedColumns = { commercial: [], personal: [], logins: [] };

		// Rebuild trie from list data (только если самообучение включено)
		companyNameTrie = new CompanyNameTrie();
		if (state.enableSelfLearning) {
		  state.listData.forEach(function (values) {
			values.forEach(function (v) {
			  if (v.length >= 3) companyNameTrie.insert(v);
			});
		  });
		}

        var totalSheets = wb.SheetNames.length;
        var totalCells = 0;
        var processedCells = 0;

        // Count total cells
        wb.SheetNames.forEach(function(sheetName){
            var ws = wb.Sheets[sheetName]; if (!ws || !ws['!ref']) return;
            var range = XLSX.utils.decode_range(ws['!ref']);
            totalCells += (range.e.r - range.s.r + 1) * (range.e.c - range.s.c + 1);
        });

		// Phase 1 Column type detection - first pass to collect sample values
		var columnTypes = {};   // sheetName -> colIndex -> type
		var columnValues = {};  // sheetName -> colIndex -> values
		var columnHeaders = {}; // sheetName -> colIndex -> header text
		var columnLoginCounts = {}; // sheetName -> colIndex -> {count, total}

		wb.SheetNames.forEach(function(sheetName) {
		  var ws = wb.Sheets[sheetName];
		  if (!ws || !ws['!ref']) return;

		  var range = XLSX.utils.decode_range(ws['!ref']);

		  columnValues[sheetName] = {};
		  columnHeaders[sheetName] = {};
		  columnLoginCounts[sheetName] = {};

		  // 1. Определение типа по заголовкам
		  for (var C = range.s.c; C <= range.e.c; C++) {
			var headerAddr = XLSX.utils.encode_cell({ r: range.s.r, c: C });
			var headerCell = ws[headerAddr];
			var headerText = (headerCell && headerCell.v !== undefined && headerCell.v !== null)
			  ? String(headerCell.v).replace(/\s+/g, ' ').trim()
			  : '';

			columnHeaders[sheetName][C] = headerText;
			columnValues[sheetName][C] = [];
			
			// ALWAYS detect login columns (user/login/пользователь) regardless of enableHeaderDetection
			var loginType = detectLoginColumnType(headerText);
			if (loginType) {
			  columnTypes[sheetName] = columnTypes[sheetName] || {};
			  columnTypes[sheetName][C] = loginType;
			  var key = fileName + '|' + sheetName + '|' + C;
			  columnTypeCache.set(key, loginType);
			}
			
			// ALWAYS detect firstname/lastname columns (ONLY if not already a login column)
			// v5.7.47 FIX: personType must NOT overwrite loginType
			if (!loginType) {
			  var personType = detectPersonColumnType(headerText);
			  if (personType) {
			    columnTypes[sheetName] = columnTypes[sheetName] || {};
			    columnTypes[sheetName][C] = personType;
			    var key = fileName + '|' + sheetName + '|' + C;
			    columnTypeCache.set(key, personType);
			  }
			}
			
			if (state.enableHeaderDetection) {
			var detectedType = detectColumnType(headerText);
			if (detectedType && detectedType !== 'login' && detectedType !== 'person') {
			  columnTypes[sheetName] = columnTypes[sheetName] || {};
			  columnTypes[sheetName][C] = detectedType;

			  var key = fileName + '|' + sheetName + '|' + C;
			  columnTypeCache.set(key, detectedType);
			}
			}
		  }

		  // 2. Глубокий сбор непустых значений + подсчёт логинов (один проход)
		  for (var C = range.s.c; C <= range.e.c; C++) {
			var collected = 0;
			var loginCount = 0;
			var headerText = columnHeaders[sheetName][C];

			for (
			  var R = range.s.r + 1;
			  R <= range.e.r && R <= range.s.r + MAX_SAMPLE_ROWS;
			  R++
			) {
			  if (collected >= MAX_VALUES_PER_COLUMN) break;

			  var addr = XLSX.utils.encode_cell({ r: R, c: C });
			  var cell = ws[addr];

			  if (!cell || cell.v === undefined || cell.v === null) continue;

			  var raw = String(cell.v).replace(/\s+/g, ' ').trim();
			  if (!raw || raw.length < 2) continue;

			  columnValues[sheetName][C].push(raw);
			  collected++;
			  if (isLoginWithHeader(raw, headerText)) loginCount++;
			}
			columnLoginCounts[sheetName][C] = { count: loginCount, total: collected };
		  }
		});

		// Self-learning detect column types from cell values
		if (state.enableSelfLearning) {
		wb.SheetNames.forEach(function(sheetName) {
		  if (!columnValues[sheetName]) return;

		  var ws = wb.Sheets[sheetName];
		  if (!ws || !ws['!ref']) return;

		  var sheetRange = XLSX.utils.decode_range(ws['!ref']);
		  var cols = Object.keys(columnValues[sheetName]);

		  for (var i = 0; i < cols.length; i++) {
			var C = parseInt(cols[i], 10);

			if (columnTypes[sheetName] && columnTypes[sheetName][C]) continue;

			var headerText = columnHeaders[sheetName] ? columnHeaders[sheetName][C] : '';
			if (isColumnExcluded(headerText)) continue;

			var values = columnValues[sheetName][C];
			if (!values || values.length === 0) continue;

			var inferredType = detectColumnTypeFromCells(values, DETECT_SAMPLE_SIZE, headerText);
			if (!inferredType) continue;

			columnTypes[sheetName] = columnTypes[sheetName] || {};
			columnTypes[sheetName][C] = inferredType;

			var headerAddr = XLSX.utils.encode_cell({ r: sheetRange.s.r, c: C });
			var headerCell = ws[headerAddr];
			var colName = (headerCell && headerCell.v !== undefined && headerCell.v !== null)
			  ? String(headerCell.v)
			  : ('Колонка ' + (C + 1));

			if (inferredType === 'company' && state.selfDetectedColumns.commercial.indexOf(colName) === -1) {
			  state.selfDetectedColumns.commercial.push(colName);
			}
			if (inferredType === 'person' && state.selfDetectedColumns.personal.indexOf(colName) === -1) {
			  state.selfDetectedColumns.personal.push(colName);
			}
			if (inferredType === 'login' && state.selfDetectedColumns.logins.indexOf(colName) === -1) {
			  state.selfDetectedColumns.logins.push(colName);
			}

			var key = fileName + '|' + sheetName + '|' + C;
			columnTypeCache.set(key, inferredType);
		  }
		});
		}
        // Phase 3: Bulk login detection (uses counts from Phase 1 — no extra pass)
        for (var sheetName in columnLoginCounts) {
            if (!columnLoginCounts[sheetName]) continue;
            for (var C in columnLoginCounts[sheetName]) {
                if (columnTypes[sheetName] && columnTypes[sheetName][C] === 'login') continue;
                var stats = columnLoginCounts[sheetName][C];
                if (stats.count > 0 && stats.total > 0 && stats.count / stats.total >= 0.8) {
                    columnTypes[sheetName] = columnTypes[sheetName] || {};
                    columnTypes[sheetName][C] = 'login';
                }
            }
        }

// Phase 2 Process cells with column type awareness, skip excluded columns
for (var s = 0; s < wb.SheetNames.length; s++) {
  var sheetName = wb.SheetNames[s];
  var ws = wb.Sheets[sheetName];
  if (!ws || !ws['!ref']) continue;

  var range = XLSX.utils.decode_range(ws['!ref']);

  for (var R = range.s.r + 1; R <= range.e.r; R++) {
    for (var C = range.s.c; C <= range.e.c; C++) {
      var addr = XLSX.utils.encode_cell({ r: R, c: C });
      var cell = ws[addr];

      // 1) Формулы не трогаем, чтобы Excel не удалял их при ремонте
      if (cell && cell.f !== undefined && cell.f !== null) {
        continue;
      }

      if (cell && cell.v !== undefined && cell.v !== null) {
        // Skip date/time cells to preserve formatting and avoid false pattern matches
        if (isDateTimeCell(cell)) {
          processedCells++;
          continue;
        }
        var val = String(cell.v);
        var fileChanges = [];
        var headerText = columnHeaders[sheetName] && columnHeaders[sheetName][C];
        var isExcluded = isColumnExcluded(headerText);
        // Toggle "mask only selected columns": exclude unselected columns
        if (!isExcluded && state.maskSelectedColumnsOnly && !isColumnSelectedForMasking(headerText)) {
            isExcluded = true;
        }
        var isDigitMask = isDigitMaskColumn(headerText);
        var colType = !isExcluded && columnTypes[sheetName] && columnTypes[sheetName][C];
        var softMode = (softModeOverride !== undefined) ? softModeOverride : (state.enableSoftMaskAll || isSoftMaskColumn(headerText));
        var masked;

        if (!isExcluded) {
          if (R === range.s.r) {
            // Header row: NEVER mask column headers
            masked = val;
          } else if (colType) {
            // v5.7.47 FIX: typed columns (login/person/company) ALWAYS use applyMaskByType
            // BEFORE softMode — prevents softMode from intercepting person/company columns
            masked = applyMaskByType(val, colType);
            fileChanges.push({
              type: colType === 'company' ? 'company' : colType === 'person' ? 'ФИО' : colType === 'login' ? 'Имя пользователя' : colType,
              original: val,
              maskPreview: masked,
              masked: masked,
              rule: 'columntype ' + colType,
              fileName: fileName,
              cell: addr,
              sheet: sheetName,
              confidence: 'high'
            });
          } else if (softMode) {
            // Мягкое маскирование: only for untyped columns
            if (val.length > 100) masked = await maskTextAsync(val, fileName, fileChanges, true);
            else masked = maskText(val, fileName, fileChanges, true);
          } else {
            // Полное маскирование по всем активным шаблонам
            if (val.length > 100) masked = await maskTextAsync(val, fileName, fileChanges, false);
            else masked = maskText(val, fileName, fileChanges, false);
          }
        }

        // Phase LAST: digit masking — AFTER all other masking/hashing operations
        if (!isExcluded && isDigitMask) {
          var digitMasked = (masked !== undefined && masked !== val) ? masked.replace(/\d/g, state.maskChar || '*') : val.replace(/\d/g, state.maskChar || '*');
          if (digitMasked !== val) {
            masked = digitMasked;
            fileChanges.push({
              type: 'digits',
              original: val,
              maskPreview: masked,
              masked: masked,
              rule: 'digitmask column',
              fileName: fileName,
              cell: addr,
              sheet: sheetName,
              confidence: 'high'
            });
          }
        }

        // v5.7.54 FIX: limit changes per file, not per cell — prevents unbounded memory growth on large files
        // v5.7.54 FIX: limit changes per file, not per cell — prevents unbounded memory growth on large files
        if (fileChanges.length > 0) {
          cell.v = truncateCellValue(masked);
          cell.t = 's';
          delete cell.w;
          delete cell.z;

          changes.push.apply(changes, fileChanges.slice().map(function(c) {
            return Object.assign({}, c, { cell: addr, sheet: sheetName });
          }));
        }

        // Обработка гиперссылок в ячейке
        if (cell.l && cell.l.Target) {
          var linkChanges = [];
          var linkMasked = maskText(cell.l.Target, fileName, linkChanges, softMode);
          if (linkChanges.length > 0) {
            cell.l.Target = linkMasked;
            changes.push.apply(changes, linkChanges.map(function(c) {
              return Object.assign({}, c, { cell: addr + ' (hyperlink)', sheet: sheetName, type: c.type + ' (ссылка)' });
            }));
          }
          if (cell.l.Tooltip) {
            var tooltipChanges = [];
            var tooltipMasked = maskText(cell.l.Tooltip, fileName, tooltipChanges, softMode);
            if (tooltipChanges.length > 0) {
              cell.l.Tooltip = tooltipMasked;
              changes._totalChanges = (changes._totalChanges || 0) + tooltipChanges.length;
              changes.push.apply(changes, tooltipChanges.map(function(c) {
                return Object.assign({}, c, { cell: addr + ' (tooltip)', sheet: sheetName, type: c.type + ' (tooltip)' });
              }));
            }
          }
        }

        processedCells++;
        // v5.7.53: yield every 1000 cells (was 50) — faster XLSX processing
        if (processedCells % 1000 === 0) {
          if (progressCallback) {
            var sheetProgress = (processedCells / totalCells) * 60;
            progressCallback(20 + sheetProgress);
          }
          await new Promise(function(resolve) { setTimeout(resolve, 0); });
        }
      }
    }
  }
}

if (progressCallback) progressCallback(95);

// Для XLSX остаёмся в XLSX, для XLSB — в XLSB
var lowerName = (fileName || '').toLowerCase();
var isXlsbInput = (ext === 'xlsb') || lowerName.endsWith('.xlsb');

var bookType = isXlsbInput ? 'xlsb' : 'xlsx';
var mimeType = isXlsbInput
  ? 'application/vnd.ms-excel.sheet.binary.macroEnabled.12'
  : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// v5.7.53: Optimized write — minimal output, no extra metadata/styles
var newWbData = XLSX.write(wb, {
  type: 'array',
  bookType: bookType,
  compression: true,
  cellStyles: false,
  bookSST: true
});

if (progressCallback) progressCallback(100);
return new Blob([newWbData], { type: mimeType });
    }

    // v5.7.54: processXlsxWithYield — deduplicated wrapper for non-streaming XLSX processing
    async function processXlsxWithYield(file, fileName, ext, changes, progressCallback, softModeOverride) {
        return processXlsxStreamed(file, fileName, ext, changes, progressCallback, softModeOverride);
    }

    // ==================== OPF CONSTANTS ====================
    var OPF_LIST = ['ООО','АО','ПАО','ЗАО','ОАО','ИП','НКО','ФГУП','ГУП','МУП','АНО','Фонд','Союз','Ассоциация','ТСЖ','СНТ','ГБУ','МБУ','ФГБУ'];
    var OPF_FULL_LIST = ['ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ','АКЦИОНЕРНОЕ ОБЩЕСТВО'];
    var OPF_INTL_LIST = ['Ltd','Inc','GmbH','S.A.','B.V.','LLP','PLC','Corp'];
    var ALL_OPF_FOR_REGEX = OPF_LIST.concat(OPF_FULL_LIST).concat(OPF_INTL_LIST);
    var OPF_REGEX_PART = ALL_OPF_FOR_REGEX.map(function(opf){ return '\\b' + opf.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '\\b'; }).join('|');

    // ==================== COLUMN HEADER DETECTION ====================
    var DEFAULT_COMMERCIAL_COLUMNS = [
  // Твои исходные
  'Наименование экспедитора',
  'Наименование получателя',
  'Наименование заказчика',
  'Наименование грузоотправителя',
  'Наименование грузополучателя',
  'Наименование завода-производителя',
  'Наименование завода',
  'Краткий текст материала',
  'Резерв клиента',

  // Базово про контрагентов и компании
  'контрагент',
  'контрагенты',
  'контрагент название',
  'контрагент название',
  'контрагент имя',
  'контрагент полное',
  'организация',
  'организации',
  'юрлицо',
  'юридическое лицо',
  'юр. лицо',
  'компания',
  'компании',
  'фирма',
  'фирмы',
  'предприятие',
  'название контрагента',
  'название компании',
  'название организации',
  'группа контрагентов',
  'группа контрагента',

  // Роль контрагента
  'покупатель',
  'покупатели',
  'поставщик',
  'поставщики',
  'клиент',
  'клиенты',
  'заказчик',
  'исполнитель',
  'vendor',
  'supplier',
  'customer',
  'client',
  'dealer',
  'partner',
  'партнер',
  'партнёр',
  'дистрибьютор',
  'дилер',
  'агент',
  'агенты',
  'посредник',

  // Налоговые идентификаторы
  'inn',
  'инн',
  'инн контрагента',
  'инн организации',
  'ogrn',
  'огрн',
  'ogrnip',
  'огрнип',
  'kpp',
  'кпп',
  'код по окпо',
  'окпо',
  'tax id',
  'taxid',

  // Адреса и реквизиты контрагента
  'юридический адрес',
  'фактический адрес',
  'адрес контрагента',
  'адрес организации',
  'банковские реквизиты',
  'реквизиты контрагента',
  'реквизиты организации',
  'расчетный счет',
  'расчётный счет',
  'р/с',
  'р/счет',
  'р/счёт',
  'бик',
  'банк получателя',
  'название банка',
  'корреспондентский счет',
  'к/с',
  'к/счет',
  'к/счёт',
  'получатель платежа',
  'получатель средств'

    ];
    var DEFAULT_PERSONAL_COLUMNS = [
	
	// Твои исходные
  'Пользователь',
  'Login',
  'ФИО',
  'Фамилия',

  // Логины, учётные записи, пользователи
  'логин',
  'user',
  'username',
  'user name',
  'account',
  'учетная запись',
  'учётная запись',
  'учетная запись ad',
  'учётная запись ad',
  'учетная запись пользователя',
  'учётная запись пользователя',
  'пользователи',
  'пользователь ad',
  'пользователь домена',
  'учетная запись домена',
  'учётная запись домена',

  // ФИО и части ФИО
  'фио',
  'фио сотрудника',
  'фио пользователя',
  'фамилия',
  'имя',
  'отчество',
  'фамилия имя отчество',
  'фамилия и.о.',
  'фамилия и. о.',
  'инициалы',
  'initials',
  'firstname',
  'lastname',
  'first name',
  'last name',

  // Сотрудники, физлица
  'сотрудник',
  'сотрудники',
  'работник',
  'работники',
  'employee',
  'employees',
  'staff',
  'person',
  'персона',

  // Ответственные / контакты
  'ответственный',
  'ответственное лицо',
  'ответственный сотрудник',
  'контактное лицо',
  'контакт',
  'контакты',
  'manager',
  'account manager',

  // E-mail / почта
  'email',
  'e-mail',
  'почта',
  'электронная почта',
  'email сотрудника',
  'почта сотрудника',
  'корпоративная почта',

  // Телефоны
  'телефон',
  'телефон сотрудника',
  'мобильный телефон',
  'мобильный',
  'сотовый',
  'mobile',
  'mobile phone',
  'phone',
  'contact phone',

  // Документы и идентификаторы физлица
  'паспорт',
  'паспортные данные',
  'серия и номер паспорта',
  'снилс',
  'snils',
  'инн физлица',
  'инн сотрудника',
  'инн работника',

  // Даты рождения
  'дата рождения',
  'дата рождения сотрудника',
  'др',
  'birthdate',
  'date of birth',

  // Адреса физлиц
  'адрес регистрации',
  'адрес проживания',
  'адрес прописки',
  'домашний адрес',
  'адрес сотрудника'
	
	];

    // ==================== TRIE STRUCTURE FOR COMPANY NAMES ====================
    function CompanyNameTrie() {
        this.root = {};
        this.count = 0;
    }
    CompanyNameTrie.prototype.insert = function(name) {
        var node = this.root;
        var chars = name.toLowerCase().replace(/\s+/g, '');
        for (var i = 0; i < chars.length; i++) {
            if (!node[chars[i]]) node[chars[i]] = {};
            node = node[chars[i]];
        }
        node._end = true;
        this.count++;
    };
    CompanyNameTrie.prototype.findInText = function(text) {
        var results = [];
        var normalized = text.toLowerCase().replace(/\s+/g, '');
        for (var i = 0; i < normalized.length; i++) {
            var node = this.root;
            var j = i;
            while (j < normalized.length && node[normalized[j]]) {
                node = node[normalized[j]];
                if (node._end) {
                    results.push(text.substring(i, j + 1));
                }
                j++;
            }
        }
        return results;
    };
    CompanyNameTrie.prototype.contains = function(text) {
        var normalized = text.toLowerCase().replace(/\s+/g, '');
        for (var i = 0; i < normalized.length; i++) {
            var node = this.root;
            var j = i;
            while (j < normalized.length && node[normalized[j]]) {
                node = node[normalized[j]];
                if (node._end) return true;
                j++;
            }
        }
        return false;
    };

    // ==================== COLUMN TYPE CACHE ====================
    var columnTypeCache = new Map();
    var companyNameTrie = new CompanyNameTrie();
    var listBasedCompanyNames = new Set();

    function getCachedColumnType(workbookId, sheetName, colIndex, header) {
        var key = workbookId + '|' + sheetName + '|' + colIndex;
        if (columnTypeCache.has(key)) return columnTypeCache.get(key);
        var type = detectColumnType(header);
        columnTypeCache.set(key, type);
        return type;
    }

    // ==================== SELF-LEARNING: COLUMN TYPE DETECTION ====================
    // Check if word appears as a standalone word in text (word boundary)
    function _isWordInText(text, word) {
        if (!text || !word) return false;
        var idx = text.indexOf(word.toLowerCase());
        if (idx === -1) return false;
        // Check word boundary before and after
        // Note: _ is NOT a word char here — so "login" in "usr_login" is a match
        var WORD_CHAR = /[A-Za-zА-Яа-яЁё0-9]/;
        var beforeOk = (idx === 0) || !WORD_CHAR.test(text[idx - 1]);
        var afterOk = (idx + word.length >= text.length) || !WORD_CHAR.test(text[idx + word.length]);
        return beforeOk && afterOk;
    }

    function detectColumnType(headerText) {
        if (!headerText) return null;
        // Check excluded columns first — if matched, do not type
        if (isColumnExcluded(headerText)) return null;
        var h = String(headerText).trim().toLowerCase();

        // Check for login/username columns FIRST (before any other detection)
        // This includes headers like: user, login, usr_login, ad_user, username, etc.
        var loginKeywords = ['user', 'username', 'login', 'логин', 'пользователь', 'учетная запись', 'учётная запись', 'учетная', 'учётная', 'ад пользователя', 'ad пользователя', 'domain user', 'имя пользователя'];
        for (var i = 0; i < loginKeywords.length; i++) {
            if (_isWordInText(h, loginKeywords[i])) return 'login';
        }

        var commCols = state.customCommercialColumns || [];
        var persCols = state.customPersonalColumns || [];
        var allComm = DEFAULT_COMMERCIAL_COLUMNS.concat(commCols);
        var allPers = DEFAULT_PERSONAL_COLUMNS.concat(persCols);

        for (var i = 0; i < allComm.length; i++) {
            if (_isWordInText(h, allComm[i])) return 'company';
        }
        for (var i = 0; i < allPers.length; i++) {
            if (_isWordInText(h, allPers[i])) {
                // Additional check: if it contains login/user keywords, classify as login
                for (var j = 0; j < loginKeywords.length; j++) {
                    if (_isWordInText(h, loginKeywords[j])) return 'login';
                }
                return 'person';
            }
        }
        return null;
    }

    /**
     * Detects ONLY login/username columns — works independently of enableHeaderDetection.
     * Always active to ensure login columns are masked even in softMode.
     */
    // Headers that should NEVER be typed as login
    // v5.7.51: Added 'статус' and other common non-login headers
    var NON_LOGIN_HEADERS = ['система', 'system', 'транзакция', 'transaction', 'статус', 'status', 'дата', 'date', 'номер', 'number', 'код', 'code', 'тип', 'type', 'описание', 'description', 'примечание', 'note', 'комментарий', 'comment', 'сумма', 'amount', 'цена', 'price'];

    function detectLoginColumnType(headerText) {
        if (!headerText) return null;
        if (isColumnExcluded(headerText)) return null;
        var h = String(headerText).trim().toLowerCase();
        // Never type system/transaction columns as login
        for (var i = 0; i < NON_LOGIN_HEADERS.length; i++) {
            if (_isWordInText(h, NON_LOGIN_HEADERS[i])) return null;
        }
        // Login keywords — checked with _isWordInText for word boundary matching
        var loginKeywords = ['user', 'username', 'login', 'логин', 'пользователь',
                             'учетная запись', 'учётная запись', 'ад пользователя', 'ad пользователя',
                             'domain user', 'имя пользователя', 'account', 'acct', 'signin', 'sign-in', 'auth',
                             'credential', 'uid', 'userid', 'user_id', 'samaccountname', 'upn', 'principal',
                             'identity', 'sso', 'windows login', 'ad login', 'domain login', 'net user'];
        for (var i = 0; i < loginKeywords.length; i++) {
            if (_isWordInText(h, loginKeywords[i])) return 'login';
        }
        // Also check custom personal columns for login keywords
        var persCols = state.customPersonalColumns || [];
        for (var i = 0; i < persCols.length; i++) {
            if (_isWordInText(h, persCols[i])) {
                for (var j = 0; j < loginKeywords.length; j++) {
                    if (_isWordInText(h, loginKeywords[j])) return 'login';
                }
            }
        }
        return null;
    }

    /**
     * Detects firstname/lastname columns — works independently of enableHeaderDetection.
     * Always active to ensure name columns are masked as FIO even when header detection is off.
     */
    function detectPersonColumnType(headerText) {
        if (!headerText) return null;
        if (isColumnExcluded(headerText)) return null;
        var h = String(headerText).trim().toLowerCase();
        // v5.7.47: added 'фио', 'fio', 'fullname', 'full name', 'family name', 'given name', 'first_name', 'last_name', 'отчество'
        var personKeywords = ['firstname', 'lastname', 'first name', 'last name', 'first_name', 'last_name', 'имя', 'фамилия', 'фио', 'fio', 'fullname', 'full name', 'family name', 'given name', 'отчество'];
        for (var i = 0; i < personKeywords.length; i++) {
            if (_isWordInText(h, personKeywords[i])) return 'person';
        }
        return null;
    }

    // ==================== SELF-LEARNING: DETECT TYPE FROM CELL VALUES ====================
    
	function detectColumnTypeFromCells(cellValues, sampleSize, headerText) {
	  sampleSize = sampleSize || DETECT_SAMPLE_SIZE;

	  // колонка в белом списке — не типизируем
	  if (headerText && isColumnExcluded(headerText)) return null;

	  // нормализация и отбор непустых значений
	  var values = cellValues
		.map(function (v) { return v == null ? '' : String(v); })
		.map(function (s) { return s.replace(/\s+/g, ' ').trim(); })
		.filter(function (s) { return s.length > 1; });

	  if (!values.length) return null;

	  var sample = values.slice(0, Math.min(sampleSize, values.length));

	  var companyCount = 0;
	  var companyIdCount = 0;
	  var personCount = 0;
	  var loginCount = 0;

	  for (var i = 0; i < sample.length; i++) {
		var val = sample[i];
		if (!val) continue;

		// названия компаний (ООО, АО, список, кавычки и т.п.)
		if (isCompanyName(val)) companyCount++;

		// числовые идентификаторы контрагентов
		if (isInnLike(val) || isOgrnLike(val) || isKppLike(val)) companyIdCount++;

		// ФИО
		if (isPersonName(val)) personCount++;

		// логины / учётки
		if (isLogin(val)) loginCount++;
	  }

	  // усиливаем сигнал company за счёт ИНН/ОГРН/КПП
	  companyCount += companyIdCount;

	  if (!companyCount && !personCount && !loginCount) return null;

	  function passes(count, frac) {
		var neededByFrac = Math.ceil(sample.length * frac);
		var neededMin = 2; // минимум два совпадения
		return count >= neededMin && count >= neededByFrac;
	  }

	  // приоритет person, как раньше
	  if (passes(personCount, 0.25) &&
		  personCount >= companyCount &&
		  personCount >= loginCount) {
		return 'person';
	  }

	  // для company делаем порог по доле чуть мягче (0.25)
	  if (passes(companyCount, 0.25) &&
		  companyCount >= personCount &&
		  companyCount >= loginCount) {
		return 'company';
	  }

	  if (passes(loginCount, 0.3) &&
		  loginCount >= personCount &&
		  loginCount >= companyCount) {
		return 'login';
	  }

	  return null;
	}

    function isCompanyName(val) {
        if (!val || val.length < 3) return false;
        var v = val.toLowerCase();
        for (var i = 0; i < ALL_OPF_FOR_REGEX.length; i++) {
            if (v.indexOf(ALL_OPF_FOR_REGEX[i].toLowerCase()) !== -1) return true;
        }
        if (companyNameTrie.contains(val)) return true;
        if (/[А-ЯЁA-Z][а-яёa-z]+\s+(?:логистика|трейдинг|холдинг|групп|нефте|хим|пром|строй|транс|сервис|консалтинг|машин|металл|агро|фарм|банк|страх|инвест|финанс|инжиниринг|компани|систем|техно|электро|газ|уголь|цемент|карьер|мяс|молок|хлеб)/gi.test(val)) return true;
        return false;
    }

	function isInnLike(val) {
	  if (!val) return false;
	  var digits = String(val).replace(/\D/g, '');
	  // ИНН юрлиц – 10 цифр, ИНН физлиц/ИП – 12 цифр
	  return digits.length === 10 || digits.length === 12;
	}

	function isOgrnLike(val) {
	  if (!val) return false;
	  var digits = String(val).replace(/\D/g, '');
	  // ОГРН – 13, ОГРНИП – 15
	  return digits.length === 13 || digits.length === 15;
	}

	function isKppLike(val) {
	  if (!val) return false;
	  var digits = String(val).replace(/\D/g, '');
	  // КПП – 9 цифр
	  return digits.length === 9;
	}


	function isPersonName(val) {
	  if (!val || String(val).length < 3) return false;
	  // Normalize: replace underscores and multiple spaces with single space
	  var v = String(val).replace(/[_\s]+/g, ' ').trim();

	  // 4 слова с дефисами
	  if (/^[А-ЯЁ][а-яё]{2,}(?:\-[А-ЯЁ][а-яё]{2,})*\s+[А-ЯЁ][а-яё]{2,}(?:\-[А-ЯЁ][а-яё]{2,})*\s+[А-ЯЁ][а-яё]{2,}(?:\-[А-ЯЁ][а-яё]{2,})*\s+[А-ЯЁ][а-яё]{2,}(?:\-[А-ЯЁ][а-яё]{2,})*$/.test(v)) return true;

	  // 3 слова с дефисами: Первухина-Вейс Алёна Дмитриевна
	  if (/^[А-ЯЁ][а-яё]{2,}(?:\-[А-ЯЁ][а-яё]{2,})*\s+[А-ЯЁ][а-яё]{2,}(?:\-[А-ЯЁ][а-яё]{2,})*\s+[А-ЯЁ][а-яё]{2,}(?:\-[А-ЯЁ][а-яё]{2,})*$/.test(v)) return true;

	  // ФИ (2 слова) с дефисом
	  if (/^[А-ЯЁ][а-яё]{2,}(?:\-[А-ЯЁ][а-яё]{2,})*\s+[А-ЯЁ][а-яё]{2,}(?:\-[А-ЯЁ][а-яё]{2,})*$/.test(v)) return true;

	  // Фамилия + инициалы: Иванов А.А.
	  if (/^[А-ЯЁ][а-яё]{2,25}\s+[А-ЯЁ]\.\s*[А-ЯЁ]\.$/.test(v)) return true;

	  // Инициалы + фамилия: А.А. Иванов, А. Иванов, АН Иванов, АВ Иванов
	  // Pattern: initials (with or without dots) followed by surname
	  // "А.А. Иванов" - two initials with dots
	  if (/^[А-ЯЁ]\.\s*[А-ЯЁ]?\.?\s+[А-ЯЁ][а-яё]{2,25}$/.test(v)) return true;
	  // "АН Иванов" - two uppercase letters (compact initials) + surname
	  // Allow mixed case in surname (e.g., РАссказов in some filenames)
	  if (/^[А-ЯЁ]{2}\s+[А-ЯЁ][А-Яа-яЁё]{2,25}$/.test(v)) return true;

	  // Латиница
	  if (/^[A-Z][a-zA-Z]{1,15}\s+[A-Z][a-zA-Z]{1,15}(?:\s+[A-Z][a-zA-Z]{1,15})?$/.test(v)) return true;

	  return false;
	}

    // v5.7.60: Common words that should NEVER be treated as logins
    var COMMON_WORDS_NOT_LOGIN = [
        'window_session','[sensitive]','chat','FTE',
        'Microsoft','Excel','Word','PowerPoint','Outlook','Windows','Office','Adobe','Google','Amazon','Apple','Samsung',
        'Intel','Oracle','SAP','IBM','Cisco','Dell','HP','Lenovo','Firefox','Chrome','Safari','Edge','Explorer','Visual',
        'Studio','Code','GitHub','GitLab','Docker','Kubernetes','Jenkins','Jira','Confluence','Slack','Teams','Telegram',
        'WhatsApp','Skype','Zoom','WebEx','Internet','Server','Client','Database','Application','Program','System',
        'Network','Domain','Service','Manager','Admin','Guest','Test','Default','Public','Private','General','Specific',
        'Local','Remote','Global','Internal','External','Primary','Secondary','Main','Master','Backup','Archive','Log',
        'Data','File','Folder','Directory','Path','Root','Home','Temp','Cache','Config','Settings','Profile','Account',
        'Session','Token','Cookie','Key','Password','Secret','Auth','Permission','Role','Group','Member','Owner','Creator',
        'Editor','Viewer','Reader','Writer','Uploader','Downloader','Subscriber','Publisher','Moderator','Administrator',
        'Supervisor','Coordinator','Operator','Technician','Engineer','Developer','Designer','Analyst','Consultant',
        'Specialist','Expert','Professional','Assistant','Support','Help','Contact','Email','Mail','Phone','Mobile',
        'Fax','Address','Location','City','Country','Region','State','Zip','Code','Number','ID','Index','Reference',
        'Serial','Version','Release','Build','Patch','Update','Upgrade','Install','Setup','Configuration','Deployment',
        'Distribution','Package','Module','Component','Library','Framework','Platform','Environment','Runtime','Compiler',
        'Interpreter','Parser','Generator','Renderer','Processor','Handler','Controller','Model','View','Template','Layout',
        'Style','Sheet','Page','Section','Paragraph','Sentence','Word','Character','Symbol','Letter','Digit','Integer',
        'Float','Double','Decimal','Boolean','String','Array','List','Map','Set','Object','Class','Function','Method',
        'Procedure','Routine','Task','Job','Process','Thread','Signal','Event','Action','Operation','Transaction',
        'Request','Response','Query','Command','Instruction','Statement','Expression','Block','Scope','Namespace',
        'Import','Export','Define','Assign','Evaluate','Execute','Run','Start','Stop','Idle','Pause','Resume','Restart','Reload',
        'Refresh','Reset','Clear','Delete','Remove','Add','Insert','Append','Create','Make','Generate','Produce','Build',
        'Compile','Link','Load','Save','Store','Write','Read','Open','Close','Connect','Disconnect','Bind','Attach','Mount',
        'Lock','Unlock','Enable','Disable','Activate','Deactivate','Show','Hide','Display','Print','Render','Draw','Paint',
        'Fill','Erase','Cut','Copy','Paste','Move','Drag','Drop','Select','Deselect','Check','Uncheck','Toggle','Switch',
        'Change','Modify','Edit','Update','Alter','Transform','Convert','Format','Serialize','Deserialize','Encode','Decode',
        'Encrypt','Decrypt','Compress','Decompress','Archive','Extract','Merge','Split','Join','Separate','Divide','Multiply',
        'Calculate','Compute','Estimate','Round','Truncate','Absolute','Relative','Positive','Negative','Zero','Null','Nil',
        'None','Empty','Void','Blank','Space','Tab','Newline','Line','Column','Row','Cell','Field','Record','Entry','Item',
        'Element','Node','Leaf','Branch','Tree','Graph','Chart','Diagram','Table','Matrix','Vector','Scalar','Point','Curve',
        'Surface','Volume','Area','Length','Width','Height','Depth','Size','Dimension','Scale','Ratio','Proportion','Percentage',
        'Fraction','Decimal','Hexadecimal','Octal','Binary','Bit','Byte','Kilobyte','Megabyte','Gigabyte','Terabyte','Hertz',
        'Second','Minute','Hour','Day','Week','Month','Year','Date','Time','Timestamp','Calendar','Schedule','Period','Duration',
        'Interval','Timeout','Deadline','Limit','Boundary','Threshold','Minimum','Maximum','Min','Max','Avg','Average','Mean',
        'Median','Mode','Standard','Deviation','Variance','Sample','Population','Distribution','Frequency','Probability',
        'Chance','Risk','Error','Mistake','Fault','Defect','Bug','Issue','Problem','Ticket','Case','Incident','Alert','Warning',
        'Notice','Message','Notification','Info','Information','Content','Text','Label','Title','Name','Description','Comment',
        'Note','Annotation','Tag','Keyword','Category','Type','Kind','Sort','Collection','Queue','Stack','Heap','Pool','Buffer',
        'Stream','Flow','Pipe','Channel','Socket','Port','Interface','API','Endpoint','URL','URI','URN','Route','Link','Connection',
        'Conversation','Dialog','Packet','Frame','Segment','Datagram','Traffic','Bandwidth','Throughput','Latency','Delay','Loss',
        'Speed','Velocity','Temperature','Humidity','Brightness','Contrast','Saturation','Hue','Color','Colour','Red','Green',
        'Blue','Yellow','Orange','Purple','Pink','Brown','Black','White','Gray','Grey','Silver','Gold','Bronze','Copper','Iron',
        'Steel','Plastic','Rubber','Glass','Wood','Stone','Concrete','Brick','Tile','Fabric','Leather','Paper','Cardboard','Metal',
        'Material','Substance','Chemical','Compound','Mixture','Solution','Liquid','Solid','Gas','Energy','Power','Electricity',
        'Voltage','Current','Resistance','Capacitance','Inductance','Frequency','Wavelength','Amplitude','Phase','Polarity',
        'Charge','Magnet','Wave','Particle','Atom','Molecule','Electron','Proton','Neutron','Nucleus','Bond','Reaction','Catalyst',
        'Enzyme','Protein','DNA','RNA','Gene','Virus','Bacteria','Disease','Illness','Symptom','Diagnosis','Treatment','Medicine',
        'Drug','Pill','Tablet','Capsule','Injection','Vaccine','Cure','Remedy','Health','Fitness','Nutrition','Diet','Exercise',
        'Sport','Game','Play','Match','Tournament','Championship','Competition','Race','Contest','League','Division','Conference',
        'Team','Club','Squad','Crew','Staff','Personnel','Workforce','Employee','Worker','Laborer','Farmer','Miner','Craftsman',
        'Artisan','Artist','Musician','Composer','Singer','Dancer','Actor','Actress','Writer','Author','Novelist','Journalist',
        'Reporter','Editor','Publisher','Teacher','Professor','Instructor','Lecturer','Tutor','Mentor','Coach','Trainer','Advisor',
        'Counselor','Therapist','Psychologist','Scientist','Researcher','Scholar','Academic','Physicist','Chemist','Biologist',
        'Mathematician','Statistician','Sociologist','Geologist','Astronomer','Engineer','Doctor','Physician','Nurse','Surgeon',
        'Dentist','Pharmacist','Veterinarian','Pilot','Driver','Captain','Sailor','Soldier','Officer','General','Lieutenant',
        'Sergeant','Corporal','Private','President','Governor','Mayor','Senator','Congressman','Representative','Minister',
        'Secretary','Ambassador','Judge','Lawyer','Attorney','Prosecutor','Defendant','Plaintiff','Witness','Jury','Court',
        'Police','Sheriff','Detective','Agent','Spy','Guard','Security','Rescue','Firefighter','Paramedic','Medic','Volunteer',
        'Student','Pupil','Graduate','Undergraduate','Postgraduate','Doctorate','Bachelor','Master','Diploma','Certificate',
        'License','Degree','Grade','Score','Mark','Rank','Level','Tier','Stage','Phase','Step','Phase','Stage','Period','Era',
        'Epoch','Age','Generation','Decade','Century','Millennium','Quarter','Semester','Term','Session','Class','Course','Lesson',
        'Lecture','Seminar','Workshop','Training','Practice','Exercise','Drill','Exam','Test','Quiz','Assessment','Evaluation',
        'Review','Audit','Inspection','Survey','Poll','Study','Research','Analysis','Investigation','Inquiry','Search','Lookup',
        'Query','Request','Application','Submission','Proposal','Project','Plan','Scheme','Strategy','Policy','Procedure',
        'Protocol','Guideline','Standard','Norm','Rule','Regulation','Law','Act','Statute','Constitution','Treaty','Agreement',
        'Contract','Deal','Transaction','Exchange','Trade','Sale','Purchase','Order','Invoice','Bill','Receipt','Payment',
        'Refund','Deposit','Withdrawal','Transfer','Loan','Credit','Debit','Interest','Dividend','Profit','Loss','Revenue',
        'Income','Expense','Cost','Price','Rate','Fee','Charge','Tariff','Tax','Duty','Levy','Fine','Penalty','Sanction',
        'Ban','Restriction','Limitation','Constraint','Barrier','Obstacle','Challenge','Difficulty','Problem','Issue',
        'Matter','Subject','Topic','Theme','Subject','Course','Curriculum','Syllabus','Program','Schedule','Agenda','Calendar',
        'Timeline','Deadline','Milestone','Checkpoint','Goal','Objective','Target','Aim','Purpose','Intent','Mission','Vision',
        'Value','Principle','Ethic','Moral','Belief','Faith','Religion','Church','Temple','Mosque','Synagogue','Shrine','Monastery',
        'Convent','Cemetery','Grave','Tomb','Memorial','Monument','Statue','Sculpture','Painting','Drawing','Sketch','Portrait',
        'Landscape','Seascape','Still','Life','Abstract','Impression','Expression','Surrealism','Cubism','Realism','Romanticism',
        'Classicism','Neoclassicism','Baroque','Rococo','Gothic','Renaissance','Modernism','Postmodernism','Contemporary','Avant',
        'Garde','Minimalism','Maximalism','Brutalism','Deconstructivism','Futurism','Constructivism','Suprematism','Bauhaus',
        'Art','Nouveau','Deco','Arts','Crafts','Pre','Raphaelite','Symbolism','Fauvism','Expressionism','Dadaism','Surrealism',
        'Abstract','Expressionism','Pop','Art','Op','Art','Kinetic','Art','Conceptual','Art','Performance','Art','Installation',
        'Art','Land','Art','Video','Art','Digital','Art','Net','Art','Virtual','Art','Street','Art','Graffiti','Stencil','Wheat',
        'Paste','Sticker','Mosaic','Yarn','Bombing','Guerrilla','Art','Activist','Art','Protest','Art','Tactical','Media','Bio',
        'Art','Nano','Art','Robotic','Art','Telematic','Art','Transgenic','Art','Sound','Art','Noise','Music','Ambient','Drone',
        'Musique','Concrete','Acoustic','Electroacoustic','Algorithmic','Generative','Aleatoric','Stochastic','Spectral',
        'Microtonal','Minimal','Phase','Process','Totalism','Extended','Technique','New','Complexity','Polytemporal','Polyrhythm',
        'Just','Intonation','Meantone','Well','Temperament','Equal','Temperament','Pythagorean','Ptolemaic','Superparticular',
        'Interval','Comma','Syntonic','Diesis','Limma','Apotome','Schisma','Kleisma','Diaschisma','Semicomma','Major','Tone',
        'Minor','Tone','Semitone','Tone','Whole','Tone','Semitone','Tritone','Tritone','Octave','Fifth','Fourth','Third','Sixth',
        'Seventh','Ninth','Eleventh','Thirteenth','Diminished','Augmented','Perfect','Major','Minor','Dominant','Subdominant',
        'Supertonic','Mediant','Submediant','Leading','Tone','Subtonic','Tonic','Key','Signature','Clef','Staff','Stave','Ledger',
        'Line','Space','Note','Head','Stem','Flag','Beam','Rest','Dot','Tie','Slur','Phrase','Bar','Line','Measure','Repeat',
        'Sign','Volta','Bracket','Brace','Coda','Segno','Da','Capo','Dal','Fine','Fermata','Caesura','Breath','Mark','Glissando',
        'Portamento','Vibrato','Tremolo','Trill','Turn','Mordent','Appoggiatura','Acciaccatura','Grace','Note','Arpeggio',
        'Chord','Scale','Arpeggio','Glissando','Tremolo','Vibrato','Staccato','Legato','Marcato','Accent','Tenuto','Sforzando',
        'Rinforzando','Piano','Mezzo','Forte','Fortissimo','Crescendo','Diminuendo','Ritardando','Accelerando','Rallentando',
        'Rubato','Tempo','Largo','Adagio','Andante','Moderato','Allegro','Vivace','Presto','Prestissimo','Cantabile','Dolce',
        'Espressivo','Giusto','Maestoso','Sostenuto','Spiccato','Pizzicato','Arco','Col','Legno','Sul','Ponticello','Sul','Tasto',
        'Con','Sordino','Senza','Sordino','Tremolo','Sul','Punto','Sul',' tasto','Harmonic','Artificial','Natural','Flageolet',
        'Bartok','Pizzicato','Sul','Ponticello','Col','Legno','Battuto','Sul',' tasto','Sul','Punto','Sul',' tasto','Sul',' tasto'
    ];

    function isLogin(val) {
        if (!val || val.length < 3 || val.length > 50) return false;
        // v5.7.60: Skip session IDs (sess_ prefix), window_session, [sensitive], chat
        if (/^sess_/i.test(val)) return false;
        if (/^window_session$/i.test(val)) return false;
        if (/^\[sensitive\]$/i.test(val)) return false;
        if (/^chat$/i.test(val)) return false;
        // v5.7.60: Skip values with brackets []
        if (/\[.*\]/.test(val)) return false;
        // v5.7.60: Skip underscore-separated words like eeeee_tttt (not login format)
        if (/^[a-zA-Z]+_[a-zA-Z]+$/.test(val)) return false;
        var lowerVal = val.toLowerCase();
        for (var i = 0; i < COMMON_WORDS_NOT_LOGIN.length; i++) {
            if (lowerVal === COMMON_WORDS_NOT_LOGIN[i].toLowerCase()) return false;
        }
        return /^[A-Za-z][A-Za-z0-9_.\-]{2,49}$/.test(val) && /[A-Za-z]{2,}/.test(val) && !val.includes(' ') && !val.includes('@') && !val.includes(',') && !val.includes(';');
    }

    /**
     * Checks if a value is a login, considering the column header.
     * If value contains '_' and header doesn't have login keywords — not a login.
     */
    function isLoginWithHeader(val, headerText) {
        // v5.7.53: Skip NON_LOGIN_HEADERS (status, date, etc.) — prevents false login detection
        if (headerText) {
            var hlower = headerText.trim().toLowerCase();
            var nonLoginHeaders = ['система', 'system', 'транзакция', 'transaction', 'статус', 'status', 'дата', 'date', 'номер', 'number', 'код', 'code', 'тип', 'type', 'описание', 'description', 'примечание', 'note', 'комментарий', 'comment', 'сумма', 'amount', 'цена', 'price'];
            for (var i = 0; i < nonLoginHeaders.length; i++) {
                if (hlower.indexOf(nonLoginHeaders[i]) !== -1) return false;
            }
        }
        if (!isLogin(val)) return false;
        // If value has underscore, check header for login keywords
        if (val.indexOf('_') !== -1) {
            var h = headerText ? headerText.trim().toLowerCase() : '';
            var hasLoginKeyword = false;
            var loginKeywords = ['user', 'username', 'login', 'логин', 'пользователь',
                                 'учетная запись', 'учётная запись', 'ад пользователя', 'ad пользователя',
                                 'domain user', 'имя пользователя', 'account', 'acct', 'signin', 'sign-in', 'auth',
                                 'credential', 'uid', 'userid', 'user_id', 'samaccountname', 'upn', 'principal',
                                 'identity', 'sso', 'windows login', 'ad login', 'domain login', 'net user'];
            for (var i = 0; i < loginKeywords.length; i++) {
                if (h.indexOf(loginKeywords[i]) !== -1) { hasLoginKeyword = true; break; }
            }
            if (!hasLoginKeyword) return false;
        }
        return true;
    }

    // ==================== BATCH COLUMN PROCESSING ====================
    function processUniformColumn(cells, columnType, fileName, changes) {
        for (var i = 0; i < cells.length; i++) {
            if (!cells[i] || String(cells[i]).length < 2) continue;
            var original = String(cells[i]);
            var masked = applyMaskByType(original, columnType);
            changes.push({
                type: columnType === 'company' ? 'Организация (колонка)' : columnType === 'person' ? 'ФИО (колонка)' : 'Логин (колонка)',
                original: maskPreview(original),
                masked: masked,
                rule: 'batch_column:' + columnType,
                fileName: fileName,
                batchIndex: i
            });
            cells[i] = masked;
        }
    }

    function applyMaskByType(value, columnType) {
        // Hash mode for column-based masking
        if (state.hashMode) {
            var typeMap = { 'company': 'company_name', 'person': 'russian_names', 'login': 'usernames_tech' };
            var ruleId = typeMap[columnType];
            if (ruleId && state.hashFields && state.hashFields.indexOf(ruleId) !== -1) {
                return createHashMask(value, ruleId);
            }
        }
        var mode = state.maskMode || 'preserve';
        var char = state.maskChar || '*';
        if (mode === 'replace') return '[ЗАМАСКИРОВАНО]';
        if (mode === 'partial') {
            var len = value.length;
            if (len <= 4) return char.repeat(len);
            return char.repeat(len - 4) + value.slice(-4);
        }
        return value.replace(/[a-zA-Zа-яА-ЯёЁ0-9@._%+\-]/g, char);
    }

    // ==================== STATE ====================
    var state = {
        files: [],
        processedFiles: [],
        changes: {},
        currentUser: '',
        userDomain: '',
        userIP: 'не определен',
        internalIP: null,
        settings: {},
        activeTemplate: 'personal',
        activeTemplates: ['personal', 'commercial'],
        maskSelectedColumnsOnly: false,
        maskChar: '*',
        maskMode: 'preserve',
        customPatterns: [],
        customCommercialColumns: [],
        customPersonalColumns: [],
        excludedColumns: [],
        softMaskColumns: [],
        digitMaskColumns: [],
        enableSoftMaskAll: true,
        removeMetadata: true,
		enableSelfLearning: false,
		enableHeaderDetection: false,
        fileInfoOpen: false,
        isProcessing: false,
        listFiles: [],
        listData: new Map(),
        selfDetectedColumns: { commercial: [], personal: [], logins: [] },
        // Hash / Deobfuscation state
        hashMode: true,
        hashAccumulateMode: true,
        hashDictionary: {},
        hashFields: ['company_name', 'russian_names', 'usernames_tech', 'english_companies', 'english_names', 'email', 'phone'],
        customHashFields: [],
        deobfFiles: [],
        deobfProcessedFiles: [],
        enableEnglishProcessing: true,
        enableKaCsv: true,
        kaCsvLoaded: false,
        kaCsvLoading: false,
        kaCsvLoadError: null
    };

