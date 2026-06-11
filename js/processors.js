    // ==================== RENDER FUNCTIONS ====================
    function renderSettings() {
        var container = document.getElementById('settingsContainer');
        if (!container) return;
        var categories = { personal: { name: '🔒 Персональные данные', rules: [] }, commercial: { name: '🏢 Коммерческие данные', rules: [] }, technical: { name: '💻 Технические данные', rules: [] } };
        for (var i = 0; i < defaultRules.length; i++) { var rule = defaultRules[i]; if (categories[rule.category]) categories[rule.category].rules.push(rule); }

        // English processing toggle (rendered at top of settings)
        var engHtml = '<div class="glass rounded-xl p-5 mb-4">';
        engHtml += '<div class="flex items-center justify-between py-2">';
        engHtml += '<div class="flex-1">';
        engHtml += '<p class="text-sm font-medium text-slate-200">Маскировать английские названия организаций и ФИО на английском</p>';
        engHtml += '<p class="text-xs text-slate-500">Включите, если в документах есть данные на латинице.</p>';
        engHtml += '</div>';
        engHtml += '<label class="relative inline-flex items-center cursor-pointer">';
        engHtml += '<input type="checkbox" id="enableEnglishProcessing" class="sr-only" ' + (state.enableEnglishProcessing ? 'checked' : '') + ' onchange="updateEnglishProcessingSetting(this.checked)">';
        engHtml += '<div class="w-11 h-6 rounded-full ' + (state.enableEnglishProcessing ? 'toggle-on' : 'toggle-off') + ' transition-colors" id="enableEnglishProcessingToggle"></div>';
        engHtml += '</label></div></div>';

        var html = '';
        var catKeys = Object.keys(categories);
        for (var c = 0; c < catKeys.length; c++) {
            var catKey = catKeys[c]; var cat = categories[catKey];
            html += '<div class="glass rounded-xl p-5">';
            html += '<h3 class="text-lg font-bold text-white mb-4">' + cat.name + '</h3>';
            html += '<div class="space-y-3">';
            for (var r = 0; r < cat.rules.length; r++) {
                var rule = cat.rules[r];
                // English rules are controlled by global toggle only — skip individual toggles
                if (rule.id === 'english_names' || rule.id === 'english_companies') continue;
                var enabled = state.settings[rule.id] !== undefined ? state.settings[rule.id] : rule.enabled;
                html += '<div class="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">';
                html += '<div class="flex-1"><p class="text-sm font-medium text-slate-200">' + rule.name + '</p><p class="text-xs text-slate-500">' + rule.patterns.length + ' паттерн(ов)</p>' + (rule.description ? '<p class="text-xs text-slate-500 mt-0.5 opacity-70">' + rule.description + '</p>' : '') + '</div>';
                html += '<label class="relative inline-flex items-center cursor-pointer">';
                html += '<input type="checkbox" class="sr-only rule-toggle" data-rule-id="' + rule.id + '" ' + (enabled ? 'checked' : '') + ' onchange="this.nextElementSibling.classList.toggle(\'toggle-on\'); this.nextElementSibling.classList.toggle(\'toggle-off\')">';
                html += '<div class="w-11 h-6 rounded-full ' + (enabled ? 'toggle-on' : 'toggle-off') + ' transition-colors"></div>';
                html += '</label></div>';
            }
            html += '</div></div>';
        }
        container.innerHTML = engHtml + html;
        var maskCharInput = document.getElementById('maskChar'); if (maskCharInput) maskCharInput.value = state.maskChar;
        var maskModeSelect = document.getElementById('maskMode'); if (maskModeSelect) maskModeSelect.value = state.maskMode;
        var maskSelectedToggle = document.getElementById('maskSelectedOnlyToggle'); if (maskSelectedToggle) maskSelectedToggle.checked = state.maskSelectedColumnsOnly;
        var removeMetaInput = document.getElementById('removeMetadata'); if (removeMetaInput) removeMetaInput.checked = state.removeMetadata;
        var removeMetaToggle = document.getElementById('removeMetadataToggle');
        if (removeMetaToggle) { if (state.removeMetadata) { removeMetaToggle.classList.add('toggle-on'); removeMetaToggle.classList.remove('toggle-off'); } else { removeMetaToggle.classList.add('toggle-off'); removeMetaToggle.classList.remove('toggle-on'); } }
		
		
		// Soft mask toggle sync
		var softMaskInput = document.getElementById('enableSoftMaskAll');
		if (softMaskInput) softMaskInput.checked = state.enableSoftMaskAll;
		var softMaskToggle = document.getElementById('enableSoftMaskAllToggle');
		if (softMaskToggle) {
		  if (state.enableSoftMaskAll) {
			softMaskToggle.classList.add('toggle-on');
			softMaskToggle.classList.remove('toggle-off');
		  } else {
			softMaskToggle.classList.add('toggle-off');
			softMaskToggle.classList.remove('toggle-on');
		  }
		}

		// НОВОЕ:
		var selfLearningInput = document.getElementById('enableSelfLearning');
		if (selfLearningInput) selfLearningInput.checked = state.enableSelfLearning;
		var selfLearningToggle = document.getElementById('enableSelfLearningToggle');
		if (selfLearningToggle) {
		  if (state.enableSelfLearning) {
			selfLearningToggle.classList.add('toggle-on');
			selfLearningToggle.classList.remove('toggle-off');
		  } else {
			selfLearningToggle.classList.add('toggle-off');
			selfLearningToggle.classList.remove('toggle-on');
		  }
		}
		
			var headerDetectionInput = document.getElementById('enableHeaderDetection');
				if (headerDetectionInput) headerDetectionInput.checked = state.enableHeaderDetection;

				var headerDetectionToggle = document.getElementById('enableHeaderDetectionToggle');
				if (headerDetectionToggle) {
				  if (state.enableHeaderDetection) {
					headerDetectionToggle.classList.add('toggle-on');
					headerDetectionToggle.classList.remove('toggle-off');
				  } else {
					headerDetectionToggle.classList.add('toggle-off');
					headerDetectionToggle.classList.remove('toggle-on');
				  }
				}
	
    }
    function renderTemplates() {
        var container = document.getElementById('templatesContainer');
        if (!container) return;
        var html = '';
        for (var i = 0; i < templates.length; i++) {
            var t = templates[i];
            var isActive = state.activeTemplates.indexOf(t.id) !== -1;
            var isListTemplate = t.isListTemplate;
            var cardClass = isActive ? (isListTemplate ? 'template-list-active' : t.id === 'custom' ? 'template-multi-active' : 'template-active') : '';
            var iconClass = isListTemplate ? 'text-emerald-400' : t.id === 'custom' ? 'text-purple-400' : '';
            // Checkbox style (square with checkmark) for multi-select
            html += '<div class="glass rounded-xl p-5 cursor-pointer transition-all hover:scale-[1.02] ' + cardClass + '" onclick="toggleTemplate(\'' + t.id + '\')">';
            html += '<div class="flex items-start justify-between mb-3">';
            html += '<div class="text-3xl ' + iconClass + '">' + t.icon + '</div>';
            html += '<div class="flex items-center h-6">';
            html += '<div class="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ' + (isActive ? 'bg-indigo-500 border-indigo-500' : 'border-slate-500') + '">';
            if (isActive) html += '<svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>';
            html += '</div></div></div>';
            html += '<h3 class="text-lg font-bold text-white mb-2">' + t.name + '</h3>';
            html += '<p class="text-sm text-slate-400 mb-3">' + t.description + '</p>';
            if (isListTemplate) {
                var listCount = state.listFiles.length;
                var totalValues = 0; state.listData.forEach(function(set){ totalValues += set.size; });
                html += '<div class="flex flex-wrap gap-1 mb-3">';
                html += '<span class="text-xs bg-emerald-900/30 text-emerald-300 px-2 py-1 rounded">' + listCount + ' файлов</span>';
                html += '<span class="text-xs bg-emerald-900/30 text-emerald-300 px-2 py-1 rounded">' + totalValues + ' значений</span></div>';
                if (listCount === 0) html += '<p class="text-xs text-amber-400">⚠️ Загрузите файлы-списки</p>';
            } else {
                html += '<div class="flex flex-wrap gap-1">';
                for (var j = 0; j < Math.min(t.rules.length, 4); j++) { html += '<span class="text-xs bg-indigo-900/30 text-indigo-300 px-2 py-1 rounded">' + t.rules[j] + '</span>'; }
                if (t.rules.length > 4) html += '<span class="text-xs bg-slate-700 text-slate-400 px-2 py-1 rounded">+' + (t.rules.length - 4) + '</span>';
                html += '</div>';
            }
            if (isActive) html += '<div class="mt-3 ' + (isListTemplate ? 'text-emerald-400' : t.id === 'custom' ? 'text-purple-400' : 'text-indigo-400') + ' text-sm font-semibold">✓ Активен</div>';
            html += '</div>';
        }
        container.innerHTML = html;
    }
    function updateEnglishProcessingSetting(checked) {
        state.enableEnglishProcessing = checked;
        var toggle = document.getElementById('enableEnglishProcessingToggle');
        if (toggle) {
            if (checked) { toggle.classList.add('toggle-on'); toggle.classList.remove('toggle-off'); }
            else { toggle.classList.add('toggle-off'); toggle.classList.remove('toggle-on'); }
        }
        // Re-apply templates so english_names/english_companies settings update
        applyMultiTemplates();
        renderSettings();
        saveSettings();
    }
    function updateMaskChar(val){ state.maskChar = val || '*'; }
    function updateMaskMode(val){ state.maskMode = val; }
    function updateMetadataSetting(checked){
        state.removeMetadata = checked;
        var toggle = document.getElementById('removeMetadataToggle');
        if (toggle) { if (checked) { toggle.classList.add('toggle-on'); toggle.classList.remove('toggle-off'); } else { toggle.classList.add('toggle-off'); toggle.classList.remove('toggle-on'); } }
    }
			function updateSelfLearningSetting(checked) {
		  state.enableSelfLearning = checked;
		  var toggle = document.getElementById('enableSelfLearningToggle');
		  if (toggle) {
			if (checked) {
			  toggle.classList.add('toggle-on');
			  toggle.classList.remove('toggle-off');
			} else {
			  toggle.classList.add('toggle-off');
			  toggle.classList.remove('toggle-on');
			}
		  }
		  // Взаимоисключение с мягким маскированием
		  if (checked && state.enableSoftMaskAll) {
			state.enableSoftMaskAll = false;
			var softToggle = document.getElementById('enableSoftMaskAllToggle');
			var softInput = document.getElementById('enableSoftMaskAll');
			if (softToggle) { softToggle.classList.add('toggle-off'); softToggle.classList.remove('toggle-on'); }
			if (softInput) softInput.checked = false;
		  }
		  saveSettings();
		}

		function updateSoftMaskAllSetting(checked) {
		  state.enableSoftMaskAll = checked;
		  var toggle = document.getElementById('enableSoftMaskAllToggle');
		  if (toggle) {
			if (checked) {
			  toggle.classList.add('toggle-on');
			  toggle.classList.remove('toggle-off');
			} else {
			  toggle.classList.add('toggle-off');
			  toggle.classList.remove('toggle-on');
			}
		  }
		  // Взаимоисключение: мягкое маскирование отключает самообучение и распознавание
		  if (checked) {
			if (state.enableSelfLearning) {
			  state.enableSelfLearning = false;
			  var slToggle = document.getElementById('enableSelfLearningToggle');
			  var slInput = document.getElementById('enableSelfLearning');
			  if (slToggle) { slToggle.classList.add('toggle-off'); slToggle.classList.remove('toggle-on'); }
			  if (slInput) slInput.checked = false;
			}
			if (state.enableHeaderDetection) {
			  state.enableHeaderDetection = false;
			  var hdToggle = document.getElementById('enableHeaderDetectionToggle');
			  var hdInput = document.getElementById('enableHeaderDetection');
			  if (hdToggle) { hdToggle.classList.add('toggle-off'); hdToggle.classList.remove('toggle-on'); }
			  if (hdInput) hdInput.checked = false;
			}
		  }
		  saveSettings();
		}

		function updateHeaderDetectionSetting(checked) {
		  state.enableHeaderDetection = checked;
		  var toggle = document.getElementById('enableHeaderDetectionToggle');
		  if (toggle) {
			if (checked) {
			  toggle.classList.add('toggle-on');
			  toggle.classList.remove('toggle-off');
			} else {
			  toggle.classList.add('toggle-off');
			  toggle.classList.remove('toggle-on');
			}
		  }
		  // Взаимоисключение: распознавание отключает мягкое маскирование
		  if (checked && state.enableSoftMaskAll) {
			state.enableSoftMaskAll = false;
			var softToggle = document.getElementById('enableSoftMaskAllToggle');
			var softInput = document.getElementById('enableSoftMaskAll');
			if (softToggle) { softToggle.classList.add('toggle-off'); softToggle.classList.remove('toggle-on'); }
			if (softInput) softInput.checked = false;
		  }
		  saveSettings();
		}

    function addCustomPattern() { state.customPatterns.push({ id: 'custom_' + Date.now(), name: 'Новый паттерн', regex: '', enabled: true, type: 'Пользовательский' }); renderCustomPatterns(); }
    function renderCustomPatterns() {
        var container = document.getElementById('customPatterns'); if (!container) return;
        var html = '';
        for (var i = 0; i < state.customPatterns.length; i++) {
            var p = state.customPatterns[i];
            html += '<div class="glass-light rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">';
            html += '<div><label class="block text-xs text-slate-400 mb-1">Название</label>';
            html += '<input type="text" value="' + p.name + '" class="w-full bg-slate-700/50 border border-slate-600 rounded px-3 py-2 text-sm text-white" onchange="state.customPatterns[' + i + '].name=this.value"></div>';
            html += '<div class="md:col-span-2"><label class="block text-xs text-slate-400 mb-1">Regex</label>';
            html += '<input type="text" value="' + p.regex + '" class="w-full bg-slate-700/50 border border-slate-600 rounded px-3 py-2 text-sm text-white regex-input" placeholder="\\b\\d{10}\\b" onchange="state.customPatterns[' + i + '].regex=this.value"></div>';
            html += '<div class="flex gap-2"><button onclick="removeCustomPattern(' + i + ')" class="bg-red-900/30 hover:bg-red-900/50 text-red-300 px-3 py-2 rounded text-sm transition">Удалить</button></div>';
            html += '</div>';
        }
        container.innerHTML = html;
    }
    function removeCustomPattern(index) { state.customPatterns.splice(index, 1); renderCustomPatterns(); }

    // ==================== DRAG & DROP ====================
    function setupDragDrop() {
        var dropZone = document.getElementById('dropZone'); if (!dropZone) return;
        dropZone.addEventListener('dragenter', function(e){ e.preventDefault(); e.stopPropagation(); dropZone.classList.add('drag-over'); });
        dropZone.addEventListener('dragover', function(e){ e.preventDefault(); e.stopPropagation(); dropZone.classList.add('drag-over'); });
        dropZone.addEventListener('dragleave', function(e){ e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('drag-over'); });
        dropZone.addEventListener('drop', function(e){ e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('drag-over'); handleFiles(e.dataTransfer.files); });
    }
    function setupListDragDrop() {
        var dropZone = document.getElementById('listDropZone'); if (!dropZone) return;
        dropZone.addEventListener('dragenter', function(e){ e.preventDefault(); e.stopPropagation(); dropZone.classList.add('drag-over'); });
        dropZone.addEventListener('dragover', function(e){ e.preventDefault(); e.stopPropagation(); dropZone.classList.add('drag-over'); });
        dropZone.addEventListener('dragleave', function(e){ e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('drag-over'); });
        dropZone.addEventListener('drop', function(e){ e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('drag-over'); handleListFiles(e.dataTransfer.files); });
    }

    // ==================== LIST FILES ====================
    async function handleListFiles(fileList) {
        var remaining = 10 - state.listFiles.length;
        var filesArr = Array.from(fileList).slice(0, remaining);
        for (var i = 0; i < filesArr.length; i++) {
            var file = filesArr[i]; var ext = file.name.split('.').pop().toLowerCase();
            if (ext !== 'txt' && ext !== 'csv') { showNotification('Файл-список должен быть в формате .txt или .csv', 'error'); continue; }
            if (file.size > MAX_FILE_SIZE) { showNotification('Файл "' + file.name + '" превышает лимит 100 МБ', 'error'); continue; }
            try { var fileRead = await readFileAsTextWithEncoding(file); var content = fileRead.text; var values = parseListFile(content);
                state.listFiles.push({ id: Date.now() + Math.random(), name: file.name, size: file.size, valueCount: values.size });
                state.listData.set(file.name, values);
                rebuildListTrie(); // Rebuild O(n) trie for list-based masking
                // Add company names to trie for fast lookup
                values.forEach(function(v){ if (v.length > 3) { companyNameTrie.insert(v); listBasedCompanyNames.add(v.toLowerCase()); } });
            } catch(e) { showNotification('Ошибка чтения файла "' + file.name + '"', 'error'); }
        }
        if (state.listFiles.length > 10) { var excess = state.listFiles.slice(10); excess.forEach(function(f){ state.listData.delete(f.name); }); state.listFiles = state.listFiles.slice(0, 10); }
        renderListFiles(); renderTemplates(); showNotification('Файлы-списки загружены: ' + state.listFiles.length);
    }
    function parseListFile(content) {
        // Use Array to preserve duplicates, then deduplicate only at the end
        var rawValues = [];
        var normalizedContent = content.replace(/^\uFEFF/, '').normalize('NFC');
        var lines = normalizedContent.split(/\r?\n/);
        var skippedEmpty = 0;
        var skippedHeader = 0;
        for (var i = 0; i < lines.length; i++) {
            var rawLine = lines[i];
            // Preserve original line for counting, only trim for processing
            var line = rawLine.trim();
            if (line.length === 0) { skippedEmpty++; continue; }
            // CSV-aware: extract all column values, skip header
            if (i === 0 && (line.indexOf(',') !== -1 || line.indexOf(';') !== -1)) {
                var headerCols = line.split(/[,;]/);
                if (headerCols.length > 1) { skippedHeader++; continue; }
            }
            // If line contains CSV delimiters, extract each column value
            if (line.indexOf(',') !== -1 || line.indexOf(';') !== -1) {
                var cols = line.split(/[,;]/);
                for (var j = 0; j < cols.length; j++) {
                    var val = cols[j].trim().replace(/^["']|["']$/g, '');
                    // Normalize internal spaces but preserve the value
                    val = val.replace(/\s+/g, ' ').trim();
                    if (val.length > 0) rawValues.push(val);
                }
            } else {
                // Normalize spaces for consistency
                line = line.replace(/\s+/g, ' ').trim();
                if (line.length > 0) rawValues.push(line);
            }
        }
        // Log stats for debugging
        var uniqueCount = 0;
        var values = new Set();
        for (var v = 0; v < rawValues.length; v++) {
            if (!values.has(rawValues[v])) uniqueCount++;
            values.add(rawValues[v]);
        }
        console.log('List file parsed: ' + rawValues.length + ' raw lines, ' + values.size + ' unique, ' + skippedEmpty + ' empty skipped, ' + skippedHeader + ' header skipped');
        return values;
    }
    function renderListFiles() {
        var container = document.getElementById('listFileList'); var counter = document.getElementById('listFileCounter');
        var countEl = document.getElementById('listFileCount'); var infoSection = document.getElementById('listFilesInfo');
        var statsContainer = document.getElementById('listFilesStats');
        var kaToggle = document.getElementById('enableKaCsv'); var kaToggleVis = document.getElementById('enableKaCsvToggle');
        var kaBadge = document.getElementById('kaCsvBadge'); var kaStatusText = document.getElementById('kaCsvStatusText');
        if (!container) return;
        // Sync ka.csv toggle UI
        if (kaToggle) kaToggle.checked = state.enableKaCsv;
        if (kaToggleVis) {
            if (state.enableKaCsv) { kaToggleVis.classList.add('toggle-on'); kaToggleVis.classList.remove('toggle-off'); }
            else { kaToggleVis.classList.add('toggle-off'); kaToggleVis.classList.remove('toggle-on'); }
        }
        var kaValues = state.listData.get('ka.csv');
        var kaCount = kaValues ? kaValues.size : 0;
        var manualUpload = document.getElementById('kaCsvManualUpload');
        if (kaBadge) {
            if (!state.enableKaCsv) {
                kaBadge.classList.add('hidden');
                if (manualUpload) manualUpload.classList.add('hidden');
            } else if (state.kaCsvLoading) {
                kaBadge.classList.remove('hidden');
                if (kaStatusText) kaStatusText.textContent = '⏳ Загрузка vendor/ka.csv... (файл ~4 МБ, может занять несколько секунд)';
                if (manualUpload) manualUpload.classList.add('hidden');
            } else if (state.kaCsvLoaded) {
                kaBadge.classList.remove('hidden');
                if (kaStatusText) kaStatusText.textContent = '✓ Загружено: ' + kaCount + ' записей из vendor/ka.csv';
                if (manualUpload) manualUpload.classList.add('hidden');
            } else if (state.kaCsvLoadError) {
                kaBadge.classList.remove('hidden');
                if (kaStatusText) kaStatusText.textContent = '⚠ ' + state.kaCsvLoadError + '. Проверьте, что файл vendor/ka.csv находится рядом с index.html';
                if (manualUpload) manualUpload.classList.remove('hidden');
            } else {
                kaBadge.classList.remove('hidden');
                if (kaStatusText) kaStatusText.textContent = '⏳ Ожидание загрузки vendor/ka.csv...';
                if (manualUpload) manualUpload.classList.add('hidden');
            }
        }
        counter.classList.remove('hidden');
        var totalListFiles = state.listFiles.length + (state.kaCsvLoaded ? 1 : 0);
        countEl.textContent = totalListFiles;
        var html = '';
        // Show ka.csv card
        if (state.enableKaCsv && state.kaCsvLoaded && kaValues) {
            html += '<div class="file-card list-file-card rounded-xl p-4 flex items-center gap-4 opacity-90">';
            html += '<div class="text-2xl">🏢</div><div class="flex-1 min-w-0"><p class="text-sm font-medium text-white truncate">ka.csv (автозагрузка)</p>';
            html += '<p class="text-xs text-slate-500">' + kaCount + ' контрагентов · авто</p></div>';
            html += '<div class="flex items-center gap-2"><span class="list-badge text-white text-xs px-2 py-1 rounded-full">' + kaCount + '</span>';
            html += '<span class="text-xs text-emerald-400 px-2 py-1 rounded bg-emerald-900/30">авто</span></div></div>';
        }
        for (var i = 0; i < state.listFiles.length; i++) {
            var f = state.listFiles[i]; var sizeStr = formatSize(f.size);
            html += '<div class="file-card list-file-card rounded-xl p-4 flex items-center gap-4">';
            html += '<div class="text-2xl">📋</div><div class="flex-1 min-w-0"><p class="text-sm font-medium text-white truncate">' + f.name + '</p>';
            html += '<p class="text-xs text-slate-500">' + sizeStr + ' · ' + f.valueCount + ' значений</p></div>';
            html += '<div class="flex items-center gap-2"><span class="list-badge text-white text-xs px-2 py-1 rounded-full">' + f.valueCount + '</span>';
            html += '<button onclick="removeListFile(' + i + ')" class="text-slate-500 hover:text-red-400 transition"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button></div></div>';
        }
        container.innerHTML = html;
        if (state.listFiles.length === 0 && !state.kaCsvLoaded) { infoSection.classList.add('hidden'); }
        else { infoSection.classList.remove('hidden'); }
        var totalValues = 0; var allValues = new Set();
        state.listData.forEach(function(set){ totalValues += set.size; set.forEach(function(v){ allValues.add(v); }); });
        var statsHtml = '<div class="stat-card rounded-xl p-4 text-center"><div class="text-2xl font-bold text-emerald-400">' + state.listFiles.length + '</div><div class="text-xs text-slate-400">Файлов-списков</div></div>';
        if (state.kaCsvLoaded) {
            statsHtml += '<div class="stat-card rounded-xl p-4 text-center"><div class="text-2xl font-bold text-amber-400">' + kaCount + '</div><div class="text-xs text-slate-400">Контрагенты (ka.csv)</div></div>';
        }
        statsHtml += '<div class="stat-card rounded-xl p-4 text-center"><div class="text-2xl font-bold text-emerald-400">' + totalValues + '</div><div class="text-xs text-slate-400">Всего значений</div></div>';
        statsHtml += '<div class="stat-card rounded-xl p-4 text-center"><div class="text-2xl font-bold text-emerald-400">' + allValues.size + '</div><div class="text-xs text-slate-400">Уникальных значений</div></div>';
        statsContainer.innerHTML = statsHtml;
    }
    function removeListFile(index) { var fileName = state.listFiles[index].name; state.listData.delete(fileName); state.listFiles.splice(index, 1); renderListFiles(); renderTemplates(); }
    function clearAllListFiles() { state.listFiles = []; state.listData.clear(); listBasedCompanyNames.clear(); renderListFiles(); renderTemplates(); if (state.enableKaCsv) loadKaCsv(); }

    async function loadKaCsv() {
        if (!state.enableKaCsv || state.kaCsvLoading || state.kaCsvLoaded) return;
        state.kaCsvLoading = true;
        state.kaCsvLoadError = null;
        renderListFiles();
        var values = new Set();
        var decoder = new TextDecoder('utf-8', { fatal: false });
        var buffer = '';
        var processedLines = 0;
        var startTime = Date.now();
        try {
            var response = await fetch('vendor/ka.csv');
            if (!response.ok) { throw new Error('HTTP ' + response.status); }
            var reader = response.body.getReader();
            var loadedBytes = 0;
            var contentLength = response.headers.get('Content-Length');
            var totalBytes = contentLength ? parseInt(contentLength, 10) : null;
            while (true) {
                var readResult = await reader.read();
                if (readResult.done) break;
                var chunk = readResult.value;
                loadedBytes += chunk.length;
                var decoded = decoder.decode(chunk, { stream: true });
                buffer += decoded;
                // Process complete lines from buffer
                var lineEnd;
                while ((lineEnd = buffer.indexOf('\n')) !== -1) {
                    var line = buffer.substring(0, lineEnd);
                    buffer = buffer.substring(lineEnd + 1);
                    // Also handle \r\n
                    if (line.length > 0 && line.charAt(line.length - 1) === '\r') {
                        line = line.substring(0, line.length - 1);
                    }
                    if (line.length > 0) {
                        var val = parseKaCsvLine(line);
                        if (val && val.length > 0) values.add(val);
                    }
                    processedLines++;
                }
                // Yield to UI thread every 256KB
                if (loadedBytes % 262144 < 65536) {
                    await new Promise(function(resolve){ setTimeout(resolve, 0); });
                }
                // Timeout safety: 60 seconds max for loading
                if (Date.now() - startTime > 60000) {
                    console.warn('ka.csv loading timeout after 60s');
                    break;
                }
            }
            // Process remaining buffer
            if (buffer.length > 0) {
                var val = parseKaCsvLine(buffer);
                if (val && val.length > 0) values.add(val);
            }
            if (values.size > 0) {
                state.listData.set('ka.csv', values);
                values.forEach(function(v){ if (v.length > 3) { companyNameTrie.insert(v); listBasedCompanyNames.add(v.toLowerCase()); } });
                state.kaCsvLoaded = true;
                state.kaCsvLoadError = null;
                showNotification('Контрагенты загружены: ' + values.size + ' записей');
            } else {
                state.kaCsvLoadError = 'Файл пуст или не содержит данных';
            }
        } catch(e) {
            console.log('ka.csv load error:', e.message || e);
            state.kaCsvLoadError = e.message || 'Ошибка загрузки';
            state.kaCsvLoaded = false;
        }
        state.kaCsvLoading = false;
        renderListFiles(); renderTemplates();
    }
    function parseKaCsvLine(line) {
        // Remove BOM from first line
        var cleanLine = line.replace(/^\uFEFF/, '').trim();
        if (cleanLine.length === 0) return null;
        // CSV: take first non-empty column value
        var cols = cleanLine.split(/[,;]/);
        for (var j = 0; j < cols.length; j++) {
            var val = cols[j].trim().replace(/\s+/g, ' ').replace(/^["']|["']$/g, '');
            if (val.length > 0) return val;
        }
        return null;
    }
    function parseKaCsv(content) {
        var values = new Set();
        var normalizedContent = content.replace(/^\uFEFF/, '').normalize('NFC');
        var lines = normalizedContent.split(/\r?\n/);
        for (var i = 0; i < lines.length; i++) {
            var val = parseKaCsvLine(lines[i]);
            if (val) values.add(val);
        }
        return values;
    }
    function updateKaCsvSetting(checked) {
        state.enableKaCsv = checked;
        if (checked) { loadKaCsv(); }
        else {
            state.listData.delete('ka.csv');
            state.kaCsvLoaded = false;
            state.kaCsvLoading = false;
            state.kaCsvLoadError = null;
            // Rebuild trie and listBasedCompanyNames from remaining lists
            companyNameTrie = new CompanyNameTrie();
            listBasedCompanyNames.clear();
            state.listData.forEach(function(values){
                values.forEach(function(v){ if (v.length > 3) { companyNameTrie.insert(v); listBasedCompanyNames.add(v.toLowerCase()); } });
            });
            renderListFiles(); renderTemplates();
        }
    }
    async function handleManualKaCsv(file) {
        if (!file) return;
        state.kaCsvLoading = true;
        state.kaCsvLoadError = null;
        renderListFiles();
        try {
            var fileRead = await readFileAsTextWithEncoding(file);
            var values = parseKaCsv(fileRead.text);
            if (values.size > 0) {
                state.listData.set('ka.csv', values);
                values.forEach(function(v){ if (v.length > 3) { companyNameTrie.insert(v); listBasedCompanyNames.add(v.toLowerCase()); } });
                state.kaCsvLoaded = true;
                state.kaCsvLoadError = null;
                showNotification('Контрагенты загружены вручную: ' + values.size + ' записей');
                renderListFiles(); renderTemplates();
            } else {
                state.kaCsvLoadError = 'Файл пуст';
            }
        } catch(e) {
            state.kaCsvLoadError = e.message || 'Ошибка чтения файла';
        }
        state.kaCsvLoading = false;
        renderListFiles();
    }

    // ==================== FILE HANDLING ====================
    function handleFiles(fileList) {
        var remaining = 10 - state.files.length;
        var filesArr = Array.from(fileList).slice(0, remaining);
        for (var i = 0; i < filesArr.length; i++) {
            var file = filesArr[i]; var ext = file.name.split('.').pop().toLowerCase();
            var allowedExts = ['docx','xlsx','xlsb','pptx','ppt','txt','csv','json','xml','log','sql','yaml','yml','ini','md','msg','zip','7z','tar','gz','tgz'];
            if (allowedExts.indexOf(ext) === -1) { showNotification('Формат .' + ext + ' не поддерживается', 'error'); continue; }
            if (file.size > MAX_FILE_SIZE) { showNotification('Файл "' + file.name + '" превышает лимит 100 МБ', 'error'); continue; }
            state.files.push({ id: Date.now() + Math.random(), name: file.name, size: file.size, ext: ext, file: file, status: 'pending' });
        }
        if (state.files.length > 10) state.files = state.files.slice(0, 10);
        renderFileList();
    }
    function renderFileList() {
        var container = document.getElementById('fileList'); var counter = document.getElementById('fileCounter');
        var countEl = document.getElementById('fileCount'); var processSection = document.getElementById('processSection');
        counter.classList.remove('hidden'); countEl.textContent = state.files.length;
        if (state.files.length === 0) { container.innerHTML = ''; processSection.classList.add('hidden'); return; }
        processSection.classList.remove('hidden');
        var html = '';
        for (var i = 0; i < state.files.length; i++) {
            var f = state.files[i]; var icon = getFileIcon(f.ext); var sizeStr = formatSize(f.size);
            html += '<div class="file-card glass rounded-xl p-4 flex items-center gap-4">';
            html += '<div class="text-2xl">' + icon + '</div><div class="flex-1 min-w-0"><p class="text-sm font-medium text-white truncate">' + f.name + '</p>';
            html += '<p class="text-xs text-slate-500">' + sizeStr + ' · ' + f.ext.toUpperCase() + '</p></div>';
            html += '<div class="flex items-center gap-2">';
            var statusClass = f.status === 'done' ? 'bg-green-900/30 text-green-400' : f.status === 'error' ? 'bg-red-900/30 text-red-400' : 'bg-slate-700 text-slate-400';
            var statusText = f.status === 'done' ? '✓ Готов' : f.status === 'error' ? '✗ Ошибка' : 'Ожидание';
            html += '<span class="text-xs px-2 py-1 rounded ' + statusClass + '">' + statusText + '</span>';
            html += '<button onclick="removeFile(' + i + ')" class="text-slate-500 hover:text-red-400 transition"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button></div></div>';
        }
        container.innerHTML = html;
    }
    function removeFile(index) { state.files.splice(index, 1); renderFileList(); }
    function clearAllFiles() { state.files = []; state.processedFiles = []; renderFileList(); document.getElementById('resultsSection').classList.add('hidden'); }
    function getFileIcon(ext) { var icons = { docx: '📄', xlsx: '📊', xlsb: '📊', pptx: '📔', ppt: '📒', txt: '📝', csv: '📋', json: '🔗', xml: '📰', log: '📋', sql: '🗃️', yaml: '⚙️', yml: '⚙️', ini: '🔧', md: '📑', msg: '📧', zip: '📦', '7z': '📦', tar: '📦', gz: '🗜️', tgz: '🗜️' }; return icons[ext] || '📄'; }
    function formatSize(bytes) { if (bytes < 1024) return bytes + ' Б'; if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' КБ'; return (bytes / 1048576).toFixed(1) + ' МБ'; }

    // ==================== PROCESSING OVERLAY ====================
    // ==================== ETA & STEP TRACKING ====================
    var processingStartTime = 0; // timestamp when current file processing started
    var overallStartTime = 0;    // timestamp when batch processing started

    /**
     * Returns human-readable ETA based on elapsed time and progress
     */
    function calculateETA(progressPercent, startTime) {
        if (!startTime || progressPercent <= 0) return 'расчёт...';
        if (progressPercent >= 100) return 'завершено';
        var elapsed = Date.now() - startTime;
        var estimatedTotal = elapsed / (progressPercent / 100);
        var remaining = estimatedTotal - elapsed;
        if (remaining < 1000) return '< 1 сек';
        if (remaining < 60000) return Math.ceil(remaining / 1000) + ' сек';
        var mins = Math.floor(remaining / 60000);
        var secs = Math.ceil((remaining % 60000) / 1000);
        return mins + ' мин ' + secs + ' сек';
    }

    /**
     * Maps processing progress ranges to human-readable step descriptions
     */
    function getStepDescription(progress, ext, isStreaming) {
        var mode = isStreaming ? ' (потоковый режим)' : '';
        if (ext === 'docx') {
            if (progress < 20) return 'Чтение ZIP-архива DOCX...';
            if (progress < 50) return 'Маскирование текста документа...';
            if (progress < 75) return 'Обработка колонтитулов и сносок...';
            if (progress < 90) return 'Очистка метаданных...';
            return 'Сборка и сжатие файла...';
        }
		if (ext === 'pptx') {
            if (progress < 20) return 'Чтение ZIP-архива PPTX...';
            if (progress < 45) return 'Маскирование слайдов...';
            if (progress < 60) return 'Обработка заметок...';
            if (progress < 75) return 'Обработка мастер-слайдов...';
            if (progress < 90) return 'Очистка метаданных...';
            return 'Сборка и сжатие презентации...';
        }
        if (ext === 'xlsx') {
            if (progress < 20) return 'Чтение рабочей книги Excel...';
            if (progress < 40) return 'Анализ столбцов (самообучение)...';
            if (progress < 85) return 'Маскирование ячеек...';
            if (progress < 95) return 'Очистка метаданных...';
            return 'Сохранение файла...';
        }
        // Text files
        if (isStreaming) {
            if (progress < 10) return 'Нарезка файла на части...';
            if (progress < 90) return 'Потоковое маскирование фрагментов...';
            return 'Сборка результата...';
        }
        if (progress < 30) return 'Загрузка содержимого...';
        if (progress < 90) return 'Маскирование данных...';
        return 'Финализация...';
    }

    function showProcessingOverlay(fileName, progress, stepDesc, etaText) {
        var overlay = document.getElementById('processingOverlay');
        var fileText = document.getElementById('processingFile');
        var stepText = document.getElementById('processingStep');
        var etaDisplay = document.getElementById('processingETA');
        var progressBar = document.getElementById('progressBar');
        var progressText = document.getElementById('progressText');
        overlay.classList.add('active');
        fileText.textContent = fileName || '';
        if (stepText) stepText.textContent = stepDesc || '';
        if (etaDisplay) etaDisplay.textContent = etaText ? '⏱ Осталось: ' + etaText : '';
        progressBar.style.width = (progress || 0) + '%';
        progressText.textContent = Math.round(progress || 0) + '%';
    }
    function hideProcessingOverlay() { var overlay = document.getElementById('processingOverlay'); overlay.classList.remove('active'); }

    // ==================== MAIN PROCESSING ====================
    async function processAllFiles() {
        if (state.files.length === 0) { showNotification('Загрузите файлы для обработки', 'error'); return; }
        if (state.activeTemplates.indexOf('listmask') !== -1 && state.listFiles.length === 0) { showNotification('Для шаблона "Маскирование по списку" загрузите файлы-списки', 'error'); switchTab('listfiles'); return; }
        if (state.isProcessing) return; state.isProcessing = true;
        var oversizedFiles = state.files.filter(function(f){ return f.size > MAX_FILE_SIZE; });
        if (oversizedFiles.length > 0) { showNotification(oversizedFiles.length + ' файл(ов) превышает лимит 100 МБ', 'error'); state.isProcessing = false; return; }
        var processStatus = document.getElementById('processStatus'); processStatus.textContent = 'Обработка...';
        state.processedFiles = []; state.changes = {};
        overallStartTime = Date.now();
        var hasLargeFile = state.files.some(function(f){ return f.size > LARGE_FILE_THRESHOLD; });
        for (var i = 0; i < state.files.length; i++) {
            var fileObj = state.files[i]; processingStartTime = Date.now();
            processStatus.textContent = 'Обработка ' + (i + 1) + '/' + state.files.length + ': ' + fileObj.name;
            var overallProgress = ((i) / state.files.length) * 100;
            var overallETA = calculateETA(overallProgress, overallStartTime);
            if (hasLargeFile || fileObj.size > LARGE_FILE_THRESHOLD) {
                showProcessingOverlay('Файл ' + (i + 1) + '/' + state.files.length + ': ' + fileObj.name, overallProgress, 'Подготовка...', overallETA);
            }
            try {
                var result = await processFileWithYield(fileObj, i, state.files.length);
                result._totalChanges = result.changes._totalChanges || result.changes.length;
                state.processedFiles.push(result);
                fileObj.status = 'done';
                fileObj.file = null; // CRITICAL: free File object memory
            }
            catch(e) { console.error('Ошибка обработки:', e); fileObj.status = 'error'; state.processedFiles.push({ name: fileObj.name, ext: fileObj.ext, content: null, changes: [], error: e.message }); }
            // CRITICAL: long GC pause — 1000ms for large files lets browser reclaim memory
            var gcPause = fileObj.size > STREAMING_FILE_THRESHOLD ? 1000 : fileObj.size > 10 * 1024 * 1024 ? 500 : 50;
            await new Promise(function(resolve){ setTimeout(resolve, gcPause); });
        }
        hideProcessingOverlay(); renderFileList(); renderResults(); processStatus.textContent = 'Обработано ' + state.processedFiles.length + ' файлов'; state.isProcessing = false;
        // Save hashDictionary to localStorage after processing
        saveSettings();
    }
    /**
     * Mask sensitive data in file name (FIO, logins, company names) if hash mode is enabled.
     * v5.7.60: Only masks when hashMode is true. Keeps file extension unchanged.
     * Returns { name: maskedName, changes: fileNameChanges }
     */
    // v5.7.61: Hash helpers for filename masking (self-contained, no dependency on ui.js load order)
    function simpleHash(str) {
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            var char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        var hex = Math.abs(hash).toString(16);
        while (hex.length < 8) hex = '0' + hex;
        return hex.substring(0, 8);
    }
    function getHashTypePrefix(ruleId) {
        if (ruleId === 'company_name') return '#ORG_';
        if (ruleId === 'english_companies') return '#ORG_';
        if (ruleId === 'sibur') return '#ORG_';
        if (ruleId === 'russian_names') return '#FIO_';
        if (ruleId === 'english_names') return '#FIO_';
        if (ruleId === 'usernames_tech') return '#USR_';
        if (ruleId === 'list') return '#ORG_';
        if (ruleId === 'email') return '#EML_';
        if (ruleId === 'phone') return '#PHN_';
        if (ruleId === 'urls') return '#URL_';
        return '#HSH_';
    }
    function createHashMask(original, type) {
        var prefix = getHashTypePrefix(type);
        var hashValue = simpleHash(original);
        var hashKey = prefix + hashValue;
        if (state && state.hashDictionary && !state.hashDictionary[hashKey]) {
            state.hashDictionary[hashKey] = original;
            try { localStorage.setItem('maskingHashDictionary', JSON.stringify(state.hashDictionary)); } catch(e) {}
        }
        return hashKey;
    }

    async function maskFileName(originalName, softMode) {
        var fileNameChanges = [];
        // v5.7.61: Only mask if hashMode is enabled
        if (!state.hashMode) return { name: originalName, changes: fileNameChanges };
        var lastDot = originalName.lastIndexOf('.');
        var baseName = lastDot > 0 ? originalName.substring(0, lastDot) : originalName;
        var ext = lastDot > 0 ? originalName.substring(lastDot) : '';
        // Only mask FIO and logins in filename — no other rules
        // 1. Russian FIO: Фамилия И.О. or Фамилия И. О. (with optional spaces)
        baseName = baseName.replace(/[А-ЯЁ][а-яё]{2,25}\s+[А-ЯЁ]\.\s*[А-ЯЁ]\./g, function(match) {
            var masked = createHashMask(match, 'russian_names');
            fileNameChanges.push({ type: 'ФИО', original: match, masked: masked, rule: 'filename_fio', fileName: originalName });
            return masked;
        });
        // 2. Russian FIO: И.О. Фамилия or И. О. Фамилия
        baseName = baseName.replace(/[А-ЯЁ]\.\s*[А-ЯЁ]\.\s+[А-ЯЁ][а-яё]{2,25}/g, function(match) {
            var masked = createHashMask(match, 'russian_names');
            fileNameChanges.push({ type: 'ФИО', original: match, masked: masked, rule: 'filename_fio', fileName: originalName });
            return masked;
        });
        // 3. Russian FIO: Фамилия Имя Отчество (full name)
        baseName = baseName.replace(/[А-ЯЁ][а-яё]{2,}(?:\-[А-ЯЁ][а-яё]{2,})*\s+[А-ЯЁ][а-яё]{2,}(?:\-[А-ЯЁ][а-яё]{2,})*\s+[А-ЯЁ][а-яё]{2,}(?:\-[А-ЯЁ][а-яё]{2,})*/g, function(match) {
            var masked = createHashMask(match, 'russian_names');
            fileNameChanges.push({ type: 'ФИО', original: match, masked: masked, rule: 'filename_fio', fileName: originalName });
            return masked;
        });
        // 4. Russian FIO: Фамилия Имя (2 words)
        baseName = baseName.replace(/[А-ЯЁ][а-яё]{2,}(?:\-[А-ЯЁ][а-яё]{2,})*\s+[А-ЯЁ][а-яё]{2,}(?:\-[А-ЯЁ][а-яё]{2,})*/g, function(match) {
            var masked = createHashMask(match, 'russian_names');
            fileNameChanges.push({ type: 'ФИО', original: match, masked: masked, rule: 'filename_fio', fileName: originalName });
            return masked;
        });
        // 5. English FIO
        baseName = baseName.replace(/[A-Z][a-zA-Z]{1,15}\s+[A-Z][a-zA-Z]{1,15}(?:\s+[A-Z][a-zA-Z]{1,15})?/g, function(match) {
            var masked = createHashMask(match, 'english_names');
            fileNameChanges.push({ type: 'ФИО (англ.)', original: match, masked: masked, rule: 'filename_eng', fileName: originalName });
            return masked;
        });
        // 6. Logins: check each word/token
        var tokens = baseName.split(/[^A-Za-z0-9_.\-]+/);
        for (var i = 0; i < tokens.length; i++) {
            var w = tokens[i];
            if (w && isLogin(w)) {
                var masked = createHashMask(w, 'usernames_tech');
                // Escape regex special chars in word
                var escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                var regex = new RegExp('\\b' + escaped + '\\b', 'g');
                baseName = baseName.replace(regex, masked);
                fileNameChanges.push({ type: 'Логин', original: w, masked: masked, rule: 'filename_login', fileName: originalName });
            }
        }
        return { name: baseName + ext, changes: fileNameChanges };
    }

    async function processFileWithYield(fileObj, fileIndex, totalFiles) {
        // Clear caches from previous file processing
        columnTypeCache.clear();

        var changes = []; var baseProgress = (fileIndex / totalFiles) * 100;
        var ext = fileObj.ext;

        var fileSoftMode = state.enableSoftMaskAll;

        // v5.7.60: Mask file name if hash mode is enabled
        var fileNameResult = await maskFileName(fileObj.name, fileSoftMode);
        var processedFileName = fileNameResult.name;
        if (fileNameResult.changes.length > 0) {
            changes.push.apply(changes, fileNameResult.changes.map(function(c) {
                return Object.assign({}, c, { fileName: fileObj.name, location: 'filename' });
            }));
        }

        // Helper to build overlay with ETA and step description
        function updateOverlay(fileProgress, isStreaming) {
            var overallProgress = Math.min(99.9, baseProgress + (fileProgress / totalFiles));
            var eta = calculateETA(fileProgress, processingStartTime);
            var overallETA = calculateETA(overallProgress, overallStartTime);
            var step = getStepDescription(fileProgress, ext, isStreaming);
            var fileLabel = 'Файл ' + (fileIndex + 1) + '/' + totalFiles + ': ' + processedFileName;
            var etaStr = overallETA;
            if (fileProgress > 0 && fileProgress < 100) {
                etaStr = 'файл ~' + eta + ' · всего ~' + overallETA;
            }
            showProcessingOverlay(fileLabel, overallProgress, step, etaStr);
        }

        updateOverlay(0, false);

        if (ext === 'docx') {
            var useStreaming = fileObj.size > LARGE_FILE_THRESHOLD;
            var result;
            if (useStreaming) {
                result = await processDocxStreamed(fileObj.file, processedFileName, changes, function(p){
                    updateOverlay(p, true);
                }, fileSoftMode);
            } else {
                result = await processDocxWithYield(fileObj.file, processedFileName, changes, function(p){
                    updateOverlay(p, false);
                }, fileSoftMode);
            }
            return { name: processedFileName, ext: ext, blob: result, changes: changes, streamed: useStreaming };
        }
        else if (ext === 'pptx') {
            var useStreaming = fileObj.size > LARGE_FILE_THRESHOLD;
            var result;
            if (useStreaming) {
                result = await processPptxStreamed(fileObj.file, processedFileName, changes, function(p){
                    updateOverlay(p, true);
                }, fileSoftMode);
            } else {
                result = await processPptxWithYield(fileObj.file, processedFileName, changes, function(p){
                    updateOverlay(p, false);
                }, fileSoftMode);
            }
            return { name: processedFileName, ext: ext, blob: result, changes: changes, streamed: useStreaming };
        }
        else if (ext === 'zip') {
            var result = await processZipFile(fileObj.file, processedFileName, changes, function(p){
                updateOverlay(p, false);
            }, fileSoftMode);
            return { name: processedFileName, ext: ext, blob: result, changes: changes };
        }
        else if (ext === '7z') {
            var result = await process7zFile(fileObj.file, processedFileName, changes, function(p){
                updateOverlay(p, false);
            }, fileSoftMode);
            return { name: processedFileName, ext: ext, blob: result, changes: changes };
        }
        else if (ext === 'tar') {
            var result = await processTarFile(fileObj.file, processedFileName, changes, function(p){
                updateOverlay(p, false);
            }, fileSoftMode);
            return { name: processedFileName, ext: ext, blob: result, changes: changes };
        }
        else if (ext === 'gz' || ext === 'tgz') {
            var result = await processGzFile(fileObj.file, processedFileName, changes, function(p){
                updateOverlay(p, false);
            }, fileSoftMode);
            return { name: processedFileName, ext: ext, blob: result, changes: changes };
        }
		else if (ext === 'ppt') {
    showNotification('Формат .ppt (PowerPoint 97-2003) требует конвертации в .pptx перед маскированием. Используйте "Сохранить как" в PowerPoint.', 'error');
    throw new Error('Формат .ppt не поддерживается напрямую. Конвертируйте в .pptx');
}
        else if (ext === 'xlsx' || ext === 'xlsb') {
            var useStreaming = fileObj.size > LARGE_FILE_THRESHOLD;
            var result;
            if (useStreaming) {
                result = await processXlsxStreamed(
                    fileObj.file,
                    processedFileName,
                    ext,
                    changes,
                    function(p) { updateOverlay(p, true); },
                    fileSoftMode
                );
            } else {
                result = await processXlsxWithYield(
                    fileObj.file,
                    processedFileName,
                    ext,
                    changes,
                    function(p) { updateOverlay(p, false); },
                    fileSoftMode
                );
            }
            return {
                name: processedFileName,
                ext: ext,
                blob: result,
                changes: changes,
                streamed: useStreaming
            };
        }
		
        else if (ext === 'csv') {
            // v5.7.47: CSV with column-aware login/person detection
            var csvResult = await processCsvFile(fileObj.file, processedFileName, changes, function(p){
                updateOverlay(p, false);
            }, fileSoftMode);
            return { name: processedFileName, ext: ext, blob: csvResult, changes: changes, streamed: false };
        }
        else if (ext === 'msg') {
            // v5.7.53: Outlook .msg files — read as ArrayBuffer, extract text strings
            updateOverlay(10, false);
            var buffer = await fileObj.file.arrayBuffer();
            var bytes = new Uint8Array(buffer);
            updateOverlay(30, false);
            // Extract readable text from binary .msg
            var extracted = extractMsgBinary(bytes);
            updateOverlay(50, false);
            var masked;
            if (extracted.length > 50000) {
                masked = await maskTextChunked(extracted, processedFileName, changes, function(p){
                    updateOverlay(50 + p * 0.4, false);
                });
            } else {
                masked = await maskTextAsync(extracted, processedFileName, changes, fileSoftMode);
            }
            updateOverlay(95, false);
            // v5.7.53: Add UTF-8 BOM for correct Cyrillic display in Windows editors
            var blob = new Blob(['\uFEFF' + masked], { type: 'text/plain;charset=utf-8' });
            // Return with .txt extension since binary .msg format cannot be reconstructed
            // Keep ext='msg' so preview shows correct icon
            return { name: processedFileName.replace(/\.msg$/i, '.txt'), ext: 'msg', blob: blob, changes: changes, content: masked, streamed: false };
        }
        else {
            var textExts = ['txt','json','xml','log','sql','yaml','yml','ini','md','msg'];
            var useStreaming = fileObj.size > STREAMING_FILE_THRESHOLD && textExts.indexOf(ext) !== -1;

            if (useStreaming) {
                var blob = await processTextFileStreamed(fileObj.file, processedFileName, changes, function(p){
                    updateOverlay(p, true);
                }, fileSoftMode);
                return { name: processedFileName, ext: ext, blob: blob, changes: changes, content: null, streamed: true };
            } else {
                var fileRead = await readFileAsTextWithEncoding(fileObj.file);
                var text = fileRead.text;
                var fileEncoding = fileRead.encoding;
                updateOverlay(30, false);
                var masked;
                if (text.length > 50000) {
                    masked = await maskTextChunked(text, processedFileName, changes, function(p){
                        updateOverlay(30 + p * 0.6, false);
                    });
                } else {
                    masked = await maskTextAsync(text, processedFileName, changes, fileSoftMode);
                }
                updateOverlay(95, false);
                var blob = createBlobWithEncoding(masked, fileEncoding);
                return { name: processedFileName, ext: ext, blob: blob, changes: changes, content: masked, streamed: false, encoding: fileEncoding };
            }
        }
    }

    // ==================== MSG TEXT EXTRACTION ====================
    // v5.7.53: Extract readable text from Outlook .msg binary files
    // .msg uses Compound File Binary Format (CFBF) — we extract text strings from binary
    function extractMsgBinary(bytes) {
        if (!bytes || bytes.length === 0) return '';
        var lines = [];
        var len = bytes.length;

        // Strategy 1: Decode entire buffer as UTF-16LE (most .msg text is UTF-16LE)
        // Skip the first 512 bytes (CFB header), scan the rest
        var utf16Text = '';
        try {
            var decoder = new TextDecoder('utf-16le', { fatal: false });
            utf16Text = decoder.decode(bytes.slice(512));
        } catch(e) {}

        // Extract readable text from UTF-16 decoded content
        var blocks = utf16Text.split(/[\x00-\x08\x0B\x0C\x0E-\x1F]+/);
        for (var i = 0; i < blocks.length; i++) {
            var block = blocks[i].trim();
            if (block.length >= 8) {
                var letterCount = 0;
                for (var j = 0; j < block.length; j++) {
                    var c = block.charCodeAt(j);
                    if ((c >= 0x41 && c <= 0x5A) || (c >= 0x61 && c <= 0x7A) ||
                        (c >= 0x410 && c <= 0x44F) || c === 0x401 || c === 0x451) letterCount++;
                }
                // Keep block if at least 25% letters
                if (letterCount / block.length > 0.25 && /[а-яА-Яa-zA-Z]{3,}/.test(block)) {
                    lines.push(block);
                }
            }
        }

        // Strategy 2: Also try UTF-8 decoding for any ASCII/UTF-8 text
        var utf8Text = '';
        try {
            var decoder8 = new TextDecoder('utf-8', { fatal: false });
            utf8Text = decoder8.decode(bytes);
        } catch(e) {}
        // Look for .msg property patterns: __substg1.0_XXXX follows property value
        // __substg1.0_1000 = PR_BODY, __substg1.0_0037 = PR_SUBJECT
        var knownProps = ['1000', '0037', '0C1A', '0C1D', '0C1F', '0E01', '0E02', '0E03', '0E04', '0E1D', '3001'];
        for (var p = 0; p < knownProps.length; p++) {
            var propMarker = '__substg1.0_' + knownProps[p];
            var idx = utf8Text.indexOf(propMarker);
            while (idx !== -1) {
                // Skip past the marker and any binary junk
                var start = idx + propMarker.length;
                // Skip null bytes and short binary data
                while (start < utf8Text.length && utf8Text.charCodeAt(start) < 32) start++;
                // Extract up to 2000 chars or until next null/property
                var end = start;
                while (end < utf8Text.length && end < start + 2000) {
                    var code = utf8Text.charCodeAt(end);
                    if (code === 0) break;
                    if (utf8Text.substring(end, end + 10).indexOf('__substg1') === 0) break;
                    end++;
                }
                var extracted = utf8Text.substring(start, end).trim();
                if (extracted.length >= 4 && /[а-яА-Яa-zA-Z]{2,}/.test(extracted)) {
                    lines.push(extracted);
                }
                idx = utf8Text.indexOf(propMarker, idx + 1);
            }
        }

        // Strategy 3: Extract all readable UTF-8 sequences with word chars
        var wordBlocks = utf8Text.split(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]+/);
        for (var w = 0; w < wordBlocks.length; w++) {
            var wb = wordBlocks[w].trim();
            if (wb.length >= 10 && /[а-яА-Яa-zA-Z]{3,}/.test(wb)) {
                var wLetterCount = 0;
                for (var c = 0; c < wb.length; c++) {
                    var cc = wb.charCodeAt(c);
                    if ((cc >= 0x41 && cc <= 0x5A) || (cc >= 0x61 && cc <= 0x7A) ||
                        (cc >= 0x410 && cc <= 0x44F) || cc === 0x401 || cc === 0x451) wLetterCount++;
                }
                if (wLetterCount / wb.length > 0.3) lines.push(wb);
            }
        }

        // Deduplicate
        var seen = {};
        var unique = [];
        for (var k = 0; k < lines.length; k++) {
            var key = lines[k].substring(0, 60);
            if (!seen[key]) { seen[key] = true; unique.push(lines[k]); }
        }
        return unique.join('\n\n---\n\n');
    }

    // ==================== CHUNKED TEXT MASKING ====================
    async function maskTextChunked(text, fileName, changes, progressCallback, softMode) {
        var result = ''; var totalLength = text.length; var processedLength = 0;
        var chunkIndex = 0; var totalChunks = Math.ceil(totalLength / CHUNK_SIZE);
        while (processedLength < totalLength) {
            var chunkEnd = Math.min(processedLength + CHUNK_SIZE, totalLength);
            var chunk = text.substring(processedLength, chunkEnd);
            var maskedChunk = await maskTextAsync(chunk, fileName, changes, softMode);
            result += maskedChunk; processedLength = chunkEnd; chunkIndex++;
            if (progressCallback) progressCallback((chunkIndex / totalChunks) * 100);
            await new Promise(function(resolve){ setTimeout(resolve, 1); });
        }
        return result;
    }
    async function maskTextAsync(text, fileName, changes, softMode) { if (!text) return text; return await maskTextInternal(text, fileName, changes, null, softMode); }

    // v5.7.47: CSV with column-aware login/person detection
    async function processCsvFile(file, fileName, changes, progressCallback, softMode) {
        var fileRead = await readFileAsTextWithEncoding(file);
        var text = fileRead.text;
        var fileEncoding = fileRead.encoding;
        
        if (progressCallback) progressCallback(10);
        
        // Detect delimiter
        var delimiter = ',';
        if (text.indexOf('\t') !== -1 && text.indexOf(',') === -1) delimiter = '\t';
        else if (text.indexOf(';') !== -1 && text.indexOf(',') === -1) delimiter = ';';
        
        var lines = text.split(/\r?\n/);
        if (lines.length === 0) return createBlobWithEncoding(text, fileEncoding);
        
        // Parse header row and detect column types
        var headers = parseCsvLine(lines[0], delimiter);
        var colTypes = [];
        
        for (var C = 0; C < headers.length; C++) {
            var headerText = headers[C] ? headers[C].trim() : '';
            
            var loginType = detectLoginColumnType(headerText);
            var personType = !loginType ? detectPersonColumnType(headerText) : null;
            colTypes[C] = loginType || personType;
        }
        
        if (progressCallback) progressCallback(20);
        
        // Process data rows
        var maskedLines = [lines[0]]; // keep original header
        var totalDataRows = lines.length - 1;
        
        for (var R = 1; R < lines.length; R++) {
            if (!lines[R]) { maskedLines.push(''); continue; }
            
            var fields = parseCsvLine(lines[R], delimiter);
            var maskedFields = [];
            
            for (var C = 0; C < fields.length; C++) {
                var val = fields[C];
                var colType = colTypes[C];
                
                if (colType && val) {
                    // Typed column: mask via applyMaskByType
                    var masked = applyMaskByType(val, colType);
                    maskedFields.push(masked);
                    changes._totalChanges = (changes._totalChanges || 0) + 1;
                    changes.push({
                        type: colType,
                        original: val,
                        masked: masked,
                        rule: 'csv-columntype-' + colType,
                        fileName: fileName,
                        cell: 'R' + R + 'C' + C,
                        confidence: 'high'
                    });
                } else if (val) {
                    // v5.7.47: Untyped column — still apply maskText for FIO/patterns
                    var fileChanges = [];
                    var masked = maskText(val, fileName, fileChanges, softMode);
                    maskedFields.push(masked);
                    if (fileChanges.length > 0) {
                        changes._totalChanges = (changes._totalChanges || 0) + fileChanges.length;
                        for (var ci = 0; ci < fileChanges.length; ci++) {
                            fileChanges[ci].cell = 'R' + R + 'C' + C;
                            fileChanges[ci].sheet = fileName;
                            changes.push(fileChanges[ci]);
                        }
                    }
                } else {
                    maskedFields.push(val);
                }
            }
            
            maskedLines.push(joinCsvLine(maskedFields, delimiter));
            
            // v5.7.50: yield every 500 rows (was 1000) to prevent UI blocking
            if (R % 500 === 0) {
                if (progressCallback) progressCallback(20 + (R / totalDataRows) * 75);
                await new Promise(function(resolve) { setTimeout(resolve, 0); });
            }
        }
        
        if (progressCallback) progressCallback(100);
        var resultText = maskedLines.join('\n');
        return createBlobWithEncoding(resultText, fileEncoding);
    }

    // ==================== DOCX PROCESSING ====================
    async function processDocxWithYield(file, fileName, changes, progressCallback, softMode) {
        var arrayBuffer = await file.arrayBuffer(); if (progressCallback) progressCallback(10);
        var zip = await JSZip.loadAsync(arrayBuffer); if (progressCallback) progressCallback(20);
        var docXmlEntry = zip.file('word/document.xml');
        if (docXmlEntry) {
            var docXml = await docXmlEntry.async('string'); if (progressCallback) progressCallback(30);
            var maskedXml; if (docXml.length > 20000) { maskedXml = await maskDocxXmlAsync(docXml, fileName, changes, function(p){ if (progressCallback) progressCallback(30 + (p * 0.15)); }, softMode); } else { maskedXml = maskDocxXml(docXml, fileName, changes, softMode); }
            zip.file('word/document.xml', maskedXml, { compression: 'DEFLATE', compressionOptions: { level: 6 } });
        }
        if (progressCallback) progressCallback(50);
        var headerFooterFiles = zip.file(/^word\/(header|footer)\d+\.xml$/);
        for (var i = 0; i < headerFooterFiles.length; i++) {
            var hfFile = headerFooterFiles[i]; var hfXml = await hfFile.async('string'); var maskedHfXml;
            if (hfXml.length > 20000) maskedHfXml = await maskDocxXmlAsync(hfXml, fileName, changes, null, softMode); else maskedHfXml = maskDocxXml(hfXml, fileName, changes, softMode);
            zip.file(hfFile.name, maskedHfXml, { compression: 'DEFLATE', compressionOptions: { level: 6 } });
            if (i % 2 === 0) await new Promise(function(resolve){ setTimeout(resolve, 5); });
        }
        if (progressCallback) progressCallback(70);
        var noteFiles = zip.file(/^word\/(footnotes|endnotes)\.xml$/);
        for (var i = 0; i < noteFiles.length; i++) {
            var noteFile = noteFiles[i]; var noteXml = await noteFile.async('string'); var maskedNoteXml;
            if (noteXml.length > 50000) maskedNoteXml = await maskDocxXmlAsync(noteXml, fileName, changes, null, softMode); else maskedNoteXml = maskDocxXml(noteXml, fileName, changes, softMode);
            zip.file(noteFile.name, maskedNoteXml, { compression: 'DEFLATE', compressionOptions: { level: 6 } });
        }
        if (progressCallback) progressCallback(80);
        var settingsXml = zip.file('word/settings.xml');
        if (settingsXml) { var settingsContent = await settingsXml.async('string'); if (state.removeMetadata) { settingsContent = settingsContent.replace(/<w:defaultTabStop[^>]*\/>/g, ''); settingsContent = settingsContent.replace(/<w:trackRevisions[^>]*\/>/g, ''); } zip.file('word/settings.xml', settingsContent, { compression: 'DEFLATE', compressionOptions: { level: 6 } }); }
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
            var coreXml = zip.file('docProps/core.xml'); if (coreXml) zip.file('docProps/core.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"></cp:coreProperties>');
            var appXml = zip.file('docProps/app.xml'); if (appXml) zip.file('docProps/app.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>MaskingTool</Application></Properties>');
            var customXml = zip.file('docProps/custom.xml'); if (customXml) zip.remove('docProps/custom.xml');
        }
        if (progressCallback) progressCallback(90);
        var blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', compression: 'DEFLATE', compressionOptions: { level: 9 } });
        if (progressCallback) progressCallback(100); return blob;
    }
	
// ==================== PPTX PROCESSING ====================
async function processPptxWithYield(file, fileName, changes, progressCallback, softMode) {
    return await _processPptxInternal(file, fileName, changes, progressCallback, softMode);
}

async function processPptxStreamed(file, fileName, changes, progressCallback, softMode) {
    return await _processPptxInternal(file, fileName, changes, progressCallback, softMode);
}

async function _processPptxInternal(file, fileName, changes, progressCallback, softMode) {
    var arrayBuffer = await file.arrayBuffer();
    if (progressCallback) progressCallback(5);

    var zip = await JSZip.loadAsync(arrayBuffer);
    if (progressCallback) progressCallback(10);

    // Создаём новый архив с нуля — избегаем проблем с zip.remove()/метаданными
    var newZip = new JSZip();

    var textXmlPatterns = [
        /^ppt\/slides\/slide\d+\.xml$/,
        /^ppt\/notesSlides\/notesSlide\d+\.xml$/,
        /^ppt\/notesMasters\/notesMaster\d+\.xml$/,
        /^ppt\/slideMasters\/slideMaster\d+\.xml$/,
        /^ppt\/slideLayouts\/slideLayout\d+\.xml$/
    ];

    var entries = [];
    zip.forEach(function(relativePath, zipEntry) {
        // Пропускаем записи-директории — они ломают структуру ZIP
        if (relativePath.endsWith('/')) return;
        entries.push({ path: relativePath, entry: zipEntry });
    });

    var totalFiles = entries.length;

    for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        var path = e.path;

        // Проверяем, нужно ли маскировать этот файл
        var isTextXml = false;
        for (var p = 0; p < textXmlPatterns.length; p++) {
            if (textXmlPatterns[p].test(path)) {
                isTextXml = true;
                break;
            }
        }

        if (isTextXml) {
            var xmlContent = await e.entry.async('string');
            var maskedXml;

            if (xmlContent.length > 50000) {
                maskedXml = await maskPptxXmlStreamed(xmlContent, fileName, changes, null, softMode);
            } else {
                maskedXml = maskPptxXml(xmlContent, fileName, changes, softMode);
            }

            // Гарантируем отсутствие null bytes в XML
            if (maskedXml.indexOf('\x00') !== -1) {
                console.error('[PPTX] Null bytes detected in masked XML for', path);
                maskedXml = maskedXml.replace(/\x00/g, '');
            }

            newZip.file(path, maskedXml, {
                compression: 'DEFLATE',
                compressionOptions: { level: 6 },
                date: new Date(1980, 0, 1)
            });
        } else {
            // Бинарные и системные файлы — копируем как Uint8Array без изменений
            var binContent = await e.entry.async('uint8array');
            // Для уже сжатых форматов используем STORE, для остальных — DEFLATE
            var isAlreadyCompressed = /\.(jpeg|jpg|png|gif|bmp|emf|wmf|bin|mp3|mp4|wav|wmv|avi)$/i.test(path);

            newZip.file(path, binContent, {
                compression: isAlreadyCompressed ? 'STORE' : 'DEFLATE',
                compressionOptions: { level: 6 },
                date: new Date(1980, 0, 1)
            });
        }

        if (progressCallback) {
            progressCallback(10 + ((i + 1) / totalFiles) * 85);
        }

        if (i % 3 === 0) {
            await new Promise(function(resolve) { setTimeout(resolve, 5); });
        }
    }

    if (progressCallback) progressCallback(98);

    var blob = await newZip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    });

    if (progressCallback) progressCallback(100);
    return blob;
}

