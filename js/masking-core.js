    // ==================== MASK TEXT INTERNAL (async with multi-template) ====================
    async function maskTextInternal(text, fileName, changes, progressCallback, softMode) {
        var result = text; var totalIterations = 0; var startTime = Date.now(); var maxTotalTime = 120000;
        _hashPlaceholders = []; // Reset hash placeholders for this cell
        // Check list-based masking
        var isListOnly = state.activeTemplates.length === 1 && state.activeTemplates[0] === 'listmask';
        if (isListOnly) { result = await applyListMaskingAsync(result, fileName, changes, progressCallback); return result; }
        // Use active rules from templates in both modes; softMode changes how patterns are applied (per-pattern vs whole-cell)
        // softMode: only enabled patterns + always-included hash rules (company, FIO)
        // non-softMode: all rules from active templates
        var activeRules = softMode ? getSoftMaskRules() : getActiveRulesFromTemplates();
        // Split rules: priority (email/FIO/usernames/phone) first, then list-based, then others
        var priorityIds = ['email', 'russian_names', 'english_names', 'usernames_tech', 'phone', 'sibur'];
        var priorityRules = [], otherRules = [];
        for (var i = 0; i < activeRules.length; i++) {
            if (priorityIds.indexOf(activeRules[i].id) !== -1) priorityRules.push(activeRules[i]);
            else otherRules.push(activeRules[i]);
        }
        // Phase 1: Priority rules (email, FIO, usernames, phone, sibur) BEFORE list-based masking
        for (var r = 0; r < priorityRules.length; r++) {
            var rule = priorityRules[r];
            for (var p = 0; p < rule.patterns.length; p++) {
                var pattern = rule.patterns[p]; try {
                    var regex = new RegExp(pattern.regex.source, pattern.regex.flags); var match;
                    var patternStartTime = Date.now(); var matchCount = 0;
                    while ((match = regex.exec(result)) !== null) {
                        if (Date.now() - patternStartTime > MAX_REGEX_TIME) { console.warn('Pattern timeout:', pattern.type); break; }
                        if (Date.now() - startTime > maxTotalTime) { console.warn('Total masking timeout for file:', fileName); return result; }
                        var original = match[0]; var masked = createMask(original, pattern.type);
                        var replacementIndex = result.indexOf(original, regex.lastIndex - original.length);
                        if (replacementIndex !== -1) { result = result.substring(0, replacementIndex) + masked + result.substring(replacementIndex + original.length); regex.lastIndex = replacementIndex + masked.length; }
                        changes.push({ type: pattern.type, original: maskPreview(original), masked: masked, rule: rule.name, fileName: fileName, confidence: getConfidence(pattern.type, rule.id) });
                        matchCount++; totalIterations++;
                        if (totalIterations % YIELD_INTERVAL === 0) await new Promise(function(resolve){ setTimeout(resolve, 0); });
                    }
                } catch(e) { console.warn('Regex error:', pattern.regex.source, e); }
            }
        }
        // Phase 2: List-based masking AFTER priority rules (so email/FIO are intact)
        if (state.listData.size > 0) {
            result = await applyListMaskingAsync(result, fileName, changes, progressCallback);
        }
        // Protect list-based hashes from being touched by pattern matching
        result = _protectHashes(result);
        // Phase 3: Other rules (company, sibur, inn, passport, etc.)
        for (var r = 0; r < otherRules.length; r++) {
            var rule = otherRules[r];
            for (var p = 0; p < rule.patterns.length; p++) {
                var pattern = rule.patterns[p]; try {
                    var regex = new RegExp(pattern.regex.source, pattern.regex.flags); var match;
                    var patternStartTime = Date.now(); var matchCount = 0;
                    while ((match = regex.exec(result)) !== null) {
                        if (Date.now() - patternStartTime > MAX_REGEX_TIME) { console.warn('Pattern timeout:', pattern.type); break; }
                        if (Date.now() - startTime > maxTotalTime) { console.warn('Total masking timeout for file:', fileName); return result; }
                        var original = match[0]; var masked = createMask(original, pattern.type);
                        var replacementIndex = result.indexOf(original, regex.lastIndex - original.length);
                        if (replacementIndex !== -1) { result = result.substring(0, replacementIndex) + masked + result.substring(replacementIndex + original.length); regex.lastIndex = replacementIndex + masked.length; }
                        changes.push({ type: pattern.type, original: maskPreview(original), masked: masked, rule: rule.name, fileName: fileName, confidence: getConfidence(pattern.type, rule.id) });
                        matchCount++; totalIterations++;
                        if (totalIterations % YIELD_INTERVAL === 0) await new Promise(function(resolve){ setTimeout(resolve, 0); });
                    }
                } catch(e) { console.warn('Regex error:', pattern.regex.source, e); }
            }
        }
        // Process custom patterns
        for (var i = 0; i < state.customPatterns.length; i++) {
            var cp = state.customPatterns[i]; if (!cp.enabled || !cp.regex) continue;
            try { var regex = new RegExp(cp.regex, 'g'); var match; var patternStartTime = Date.now();
                while ((match = regex.exec(result)) !== null) {
                    if (Date.now() - patternStartTime > MAX_REGEX_TIME) { console.warn('Custom pattern timeout:', cp.name); break; }
                    var original = match[0]; var masked = createMask(original, cp.type);
                    var replacementIndex = result.indexOf(original, regex.lastIndex - original.length);
                    if (replacementIndex !== -1) { result = result.substring(0, replacementIndex) + masked + result.substring(replacementIndex + original.length); regex.lastIndex = replacementIndex + masked.length; }
                    changes.push({ type: cp.type, original: maskPreview(original), masked: masked, rule: 'Пользовательский: ' + cp.name, fileName: fileName });
                    totalIterations++; if (totalIterations % YIELD_INTERVAL === 0) await new Promise(function(resolve){ setTimeout(resolve, 0); });
                }
            } catch(e){}
        }
        result = _restoreHashes(result);
        return result;
    }
