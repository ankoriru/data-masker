    // ==================== RESULTS / PREVIEW ====================
    function renderResults() {
        var section = document.getElementById('resultsSection'); var container = document.getElementById('resultsList');
        section.classList.remove('hidden');
        var totalChanges = state.processedFiles.reduce(function(sum, f){ return sum + (f._totalChanges || (f.changes ? f.changes.length : 0)); }, 0);
        var statsHtml = '<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">';
        statsHtml += '<div class="stat-card rounded-xl p-4 text-center"><div class="text-2xl font-bold text-indigo-400">' + state.processedFiles.length + '</div><div class="text-xs text-slate-400">Файлов</div></div>';
        statsHtml += '<div class="stat-card rounded-xl p-4 text-center"><div class="text-2xl font-bold text-purple-400">' + totalChanges + '</div><div class="text-xs text-slate-400">Всего замен</div></div>';
        var uniqueTypes = new Set(); state.processedFiles.forEach(function(f){ if (f.changes) f.changes.forEach(function(c){ uniqueTypes.add(c.type); }); });
        statsHtml += '<div class="stat-card rounded-xl p-4 text-center"><div class="text-2xl font-bold text-pink-400">' + uniqueTypes.size + '</div><div class="text-xs text-slate-400">Типов данных</div></div>';
        statsHtml += '<div class="stat-card rounded-xl p-4 text-center"><div class="text-2xl font-bold text-green-400">' + state.processedFiles.filter(function(f){ return f.changes && f.changes.length > 0; }).length + '</div><div class="text-xs text-slate-400">Изменено</div></div></div>';
        var filesHtml = '';
        for (var i = 0; i < state.processedFiles.length; i++) {
            var f = state.processedFiles[i]; var changeCounts = {};
            if (f.changes) f.changes.forEach(function(c){ changeCounts[c.type] = (changeCounts[c.type] || 0) + 1; });
            filesHtml += '<div class="glass rounded-xl p-5">';
            filesHtml += '<div class="flex items-center justify-between mb-3 flex-wrap gap-2">';
            filesHtml += '<div class="flex items-center gap-3"><span class="text-2xl">' + getFileIcon(f.ext) + '</span><div><p class="text-sm font-semibold text-white">' + f.name + '</p>';
            // v5.7.52: show _totalChanges only (not "changes.length из _totalChanges")
            var chLabel = f._totalChanges || (f.changes ? f.changes.length : 0);
            filesHtml += '<p class="text-xs text-slate-500">' + chLabel + ' изменений' + (state.removeMetadata ? ' · метаданные удалены' : '') + (f.streamed ? ' · 🌊 потоковая обработка' : '') + '</p></div></div>';
            if (f.blob) filesHtml += '<button onclick="downloadProcessedFile(\'' + f.name + '\')" class="btn-primary text-white text-sm px-4 py-2 rounded-lg font-semibold">Скачать</button>';
            var qs = calculateQualityScore(f);
            var qsBadge = '<span class="text-xs px-2 py-1 rounded ml-2 ' + (qs.score >= 90 ? 'bg-green-900/30 text-green-400' : qs.score >= 70 ? 'bg-amber-900/30 text-amber-400' : 'bg-red-900/30 text-red-400') + '">QS: ' + qs.score + '</span>';
            filesHtml += qsBadge;
            if (f.error) filesHtml += '<span class="text-red-400 text-sm">' + f.error + '</span>';
            filesHtml += '</div>';
            if (Object.keys(changeCounts).length > 0) {
                filesHtml += '<div class="flex flex-wrap gap-2">';
                // v5.7.50: if capped, show ~estimated counts based on _totalChanges ratio
                var _ratio = (f._totalChanges && f._totalChanges > f.changes.length) ? (f._totalChanges / f.changes.length) : 1;
                Object.entries(changeCounts).forEach(function(entry){ var type = entry[0]; var count = entry[1]; var _displayCount = _ratio > 1 ? Math.round(count * _ratio) : count; filesHtml += '<span class="chip bg-indigo-900/30 text-indigo-300 px-3 py-1 rounded-full text-xs">' + type + ': ' + _displayCount + '</span>'; });
                filesHtml += '</div>';
            } else { filesHtml += '<p class="text-xs text-slate-500">Нет обнаруженных данных для маскирования</p>'; }
            filesHtml += '</div>';
        }
        container.innerHTML = statsHtml + filesHtml;
    }
    function renderPreview() {
        var container = document.getElementById('previewContainer');
        if (state.processedFiles.length === 0) { container.innerHTML = '<div class="text-center py-16 text-slate-500"><svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg><p>Загрузите и обработайте файлы для просмотра изменений</p></div>'; return; }
        var html = ''; var hasChanges = false;
        for (var i = 0; i < state.processedFiles.length; i++) {
            var f = state.processedFiles[i]; if (!f.changes || f.changes.length === 0) continue; hasChanges = true;
            html += '<div class="glass rounded-xl p-5 mb-4 fade-in">';
            html += '<div class="flex items-center justify-between mb-3">';
            html += '<h3 class="text-lg font-bold text-white">' + getFileIcon(f.ext) + ' ' + f.name + '</h3>';
            var _previewTotal = f._totalChanges || f.changes.length;
            html += '<span class="text-xs bg-indigo-900/30 text-indigo-300 px-3 py-1 rounded-full">' + _previewTotal + ' изменений</span></div>';
            html += '<div class="space-y-2 max-h-96 overflow-y-auto">';
            for (var j = 0; j < f.changes.length; j++) {
                var c = f.changes[j];
                html += '<div class="grid grid-cols-1 md:grid-cols-4 gap-2 bg-slate-800/50 rounded-lg p-3 text-sm border border-slate-700/50">';
                html += '<div class="flex items-center gap-2"><span class="text-xs text-slate-500">#' + (j + 1) + '</span><span class="text-indigo-400 font-medium text-xs">' + c.type + '</span></div>';
                html += '<div class="md:col-span-1"><span class="text-xs text-slate-500">Правило:</span><span class="text-slate-300 text-xs ml-1">' + c.rule + '</span></div>';
                html += '<div><span class="text-xs text-red-500">Было:</span><span class="diff-old text-xs ml-1">' + escapeHtml(c.original) + '</span></div>';
                html += '<div><span class="text-xs text-green-500">Стало:</span><span class="diff-new text-xs ml-1">' + escapeHtml(c.masked) + '</span></div></div>';
            }
            html += '</div></div>';
        }
        if (!hasChanges) html = '<div class="text-center py-16 text-slate-500 fade-in"><svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><p class="text-lg">Обработка завершена, но изменений не обнаружено</p><p class="text-sm mt-2">Возможно, в файлах нет данных, соответствующих правилам маскирования</p></div>';
        container.innerHTML = html;
    }
    function escapeHtml(text) { var div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

    // ==================== DOWNLOADS ====================
    function downloadProcessedFile(name) {
        var processed = state.processedFiles.find(function(f){ return f.name === name; });
        if (processed && processed.blob) { 
            var url = URL.createObjectURL(processed.blob); 
            var a = document.createElement('a'); 
            a.href = url; 
            var ext = name.split('.').pop().toLowerCase();
            var outName = 'masked_' + name;
            a.download = outName; 
            document.body.appendChild(a); 
            a.click(); 
            document.body.removeChild(a); 
            URL.revokeObjectURL(url); 
        }
        else if (processed && processed.content !== undefined && processed.content !== null) { 
            var blob = new Blob([processed.content], { type: 'text/plain;charset=utf-8' }); 
            var url = URL.createObjectURL(blob); 
            var a = document.createElement('a'); 
            a.href = url; 
            a.download = 'masked_' + name; 
            document.body.appendChild(a); 
            a.click(); 
            document.body.removeChild(a); 
            URL.revokeObjectURL(url); 
        }
    }
    function downloadAllFiles() { for (var i = 0; i < state.processedFiles.length; i++) { var f = state.processedFiles[i]; if (f.blob || (f.content !== undefined && f.content !== null)) downloadProcessedFile(f.name); } }
    function downloadTextFile(name, content) { var blob = new Blob([content], { type: 'text/plain;charset=utf-8' }); var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }
    function downloadReport() {
        var report = 'ОТЧЁТ О МАСКИРОВАНИИ ДОКУМЕНТОВ\n';
        report += '='.repeat(60) + '\n';
        report += 'Дата: ' + new Date().toLocaleString('ru-RU') + '\n';
        report += 'Пользователь AD: ' + state.currentUser + '\n';
        report += 'Шаблоны: ' + state.activeTemplates.map(function(tid){ for(var i=0;i<templates.length;i++) if(templates[i].id===tid) return templates[i].name; return tid; }).join(', ') + '\n';
        report += 'Удаление метаданных: ' + (state.removeMetadata ? 'Включено' : 'Выключено') + '\n';
        if (state.activeTemplates.indexOf('listmask') !== -1 && state.listFiles.length > 0) {
            report += '\n--- Файлы-списки ---\n';
            for (var i = 0; i < state.listFiles.length; i++) { var lf = state.listFiles[i]; report += '  - ' + lf.name + ': ' + lf.valueCount + ' значений\n'; }
        }
        if (state.customCommercialColumns.length > 0) { report += '\n--- Колонки Коммерческая тайна ---\n'; state.customCommercialColumns.forEach(function(c){ report += '  - ' + c + '\n'; }); }
        if (state.customPersonalColumns.length > 0) { report += '\n--- Колонки Персональные данные ---\n'; state.customPersonalColumns.forEach(function(c){ report += '  - ' + c + '\n'; }); }
        if (state.excludedColumns.length > 0) { report += '\n--- Исключаемые столбцы (белый список) ---\n'; state.excludedColumns.forEach(function(c){ report += '  - ' + c + ' (НЕ маскируется)\n'; }); }
        report += '='.repeat(60) + '\n\n';
        for (var i = 0; i < state.processedFiles.length; i++) {
            var f = state.processedFiles[i]; report += 'Файл: ' + f.name + '\n';
            report += 'Статус: ' + (f.error ? 'ОШИБКА: ' + f.error : 'Обработан') + '\n';
            if (f.changes && f.changes.length > 0) {
                var qs = calculateQualityScore(f);
            report += 'Quality Score (QS): ' + qs.score + '/100\n';
            report += '  Полнота: ' + qs.coverage + ' | Точность: ' + qs.confidence + ' | Риск: ' + qs.residual + ' | Целостность: ' + qs.integrity + '\n';
            report += '  Распределение: Высокая=' + qs.counts.high + ' Средняя=' + qs.counts.medium + ' Низкая=' + qs.counts.low + '\n';
            var _reportTotal = f._totalChanges || f.changes.length;
            report += 'Количество замен: ' + _reportTotal + '\n'; report += 'Детали:\n';
                for (var j = 0; j < f.changes.length; j++) { var c = f.changes[j]; report += '  ' + (j + 1) + '. Тип: ' + c.type + ' | Правило: ' + c.rule + '\n'; report += '     Оригинальное значение: ' + maskPreview(c.original) + ' \u2192 Замаскировано\n'; }
            } else { report += 'Замен не обнаружено\n'; }
            report += '-'.repeat(40) + '\n';
        }
        downloadTextFile('report_masking_' + Date.now() + '.txt', report);
    }

    
    // ==================== QUALITY ASSESSMENT ====================
    var CONFIDENCE_WEIGHTS = { high: 1.0, medium: 0.6, low: 0.25 };

    function getConfidence(patternType, ruleId, isList, isColumnType) {
        if (isList) return 'high';
        if (isColumnType) return 'high';
        var map = {
            'ИНН': 'high', 'СНИЛС': 'high', 'СНИЛС (формат)': 'high',
            'Серия паспорта': 'high', 'Номер паспорта': 'high', 'Паспорт серия+номер': 'high',
            'Паспорт': 'high', 'Код подразделения': 'high', 'Код подразделения (контекст)': 'high',
            'Расчётный счёт': 'high', 'Корр. счёт': 'high', 'БИК': 'high', 'Банковский счёт': 'high',
            'ОГРН': 'high', 'ОГРНИП': 'high', 'КПП': 'high',
            'Номер карты': 'high',
            'MAC-адрес': 'high',
            'UUID/GUID': 'high',
            'JWT токен': 'high',
            'API-ключ/Токен': 'high',
            'VIN': 'high',
            'Полис ОМС': 'high',
            'Certificate/Key header': 'high', 'Certificate/Key footer': 'high',
            'Connection string parameter': 'high', 'Database connection URI': 'high',
            'Пароль': 'high',
            'Телефон': 'medium',
            'Email': 'medium',
            'ФИО (полное)': 'medium', 'ФИО (с инициалами)': 'medium', 'ФИО (инициалы + фамилия)': 'medium',
            'IP-адрес': 'medium',
            'URL': 'medium',
            'Гос. номер': 'medium',
            'Git commit hash': 'medium',
            'MD5 хеш': 'medium', 'SHA-256 хеш': 'medium',
            'Имя хоста': 'medium',
            'IP:Порт': 'medium',
            'Имя пользователя': 'medium',
            'Session ID': 'medium',
            'Docker image': 'medium', 'Docker reference': 'medium',
            'Kubernetes resource': 'medium',
            'Организация (ОПФ + кавычки)': 'high',
            'Организация (название + ОПФ)': 'high',
            'Организация (дефисное название)': 'high',
            'Организация (кавычки + скобки)': 'high',
            'Организация (только заглавные)': 'medium',
            'Организация (международная ОПФ)': 'high',
            'Организация (некоммерческая)': 'medium',
            'СИБУР': 'high',
            'НДС': 'low',
            'Номер документа': 'low',
            'Кем выдан': 'medium',
            'Дата выдачи паспорта': 'medium',
            'Почтовый индекс': 'medium',
            'Полный адрес': 'low', 'Адрес (город)': 'low', 'Адрес (дом)': 'low',
            'Кабинет/Офис': 'low', 'Строение/Корпус': 'low', 'Адрес (улица)': 'low', 'Адрес (полный)': 'low',
            'Дата рождения': 'low', 'Дата': 'low',
            'Путь Windows': 'low', 'Путь Unix': 'low',
            'Порт': 'low',
            'Environment variable': 'low', 'Windows environment variable': 'low',
            'Timestamp': 'low', 'Log level': 'low', 'Log level (bracketed)': 'low',
            'Base64 data': 'low'
        };
        return map[patternType] || 'medium';
    }

    function calculateQualityScore(fileResult) {
        var changes = fileResult.changes || [];
        if (changes.length === 0) {
            return { score: 0, coverage: 0, confidence: 0, residual: 100, integrity: fileResult.error ? 0 : 100, counts: { high: 0, medium: 0, low: 0 } };
        }
        var counts = { high: 0, medium: 0, low: 0 };
        var confSum = 0;
        for (var i = 0; i < changes.length; i++) {
            var c = changes[i].confidence || 'medium';
            counts[c] = (counts[c] || 0) + 1;
            confSum += CONFIDENCE_WEIGHTS[c] || 0.5;
        }
        var avgConf = confSum / changes.length;
        var confidence = Math.round(avgConf * 100);
        var coverage = Math.min(100, Math.round(changes.length * 1.5));
        var residual = 100;
        var integrity = fileResult.error ? 0 : 100;
        var score = Math.round(coverage * 0.35 + confidence * 0.30 + residual * 0.25 + integrity * 0.10);
        return { score: Math.min(100, score), coverage, confidence, residual, integrity, counts };
    }

    function renderQualityTab() {
        var container = document.getElementById('qualityFilesList');
        if (!container) return;
        if (state.processedFiles.length === 0) {
            container.innerHTML = '<div class="text-center py-16 text-slate-500"><svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg><p>Обработайте файлы для оценки качества маскирования</p></div>';
            document.getElementById('qualityScoreValue').textContent = '—';
            document.getElementById('qualityRingProgress').style.strokeDashoffset = '339.292';
            document.getElementById('qualityVerdict').textContent = '';
            ['qCoverage','qConfidence','qResidual','qIntegrity'].forEach(function(id){ document.getElementById(id).textContent = '—'; });
            document.getElementById('confidenceBar').style.width = '0%';
            document.getElementById('confidenceTotal').textContent = '0 шт';
            ['confHighCount','confMediumCount','confLowCount'].forEach(function(id){ document.getElementById(id).textContent = '0'; });
            return;
        }
        var totalChanges = 0, totalScore = 0, totalCounts = { high: 0, medium: 0, low: 0 };
        var html = '';
        for (var i = 0; i < state.processedFiles.length; i++) {
            var f = state.processedFiles[i];
            var qs = calculateQualityScore(f);
            totalChanges += (f._totalChanges || (f.changes ? f.changes.length : 0));
            totalScore += qs.score;
            totalCounts.high += qs.counts.high; totalCounts.medium += qs.counts.medium; totalCounts.low += qs.counts.low;
            var scoreColor = qs.score >= 90 ? 'text-green-400' : qs.score >= 70 ? 'text-amber-400' : 'text-red-400';
            var scoreBg = qs.score >= 90 ? 'bg-green-900/20 border-green-500/30' : qs.score >= 70 ? 'bg-amber-900/20 border-amber-500/30' : 'bg-red-900/20 border-red-500/30';
            var verdict = qs.score >= 90 ? '✓ Проверено, можно передавать' : qs.score >= 70 ? '⚠ Рекомендуется просмотр' : qs.score >= 50 ? '▲ Высокий риск пропусков' : '✗ Критично: неэффективно';
            html += '<div class="glass rounded-xl p-5 ' + scoreBg + ' border">';
            html += '<div class="flex items-center justify-between mb-4 flex-wrap gap-2">';
            html += '<div class="flex items-center gap-3"><span class="text-2xl">' + getFileIcon(f.ext) + '</span><div><p class="text-sm font-semibold text-white">' + f.name + '</p>';
            // v5.7.52: show _totalChanges only
            var chDisplay = f._totalChanges || (f.changes ? f.changes.length : 0);
            html += '<p class="text-xs text-slate-500">' + chDisplay + ' замен · ' + verdict + '</p></div></div>';
            html += '<div class="text-2xl font-bold ' + scoreColor + '">' + qs.score + '<span class="text-sm text-slate-500 font-normal">/100</span></div></div>';
            html += '<div class="grid grid-cols-4 gap-3 mb-3">';
            html += '<div class="text-center"><div class="text-xs text-slate-400">Полнота</div><div class="text-sm font-semibold text-indigo-400">' + qs.coverage + '</div></div>';
            html += '<div class="text-center"><div class="text-xs text-slate-400">Точность</div><div class="text-sm font-semibold text-emerald-400">' + qs.confidence + '</div></div>';
            html += '<div class="text-center"><div class="text-xs text-slate-400">Риск</div><div class="text-sm font-semibold text-amber-400">' + qs.residual + '</div></div>';
            html += '<div class="text-center"><div class="text-xs text-slate-400">Целостность</div><div class="text-sm font-semibold text-blue-400">' + qs.integrity + '</div></div>';
            html += '</div>';
            var totalFile = qs.counts.high + qs.counts.medium + qs.counts.low;
            if (totalFile > 0) {
                var pctHigh = Math.round((qs.counts.high / totalFile) * 100);
                var pctMed = Math.round((qs.counts.medium / totalFile) * 100);
                var pctLow = Math.round((qs.counts.low / totalFile) * 100);
                html += '<div class="flex items-center gap-2 text-xs">';
                html += '<span class="confidence-high px-2 py-1 rounded">Выс: ' + qs.counts.high + ' (' + pctHigh + '%)</span>';
                html += '<span class="confidence-medium px-2 py-1 rounded">Ср: ' + qs.counts.medium + ' (' + pctMed + '%)</span>';
                html += '<span class="confidence-low px-2 py-1 rounded">Низ: ' + qs.counts.low + ' (' + pctLow + '%)</span>';
                html += '</div>';
            }
            if (f.changes) {
                var lowChanges = f.changes.filter(function(c){ return c.confidence === 'low'; });
                if (lowChanges.length > 0) {
                    html += '<div class="mt-3 pt-3 border-t border-slate-700/50">';
                    html += '<p class="text-xs text-amber-400 font-semibold mb-2">⚠ Замены с низкой уверенностью — рекомендуется проверить:</p>';
                    html += '<div class="space-y-1 max-h-40 overflow-y-auto">';
                    for (var j = 0; j < Math.min(lowChanges.length, 10); j++) {
                        var lc = lowChanges[j];
                        html += '<div class="quality-detail-row flex justify-between text-xs bg-slate-800/40 rounded px-3 py-2">';
                        html += '<span class="text-slate-300">' + escapeHtml(lc.type) + '</span>';
                        html += '<span class="text-slate-500">' + escapeHtml(lc.original) + ' → ' + escapeHtml(lc.masked) + '</span>';
                        html += '</div>';
                    }
                    if (lowChanges.length > 10) html += '<div class="text-xs text-slate-500 text-center">...и ещё ' + (lowChanges.length - 10) + '</div>';
                    html += '</div></div>';
                }
            }
            html += '</div>';
        }
        container.innerHTML = html;
        var avgScore = state.processedFiles.length > 0 ? Math.round(totalScore / state.processedFiles.length) : 0;
        var circumference = 2 * Math.PI * 54;
        var offset = circumference - (circumference * avgScore / 100);
        document.getElementById('qualityRingProgress').style.strokeDashoffset = offset;
        document.getElementById('qualityRingProgress').setAttribute('stroke', avgScore >= 90 ? '#22c55e' : avgScore >= 70 ? '#f59e0b' : '#ef4444');
        document.getElementById('qualityScoreValue').textContent = avgScore;
        var globalVerdict = avgScore >= 90 ? '<span class="text-green-400">✓ Результат проверен</span>' : avgScore >= 70 ? '<span class="text-amber-400">⚠ Требуется просмотр</span>' : '<span class="text-red-400">✗ Низкое качество</span>';
        document.getElementById('qualityVerdict').innerHTML = globalVerdict;
        document.getElementById('qCoverage').textContent = totalChanges > 0 ? Math.min(100, Math.round(totalChanges * 1.5 / state.processedFiles.length)) : 0;
        var totalConfSum = totalCounts.high * 1.0 + totalCounts.medium * 0.6 + totalCounts.low * 0.25;
        var totalConf = totalChanges > 0 ? Math.round((totalConfSum / totalChanges) * 100) : 0;
        document.getElementById('qConfidence').textContent = totalConf;
        document.getElementById('qResidual').textContent = '100';
        document.getElementById('qIntegrity').textContent = '100';
        var grandTotal = totalCounts.high + totalCounts.medium + totalCounts.low;
        if (grandTotal > 0) {
            var wHigh = (totalCounts.high / grandTotal) * 100;
            var wMed = (totalCounts.medium / grandTotal) * 100;
            var wLow = (totalCounts.low / grandTotal) * 100;
            var barHtml = '<div style="width:' + wHigh + '%;background:#22c55e;height:100%;float:left;border-radius:4px 0 0 4px;"></div>';
            barHtml += '<div style="width:' + wMed + '%;background:#f59e0b;height:100%;float:left;"></div>';
            barHtml += '<div style="width:' + wLow + '%;background:#ef4444;height:100%;float:left;border-radius:0 4px 4px 0;"></div>';
            document.getElementById('confidenceBar').innerHTML = barHtml;
            document.getElementById('confidenceBar').style.width = '100%';
            document.getElementById('confidenceTotal').textContent = grandTotal + ' шт';
            document.getElementById('confHighCount').textContent = totalCounts.high;
            document.getElementById('confMediumCount').textContent = totalCounts.medium;
            document.getElementById('confLowCount').textContent = totalCounts.low;
        }
    }


    // ==================== MARKDOWN RENDERER ====================
function renderMarkdown(md) {
    if (!md) return '';

    var css = `
        <style>
        .md-table-container { overflow-x: auto; margin: 1rem 0; }
        .md-table { width: 100%; border-collapse: collapse; background: rgba(15,23,42,0.8); border-radius: 8px; overflow: hidden; border: 1px solid rgba(148,163,184,0.3); font-size: 0.875rem; }
        .md-table-row { transition: background 0.2s; }
        .md-table-row:hover { background: rgba(99,102,241,0.1); }
        .md-table-row.odd { background: rgba(30,41,59,0.5); }
        .md-table-cell, .md-table th { padding: 12px 16px; text-align: left; border-bottom: 1px solid rgba(148,163,184,0.1); }
        .md-table th { background: rgba(99,102,241,0.2); font-weight: 600; color: #e2e8f0; text-transform: uppercase; letter-spacing: 0.05em; }
        .md-table td { color: #cbd5e1; }
        .md-list { padding-left: 1.5rem; margin: 1rem 0; }
        .md-list li { margin: 0.5rem 0; color: #e2e8f0; }
        </style>
    `;

    // Protect code blocks first, then escape HTML, then restore code blocks
    var codeBlocks = [];
    var inlineCodes = [];
    var mdProtected = md
        .replace(/```([\s\S]*?)```/g, function(match, code) {
            codeBlocks.push(code.replace(/^\n/, '').trim());
            return '\x00CODEBLOCK' + (codeBlocks.length - 1) + '\x00';
        })
        .replace(/`([^`]+)`/g, function(match, code) {
            inlineCodes.push(code);
            return '\x00INLINECODE' + (inlineCodes.length - 1) + '\x00';
        });

    var html = mdProtected
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^> (.*$)/gim, '<blockquote><p>$1</p></blockquote>')
        .replace(/^---$/gim, '<hr>')
        // Parse tables BEFORE restoring inline codes (so | inside code is still protected)
        .replace(/((?:^|\n)(?:[^\n]*\|[^\n]*\n){2,})/g, function(match) {
            var lines = match.trim().split('\n').filter(function(l) { return l.trim(); });
            if (lines.length < 2) return match;

            var tableHtml = '<div class="md-table-container"><table class="md-table">';
            lines.forEach(function(line, idx) {
                var cells = line.split('|').map(function(c) { return c.trim(); }).filter(function(c) { return c !== '' && c !== '|'; });
                if (cells.length === 0) return;
                if (idx === 1 && cells.every(function(c) { return /^[-:\s|]+$/.test(c); })) return;

                var tag = idx === 0 ? 'th' : 'td';
                var rowClass = idx % 2 === 1 ? 'odd' : 'even';
                tableHtml += '<tr class="md-table-row ' + rowClass + '">';
                cells.forEach(function(cell) {
                    tableHtml += '<' + tag + ' class="md-table-cell">' + cell + '</' + tag + '>';
                });
                tableHtml += '</tr>';
            });
            tableHtml += '</table></div>';
            return tableHtml;
        })
        // NOW restore code blocks (after table parsing)
        .replace(/\x00CODEBLOCK(\d+)\x00/g, function(match, idx) {
            return '<pre><code>' + codeBlocks[parseInt(idx)] + '</code></pre>';
        })
        .replace(/\x00INLINECODE(\d+)\x00/g, function(match, idx) {
            return '<code>' + inlineCodes[parseInt(idx)] + '</code>';
        })
        .replace(/(?:^|\n)((?:- .*\n)+)/g, function(match, list) {
            var items = list.trim().split('\n').filter(function(l) { return l.trim(); });
            return '<ul class="md-list">' + items.map(function(item) { return '<li>' + item.replace(/^- /, '') + '</li>'; }).join('') + '</ul>';
        })
        .replace(/(?:^|\n)((?:\d+\. .*\n)+)/g, function(match, list) {
            var items = list.trim().split('\n').filter(function(l) { return l.trim(); });
            return '<ol class="md-list">' + items.map(function(item) { return '<li>' + item.replace(/^\d+\. /, '') + '</li>'; }).join('') + '</ol>';
        })
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

    return css + '<div class="md-content">' + html + '</div>';
}

    // ==================== INSTRUCTION LOADER ====================
    var instructionLoaded = false;
    async function loadInstruction() {
        var container = document.getElementById('instructionContent');
        if (!container) return;
        if (instructionLoaded) return;
        try {
            var response = await fetch('vendor/instruction.md');
            if (!response.ok) {
                var basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
                response = await fetch(basePath + 'vendor/instruction.md');
            }
            if (!response.ok) {
                container.innerHTML = '<div class="text-center py-12 text-red-400"><p>❌ Не удалось загрузить инструкцию.</p><p class="text-sm text-slate-500">Убедитесь, что файл vendor/instruction.md находится рядом с index.html.</p></div>';
                return;
            }
            var md = await response.text();
            container.innerHTML = renderMarkdown(md);
            instructionLoaded = true;
        } catch(e) {
            container.innerHTML = '<div class="text-center py-12 text-red-400"><p>❌ Ошибка загрузки инструкции: ' + e.message + '</p><p class="text-sm text-slate-500">Убедитесь, что файл vendor/instruction.md доступен.</p></div>';
        }
    }

    // ==================== NOTIFICATIONS ====================
    function showNotification(message, type) {
        type = type || 'info';
        var existing = document.querySelector('.notification'); if (existing) existing.remove();
        var colors = { info: 'bg-indigo-900/80 border-indigo-500/50 text-indigo-200', error: 'bg-red-900/80 border-red-500/50 text-red-200', success: 'bg-green-900/80 border-green-500/50 text-green-200' };
        var notif = document.createElement('div'); notif.className = 'notification fixed top-4 right-4 z-50 px-6 py-3 rounded-lg border shadow-xl ' + (colors[type] || colors.info); notif.textContent = message; document.body.appendChild(notif);
        setTimeout(function(){ notif.style.opacity = '0'; notif.style.transform = 'translateX(100%)'; notif.style.transition = 'all 0.3s ease'; setTimeout(function(){ notif.remove(); }, 300); }, 3000);
    }

    
// ==================== HASH / DEOBFUSCATION ====================
function simpleHash(str) {
    // Нормализуем к нижнему регистру перед хешированием
    var normalized = str.toLowerCase();
    var hash = 5381;
    for (var i = 0; i < normalized.length; i++) {
        hash = ((hash << 5) + hash) + normalized.charCodeAt(i);
        hash = hash & 0xFFFFFFFF;
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

function getHashForValue(value, type) {
    var prefix = getHashTypePrefix(type);
    // Хеш вычисляется от нормализованного значения (нижний регистр)
    var hashValue = simpleHash(value);
    var hashKey = prefix + hashValue;
    
    // Сохраняем в словарь: ключ — хеш, значение — оригинал (первое встреченное написание)
    // При накоплении: если хеш уже есть — НЕ перезаписываем (сохраняем первое написание)
    if (!state.hashDictionary[hashKey]) {
        state.hashDictionary[hashKey] = value;
        // Auto-save dictionary to localStorage for persistence across reloads
        try { localStorage.setItem('maskingHashDictionary', JSON.stringify(state.hashDictionary)); } catch(e) {}
    }
    return hashKey;
}

function createHashMask(original, type) {
    return getHashForValue(original, type);
}

    function updateHashModeSetting(checked) {
        state.hashMode = checked;
        var toggle = document.getElementById('enableHashModeToggle');
        var badge = document.getElementById('hashModeBadge');
        if (toggle) {
            if (checked) {
                toggle.classList.add('toggle-on');
                toggle.classList.remove('toggle-off');
            } else {
                toggle.classList.add('toggle-off');
                toggle.classList.remove('toggle-on');
            }
        }
        if (badge) {
            if (checked) badge.classList.remove('hidden');
            else badge.classList.add('hidden');
        }
        // Если режим хеширования выключен — отключаем и накопление
        if (!checked && state.hashAccumulateMode) {
            updateHashAccumulateSetting(false);
        }
        renderDeobfuscationTab();
    }

    function updateHashAccumulateSetting(checked) {
        // Режим накопления доступен только при включённом режиме хеширования
        if (checked && !state.hashMode) {
            showNotification('Сначала включите «Режим хеширования при маскировании»', 'error');
            var input = document.getElementById('enableHashAccumulate');
            if (input) input.checked = false;
            return;
        }
        state.hashAccumulateMode = checked;
        var toggle = document.getElementById('enableHashAccumulateToggle');
        var badge = document.getElementById('hashAccumulateBadge');
        var section = document.getElementById('hashAccumulateSection');
        if (toggle) {
            if (checked) {
                toggle.classList.add('toggle-on');
                toggle.classList.remove('toggle-off');
            } else {
                toggle.classList.add('toggle-off');
                toggle.classList.remove('toggle-on');
            }
        }
        if (badge) {
            if (checked) badge.classList.remove('hidden');
            else badge.classList.add('hidden');
        }
        // Визуально подсвечиваем секцию когда накопление активно
        if (section) {
            if (checked) {
                section.classList.add('border-purple-500/40', 'bg-purple-900/10');
                section.classList.remove('border-slate-700/50', 'bg-slate-800/40');
            } else {
                section.classList.remove('border-purple-500/40', 'bg-purple-900/10');
                section.classList.add('border-slate-700/50', 'bg-slate-800/40');
            }
        }
        renderDeobfuscationTab();
    }

    function addCustomHashField() {
        var input = document.getElementById('customHashFieldInput');
        var value = input.value.trim();
        if (!value) return;
        if (state.customHashFields.indexOf(value) !== -1) { showNotification('Это поле уже добавлено', 'error'); return; }
        state.customHashFields.push(value);
        input.value = '';
        renderDeobfuscationTab();
        showNotification('Поле добавлено для хеширования');
    }
    function removeCustomHashField(index) {
        state.customHashFields.splice(index, 1);
        renderDeobfuscationTab();
    }

    function saveHashDictionary() {
        if (Object.keys(state.hashDictionary).length === 0) { showNotification('Словарь пуст', 'error'); return; }
        var dictData = {
            created: new Date().toISOString(),
            version: '1.0',
            dictionary: state.hashDictionary
        };
        var blob = new Blob([JSON.stringify(dictData, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'hash_dictionary_' + Date.now() + '.json';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification('Словарь хешей сохранён');
    }

    async function loadHashDictionary(file) {
        if (!file) return;
        try {
            var fileRead = await readFileAsTextWithEncoding(file); var text = fileRead.text;
            var data = JSON.parse(text);
            if (data.dictionary) {
                var loadedDict = data.dictionary;
                var loadedCount = Object.keys(loadedDict).length;
                var existingCount = Object.keys(state.hashDictionary).length;

                if (state.hashAccumulateMode && existingCount > 0) {
                    // Режим накопления: объединяем словари, не перезаписывая существующие ключи
                    var addedCount = 0;
                    for (var key in loadedDict) {
                        if (!state.hashDictionary[key]) {
                            state.hashDictionary[key] = loadedDict[key];
                            addedCount++;
                        }
                    }
                    showNotification('Словарь объединён: +' + addedCount + ' новых, ' + existingCount + ' сохранено. Всего: ' + Object.keys(state.hashDictionary).length);
                } else {
                    // Обычный режим: заменяем словарь
                    state.hashDictionary = loadedDict;
                    showNotification('Словарь хешей загружен: ' + loadedCount + ' записей');
                }
                renderDeobfuscationTab();
            } else {
                showNotification('Неверный формат файла словаря', 'error');
            }
        } catch(e) {
            showNotification('Ошибка загрузки словаря: ' + e.message, 'error');
        }
    }

    function clearHashDictionary() {
        state.hashDictionary = {};
        // v5.7.52: Also clear from localStorage so it doesn't restore on page reload
        try {
            localStorage.removeItem('maskingHashDictionary');
            // Also clear from main settings key
            var saved = localStorage.getItem('docmask_settings');
            if (saved) {
                var parsed = JSON.parse(saved);
                if (parsed && parsed.hashDictionary) {
                    delete parsed.hashDictionary;
                    localStorage.setItem('docmask_settings', JSON.stringify(parsed));
                }
            }
        } catch(e) { console.warn('Failed to clear hash dictionary from storage:', e); }
        // CRITICAL: saveSettings() must be called to overwrite masking_settings
        // Otherwise other code paths will re-save the old dictionary
        if (typeof saveSettings === 'function') saveSettings();
        renderDeobfuscationTab();
        showNotification('Словарь очищен');
    }

    function renderHashDictionary() {
        var totalEl = document.getElementById('hashDictTotal');
        var orgEl = document.getElementById('hashDictOrg');
        var fioEl = document.getElementById('hashDictFio');
        var usrEl = document.getElementById('hashDictUsr');
        var emlEl = document.getElementById('hashDictEml');
        var phnEl = document.getElementById('hashDictPhn');
        var urlEl = document.getElementById('hashDictUrl');
        var tbody = document.getElementById('hashDictionaryBody');
        if (!totalEl || !tbody) return;
        var keys = Object.keys(state.hashDictionary);
        totalEl.textContent = keys.length;
        var orgCount = 0, fioCount = 0, usrCount = 0, emlCount = 0, phnCount = 0, urlCount = 0;
        keys.forEach(function(k) {
            if (k.indexOf('#ORG_') === 0) orgCount++;
            else if (k.indexOf('#FIO_') === 0) fioCount++;
            else if (k.indexOf('#USR_') === 0) usrCount++;
            else if (k.indexOf('#EML_') === 0) emlCount++;
            else if (k.indexOf('#PHN_') === 0) phnCount++;
            else if (k.indexOf('#URL_') === 0) urlCount++;
        });
        orgEl.textContent = orgCount;
        fioEl.textContent = fioCount;
        usrEl.textContent = usrCount;
        if (emlEl) emlEl.textContent = emlCount;
        if (phnEl) phnEl.textContent = phnCount;
        if (urlEl) urlEl.textContent = urlCount;
        if (keys.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-slate-500">Словарь пуст. Запустите маскирование с включённым режимом хеширования или загрузите словарь.</td></tr>';
            return;
        }
        var html = '';
        keys.forEach(function(key) {
            var type = 'Другое';
            var typeClass = 'text-slate-400';
            if (key.indexOf('#ORG_') === 0) { type = 'Организация'; typeClass = 'text-amber-400'; }
            else if (key.indexOf('#FIO_') === 0) { type = 'ФИО'; typeClass = 'text-blue-400'; }
            else if (key.indexOf('#USR_') === 0) { type = 'Уч. запись'; typeClass = 'text-green-400'; }
            else if (key.indexOf('#EML_') === 0) { type = 'Email'; typeClass = 'text-pink-400'; }
            else if (key.indexOf('#PHN_') === 0) { type = 'Телефон'; typeClass = 'text-cyan-400'; }
            else if (key.indexOf('#URL_') === 0) { type = 'URL'; typeClass = 'text-indigo-400'; }
            html += '<tr class="dict-row border-b border-slate-700/50">';
            html += '<td class="px-4 py-2 text-xs ' + typeClass + '">' + type + '</td>';
            html += '<td class="px-4 py-2 text-xs font-mono text-indigo-300">' + escapeHtml(key) + '</td>';
            html += '<td class="px-4 py-2 text-xs text-slate-300">' + escapeHtml(state.hashDictionary[key]) + '</td>';
            html += '</tr>';
        });
        tbody.innerHTML = html;
    }

    function renderDeobfuscationTab() {
        // Hash mode toggle sync
        var hashToggle = document.getElementById('enableHashModeToggle');
        var hashToggleVis = document.getElementById('enableHashModeToggle');
        if (hashToggle) hashToggle.checked = state.hashMode;
        if (hashToggleVis) {
            if (state.hashMode) { hashToggleVis.classList.add('toggle-on'); hashToggleVis.classList.remove('toggle-off'); }
            else { hashToggleVis.classList.add('toggle-off'); hashToggleVis.classList.remove('toggle-on'); }
        }
        var badge = document.getElementById('hashModeBadge');
        if (badge) {
            if (state.hashMode) badge.classList.remove('hidden');
            else badge.classList.add('hidden');
        }

        // Hash accumulate toggle sync
        var accumulateInput = document.getElementById('enableHashAccumulate');
        var accumulateToggle = document.getElementById('enableHashAccumulateToggle');
        var accumulateBadge = document.getElementById('hashAccumulateBadge');
        var accumulateSection = document.getElementById('hashAccumulateSection');
        var accumulateHint = document.getElementById('hashAccumulateHint');

        // Блокируем переключатель накопления если хеш-режим выключен
        if (accumulateInput) {
            accumulateInput.disabled = !state.hashMode;
            accumulateInput.checked = state.hashAccumulateMode;
        }
        if (accumulateToggle) {
            if (state.hashAccumulateMode && state.hashMode) {
                accumulateToggle.classList.add('toggle-on');
                accumulateToggle.classList.remove('toggle-off');
            } else {
                accumulateToggle.classList.add('toggle-off');
                accumulateToggle.classList.remove('toggle-on');
            }
        }
        if (accumulateBadge) {
            if (state.hashAccumulateMode && state.hashMode) accumulateBadge.classList.remove('hidden');
            else accumulateBadge.classList.add('hidden');
        }
        if (accumulateHint) {
            if (state.hashMode) accumulateHint.classList.add('hidden');
            else accumulateHint.classList.remove('hidden');
        }
        if (accumulateSection) {
            if (state.hashAccumulateMode && state.hashMode) {
                accumulateSection.classList.add('border-purple-500/40', 'bg-purple-900/10');
                accumulateSection.classList.remove('border-slate-700/50', 'bg-slate-800/40');
            } else {
                accumulateSection.classList.remove('border-purple-500/40', 'bg-purple-900/10');
                accumulateSection.classList.add('border-slate-700/50', 'bg-slate-800/40');
            }
        }

        // Custom hash fields
        var list = document.getElementById('customHashFieldsList');
        if (list) {
            var html = '';
            for (var i = 0; i < state.customHashFields.length; i++) {
                html += '<span class="hash-tag">' + escapeHtml(state.customHashFields[i]) + ' <span class="remove" onclick="removeCustomHashField(' + i + ')">&times;</span></span>';
            }
            if (state.customHashFields.length === 0) html = '<span class="text-xs text-slate-500">Нет дополнительных полей</span>';
            list.innerHTML = html;
        }
        // Hash dictionary table
        renderHashDictionary();
        // Deobf file list
        renderDeobfFileList();
    }

    // ==================== DEOBFUSCATION FILE HANDLING ====================
    function handleDeobfFiles(fileList) {
        var remaining = 10 - state.deobfFiles.length;
        var filesArr = Array.from(fileList).slice(0, remaining);
        for (var i = 0; i < filesArr.length; i++) {
            var file = filesArr[i];
            var ext = file.name.split('.').pop().toLowerCase();
            var allowedExts = ['docx','xlsx','xlsb','pptx','ppt','txt','csv','json','xml','log','sql','yaml','yml','ini','md','zip','7z'];
            if (allowedExts.indexOf(ext) === -1) { showNotification('Формат .' + ext + ' не поддерживается', 'error'); continue; }
            if (file.size > MAX_FILE_SIZE) { showNotification('Файл "' + file.name + '" превышает лимит 100 МБ', 'error'); continue; }
            state.deobfFiles.push({ id: Date.now() + Math.random(), name: file.name, size: file.size, ext: ext, file: file, status: 'pending' });
        }
        if (state.deobfFiles.length > 10) state.deobfFiles = state.deobfFiles.slice(0, 10);
        renderDeobfFileList();
    }
    function renderDeobfFileList() {
        var container = document.getElementById('deobfFileList');
        var processSection = document.getElementById('deobfProcessSection');
        if (!container) return;
        if (state.deobfFiles.length === 0) { container.innerHTML = ''; processSection.classList.add('hidden'); return; }
        processSection.classList.remove('hidden');
        var html = '';
        for (var i = 0; i < state.deobfFiles.length; i++) {
            var f = state.deobfFiles[i]; var icon = getFileIcon(f.ext); var sizeStr = formatSize(f.size);
            html += '<div class="file-card deobf-file-card rounded-xl p-4 flex items-center gap-4">';
            html += '<div class="text-2xl">' + icon + '</div><div class="flex-1 min-w-0"><p class="text-sm font-medium text-white truncate">' + f.name + '</p>';
            html += '<p class="text-xs text-slate-500">' + sizeStr + ' · ' + f.ext.toUpperCase() + '</p></div>';
            html += '<div class="flex items-center gap-2">';
            var statusClass = f.status === 'done' ? 'bg-green-900/30 text-green-400' : f.status === 'error' ? 'bg-red-900/30 text-red-400' : 'bg-slate-700 text-slate-400';
            var statusText = f.status === 'done' ? '✓ Готов' : f.status === 'error' ? '✗ Ошибка' : 'Ожидание';
            html += '<span class="text-xs px-2 py-1 rounded ' + statusClass + '">' + statusText + '</span>';
            html += '<button onclick="removeDeobfFile(' + i + ')" class="text-slate-500 hover:text-red-400 transition"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button></div></div>';
        }
        container.innerHTML = html;
    }
    function removeDeobfFile(index) { state.deobfFiles.splice(index, 1); renderDeobfFileList(); }
    function clearAllDeobfFiles() { state.deobfFiles = []; state.deobfProcessedFiles = []; renderDeobfFileList(); document.getElementById('deobfResultsSection').classList.add('hidden'); }

    // ==================== DEOBFUSCATION CORE ====================
    function deobfuscateText(text, dictionary) {
        if (!text || !dictionary) return text;
        var result = text;
        var keys = Object.keys(dictionary).sort(function(a, b) { return b.length - a.length; });
        for (var i = 0; i < keys.length; i++) {
            var hashKey = keys[i];
            var original = dictionary[hashKey];
            if (!original || original.length === 0) continue;
            var idx = result.indexOf(hashKey);
            var loopCount = 0;
            while (idx !== -1 && loopCount < 5000) {
                loopCount++;
                result = result.substring(0, idx) + original + result.substring(idx + hashKey.length);
                idx = result.indexOf(hashKey, idx + original.length);
            }
        }
        return result;
    }

    async function deobfuscateTextAsync(text, dictionary, progressCallback) {
        if (!text || !dictionary) return text;
        var result = text;
        var keys = Object.keys(dictionary).sort(function(a, b) { return b.length - a.length; });
        for (var i = 0; i < keys.length; i++) {
            var hashKey = keys[i];
            var original = dictionary[hashKey];
            if (!original || original.length === 0) continue;
            var idx = result.indexOf(hashKey);
            var loopCount = 0;
            while (idx !== -1 && loopCount < 5000) {
                loopCount++;
                result = result.substring(0, idx) + original + result.substring(idx + hashKey.length);
                idx = result.indexOf(hashKey, idx + original.length);
                if (loopCount % 100 === 0) await new Promise(function(resolve){ setTimeout(resolve, 0); });
            }
            if (progressCallback) progressCallback((i / keys.length) * 100);
        }
        return result;
    }

    async function processDeobfuscation() {
        if (state.deobfFiles.length === 0) { showNotification('Загрузите файлы для восстановления', 'error'); return; }
        if (Object.keys(state.hashDictionary).length === 0) { showNotification('Словарь хешей пуст. Загрузите словарь или выполните маскирование с хешированием.', 'error'); return; }
        if (state.isProcessing) return;
        state.isProcessing = true;
        state.deobfProcessedFiles = [];
        var deobfStartTime = Date.now();

        showProcessingOverlay('🔓 Восстановление по хешам...', 0, 'Инициализация...', '');

        for (var i = 0; i < state.deobfFiles.length; i++) {
            var fileObj = state.deobfFiles[i];
            var fileProgress = (i / state.deobfFiles.length) * 100;
            var fileLabel = 'Файл ' + (i + 1) + '/' + state.deobfFiles.length + ': ' + fileObj.name;
            var stepDesc = 'Восстановление ' + fileObj.ext.toUpperCase() + '...';
            var overallETA = calculateETA(fileProgress, deobfStartTime);

            showProcessingOverlay(fileLabel, fileProgress, stepDesc, overallETA);

            try {
                var result = await processDeobfFile(fileObj, i, state.deobfFiles.length);
                state.deobfProcessedFiles.push(result);
                fileObj.status = 'done';
            } catch(e) {
                console.error('Deobfuscation error:', e);
                fileObj.status = 'error';
                state.deobfProcessedFiles.push({ name: fileObj.name, ext: fileObj.ext, blob: null, changes: 0, error: e.message });
            }

            // Yield to UI thread
            await new Promise(function(resolve) { setTimeout(resolve, 10); });
        }

        showProcessingOverlay('🔓 Восстановление завершено', 100, 'Готово', '');
        await new Promise(function(resolve) { setTimeout(resolve, 400); });

        hideProcessingOverlay();
        state.isProcessing = false;
        renderDeobfFileList();
        renderDeobfResults();
    }

    async function processDeobfFile(fileObj, fileIndex, totalFiles) {
        var ext = fileObj.ext;
        var dict = state.hashDictionary;
        var changes = 0;

        function countReplacements(text, dictionary) {
            var count = 0;
            var keys = Object.keys(dictionary);
            for (var i = 0; i < keys.length; i++) {
                var idx = text.indexOf(keys[i]);
                while (idx !== -1) {
                    count++;
                    idx = text.indexOf(keys[i], idx + keys[i].length);
                }
            }
            return count;
        }

        if (ext === 'docx') {
            var arrayBuffer = await fileObj.file.arrayBuffer();
            var zip = await JSZip.loadAsync(arrayBuffer);
            var docXmlEntry = zip.file('word/document.xml');
            if (docXmlEntry) {
                var docXml = await docXmlEntry.async('string');
                var deobfXml = deobfuscateText(docXml, dict);
                changes += countReplacements(docXml, dict);
                zip.file('word/document.xml', deobfXml, { compression: 'DEFLATE', compressionOptions: { level: 6 } });
            }
            var headerFooterFiles = zip.file(/^word\/(header|footer)\d+\.xml$/);
            for (var i = 0; i < headerFooterFiles.length; i++) {
                var hfFile = headerFooterFiles[i];
                var hfXml = await hfFile.async('string');
                var deobfHf = deobfuscateText(hfXml, dict);
                zip.file(hfFile.name, deobfHf, { compression: 'DEFLATE', compressionOptions: { level: 6 } });
            }
            var noteFiles = zip.file(/^word\/(footnotes|endnotes)\.xml$/);
            for (var i = 0; i < noteFiles.length; i++) {
                var noteFile = noteFiles[i];
                var noteXml = await noteFile.async('string');
                var deobfNote = deobfuscateText(noteXml, dict);
                zip.file(noteFile.name, deobfNote, { compression: 'DEFLATE', compressionOptions: { level: 6 } });
            }
            var blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', compression: 'DEFLATE', compressionOptions: { level: 9 } });
            return { name: fileObj.name, ext: ext, blob: blob, changes: changes };
        }
		        else if (ext === 'pptx') {
            var arrayBuffer = await fileObj.file.arrayBuffer();
            var zip = await JSZip.loadAsync(arrayBuffer);

            var textXmlPatterns = [
                /^ppt\/slides\/slide\d+\.xml$/,
                /^ppt\/notesSlides\/notesSlide\d+\.xml$/,
                /^ppt\/notesMasters\/notesMaster\d+\.xml$/,
                /^ppt\/slideMasters\/slideMaster\d+\.xml$/,
                /^ppt\/slideLayouts\/slideLayout\d+\.xml$/,
                /^ppt\/presentation\.xml$/,
                /^ppt\/presProps\.xml$/
            ];

            var filesToProcess = [];
            zip.forEach(function(relativePath, zipEntry) {
                for (var p = 0; p < textXmlPatterns.length; p++) {
                    if (textXmlPatterns[p].test(relativePath)) {
                        filesToProcess.push({ path: relativePath, entry: zipEntry });
                        break;
                    }
                }
            });

            for (var i = 0; i < filesToProcess.length; i++) {
                var fileInfo = filesToProcess[i];
                var xmlContent = await fileInfo.entry.async('string');
                var deobfXml = deobfuscatePptxXml(xmlContent, dict);
                changes += countPptxReplacements(xmlContent, dict);
                zip.file(fileInfo.path, deobfXml, { compression: 'DEFLATE', compressionOptions: { level: 6 } });
            }

            var blob = await zip.generateAsync({
                type: 'blob',
                mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                compression: 'DEFLATE',
                compressionOptions: { level: 9 }
            });
            return { name: fileObj.name, ext: ext, blob: blob, changes: changes };
        }        else if (ext === 'xlsx' || ext === 'xlsb') {
            var data = await fileObj.file.arrayBuffer();
            var wb = XLSX.read(data, { type: 'array', cellStyles: true });
            for (var s = 0; s < wb.SheetNames.length; s++) {
                var sheetName = wb.SheetNames[s];
                var ws = wb.Sheets[sheetName];
                if (!ws || !ws['!ref']) continue;
                var range = XLSX.utils.decode_range(ws['!ref']);
                for (var R = range.s.r; R <= range.e.r; R++) {
                    for (var C = range.s.c; C <= range.e.c; C++) {
                        var addr = XLSX.utils.encode_cell({ r: R, c: C });
                        var cell = ws[addr];
                        if (cell && cell.v !== undefined && cell.v !== null && cell.f === undefined) {
                            var val = String(cell.v);
                            var deobfVal = deobfuscateText(val, dict);
                            if (deobfVal !== val) {
                                cell.v = truncateCellValue(deobfVal);
                                cell.t = 's';
                                delete cell.w;
                                delete cell.z;
                                changes++;
                            }
                        }
                    }
                }
            }
            var lowerName = (fileObj.name || '').toLowerCase();
            var isXlsbInput = (ext === 'xlsb') || lowerName.endsWith('.xlsb');
            var bookType = isXlsbInput ? 'xlsb' : 'xlsx';
            var mimeType = isXlsbInput ? 'application/vnd.ms-excel.sheet.binary.macroEnabled.12' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            var newWbData = XLSX.write(wb, { type: 'array', bookType: bookType, compression: true });
            return { name: fileObj.name, ext: ext, blob: new Blob([newWbData], { type: mimeType }), changes: changes };
        }
        else {
            var fileRead = await readFileAsTextWithEncoding(fileObj.file);
            var text = fileRead.text;
            var fileEncoding = fileRead.encoding;
            var deobfText = deobfuscateText(text, dict);
            changes += countReplacements(text, dict);
            var blob = createBlobWithEncoding(deobfText, fileEncoding);
            return { name: fileObj.name, ext: ext, blob: blob, changes: changes, content: deobfText, encoding: fileEncoding };
        }
    }


		function deobfuscatePptxXml(xmlContent, dictionary) {
		var keys = Object.keys(dictionary).sort(function(a, b) { return b.length - a.length; });
		var result = xmlContent;
		for (var i = 0; i < keys.length; i++) {
			var hashKey = keys[i];
			var original = dictionary[hashKey];
			if (!original) continue;
			result = result.split(hashKey).join(original);
		}
		return result;
	}

	function countPptxReplacements(xmlContent, dictionary) {
		var count = 0;
		var keys = Object.keys(dictionary);
		for (var i = 0; i < keys.length; i++) {
			var idx = xmlContent.indexOf(keys[i]);
			while (idx !== -1) {
				count++;
				idx = xmlContent.indexOf(keys[i], idx + keys[i].length);
			}
		}
		return count;
	}
	
    function renderDeobfResults() {
        var section = document.getElementById('deobfResultsSection');
        var container = document.getElementById('deobfResultsList');
        section.classList.remove('hidden');
        var totalChanges = state.deobfProcessedFiles.reduce(function(sum, f){ return sum + (f.changes || 0); }, 0);
        var statsHtml = '<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">';
        statsHtml += '<div class="stat-card rounded-xl p-4 text-center"><div class="text-2xl font-bold text-pink-400">' + state.deobfProcessedFiles.length + '</div><div class="text-xs text-slate-400">Файлов</div></div>';
        statsHtml += '<div class="stat-card rounded-xl p-4 text-center"><div class="text-2xl font-bold text-purple-400">' + totalChanges + '</div><div class="text-xs text-slate-400">Восстановлено значений</div></div>';
        statsHtml += '<div class="stat-card rounded-xl p-4 text-center"><div class="text-2xl font-bold text-indigo-400">' + Object.keys(state.hashDictionary).length + '</div><div class="text-xs text-slate-400">Хешей в словаре</div></div>';
        statsHtml += '</div>';
        var filesHtml = '';
        for (var i = 0; i < state.deobfProcessedFiles.length; i++) {
            var f = state.deobfProcessedFiles[i];
            filesHtml += '<div class="glass rounded-xl p-5">';
            filesHtml += '<div class="flex items-center justify-between mb-3">';
            filesHtml += '<div class="flex items-center gap-3"><span class="text-2xl">' + getFileIcon(f.ext) + '</span><div><p class="text-sm font-semibold text-white">' + f.name + '</p>';
            filesHtml += '<p class="text-xs text-slate-500">' + (f.changes || 0) + ' восстановлений</p></div></div>';
            if (f.blob) filesHtml += '<button onclick="downloadDeobfFile(\'' + f.name + '\')" class="btn-primary text-white text-sm px-4 py-2 rounded-lg font-semibold">Скачать</button>';
            if (f.error) filesHtml += '<span class="text-red-400 text-sm">' + f.error + '</span>';
            filesHtml += '</div></div>';
        }
        container.innerHTML = statsHtml + filesHtml;
    }

    function downloadDeobfFile(name) {
        var processed = state.deobfProcessedFiles.find(function(f){ return f.name === name; });
        if (processed && processed.blob) {
            var url = URL.createObjectURL(processed.blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'restored_' + name;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }
    function downloadAllDeobfFiles() {
        for (var i = 0; i < state.deobfProcessedFiles.length; i++) {
            var f = state.deobfProcessedFiles[i];
            if (f.blob) downloadDeobfFile(f.name);
        }
    }

    function setupDeobfDragDrop() {
        var dropZone = document.getElementById('deobfDropZone');
        if (!dropZone) return;
        dropZone.addEventListener('dragenter', function(e){ e.preventDefault(); e.stopPropagation(); dropZone.classList.add('drag-over'); });
        dropZone.addEventListener('dragover', function(e){ e.preventDefault(); e.stopPropagation(); dropZone.classList.add('drag-over'); });
        dropZone.addEventListener('dragleave', function(e){ e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('drag-over'); });
        dropZone.addEventListener('drop', function(e){ e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('drag-over'); handleDeobfFiles(e.dataTransfer.files); });
    }