// v5.7.61: paragraph-level aggregation for cross-run FIO detection in PPTX
// Some text is split across multiple <a:r> runs (e.g. "Кружинов А." | " " | "Ю."),
// which prevents regex from matching. This function aggregates text per <a:p> paragraph,
// masks it, and distributes the result back to the first run.
function maskPptxParagraphs(xmlContent, fileName, changes, softMode) {
    var result = '';
    var pos = 0;
    while (true) {
        var pStart = xmlContent.indexOf('<a:p>', pos);
        if (pStart === -1) {
            result += xmlContent.substring(pos);
            break;
        }
        result += xmlContent.substring(pos, pStart);
        var pEnd = xmlContent.indexOf('</a:p>', pStart);
        if (pEnd === -1) {
            result += xmlContent.substring(pStart);
            break;
        }
        pEnd += 6;
        var paragraphXml = xmlContent.substring(pStart, pEnd);
        
        // Extract all <a:t> text
        var runs = [];
        var runPos = 0;
        var fullText = '';
        while (true) {
            var tagStart = paragraphXml.indexOf('<a:t', runPos);
            if (tagStart === -1) break;
            var tagEnd = paragraphXml.indexOf('>', tagStart);
            if (tagEnd === -1) break;
            var closeTagStart = paragraphXml.indexOf('</a:t>', tagEnd + 1);
            if (closeTagStart === -1) break;
            var text = paragraphXml.substring(tagEnd + 1, closeTagStart);
            var decoded = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
            runs.push({ tagStart: tagStart, tagEnd: tagEnd + 1, textStart: tagEnd + 1, textEnd: closeTagStart, text: decoded });
            fullText += decoded;
            runPos = closeTagStart + 6;
        }
        
        if (runs.length > 1 && fullText.length > 0) {
            var paraChanges = [];
            var maskedFull = maskText(fullText, fileName, paraChanges, softMode);
            if (paraChanges.length > 0) {
                changes.push.apply(changes, paraChanges.map(function(c) {
                    return Object.assign({}, c, { source: 'pptx-paragraph' });
                }));
                // Build new paragraph: replace first run with full masked text, clear others
                // We rebuild from end to start to preserve positions
                var newParagraph = paragraphXml;
                for (var i = runs.length - 1; i >= 0; i--) {
                    var r = runs[i];
                    if (i === 0) {
                        var safeText = maskedFull.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
                        newParagraph = newParagraph.substring(0, r.textStart) + safeText + newParagraph.substring(r.textEnd);
                    } else {
                        // Clear this run's text (replace with empty)
                        newParagraph = newParagraph.substring(0, r.textStart) + newParagraph.substring(r.textEnd);
                    }
                }
                result += newParagraph;
                pos = pEnd;
                continue;
            }
        }
        result += paragraphXml;
        pos = pEnd;
    }
    return result;
}