// ==================== LIST-BASED TRIE (O(n) per cell) ====================
    var _listTrie = { root: {} };
    // Word char: letter, digit, underscore
    var LIST_WORD_CHAR = /[A-Za-zА-Яа-яЁё]/;

    function rebuildListTrie() {
        _listTrie = { root: {} };
        if (!state.listData || state.listData.size === 0) return;
        state.listData.forEach(function(values) {
            values.forEach(function(v) {
                if (!v || v.length < 2) return;
                var lowerV = v.toLowerCase();
                var node = _listTrie.root;
                for (var i = 0; i < lowerV.length; i++) {
                    var ch = lowerV[i];
                    if (!node[ch]) node[ch] = {};
                    node = node[ch];
                }
                node._end = true;
                node._original = v;
            });
        });
    }
    // Check if a value exists in the list trie (case-insensitive)
    function _isInListTrie(value) {
        if (!_listTrie || !_listTrie.root || !value) return false;
        var lower = value.toLowerCase();
        var node = _listTrie.root;
        for (var i = 0; i < lower.length; i++) {
            if (!node[lower[i]]) return false;
            node = node[lower[i]];
        }
        return !!node._end;
    }

    // Check if a list match is likely part of a FIO (name between two Russian words)
    // Words that exist in file-lists are NEVER considered FIO — they must always be masked
    function isPartOfFIO(text, start, end) {
        var match = text.substring(start, end);
        // If match exists in file-list, it's NEVER a FIO — always mask it
        if (_isInListTrie(match)) return false;

        var leftText = text.substring(0, start);
        var rightText = text.substring(end);
        var leftWords = leftText.trim().split(/\s+/);
        var leftWord = leftWords[leftWords.length - 1] || '';
        var rightWords = rightText.trim().split(/\s+/);
        var rightWord = rightWords[0] || '';
        var orgForms = /^(ООО|АО|ПАО|ЗАО|ОАО|ИП|ОБЩЕСТВО|АКЦИОНЕРНОЕ|ЗАКРЫТОЕ|ОТКРЫТОЕ)$/i;

        // Both sides must be Cyrillic words
        if (!/^[А-ЯЁа-яё]+$/.test(leftWord) || !/^[А-ЯЁа-яё]+$/.test(rightWord)) return false;
        // Match must be a proper name (capital + lowercase)
        if (!/^[А-ЯЁ][а-яё]{1,14}$/.test(match)) return false;
        // Exclude all-caps abbreviations like СИБУР
        if (/^[А-ЯЁ]{2,}$/.test(match)) return false;
        // Exclude if neighbor is an org form
        if (orgForms.test(leftWord) || orgForms.test(rightWord)) return false;

        return true;
    }

    function applyListMaskingTrie(text, fileName, changes) {
        if (!text || text.length < 2) return text;
        var lowerText = text.toLowerCase();
        var results = [];
        for (var i = 0; i < lowerText.length; i++) {
            var node = _listTrie.root;
            var j = i;
            while (j < lowerText.length && node[lowerText[j]]) {
                node = node[lowerText[j]];
                if (node._end) {
                    // Strict word boundary: (?<!\w)...(?!\w)
                    // Punctuation, spaces, quotes, brackets ARE boundaries → OK
                    var beforeOk = (i === 0) || !LIST_WORD_CHAR.test(text[i - 1]);
                    var afterOk = (j + 1 >= text.length) || !LIST_WORD_CHAR.test(text[j + 1]);
                    if (beforeOk && afterOk) {
                        results.push({ start: i, end: j + 1, value: node._original });
                    }
                }
                j++;
            }
        }
        if (results.length === 0) return text;
        results.sort(function(a, b) {
            if (a.start !== b.start) return b.start - a.start;
            return (b.end - b.start) - (a.end - a.start);
        });
        var filtered = [];
        var lastStart = -1;
        for (var r = 0; r < results.length; r++) {
            if (results[r].start !== lastStart) {
                // Skip if this list match is part of a FIO
                if (!isPartOfFIO(text, results[r].start, results[r].end)) {
                    filtered.push(results[r]);
                }
                lastStart = results[r].start;
            }
        }
        var result = text;
        for (var r = 0; r < filtered.length; r++) {
            var m = filtered[r];
            var masked = createMask(m.value, 'list');
            result = result.substring(0, m.start) + masked + result.substring(m.end);
            changes.push({
                type: 'list', original: m.value, maskPreview: masked,
                masked: masked, rule: 'Список', fileName: fileName, confidence: 'high'
            });
        }
        return result;
    }

    async function applyListMaskingAsync(text, fileName, changes, progressCallback) {
        return applyListMaskingTrie(text, fileName, changes);
    }
    function applyListMasking(text, fileName, changes) {
        return applyListMaskingTrie(text, fileName, changes);
    }

    // ==================== SYNC MASKING (for small files) ====================
    function maskText(text, fileName, changes, softMode) { if (!text) return text; return maskTextInternalSync(text, fileName, changes, softMode); }
    function maskTextInternalSync(text, fileName, changes, softMode) {
        var result = text; var totalIterations = 0; var startTime = Date.now(); var maxTotalTime = 120000;
        _hashPlaceholders = []; // Reset hash placeholders for this cell
        var isListOnly = state.activeTemplates.length === 1 && state.activeTemplates[0] === 'listmask';
        if (isListOnly) { result = applyListMasking(result, fileName, changes); return _restoreHashes(result); }
        // Use active rules from templates in both modes; softMode changes how patterns are applied (per-pattern vs whole-cell)
        // softMode: only enabled patterns + always-included hash rules (company, FIO)
        // non-softMode: all rules from active templates
        var activeRules = softMode ? getSoftMaskRules() : getActiveRulesFromTemplates();
        // Split rules: priority (email/FIO/usernames/phone) first, then list-based, then others
        var priorityIds = ['email', 'russian_names', 'english_names', 'usernames_tech', 'phone', 'sibur'];
        var priorityRules = [], otherRules = [];
        for (var i = 0; i < activeRules.length; i++) {
            if (priorityIds.indexOf(activeRules[i].id) !== -1) priorityRules.push(activeRules[i]);
            else otherRules.push(activeRules[i]);
        }
        // Phase 1: Priority rules (email, FIO, usernames, phone, sibur) BEFORE list-based masking
        for (var r = 0; r < priorityRules.length; r++) {
            var rule = priorityRules[r];
            for (var p = 0; p < rule.patterns.length; p++) {
                var pattern = rule.patterns[p]; try {
                    var regex = new RegExp(pattern.regex.source, pattern.regex.flags); var match; var patternStartTime = Date.now();
                    while ((match = regex.exec(result)) !== null) {
                        if (Date.now() - patternStartTime > MAX_REGEX_TIME) { console.warn('Pattern timeout:', pattern.type); break; }
                        if (Date.now() - startTime > maxTotalTime) { console.warn('Total masking timeout for file:', fileName); return result; }
                        var original = match[0]; var masked = createMask(original, pattern.type);
                        var replacementIndex = result.indexOf(original, regex.lastIndex - original.length);
                        if (replacementIndex !== -1) { result = result.substring(0, replacementIndex) + masked + result.substring(replacementIndex + original.length); regex.lastIndex = replacementIndex + masked.length; }
                        changes.push({ type: pattern.type, original: maskPreview(original), masked: masked, rule: rule.name, fileName: fileName });
                        totalIterations++;
                    }
                } catch(e) { console.warn('Regex error:', pattern.regex.source, e); }
            }
        }
        // Phase 2: List-based masking AFTER priority rules (so email/FIO are intact)
        if (state.listData.size > 0) {
            result = applyListMasking(result, fileName, changes);
        }
        // Protect list-based hashes from being touched by pattern matching
        result = _protectHashes(result);
        // Phase 3: Other rules (company, sibur, inn, passport, etc.)
        for (var r = 0; r < otherRules.length; r++) {
            var rule = otherRules[r];
            for (var p = 0; p < rule.patterns.length; p++) {
                var pattern = rule.patterns[p]; try {
                    var regex = new RegExp(pattern.regex.source, pattern.regex.flags); var match; var patternStartTime = Date.now();
                    while ((match = regex.exec(result)) !== null) {
                        if (Date.now() - patternStartTime > MAX_REGEX_TIME) { console.warn('Pattern timeout:', pattern.type); break; }
                        if (Date.now() - startTime > maxTotalTime) { console.warn('Total masking timeout for file:', fileName); return result; }
                        var original = match[0]; var masked = createMask(original, pattern.type);
                        var replacementIndex = result.indexOf(original, regex.lastIndex - original.length);
                        if (replacementIndex !== -1) { result = result.substring(0, replacementIndex) + masked + result.substring(replacementIndex + original.length); regex.lastIndex = replacementIndex + masked.length; }
                        changes.push({ type: pattern.type, original: maskPreview(original), masked: masked, rule: rule.name, fileName: fileName });
                        totalIterations++;
                    }
                } catch(e) { console.warn('Regex error:', pattern.regex.source, e); }
            }
        }
        for (var i = 0; i < state.customPatterns.length; i++) {
            var cp = state.customPatterns[i]; if (!cp.enabled || !cp.regex) continue;
            try { var regex = new RegExp(cp.regex, 'g'); var match; var patternStartTime = Date.now();
                while ((match = regex.exec(result)) !== null) {
                    if (Date.now() - patternStartTime > MAX_REGEX_TIME) { console.warn('Custom pattern timeout:', cp.name); break; }
                    var original = match[0]; var masked = createMask(original, cp.type);
                    var replacementIndex = result.indexOf(original, regex.lastIndex - original.length);
                    if (replacementIndex !== -1) { result = result.substring(0, replacementIndex) + masked + result.substring(replacementIndex + original.length); regex.lastIndex = replacementIndex + masked.length; }
                    changes.push({ type: cp.type, original: maskPreview(original), masked: masked, rule: 'Пользовательский: ' + cp.name, fileName: fileName, confidence: getConfidence(cp.type, cp.id) }); totalIterations++;
                }
            } catch(e){}
        }
        result = _restoreHashes(result);
        return result;
    }

    // ==================== HASH/LIST PROTECTION ====================
    var _hashPlaceholders = [];
    function _protectHashes(text) {
        return text.replace(/#(ORG|FIO|USR|HSH|CUSTOM|EML|PHN)_\w+/g, function(match) {
            _hashPlaceholders.push(match);
            return '\x00HASH' + (_hashPlaceholders.length - 1) + '\x00';
        });
    }
    function _restoreHashes(text) {
        // Restore both HASH (from hashing) and LST (from list-based masking) placeholders
        return text.replace(/\x00(?:HASH|LST)(\d+)\x00/g, function(match, idx) {
            return _hashPlaceholders[parseInt(idx)] || match;
        });
    }
    function _isHashPlaceholder(str) {
        return /^\x00(?:HASH|LST)\d+\x00$/.test(str);
    }

    // ==================== MASK CREATION ====================
    function createMask(original, type) {
        // Never re-mask a hash placeholder
        if (_isHashPlaceholder(original)) return original;

        // Защита от ложных срабатываний на описательный текст (организации)
        if (type && type.indexOf('Организация') === 0) {
            var lower = original.toLowerCase();
            var nonOrgWords = ['источник', 'наименование', 'документа', 'оценки', 'постановки', 'цели', 'причины', 'основания', 'результата', 'договора', 'приказа', 'распоряжения', 'протокола', 'акта', 'плана', 'отчета', 'задачи', 'функции', 'роли', 'показателя', 'метрики', 'коэффициента', 'периода', 'даты', 'номера', 'статьи', 'пункта', 'приложение', 'приложения', 'раздела', 'таблицы', 'графика', 'диаграммы', 'рисунка', 'споров', 'спорам', 'урегулированию', 'урегулирования', 'досудебному', 'досудебного', 'новость', 'новости', 'части', 'наличия', 'актуальной', 'актуализировано', 'верс', 'версии', 'клик', 'нажатия', 'перехода', 'ссылки', 'открытия'];
            for (var i = 0; i < nonOrgWords.length; i++) {
                if (lower.indexOf(nonOrgWords[i]) !== -1) return original;
            }
        }

        // Защита от ложных срабатываний на описательный текст (ФИО)
        if (type && type.indexOf('ФИО') === 0) {
            var words = original.toLowerCase().split(/\s+/);
            var nonPersonWords = {в:1,на:1,по:1,из:1,за:1,под:1,над:1,перед:1,при:1,про:1,через:1,без:1,от:1,до:1,для:1,и:1,или:1,но:1,а:1,с:1,к:1,о:1,об:1,у:1,не:1,да:1,же:1,также:1,тоже:1,что:1,как:1,когда:1,где:1,куда:1,откуда:1,почему:1,зачем:1,кто:1,чей:1,который:1,которая:1,которое:1,которые:1,запуск:1,запуска:1,выход:1,выхода:1,вход:1,входа:1,модуль:1,модуля:1,модули:1,модулей:1,отчет:1,отчёт:1,отчета:1,отчёта:1,программа:1,программы:1,система:1,системы:1,документ:1,документа:1,база:1,базы:1,таблица:1,таблицы:1,строка:1,строки:1,колонка:1,колонки:1,файл:1,файла:1,папка:1,папки:1,проект:1,проекта:1,задача:1,задачи:1,работа:1,работы:1,услуга:1,услуги:1,продукт:1,продукта:1,результат:1,результата:1,ошибка:1,ошибки:1,проблема:1,проблемы:1,вопрос:1,вопроса:1,ответ:1,ответа:1,справка:1,справки:1,инструкция:1,инструкции:1,руководство:1,руководства:1,приказ:1,приказа:1,распоряжение:1,распоряжения:1,протокол:1,протокола:1,акт:1,акта:1,договор:1,договора:1,соглашение:1,соглашения:1,план:1,плана:1,график:1,графика:1,информация:1,информации:1,сообщение:1,сообщения:1,уведомление:1,уведомления:1,письмо:1,письма:1,заявка:1,заявки:1,запрос:1,запроса:1,предложение:1,предложения:1,решение:1,решения:1,заключение:1,заключения:1,заказ:1,заказа:1,покупка:1,покупки:1,продажа:1,продажи:1,поставка:1,поставки:1,перевозка:1,перевозки:1,хранение:1,хранения:1,обработка:1,обработки:1,анализ:1,анализа:1,проверка:1,проверки:1,контроль:1,контроля:1,управление:1,управления:1,разработка:1,разработки:1,создание:1,создания:1,изменение:1,изменения:1,удаление:1,удаления:1,добавление:1,добавления:1,обновление:1,обновления:1,загрузка:1,загрузки:1,выгрузка:1,выгрузки:1,копирование:1,копирования:1,печать:1,печати:1,экспорт:1,экспорта:1,импорт:1,импорта:1,ввод:1,ввода:1,вывод:1,вывода:1,получение:1,получения:1,отправка:1,отправки:1,передача:1,передачи:1,приём:1,прием:1,приёма:1,приема:1,открытие:1,открытия:1,закрытие:1,закрытия:1,сохранение:1,сохранения:1,запись:1,записи:1,чтение:1,чтения:1,поиск:1,поиска:1,выбор:1,выбора:1,установка:1,установки:1,настройка:1,настройки:1,подключение:1,подключения:1,отключение:1,отключения:1,остановка:1,остановки:1,перезапуск:1,перезапуска:1,начало:1,начала:1,конец:1,конца:1,продолжение:1,продолжения:1,прекращение:1,прекращения:1,ожидание:1,ожидания:1,пауза:1,паузы:1,стоп:1,стопа:1,старт:1,старта:1,финиш:1,финиша:1,данные:1,данных:1,номер:1,номера:1,дата:1,даты:1,сумма:1,суммы:1,количество:1,количества:1,код:1,кода:1,тип:1,типа:1,статус:1,статуса:1,уровень:1,уровня:1,группа:1,группы:1,раздел:1,раздела:1,пункт:1,пункта:1,статья:1,статьи:1,приложение:1,приложения:1,комментарий:1,комментария:1,примечание:1,примечания:1,описание:1,описания:1,наименование:1,наименования:1,название:1,названия:1,адрес:1,адреса:1,телефон:1,телефона:1,организация:1,организации:1,компания:1,компании:1,подразделение:1,подразделения:1,отдел:1,отдела:1,должность:1,должности:1,роль:1,роли:1,функция:1,функции:1,процесс:1,процесса:1,операция:1,операции:1,действие:1,действия:1,этап:1,этапа:1,шаг:1,шага:1,период:1,периода:1,срок:1,срока:1,время:1,времени:1,объем:1,объёма:1,объема:1,показатель:1,показателя:1,коэффициент:1,коэффициента:1,процент:1,процента:1,ставка:1,ставки:1,тариф:1,тарифа:1,цена:1,цены:1,стоимость:1,стоимости:1,бюджет:1,бюджета:1,источник:1,источника:1,назначение:1,назначения:1,цель:1,цели:1,причина:1,причины:1,основание:1,основания:1,осн:1,содержание:1,содержания:1,тема:1,темы:1,текст:1,текста:1,суть:1,сути:1,сущность:1,сущности:1,цел:1,целый:1,целого:1,полный:1,полного:1,общий:1,общего:1,основной:1,основного:1,главный:1,главного:1,ведущий:1,ведущего:1,ответственный:1,ответственного:1,исполнитель:1,исполнителя:1,согласующий:1,согласующего:1,утверждающий:1,утверждающего:1,подписант:1,подписанта:1,инициатор:1,инициатора:1,автор:1,автора:1,создатель:1,создателя:1,владелец:1,владельца:1,участник:1,участника:1,член:1,члена:1,руководитель:1,руководителя:1,начальник:1,начальника:1,директор:1,директора:1,менеджер:1,менеджера:1,специалист:1,специалиста:1,эксперт:1,эксперта:1,консультант:1,консультанта:1,советник:1,советника:1,помощник:1,помощника:1,ассистент:1,ассистента:1,стажер:1,стажера:1,практикант:1,практиканта:1,кандидат:1,кандидата:1,победитель:1,победителя:1,партнер:1,партнера:1,клиент:1,клиента:1,заказчик:1,заказчика:1,поставщик:1,поставщика:1,продавец:1,продавца:1,покупатель:1,покупателя:1,потребитель:1,потребителя:1,пользователь:1,пользователя:1,абонент:1,абонента:1,субъект:1,субъекта:1,объект:1,объекта:1,принципал:1,принципала:1,агент:1,агента:1,представитель:1,представителя:1,уполномоченный:1,уполномоченного:1,доверенное:1,доверенного:1,лицо:1,лица:1,гражданин:1,гражданина:1,работник:1,работника:1,сотрудник:1,сотрудника:1,персонал:1,персонала:1,кадр:1,кадра:1,кадры:1,кадров:1,персона:1,персоны:1,человек:1,человека:1,люди:1,людей:1,физлицо:1,физлица:1,физическое:1,юрлицо:1,юрлица:1,юридическое:1,индивидуальный:1,предприниматель:1,предпринимателя:1,самозанятый:1,самозанятого:1,налогоплательщик:1,налогоплательщика:1,плательщик:1,плательщика:1,получатель:1,получателя:1,отправитель:1,отправителя:1,грузоотправитель:1,грузоотправителя:1,грузополучатель:1,грузополучателя:1,перевозчик:1,перевозчика:1,экспедитор:1,экспедитора:1,страхователь:1,страхователя:1,выгодоприобретатель:1,выгодоприобретателя:1,застрахованный:1,застрахованного:1,заемщик:1,заемщика:1,кредитор:1,кредитора:1,дебитор:1,дебитора:1,банкрот:1,банкрота:1,ликвидатор:1,ликвидатора:1,конкурсный:1,конкурсного:1,управляющий:1,управляющего:1,арбитражный:1,арбитражного:1,судья:1,судьи:1,суд:1,суда:1,арбитр:1,арбитра:1,мировой:1,мирового:1,нотариус:1,нотариуса:1,регистратор:1,регистратора:1,кадастровый:1,кадастрового:1,инженер:1,инженера:1,технолог:1,технолога:1,мастер:1,мастера:1,прораб:1,прораба:1,контролер:1,контролера:1,лаборант:1,лаборанта:1,оператор:1,оператора:1,наладчик:1,наладчика:1,слесарь:1,слесаря:1,токарь:1,токаря:1,фрезеровщик:1,фрезеровщика:1,сварщик:1,сварщика:1,монтажник:1,монтажника:1,электрик:1,электрика:1,сантехник:1,сантехника:1,плотник:1,плотника:1,маляр:1,маляра:1,штукатур:1,штукатура:1,облицовщик:1,облицовщика:1,каменщик:1,каменщика:1,бетонщик:1,бетонщика:1,арматурщик:1,арматурщика:1,крановщик:1,крановщика:1,машинист:1,машиниста:1,водитель:1,водителя:1,пилот:1,пилота:1,капитан:1,капитана:1,штурман:1,штурмана:1,механик:1,механика:1,бортинженер:1,бортинженера:1,стюард:1,стюарда:1,проводник:1,проводника:1,диспетчер:1,диспетчера:1,оператор:1,оператора:1,администратор:1,администратора:1,секретарь:1,секретаря:1,референт:1,референта:1,делопроизводитель:1,делопроизводителя:1,архивариус:1,архивариуса:1,библиотекарь:1,библиотекаря:1,учитель:1,учителя:1,преподаватель:1,преподавателя:1,профессор:1,профессора:1,доцент:1,доцента:1,ассистент:1,ассистента:1,лаборант:1,лаборанта:1,старший:1,старшего:1,младший:1,младшего:1,ведущий:1,ведущего:1,главный:1,главного:1,ответственный:1,ответственного:1,начальник:1,начальника:1,заместитель:1,заместителя:1,первый:1,первого:1,второй:1,второго:1,единоличный:1,единоличного:1,коллегиальный:1,коллегиального:1,совет:1,совета:1,комитет:1,комитета:1,комиссия:1,комиссии:1,совещание:1,совещания:1,собрание:1,собрания:1,заседание:1,заседания:1,конференция:1,конференции:1,форум:1,форума:1,саммит:1,саммита:1,семинар:1,семинара:1,тренинг:1,тренинга:1,курс:1,курса:1,учеба:1,учебы:1,обучение:1,обучения:1,аттестация:1,аттестации:1,квалификация:1,квалификации:1,сертификация:1,сертификации:1,аккредитация:1,аккредитации:1,лицензия:1,лицензии:1,разрешение:1,разрешения:1,допуск:1,допуска:1,согласование:1,согласования:1,утверждение:1,утверждения:1,подпись:1,подписи:1,печать:1,печати:1,штамп:1,штампа:1,марка:1,марки:1,бланк:1,бланка:1,форма:1,формы:1,шаблон:1,шаблона:1,образец:1,образца:1,пример:1,примера:1,экземпляр:1,экземпляра:1,копия:1,копии:1,дубликат:1,дубликата:1,оригинал:1,оригинала:1,подлинник:1,подлинника:1,версия:1,версии:1,редакция:1,редакции:1,издание:1,издания:1,выпуск:1,выпуска:1,номер:1,номера:1,том:1,тома:1,часть:1,части:1,раздел:1,раздела:1,пункт:1,пункта:1,подпункт:1,подпункта:1,абзац:1,абзаца:1,страница:1,страницы:1,лист:1,листа:1,листов:1,л:1,стр:1,с:1,л:1,стр:1,т:1,ч:1,п:1,пп:1,абз:1,рис:1,табл:1,схема:1,схемы:1,чертеж:1,чертежа:1,эскиз:1,эскиза:1,макет:1,макета:1,проект:1,проекта:1,план:1,плана:1};
            for (var i = 0; i < words.length; i++) {
                if (nonPersonWords[words[i]]) return original;
            }
            // ALL-CAPS: if the match has NO lowercase letters at all, it's not a name
            // Catches: "З М" (from ИЗ МОДУЛЯ), "ВЫХОД ИЗ МОДУЛЯ", "ОТЧЁТ" etc.
            if (!/[а-яёa-z]/.test(original)) return original;
            // Also catch individual words that are 3+ ALL-CAPS
            var allWords = original.split(/\s+/);
            for (var i = 0; i < allWords.length; i++) {
                if (/^[А-ЯЁA-Z]{3,}$/.test(allWords[i])) return original;
            }
        }

        // If hash mode is enabled and this type should be hashed
        if (state.hashMode) {
            var ruleId = null;
            // Determine rule ID from pattern type
            if (type && type.indexOf('Организация') === 0) {
                if (type.indexOf('англ') !== -1) ruleId = 'english_companies';
                else ruleId = 'company_name';
            }
            else if (type && type.indexOf('СИБУР') === 0) ruleId = 'sibur';
            else if (type && type.indexOf('ФИО') === 0) {
                if (type.indexOf('англ') !== -1) ruleId = 'english_names';
                else ruleId = 'russian_names';
            }
            else if (type && type.indexOf('Email') === 0) ruleId = 'email';
            else if (type && type.indexOf('Телефон') === 0) ruleId = 'phone';
            else if (type && type.indexOf('URL') === 0) ruleId = 'urls';
            else if (type && type.indexOf('Имя пользователя') === 0) ruleId = 'usernames_tech';
            else if (type && type.indexOf('Логин') === 0) ruleId = 'usernames_tech';
            else if (type === 'list') {
                // Determine if list value is a person name (FIO) or organization
                var looksLikeFIO = /^[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+(\s+[А-ЯЁ][а-яё]+)?$/.test(original) &&
                                   !/(ООО|АО|ПАО|ЗАО|ОАО|ИП|Ltd|Inc|LLC|GmbH|Int\.?)/i.test(original);
                ruleId = looksLikeFIO ? 'russian_names' : 'company_name';
            }

            var hashFields = state.hashFields || [];
            var customFields = state.customHashFields || [];

            if (ruleId && hashFields.indexOf(ruleId) !== -1) {
                var hash = createHashMask(original, ruleId);
                _hashPlaceholders.push(hash);
                return '\x00HASH' + (_hashPlaceholders.length - 1) + '\x00';
            }
            // Check custom hash fields (match by type string or rule ID)
            for (var i = 0; i < customFields.length; i++) {
                if (type && type.toLowerCase().indexOf(customFields[i].toLowerCase()) !== -1) {
                    var customHash = createHashMask(original, 'custom_' + customFields[i]);
                    _hashPlaceholders.push(customHash);
                    return '\x00HASH' + (_hashPlaceholders.length - 1) + '\x00';
                }
            }
        }

        var char = state.maskChar || '*'; var mode = state.maskMode || 'preserve';
        if (mode === 'replace') return '[ЗАМАСКИРОВАНО]';
        if (mode === 'partial') { var len = original.length; if (len <= 4) return char.repeat(len); return char.repeat(len - 4) + original.slice(-4); }
        return original.replace(/[a-zA-Zа-яА-ЯёЁ0-9@._%+\u00AD\-]/g, char);
    }
    function maskPreview(str) { if (str.length <= 8) return str.slice(0, 2) + '***'; return str.slice(0, 4) + '***' + str.slice(-2); }