// Синхронная маскировка PPTX XML (текст в <a:t> тегах)
function maskPptxXml(xmlContent, fileName, changes, softMode) {
    if (!xmlContent || xmlContent.length === 0) return xmlContent;
    // v5.7.62: Paragraph aggregation disabled — causes PowerPoint corruption
    // xmlContent = maskPptxParagraphs(xmlContent, fileName, changes, softMode);

    var result = '';
    var pos = 0;
    var maskCount = 0;

    while (true) {
        // Find next <a:t tag
        var tagStart = xmlContent.indexOf('<a:t', pos);
        if (tagStart === -1) {
            result += xmlContent.substring(pos);
            break;
        }

        result += xmlContent.substring(pos, tagStart);

        // Find the end of opening tag (>)
        var tagEnd = xmlContent.indexOf('>', tagStart);
        if (tagEnd === -1) {
            result += xmlContent.substring(tagStart);
            console.error('[PPTX-MASK] Malformed <a:t> tag');
            break;
        }

        var openTag = xmlContent.substring(tagStart, tagEnd + 1);

        // Self-closing?
        if (xmlContent.charAt(tagEnd - 1) === '/') {
            result += openTag;
            pos = tagEnd + 1;
            continue;
        }

        // Find closing </a:t>
        var closeTagStart = xmlContent.indexOf('</a:t>', tagEnd + 1);
        if (closeTagStart === -1) {
            result += xmlContent.substring(tagStart);
            console.error('[PPTX-MASK] No closing </a:t>');
            break;
        }

        var textContent = xmlContent.substring(tagEnd + 1, closeTagStart);

        // Skip if nested < inside
        if (textContent.indexOf('<') !== -1) {
            result += openTag + textContent + '</a:t>';
            pos = closeTagStart + 6;
            continue;
        }

        if (textContent.trim().length === 0) {
            result += openTag + textContent + '</a:t>';
            pos = closeTagStart + 6;
            continue;
        }

        // Decode XML entities
        var decodedText = textContent
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'");

        var fileChanges = [];
        var maskedText = maskText(decodedText, fileName, fileChanges, softMode);

        if (fileChanges.length > 0) {
            changes.push.apply(changes, fileChanges.map(function(c) {
                return Object.assign({}, c, { source: 'pptx-text' });
            }));
            maskCount++;
        }

        // Encode XML entities
        var safeText = maskedText
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');

        result += openTag + safeText + '</a:t>';
        pos = closeTagStart + 6;
    }

    // Обработка гиперссылок: tooltip в a:hlinkClick и a:hlinkHover
    var hlinkRegex = /(<a:hlink(?:Click|Hover)[^>]*\stooltip=")([^"]+)(")/gi;
    var hlinkMatch;
    while ((hlinkMatch = hlinkRegex.exec(result)) !== null) {
        var tooltip = hlinkMatch[2];
        if (!tooltip || tooltip.length < 3) continue;
        var tooltipChanges = [];
        var maskedTooltip = maskText(tooltip, fileName, tooltipChanges, softMode);
        if (tooltipChanges.length > 0) {
            changes.push.apply(changes, tooltipChanges.map(function(c) {
                return Object.assign({}, c, { source: 'pptx hyperlink tooltip' });
            }));
            result = result.replace(hlinkMatch[0], hlinkMatch[1] + maskedTooltip + hlinkMatch[3]);
        }
    }

    return result;
}

async function maskPptxXmlStreamed(xmlContent, fileName, changes, progressCallback, softMode) {
    if (!xmlContent || xmlContent.length === 0) return xmlContent;
    // v5.7.62: Paragraph aggregation disabled — causes PowerPoint corruption
    // xmlContent = maskPptxParagraphs(xmlContent, fileName, changes, softMode);

    var result = '';
    var pos = 0;
    var maskCount = 0;
    var totalTags = 0;

    while (true) {
        var tagStart = xmlContent.indexOf('<a:t', pos);
        if (tagStart === -1) {
            result += xmlContent.substring(pos);
            break;
        }

        result += xmlContent.substring(pos, tagStart);

        var tagEnd = xmlContent.indexOf('>', tagStart);
        if (tagEnd === -1) {
            result += xmlContent.substring(tagStart);
            break;
        }

        var openTag = xmlContent.substring(tagStart, tagEnd + 1);

        if (xmlContent.charAt(tagEnd - 1) === '/') {
            result += openTag;
            pos = tagEnd + 1;
            continue;
        }

        var closeTagStart = xmlContent.indexOf('</a:t>', tagEnd + 1);
        if (closeTagStart === -1) {
            result += xmlContent.substring(tagStart);
            break;
        }

        var textContent = xmlContent.substring(tagEnd + 1, closeTagStart);

        if (textContent.indexOf('<') !== -1) {
            result += openTag + textContent + '</a:t>';
            pos = closeTagStart + 6;
            continue;
        }

        totalTags++;

        if (textContent.trim().length === 0) {
            result += openTag + textContent + '</a:t>';
            pos = closeTagStart + 6;
            continue;
        }

        var decodedText = textContent
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'");

        var fileChanges = [];
        var maskedText;
        if (decodedText.length > 100) {
            maskedText = await maskTextAsync(decodedText, fileName, fileChanges, softMode);
        } else {
            maskedText = maskText(decodedText, fileName, fileChanges, softMode);
        }

        if (fileChanges.length > 0) {
            changes.push.apply(changes, fileChanges.map(function(c) {
                return Object.assign({}, c, { source: 'pptx-text' });
            }));
            maskCount++;
        }

        var safeText = maskedText
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');

        result += openTag + safeText + '</a:t>';
        pos = closeTagStart + 6;

        if (totalTags % 100 === 0) {
            if (progressCallback) {
                progressCallback(Math.min(100, (pos / xmlContent.length) * 100));
            }
            await new Promise(function(resolve) { setTimeout(resolve, 0); });
        }
    }

    // Обработка гиперссылок: tooltip в a:hlinkClick и a:hlinkHover
    var hlinkRegex = /(<a:hlink(?:Click|Hover)[^>]*\stooltip=")([^"]+)(")/gi;
    var hlinkMatch;
    while ((hlinkMatch = hlinkRegex.exec(result)) !== null) {
        var tooltip = hlinkMatch[2];
        if (!tooltip || tooltip.length < 3) continue;
        var tooltipChanges = [];
        var maskedTooltip = await maskTextAsync(tooltip, fileName, tooltipChanges, softMode);
        if (tooltipChanges.length > 0) {
            changes.push.apply(changes, tooltipChanges.map(function(c) {
                return Object.assign({}, c, { source: 'pptx hyperlink tooltip' });
            }));
            result = result.replace(hlinkMatch[0], hlinkMatch[1] + maskedTooltip + hlinkMatch[3]);
        }
    }

    if (progressCallback) progressCallback(100);
    return result;
}

	// Streamed PPTX для очень больших файлов
	

    function maskDocxXml(xmlContent, fileName, changes, softMode) {
        var parts = xmlContent.split(/(<[^>]+>)/g);
        for (var i = 0; i < parts.length; i++) {
            var part = parts[i];
            if (!part.startsWith('<') && part.trim().length > 0) { var maskedPart = maskText(part, fileName, changes, softMode); parts[i] = maskedPart; }
            if (part.startsWith('<') && !part.startsWith('</') && !part.endsWith('/>')) { var attrMasked = maskDocxAttributes(part, fileName, changes, softMode); parts[i] = attrMasked; }
        }
        return parts.join('');
    }
    async function maskDocxXmlAsync(xmlContent, fileName, changes, progressCallback, softMode) {
        var parts = xmlContent.split(/(<[^>]+>)/g); var totalParts = parts.length;
        for (var i = 0; i < parts.length; i++) {
            var part = parts[i];
            if (!part.startsWith('<') && part.trim().length > 0) { var maskedPart = await maskTextAsync(part, fileName, changes); parts[i] = maskedPart; }
            if (part.startsWith('<') && !part.startsWith('</') && !part.endsWith('/>')) { var attrMasked = await maskDocxAttributesAsync(part, fileName, changes); parts[i] = attrMasked; }
            if (i % 100 === 0 && progressCallback) { progressCallback((i / totalParts) * 100); await new Promise(function(resolve){ setTimeout(resolve, 0); }); }
        }
        return parts.join('');
    }
    function maskDocxAttributes(xmlTag, fileName, changes, softMode) {
        // Обработка стандартных атрибутов w:
        var attrRegex = /(w:(?:val|alt|desc|title|tooltip|name|id))=["']([^"']+)["']/gi;
        var result = xmlTag.replace(attrRegex, function(match, attrName, attrValue) {
            if (attrValue.trim().length < 3) return match; var attrChanges = [];
            var masked = maskText(attrValue, fileName, attrChanges, softMode);
            if (attrChanges.length > 0) { changes.push.apply(changes, attrChanges.map(function(c){ return Object.assign({}, c, { source: 'attribute: ' + attrName }); })); return attrName + '\"' + masked + '\"'; }
            return match;
        });
        // Обработка гиперссылок: w:tooltip в w:hyperlink
        result = result.replace(/(<w:hyperlink[^>]*\sw:tooltip=")([^"]+)(")/gi, function(match, prefix, url, suffix) {
            if (!url || url.length < 3) return match;
            var linkChanges = [];
            var masked = maskText(url, fileName, linkChanges, softMode);
            if (linkChanges.length > 0) {
                changes.push.apply(changes, linkChanges.map(function(c){ return Object.assign({}, c, { source: 'hyperlink tooltip' }); }));
                return prefix + masked + suffix;
            }
            return match;
        });
        return result;
    }
    async function maskDocxAttributesAsync(xmlTag, fileName, changes, softMode) {
        var attrRegex = /(w:(?:val|alt|desc|title|tooltip|name|id))=["']([^"']+)["']/gi; var result = xmlTag; var match;
        while ((match = attrRegex.exec(xmlTag)) !== null) {
            var attrName = match[1]; var attrValue = match[2]; if (attrValue.trim().length < 3) continue;
            var attrChanges = []; var masked = await maskTextAsync(attrValue, fileName, attrChanges, softMode);
            if (attrChanges.length > 0) { changes.push.apply(changes, attrChanges.map(function(c){ return Object.assign({}, c, { source: 'attribute: ' + attrName }); })); result = result.replace(match[0], attrName + '"' + masked + '"'); }
        }
        // Обработка гиперссылок: w:tooltip в w:hyperlink
        var hlinkRegex = /(<w:hyperlink[^>]*\sw:tooltip=")([^"]+)(")/gi;
        while ((match = hlinkRegex.exec(xmlTag)) !== null) {
            var url = match[2]; if (!url || url.length < 3) continue;
            var linkChanges = []; var masked = await maskTextAsync(url, fileName, linkChanges, softMode);
            if (linkChanges.length > 0) {
                changes.push.apply(changes, linkChanges.map(function(c){ return Object.assign({}, c, { source: 'hyperlink tooltip' }); }));
                result = result.replace(match[0], match[1] + masked + match[3]);
            }
        }
        return result;
    }

    // ==================== XLSX PROCESSING WITH COLUMN TYPING ====================
    /**
     * Checks if an XLSX cell contains a date/time value that should NOT be masked.
     * Preserves Excel date formats and prevents false pattern matches on serialized dates.
     */
    function isDateTimeCell(cell) {
        if (!cell) return false;
        // SheetJS date type
        if (cell.t === 'd') return true;
        // Excel format string contains date/time markers
        if (cell.z && /[dymsbh]/.test(cell.z.toLowerCase())) return true;
        // Value looks like a date/time string DD.MM.YYYY HH:MM or similar
        if (cell.v !== undefined && cell.v !== null) {
            var str = String(cell.v).trim();
            if (/^\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/.test(str)) return true;
            if (/^\d{4}[\.\/\-]\d{1,2}[\.\/\-]\d{1,2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/.test(str)) return true;
        }
        return false;
    }

