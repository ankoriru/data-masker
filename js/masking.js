    // ==================== UI HELPERS ====================
    function toggleFileInfo() { state.fileInfoOpen = !state.fileInfoOpen; var content = document.getElementById('fileInfoContent'); var arrow = document.getElementById('fileInfoArrow'); if (state.fileInfoOpen) { content.classList.add('open'); arrow.classList.add('rotated'); } else { content.classList.remove('open'); arrow.classList.remove('rotated'); } }
    function switchTab(tabName) { var tabs = ['upload','listfiles','columnsettings','settings','templates','deobfuscation','quality','instruction','preview']; for (var i = 0; i < tabs.length; i++) { var t = tabs[i]; var tabEl = document.getElementById('tab-' + t); var panelEl = document.getElementById('panel-' + t); if (tabEl) { tabEl.classList.remove('tab-active'); tabEl.classList.add('text-slate-400'); } if (panelEl) panelEl.classList.add('hidden'); } var activeTab = document.getElementById('tab-' + tabName); var activePanel = document.getElementById('panel-' + tabName); if (activeTab) { activeTab.classList.add('tab-active'); activeTab.classList.remove('text-slate-400'); } if (activePanel) activePanel.classList.remove('hidden'); if (tabName === 'preview') renderPreview(); if (tabName === 'settings') renderSettings(); if (tabName === 'listfiles') renderListFiles(); if (tabName === 'columnsettings') renderColumnSettings(); if (tabName === 'templates') renderTemplates(); if (tabName === 'quality') renderQualityTab(); if (tabName === 'deobfuscation') renderDeobfuscationTab(); if (tabName === 'instruction') loadInstruction(); }

    // ==================== CUSTOM COLUMNS ====================
    function addCustomColumn(category) {
        var inputId = category === 'commercial' ? 'customColCommercial' : 'customColPersonal';
        var input = document.getElementById(inputId);
        var value = input.value.trim();
        if (!value) return;
        var arr = category === 'commercial' ? state.customCommercialColumns : state.customPersonalColumns;
        if (arr.indexOf(value) !== -1) { showNotification('Такое название уже добавлено', 'error'); return; }
        arr.push(value);
        input.value = '';
        renderColumnSettings();
        showNotification('Название столбца добавлено');
    }
    function removeCustomColumn(category, index) {
        var arr = category === 'commercial' ? state.customCommercialColumns : state.customPersonalColumns;
        arr.splice(index, 1);
        renderColumnSettings();
    }


    function toggleMaskSelectedOnly() {
        state.maskSelectedColumnsOnly = !state.maskSelectedColumnsOnly;
        var toggle = document.getElementById('maskSelectedOnlyToggle');
        if (toggle) toggle.checked = state.maskSelectedColumnsOnly;
        saveSettings();
        showNotification(state.maskSelectedColumnsOnly ? 'Маскирование только указанных столбцов' : 'Маскирование всех столбцов');
    }

    // Check if header matches any user-added column name (exact word match)
    function isColumnSelectedForMasking(headerText) {
        if (!headerText) return false;
        var h = String(headerText).trim().toLowerCase();
        var allCols = (state.customCommercialColumns || []).concat(state.customPersonalColumns || []);
        for (var i = 0; i < allCols.length; i++) {
            if (_isWordInText(h, allCols[i])) return true;
        }
        return false;
    }

    // ==================== EXCLUDED COLUMNS (WHITELIST) ====================
    function isColumnExcluded(headerText) {
        if (!headerText || !state.excludedColumns || state.excludedColumns.length === 0) return false;
        var h = String(headerText).trim().toLowerCase();
        for (var i = 0; i < state.excludedColumns.length; i++) {
            if (h.indexOf(state.excludedColumns[i].toLowerCase()) !== -1) return true;
        }
        return false;
    }
    function addExcludedColumn() {
        var input = document.getElementById('excludedColumnInput');
        var value = input.value.trim();
        if (!value) return;
        if (state.excludedColumns.indexOf(value) !== -1) { showNotification('Этот столбец уже в исключениях', 'error'); return; }
        state.excludedColumns.push(value);
        input.value = '';
        renderColumnSettings();
        showNotification('Столбец добавлен в исключения');
    }
    function removeExcludedColumn(index) {
        state.excludedColumns.splice(index, 1);
        renderColumnSettings();
    }

    function isSoftMaskColumn(headerText) {
        if (!headerText || !state.softMaskColumns || state.softMaskColumns.length === 0) return false;
        var h = String(headerText).trim().toLowerCase();
        for (var i = 0; i < state.softMaskColumns.length; i++) {
            if (h.indexOf(state.softMaskColumns[i].toLowerCase()) !== -1) return true;
        }
        return false;
    }
    function addSoftMaskColumn() {
        var input = document.getElementById('softMaskColumnInput');
        var value = input.value.trim();
        if (!value) return;
        if (state.softMaskColumns.indexOf(value) !== -1) { showNotification('Этот столбец уже добавлен', 'error'); return; }
        state.softMaskColumns.push(value);
        input.value = '';
        renderColumnSettings();
        showNotification('Столбец добавлен в мягкое маскирование');
    }
    function removeSoftMaskColumn(index) {
        state.softMaskColumns.splice(index, 1);
        renderColumnSettings();
    }

    function isDigitMaskColumn(headerText) {
        if (!headerText || !state.digitMaskColumns || state.digitMaskColumns.length === 0) return false;
        var h = String(headerText).trim().toLowerCase();
        for (var i = 0; i < state.digitMaskColumns.length; i++) {
            if (h.indexOf(state.digitMaskColumns[i].toLowerCase()) !== -1) return true;
        }
        return false;
    }
    function addDigitMaskColumn() {
        var input = document.getElementById('digitMaskColumnInput');
        var value = input.value.trim();
        if (!value) return;
        if (state.digitMaskColumns.indexOf(value) !== -1) { showNotification('Этот столбец уже добавлен', 'error'); return; }
        state.digitMaskColumns.push(value);
        input.value = '';
        renderDigitMaskColumns();
        saveSettings();
        showNotification('Столбец добавлен в маскирование цифр');
    }
    function removeDigitMaskColumn(index) {
        state.digitMaskColumns.splice(index, 1);
        renderDigitMaskColumns();
        saveSettings();
    }
    function renderDigitMaskColumns() {
        var list = document.getElementById('digitMaskColumnsList');
        if (!list) return;
        var h = '';
        for (var i = 0; i < state.digitMaskColumns.length; i++) {
            h += '<span class="col-tag" style="background:rgba(6,182,212,0.15);border-color:rgba(6,182,212,0.3);color:#22d3ee;">' + escapeHtml(state.digitMaskColumns[i]) + ' <span class="remove" onclick="removeDigitMaskColumn(' + i + ')">&times;</span></span>';
        }
        if (state.digitMaskColumns.length === 0) h = '<span class="text-xs text-slate-500">Нет столбцов для маскирования цифр</span>';
        list.innerHTML = h;
    }


    function renderColumnSettings() {
        var commList = document.getElementById('customCommercialColumnsList');
        var persList = document.getElementById('customPersonalColumnsList');
        if (!commList || !persList) return;
        var commHtml = '';
        for (var i = 0; i < state.customCommercialColumns.length; i++) {
            commHtml += '<span class="col-tag">' + escapeHtml(state.customCommercialColumns[i]) + ' <span class="remove" onclick="removeCustomColumn(\'commercial\',' + i + ')">&times;</span></span>';
        }
        if (state.customCommercialColumns.length === 0) commHtml = '<span class="text-xs text-slate-500">Нет добавленных столбцов</span>';
        commList.innerHTML = commHtml;
        var persHtml = '';
        for (var i = 0; i < state.customPersonalColumns.length; i++) {
            persHtml += '<span class="col-tag">' + escapeHtml(state.customPersonalColumns[i]) + ' <span class="remove" onclick="removeCustomColumn(\'personal\',' + i + ')">&times;</span></span>';
        }
        if (state.customPersonalColumns.length === 0) persHtml = '<span class="text-xs text-slate-500">Нет добавленных столбцов</span>';
        persList.innerHTML = persHtml;
        // Render self-detected columns
        var detComm = document.getElementById('detectedCommercialCols');
        var detCommList = document.getElementById('detectedCommercialColsList');
        if (detComm && detCommList) {
            if (state.selfDetectedColumns.commercial.length > 0) {
                detComm.classList.remove('hidden');
                var dch = '';
                for (var i = 0; i < state.selfDetectedColumns.commercial.length; i++) {
                    dch += '<span class="detected-type-tag detected-type-company">' + escapeHtml(state.selfDetectedColumns.commercial[i]) + '</span>';
                }
                detCommList.innerHTML = dch;
            } else { detComm.classList.add('hidden'); }
        }
        var detPers = document.getElementById('detectedPersonalCols');
        var detPersList = document.getElementById('detectedPersonalColsList');
        if (detPers && detPersList) {
            if (state.selfDetectedColumns.personal.length > 0 || state.selfDetectedColumns.logins.length > 0) {
                detPers.classList.remove('hidden');
                var dph = '';
                for (var i = 0; i < state.selfDetectedColumns.personal.length; i++) {
                    dph += '<span class="detected-type-tag detected-type-person">' + escapeHtml(state.selfDetectedColumns.personal[i]) + '</span>';
                }
                for (var i = 0; i < state.selfDetectedColumns.logins.length; i++) {
                    dph += '<span class="detected-type-tag detected-type-login">' + escapeHtml(state.selfDetectedColumns.logins[i]) + '</span>';
                }
                detPersList.innerHTML = dph;
            } else { detPers.classList.add('hidden'); }
        }
        // Render excluded columns
        var exclList = document.getElementById('excludedColumnsList');
        var exclApplied = document.getElementById('excludedColsApplied');
        if (exclList) {
            var exh = '';
            for (var i = 0; i < state.excludedColumns.length; i++) {
                exh += '<span class="col-tag-excluded">' + escapeHtml(state.excludedColumns[i]) + ' <span class="remove" onclick="removeExcludedColumn(' + i + ')">&times;</span></span>';
            }
            if (state.excludedColumns.length === 0) exh = '<span class="text-xs text-slate-500">Нет исключаемых столбцов</span>';
            exclList.innerHTML = exh;
        }
        if (exclApplied) {
            if (state.excludedColumns.length > 0) exclApplied.classList.remove('hidden');
            else exclApplied.classList.add('hidden');
        }
        // Render soft mask columns
        var softList = document.getElementById('softMaskColumnsList');
        var softApplied = document.getElementById('softMaskColsApplied');
        if (softList) {
            var sh = '';
            for (var i = 0; i < state.softMaskColumns.length; i++) {
                sh += '<span class="col-tag" style="background:rgba(245,158,11,0.15);border-color:rgba(245,158,11,0.3);color:#fbbf24;">' + escapeHtml(state.softMaskColumns[i]) + ' <span class="remove" onclick="removeSoftMaskColumn(' + i + ')">&times;</span></span>';
            }
            if (state.softMaskColumns.length === 0) sh = '<span class="text-xs text-slate-500">Нет столбцов в мягком маскировании</span>';
            softList.innerHTML = sh;
        }
        if (softApplied) {
            if (state.softMaskColumns.length > 0) softApplied.classList.remove('hidden');
            else softApplied.classList.add('hidden');
        }
    }

    // ==================== MASKING RULES (updated with new OPF and company patterns) ====================
    var defaultRules = [
        { id: 'email', name: 'Email адреса', description: 'Любой email формат name@domain.ru', category: 'personal', enabled: true, patterns: [
            { regex: /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g, type: 'Email' }
        ]},
		{ id: 'russian_names', name: 'ФИО (русские)', description: 'Русские ФИО: 2–4 слова, с дефисами и инициалами', category: 'personal', enabled: true, patterns: [
			// 4 слова: Геяси Парвин Абдул Фатах
			{ regex: /[А-ЯЁ][а-яё]*(?:\-[А-ЯЁ][а-яё]*)*\s+[А-ЯЁ][а-яё]*(?:\-[А-ЯЁ][а-яё]*)*\s+[А-ЯЁ][а-яё]*(?:\-[А-ЯЁ][а-яё]*)*\s+[А-ЯЁ][а-яё]*(?:\-[А-ЯЁ][а-яё]*)*/g, type: 'ФИО (4 слова)' },
			
			// 3 слова с двойной фамилией/именем: Первухина-Вейс Алёна Дмитриевна, Лебедь-Ластухина Анна Игоревна
			{ regex: /[А-ЯЁ][а-яё]*(?:\-[А-ЯЁ][а-яё]*)*\s+[А-ЯЁ][а-яё]*(?:\-[А-ЯЁ][а-яё]*)*\s+[А-ЯЁ][а-яё]*(?:\-[А-ЯЁ][а-яё]*)*/g, type: 'ФИО (полное)' },
			
			// Фамилия + инициалы: Иванов А.А.
			{ regex: /[А-ЯЁ][а-яё]*(?:\-[А-ЯЁ][а-яё]*)*\s+[А-ЯЁ]\.\s*[А-ЯЁ]\./g, type: 'ФИО (с инициалами)' },
			
			// Инициалы + фамилия: А.А. Иванов
			{ regex: /[А-ЯЁ]\.\s*[А-ЯЁ]\.\s*[А-ЯЁ][а-яё]*(?:\-[А-ЯЁ][а-яё]*)*/g, type: 'ФИО (инициалы + фамилия)' },

			// Компактные инициалы без точек + фамилия: АН Иванов, АВ Петров, ВП Номоконов
			{ regex: /[А-ЯЁ]{2}\s+[А-ЯЁ][А-Яа-яЁё]{2,25}/g, type: 'ФИО (инициалы + фамилия)' },
			
			// Короткая фамилия (1-2 буквы) + имя + отчество: Ри Руслан Кайдарбекович
			{ regex: /[А-ЯЁ][а-яё]{0,1}\s+[А-ЯЁ][а-яё]{1,25}\s+[А-ЯЁ][а-яё]{1,25}/g, type: 'ФИО (короткая фамилия)' },
			
			// 2 слова (ФИ): Кирпичников Сергей, Цзэн Фаньли
			{ regex: /[А-ЯЁ][а-яё]*(?:\-[А-ЯЁ][а-яё]*)*\s+[А-ЯЁ][а-яё]*(?:\-[А-ЯЁ][а-яё]*)*/g, type: 'ФИО (2 слова)' },
			
			// Короткое имя (1-2 буквы): Волков Иа
			{ regex: /[А-ЯЁ][а-яё]{2,25}\s+[А-ЯЁ][а-яё]{0,1}/g, type: 'ФИО (короткое имя)' }
		]},
        { id: 'phone', name: 'Телефоны РФ', description: 'Российские номера: +7/8 и 10 цифр', category: 'personal', enabled: false, patterns: [
            { regex: /(?:^|[^\d])((?:8|\+7)[\- ]?)?(?:\(?\d{3}\)?[\- ]?)?[\d\- ]{7,10}(?![\d])/g, type: 'Телефон' }
        ]},
        { id: 'inn', name: 'ИНН', description: 'ИНН юрлица (10 цифр) или физлица (12 цифр)', category: 'personal', enabled: true, patterns: [
            { regex: /(?:ИНН|инн)[\s:;=]*(\d{10}|\d{12})/gi, type: 'ИНН' }
        ]},
        { id: 'snils', name: 'СНИЛС', description: 'Страховой номер: 11 цифр с разделителями', category: 'personal', enabled: false, patterns: [
            { regex: /СНИЛС[\s:]*(\d{3}[\s\-]?\d{3}[\s\-]?\d{3}[\s]?\d{2})/gi, type: 'СНИЛС' },
            { regex: /\d{3}[\s\-]\d{3}[\s\-]\d{3}[\s]\d{2}/g, type: 'СНИЛС (формат)' }
        ]},
        { id: 'passport', name: 'Паспортные данные', description: 'Серия, номер, кем выдан, дата выдачи, код подразделения', category: 'personal', enabled: true, patterns: [
            { regex: /(?:[Сс][\s]*[её][\s]*[рр]?[\s]*[иі]?[\s]*[яя]?[\s]*[:;.=\s]+[\s]*)(\d{4})/g, type: 'Серия паспорта' },
            { regex: /(?:[Нн][\s]*[оо][\s]*[мм]?[\s]*[е]?[\s]*[рр]?[\s]*[:;.=\s]+[\s]*)(\d{6})/g, type: 'Номер паспорта' },
            { regex: /(?:серия|сер\.)[\s:;.=\s]+(\d{4})[\s,;]*(?:номер|ном\.)?[\s:;.=\s]*(\d{6})/gi, type: 'Паспорт серия+номер' },
            { regex: /паспорт[\s:;.=\s]*(\d{4})[\s]*(\d{6})/gi, type: 'Паспорт' },
            { regex: /(?:[Кк][\s]*[её][\s]*[м]?[\s]*[Вв]?[\s]*[ыы]?[\s]*[дд]?[\s]*[аа]?[\s]*[нн]?[\s]*[:;.=\s]+[\s]*)([^\n\r]{3,120})/g, type: 'Кем выдан' },
            { regex: /(?:[Вв][\s]*[ыы]?[\s]*[дд]?[\s]*[аа]?[\s]*[нн]?[\s]*[:;.=\s]+[\s]*)(\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{2,4})/g, type: 'Дата выдачи паспорта' },
            { regex: /(?:[Кк][\s]*[оо][\s]*[дд]?[\s]*[Пп][\s]*[оо][\s]*[дд]?[\s]*[рр]?[\s]*[аа]?[\s]*[зз]?[\s]*[дд]?[\s]*[её]?[\s]*[лль]?[\s]*[нн]?[\с]*[иия]?[\s]*[:;.=\s]+[\s]*)(\d{3}[\-]?\d{3})/g, type: 'Код подразделения' },
            { regex: /код\s+подразделения[\s:;.=\s]+(\d{3}[\-]?\d{3})/gi, type: 'Код подразделения' },
            { regex: /\d{3}[\-]\d{3}(?=\s*$|\s*(?:выдан|серия|номер))/g, type: 'Код подразделения (контекст)' }
        ]},
        { id: 'address', name: 'Адреса (РФ)', description: 'Почтовый индекс (строго 6 цифр), город, улица, дом, квартира', category: 'personal', enabled: false, patterns: [
            { regex: /\d{6}(?!\d)/g, type: 'Почтовый индекс' },  // строго 6 цифр, не часть большего числа
            { regex: /\d{6},\s*[А-ЯЁа-яё\s\-.,]+(?:область|край|республика|автономный\s*округ)[\s,]*[А-ЯЁа-яё\s\-.,]{10,200}/g, type: 'Полный адрес' },
            { regex: /(?:г\.|город)\s*[А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+|\-[А-ЯЁ][а-яё]+)*/g, type: 'Адрес (город)' },
            { regex: /(?:дом|д\.)\s*\d+[а-яА-Я]?/gi, type: 'Адрес (дом)' },
            { regex: /(?:кабинет|каб\.|офис|оф\.)\s*\d+[а-яА-Я]?/gi, type: 'Кабинет/Офис' },
            { regex: /(?:строение|стр\.|корпус|к\.|владение|вл\.)\s*\d+[а-яА-Я]?/gi, type: 'Строение/Корпус' },
            { regex: /(?:улица|ул\.|пр\.|пер\.|набережная|наб\.|бульвар|бул\.|шоссе|ш\.|площадь|пл\.)[\s.]+[А-ЯЁ][а-яё\s\-.,№\d]{2,49}/gi, type: 'Адрес (улица)' },
            { regex: /(?:место\s*нахождения|адрес)[\s:;=]*([А-ЯЁа-яё0-9\s\-\.,№]{10,200})/gi, type: 'Адрес (полный)' }
        ]},
        { id: 'birth_date', name: 'Дата рождения', description: 'Даты рождения в формате ДД.ММ.ГГГГ', category: 'personal', enabled: false, patterns: [
            { regex: /(?:дата\s*рождения|день\s*рождения|д\.?\s*рожд|рожд\.|род\.|рождения|дата\s*рожд)[\s:;=]*(\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{4})/gi, type: 'Дата рождения' },
            { regex: /(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{4})/g, type: 'Дата' }
        ]},
        { id: 'bank_details', name: 'Банковские реквизиты', description: 'Р/с, к/с (20 цифр), БИК (9 цифр)', category: 'commercial', enabled: false, patterns: [
            { regex: /(?:р\/?с|расч[её]тн(?:ый)?\s*сч[её]т)[\s:;=\/]*(\d{20})/gi, type: 'Расчётный счёт' },
            { regex: /(?:к\/?с|корреспондентский\s*сч[её]т)[\s:;=\/]*(\d{20})/gi, type: 'Корр. счёт' },
            { regex: /БИК[\s:;=]*(\d{9})/gi, type: 'БИК' },
            { regex: /\d{20}/g, type: 'Банковский счёт' }
        ]},
        { id: 'ogrn', name: 'ОГРН / ОГРНИП', description: 'ОГРН (13 цифр) или ОГРНИП (15 цифр)', category: 'commercial', enabled: false, patterns: [
            { regex: /ОГРН[\s:;=]*(\d{13}|\d{15})/gi, type: 'ОГРН' },
            { regex: /ОГРНИП[\s:;=]*(\d{15})/gi, type: 'ОГРНИП' }
        ]},
        { id: 'kpp', name: 'КПП', description: 'КПП организации (9 цифр)', category: 'commercial', enabled: false, patterns: [
            { regex: /КПП[\s:;=]*(\d{9})/gi, type: 'КПП' }
        ]},
        { id: 'credit_card', name: 'Номера банковских карт', description: '16-значные номера карт с группировкой', category: 'personal', enabled: false, patterns: [
            { regex: /(?:\d{4}[\s\-]?){3}\d{4}/g, type: 'Номер карты' }
        ]},
        { id: 'ip_address', name: 'IP-адреса', description: 'IPv4 адреса вида 192.168.1.1', category: 'technical', enabled: false, patterns: [
            { regex: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g, type: 'IP-адрес' }
        ]},
        { id: 'mac_address', name: 'MAC-адреса', description: 'MAC-адрес сетевого интерфейса', category: 'technical', enabled: false, patterns: [
            { regex: /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g, type: 'MAC-адрес' }
        ]},
        { id: 'urls', name: 'URL-адреса', description: 'HTTP/HTTPS ссылки', category: 'technical', enabled: false, patterns: [
            { regex: /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g, type: 'URL' }
        ]},
        { id: 'company_name', name: 'Названия организаций', description: 'Русские ЮЛ с ОПФ (ООО, АО, ПАО) и кавычками', category: 'commercial', enabled: true, patterns: [
            { regex: new RegExp('(?:(?:' + OPF_REGEX_PART + ')\\s*["\u00AB\'\u2018]([^"\u00BB\'\u2019]{2,100})["\u00BB\'\u2019])','gi'), type: 'Организация (ОПФ + кавычки)' },
            { regex: new RegExp('([А-ЯЁA-Z][А-ЯЁA-Z0-9\\s\\-\\u2013\\u2014]{1,98}[А-ЯЁA-Z0-9])(?![А-ЯЁA-Z0-9\\-])[,]?\\s*(?:' + OPF_REGEX_PART + ')','gi'), type: 'Организация (название + ОПФ)' },
            { regex: new RegExp('([А-ЯЁA-Z]{1,4}-[А-ЯЁA-Z][А-ЯЁA-Z0-9\\s]{1,97}[А-ЯЁA-Z0-9])(?![А-ЯЁA-Z0-9\\-])[,]?\\s*(?:' + OPF_REGEX_PART + ')','gi'), type: 'Организация (дефисное название)' },
            { regex: new RegExp('["\u00AB\'\u2018]([^"\u00BB\'\u2019]{2,100})["\u00BB\'\u2019]\\s*\\((?:' + OPF_REGEX_PART + ')\\)','gi'), type: 'Организация (кавычки + скобки)' },
            { regex: new RegExp('([А-ЯЁ]{2,}(?:\\s+[А-ЯЁ]{2,}){0,10})(?![А-ЯЁA-Z0-9\\-])\\s+(?:' + OPF_REGEX_PART + ')','g'), type: 'Организация (только заглавные)' },
            // International company forms
            { regex: /[A-Z][a-zA-Z0-9\s\-]{2,98}[a-zA-Z0-9]\s+(?:Ltd\.?|Inc\.?|GmbH|S\.A\.?|B\.V\.?|LLP|PLC|Corp\.?)/gi, type: 'Организация (международная ОПФ)' },
            // Additional Russian forms without quotes
            // Case-sensitive keywords (no 'i' flag): lowercase "ано" won't match "АНО"
            // Name: Cyrillic letters/spaces/hyphens only, max 60 chars
            { regex: /(?:АНО|ТСЖ|СНТ|ГБУ|МБУ|ФГБУ|Фонд|Союз|Ассоциация)\s+["\u00AB]?[А-ЯЁа-яё][А-ЯЁа-яё\s\-–—]{2,60}["\u00BB]?/g, type: 'Организация (некоммерческая)' }
        ]},
        { id: 'sibur', name: 'СИБУР (все формы)', description: 'Все варианты написания СИБУР в любом регистре', category: 'commercial', enabled: true, patterns: [
            // Matches Сибур in any case, any form (Сибур, СИБУР, сибур, Сибура, Сибуром, Сибуре, Сибур-Юг, etc.)
            // Uses word boundaries that work with Cyrillic characters
            { regex: /сибур[А-Яа-яЁёA-Za-z0-9\-]*(?![А-Яа-яЁёA-Za-z0-9])/gi, type: 'СИБУР' }
        ]},
        { id: 'english_companies', name: 'Названия организаций (англ.)', description: 'Английские названия с Ltd, Inc, GmbH, International', category: 'commercial', enabled: false, patterns: [
            // SIBUR Int. Shanghai, SIBUR International Trading
            { regex: /\b[A-Z][a-zA-Z]{1,15}(?:\s+(?:Int\.?|Intl\.?|International|Trading|Group|Holding|Corp\.?|Ltd\.?|Inc\.?|LLC|LLP|PLC|GmbH|S\.A\.?|B\.V\.?|AG|SE))(?:\s+[A-Z][a-zA-Z]{2,20}){0,3}\b/g, type: 'Организация (англ.)' },
            // SIBUR Int. ISTANBUL, ABC Corp. NEW YORK
            { regex: /\b[A-Z][a-zA-Z]{1,15}(?:\s+(?:Int\.?|Intl\.?|International|Trading|Group|Holding|Corp\.?|Ltd\.?|Inc\.?|LLC|LLP|PLC|GmbH))\s+[A-Z]{2,20}\b/g, type: 'Организация (англ., город)' },
            // Company Name + Ltd/Inc/GmbH etc.
            { regex: /\b[A-Z][a-zA-Z]{2,20}(?:\s+[A-Z][a-zA-Z]{2,20}){0,3}\s+(?:Ltd\.?|Inc\.?|LLC|GmbH|PLC|Corp\.?|Group|Holding)\b/g, type: 'Организация (англ., ОПФ)' },
            // All-caps abbreviations with context
            { regex: /\b[A-Z]{2,8}(?:\s+[A-Z][a-zA-Z]{2,15}){1,2}\b/g, type: 'Организация (англ., аббревиатура)' }
        ]},
		{ id: 'english_names', name: 'ФИО (английские)', description: 'Английские имена и фамилии с инициалами. Исключает технические термины (SMTP Client, False Positive, Specific и т.д.).', category: 'personal', enabled: false, patterns: [
			// Full name: John Smith, Jane Doe (excludes all-caps first word AND common technical terms)
			{ regex: /(?!(?:[A-Z]{2,}|False|Specific|General|Default|Public|Static|Final|Abstract|Interface|Boolean|Integer|String|Double|Float|Long|Short|Byte|Char|Void|Null|Super|This|Extends|Implements|Import|Package|Return|Throw|Throws|Try|Catch|Finally|If|Else|While|For|Do|Switch|Case|Break|Continue|New|Instanceof|Const|Goto|Native|Strictfp|Synchronized|Transient|Volatile|Assert|Enum|Module|Requires|Exports|Opens|Uses|Provides|With|To|Transitive|Sealed|Permits|Record|Var|Yield|Non|Yes|No|Ok|Error|Warn|Info|Debug|Trace|Fatal|Critical|Warning|Notice|Alert|Emergency|Success|Failed|Failure|Pass|Passed|Skip|Ignore|Todo|Fixme|Hack|Bug|Issue|Task|Note|Caution|Danger|Important|Tip)\s)[A-Z][a-zA-Z]{1,15} +[A-Z][a-zA-Z]{1,15}(?:\s+[A-Z][a-zA-Z]{1,15})?/g, type: 'ФИО (англ.)' },
			// Name with initial: J. Smith, John A. Smith (excludes all-caps and technical terms)
			{ regex: /(?!(?:[A-Z]{2,}|False|Specific|General|Default|Public|Static|Final|Abstract|Interface|Boolean|Integer|String|Double|Float|Long|Short|Byte|Char|Void|Null|Super|This|Extends|Implements|Import|Package|Return|Throw|Throws|Try|Catch|Finally|If|Else|While|For|Do|Switch|Case|Break|Continue|New|Instanceof|Const|Goto|Native|Strictfp|Synchronized|Transient|Volatile|Assert|Enum|Module|Requires|Exports|Opens|Uses|Provides|With|To|Transitive|Sealed|Permits|Record|Var|Yield|Non|Yes|No|Ok|Error|Warn|Info|Debug|Trace|Fatal|Critical|Warning|Notice|Alert|Emergency|Success|Failed|Failure|Pass|Passed|Skip|Ignore|Todo|Fixme|Hack|Bug|Issue|Task|Note|Caution|Danger|Important|Tip)\s)[A-Z][a-zA-Z]{1,15} +[A-Z]\.? *[A-Z][a-zA-Z]{1,15}/g, type: 'ФИО (англ., инициал)' },
			// Lastname, Firstname: Smith, John (excludes all-caps and technical terms)
			{ regex: /(?!(?:[A-Z]{2,}|False|Specific|General|Default|Public|Static|Final|Abstract|Interface|Boolean|Integer|String|Double|Float|Long|Short|Byte|Char|Void|Null|Super|This|Extends|Implements|Import|Package|Return|Throw|Throws|Try|Catch|Finally|If|Else|While|For|Do|Switch|Case|Break|Continue|New|Instanceof|Const|Goto|Native|Strictfp|Synchronized|Transient|Volatile|Assert|Enum|Module|Requires|Exports|Opens|Uses|Provides|With|To|Transitive|Sealed|Permits|Record|Var|Yield|Non|Yes|No|Ok|Error|Warn|Info|Debug|Trace|Fatal|Critical|Warning|Notice|Alert|Emergency|Success|Failed|Failure|Pass|Passed|Skip|Ignore|Todo|Fixme|Hack|Bug|Issue|Task|Note|Caution|Danger|Important|Tip)\s)[A-Z][a-zA-Z]{1,15}, +[A-Z][a-zA-Z]{1,15}/g, type: 'ФИО (англ., фамилия, имя)' }
		]},
    { id: 'tax_rate', name: 'Налоговые данные', description: 'Ставка НДС с процентом', category: 'commercial', enabled: false, patterns: [
            { regex: /НДС[\s:;=]*(\d+\.?\d*)\s*%?/gi, type: 'НДС' }
        ]},
        { id: 'document_numbers', name: 'Номера документов', description: 'Номера договоров, приказов, распоряжений', category: 'technical', enabled: false, patterns: [
            { regex: /(?:№|номер|договор|приказ|распоряжение)[\s:;=]*(\d+[^\s,.]*)/gi, type: 'Номер документа' }
        ]},
        { id: 'vehicle', name: 'Транспортные средства', description: 'Гос. номера РФ и VIN-коды', category: 'personal', enabled: false, patterns: [
            { regex: /[А-ВЕКМНОРСТУХ]\d{3}\d{2}[А-Я]{2,3}\s*(?:\d{2,3})?/g, type: 'Гос. номер' },
            { regex: /VIN[\s:;=]*\s*([A-HJ-NPR-Z0-9]{17})/gi, type: 'VIN' }
        ]},
        { id: 'medical', name: 'Медицинские данные', description: 'Номера полисов ОМС (16 цифр)', category: 'personal', enabled: false, patterns: [
            { regex: /(?:полис\s*ОМС|номер\s*полиса)[\s:;=]*(\d{16})/gi, type: 'Полис ОМС' }
        ]},
        { id: 'uuid', name: 'UUID / GUID', description: 'Универсальные идентификаторы формата xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', category: 'technical', enabled: false, patterns: [
            { regex: /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g, type: 'UUID/GUID' }
        ]},
        { id: 'hashes', name: 'Хеш-суммы', description: 'MD5 (32 hex) и SHA-256 (64 hex) хеши', category: 'technical', enabled: false, patterns: [
            { regex: /\b[a-fA-F0-9]{32}\b/g, type: 'MD5 хеш' },
            { regex: /\b[a-fA-F0-9]{64}\b/g, type: 'SHA-256 хеш' }
        ]},
        { id: 'api_keys', name: 'API-ключи и токены', description: 'API ключи, access tokens, JWT токены', category: 'technical', enabled: false, patterns: [
            { regex: /(?:api[_\-]?key|apikey|api[_\-]?token|token|access[_\-]?token|auth[_\-]?token|secret[_\-]?key|private[_\-]?key)[\s:;=]+["']?([A-Za-z0-9_\-]{20,})["']?/gi, type: 'API-ключ/Токен' },
            { regex: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, type: 'JWT токен' }
        ]},
        { id: 'hostnames', name: 'Имена хостов и серверов', description: 'Имена хостов, серверов и доменов', category: 'technical', enabled: false, patterns: [
            { regex: /(?:host|hostname|server|host[_\-]?name)[\s:;=]+["']?([a-zA-Z0-9][a-zA-Z0-9\-\.]{2,})["']?/gi, type: 'Имя хоста' }
        ]},
        { id: 'file_paths', name: 'Путь к файлам', description: 'Windows (C:\\...) и Unix (/home/...) пути', category: 'technical', enabled: false, patterns: [
            { regex: /[A-Z]:\\(?:[^\s<>"|?*]+\\)*[^\s<>"|?*]+/g, type: 'Путь Windows' },
            { regex: /(?:\/(?:home|Users|usr|var|etc|tmp|opt|srv|root))[\/][^\s<>"']+/g, type: 'Путь Unix' }
        ]},
        { id: 'ports', name: 'Порты и соединения', description: 'Номера портов и IP:Port комбинации', category: 'technical', enabled: false, patterns: [
            { regex: /(?:port|порт)[\s:;=]+(\d{1,5})/gi, type: 'Порт' },
            { regex: /\b(?:\d{1,3}\.){3}\d{1,3}:\d{1,5}\b/g, type: 'IP:Порт' }
        ]},
        { id: 'usernames_tech', name: 'Имена пользователей', description: 'Логины, учетные записи и пароли в конфигах. Включая sibur\\username.', category: 'technical', enabled: true, patterns: [
            // Logins with prefix: user: name, login=name, пользователь=name, etc.
            // v5.7.51: Added 'пользователь'
            { regex: /(?:user|username|login|логин|пользователь|user[_\-]?name)[\s:;=]+["']?([a-zA-Z0-9_\-\.]{2,})["']?/gi, type: 'Имя пользователя' },
            // Uppercase-only logins: KUZNETSOVAVM, SHAKIROVAOKA (letters only, 6-20 chars)
            // Excludes codes with digits/underscores like G001GG, EAP_100, FBL3N
            // Also excludes common technical all-caps words: SMTP, CLIENT, SERVER, FALSE, TRUE, SPECIFIC, etc.
            { regex: /(?!(?:SMTP|CLIENT|SERVER|FALSE|TRUE|SPECIFIC|GENERAL|DEFAULT|PUBLIC|STATIC|FINAL|ABSTRACT|INTERFACE|BOOLEAN|INTEGER|STRING|DOUBLE|FLOAT|LONG|SHORT|BYTE|CHAR|VOID|NULL|SUPER|THIS|EXTENDS|IMPLEMENTS|IMPORT|PACKAGE|RETURN|THROW|THROWS|TRY|CATCH|FINALLY|IF|ELSE|WHILE|FOR|DO|SWITCH|CASE|BREAK|CONTINUE|NEW|INSTANCEOF|CONST|GOTO|NATIVE|STRICTFP|SYNCHRONIZED|TRANSIENT|VOLATILE|ASSERT|ENUM|MODULE|REQUIRES|EXPORTS|OPENS|USES|PROVIDES|WITH|TO|TRANSITIVE|SEALED|PERMITS|RECORD|VAR|YIELD|NON|YES|NO|OK|ERROR|WARN|INFO|DEBUG|TRACE|FATAL|CRITICAL|WARNING|NOTICE|ALERT|EMERGENCY|PANIC|SUCCESS|FAILED|FAILURE|PASS|PASSED|SKIP|IGNORE|TODO|FIXME|HACK|BUG|ISSUE|TASK|NOTE|WARNING|CAUTION|DANGER|IMPORTANT|TIP|INFO|WARNING|CAUTION|DANGER|IMPORTANT|TIP|INFO))[A-Z]{6,20}/g, type: 'Имя пользователя' },
            // Sibur domain logins: sibur\username or sibur/username (case insensitive)
            { regex: /(?:^|[^a-zA-Z])sibur[\\/][a-zA-Z0-9_\-\.]{2,30}(?![a-zA-Z0-9_])/gi, type: 'Имя пользователя' },
            // Pipe-delimited logins: |MIADMIN|, |username|
            // v5.7.51: Added for SAP-style pipe-wrapped usernames
            { regex: /\|([a-zA-Z][a-zA-Z0-9_]{1,30})\|/g, type: 'Имя пользователя' },
            // v5.7.54: Standalone usernames in isolated cells/words — 3-50 chars, letter+digit/underscore/dot/dash
            // v5.7.58: Excludes common words (Microsoft, Excel, idle, etc.) and session IDs (sess_*)
            // Excludes common technical words and very short/long strings
            { regex: /\b(?!(?:user|username|login|пользователь|name|admin|root|test|guest|info|support|service|system|administrator|manager|operator|developer|analyst|consultant|engineer|director|chief|head|lead|senior|junior|master|default|public|private|general|specific|client|server|smtp|http|https|ftp|ssh|tcp|udp|ip|url|uri|api|html|xml|json|css|js|sql|php|asp|jsp|exe|dll|bat|cmd|sys|log|tmp|txt|csv|pdf|doc|xls|ppt|jpg|png|gif|bmp|zip|rar|7z|tar|gz|mp3|mp4|avi|wmv|wav|flv|mkv|iso|bin|db|ini|cfg|conf|yml|yaml|Microsoft|Excel|Word|PowerPoint|Outlook|Windows|Office|Adobe|Google|Amazon|Apple|Samsung|Intel|Oracle|SAP|IBM|Cisco|Dell|HP|Lenovo|Firefox|Chrome|Safari|Edge|Explorer|Visual|Studio|Code|GitHub|GitLab|Docker|Kubernetes|Jenkins|Jira|Confluence|Slack|Teams|Telegram|WhatsApp|Skype|Zoom|WebEx|idle|window_session|chat|FTE)\b)(?!sess_)[a-zA-Z][a-zA-Z0-9_.\-]{2,49}\b/gi, type: 'Имя пользователя' },
            // Passwords
            { regex: /(?:password|passwd|pwd|пароль)[\s:;=]+["']?([^\s"'<>]{3,})["']?/gi, type: 'Пароль' }
        ]},
    { id: 'git_commits', name: 'Git commit hashes', description: 'SHA-1 хеши коммитов Git (7–40 hex)', category: 'technical', enabled: false, patterns: [
            { regex: /\b[a-f0-9]{7,40}\b/g, type: 'Git commit hash' }
        ]},
        { id: 'base64', name: 'Base64 encoded data', description: 'Base64 строки длиной от 20 символов', category: 'technical', enabled: false, patterns: [
            { regex: /\b[A-Za-z0-9+/]{20,}={0,2}\b/g, type: 'Base64 data' }
        ]},
        { id: 'connection_strings', name: 'Connection strings', description: 'Строки подключения к БД и параметры', category: 'technical', enabled: false, patterns: [
            { regex: /(?:Server|Data\s+Source|Host|Database|Initial\s+Catalog|User\s+ID|Password|UID|PWD)[\s:;=]+[^\s;]+/gi, type: 'Connection string parameter' },
            { regex: /(?:mongodb|mysql|postgresql|postgres|redis|amqp|mqtt):\/\/[^\s<>"{}|\\^`\[\]]+/gi, type: 'Database connection URI' }
        ]},
        { id: 'environment_vars', name: 'Environment variables', description: 'Переменные окружения $VAR, %VAR%', category: 'technical', enabled: false, patterns: [
            { regex: /\$\{[A-Z_][A-Z0-9_]*\}/g, type: 'Environment variable' },
            { regex: /\$[A-Z_][A-Z0-9_]*/g, type: 'Environment variable' },
            { regex: /%[A-Z_][A-Z0-9_]*%/g, type: 'Windows environment variable' }
        ]},
        { id: 'session_ids', name: 'Session IDs', description: 'Идентификаторы сессий PHPSESSID, JSESSIONID', category: 'technical', enabled: false, patterns: [
            { regex: /(?:session[_\-]?id|sessionid|sid|jsessionid|PHPSESSID|ASP\.NET_SessionId)[\s:;=]+["']?([A-Za-z0-9_\-]{10,})["']?/gi, type: 'Session ID' }
        ]},
        { id: 'docker_images', name: 'Docker/Container references', description: 'Docker образы и registry-ссылки', category: 'technical', enabled: false, patterns: [
            { regex: /\b[a-z0-9._-]+\/[a-z0-9._-]+:[a-z0-9._-]+\b/g, type: 'Docker image' },
            { regex: /(?:docker|container|image|registry)[\s:;=]+[a-z0-9._-]+\/[a-z0-9._-]+/gi, type: 'Docker reference' }
        ]},
        { id: 'kubernetes', name: 'Kubernetes resources', description: 'Kubernetes namespace, cluster, kubeconfig', category: 'technical', enabled: false, patterns: [
            { regex: /(?:namespace|cluster|kubeconfig|k8s)[\s:;=]+["']?([a-zA-Z0-9_\-\.]+)["']?/gi, type: 'Kubernetes resource' }
        ]},
        { id: 'certificates', name: 'Certificate references', description: 'PEM заголовки сертификатов и ключей', category: 'technical', enabled: false, patterns: [
            { regex: /-----BEGIN\s+(?:RSA\s+)?(?:CERTIFICATE|PRIVATE\s+KEY|PUBLIC\s+KEY|EC\s+PRIVATE\s+KEY|DSA\s+PRIVATE\s+KEY)-----/g, type: 'Certificate/Key header' },
            { regex: /-----END\s+(?:RSA\s+)?(?:CERTIFICATE|PRIVATE\s+KEY|PUBLIC\s+KEY|EC\s+PRIVATE\s+KEY|DSA\s+PRIVATE\s+KEY)-----/g, type: 'Certificate/Key footer' }
        ]},
        { id: 'log_patterns', name: 'Log file patterns', description: 'Timestamps ISO и уровни логирования ERROR/WARN/INFO', category: 'technical', enabled: false, patterns: [
            { regex: /\b\d{4}[\-\/]\d{2}[\-\/]\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+\-]\d{2}:?\d{2})?\b/g, type: 'Timestamp' },
            { regex: /\b(?:ERROR|WARN|WARNING|INFO|DEBUG|FATAL|CRITICAL|TRACE)\b/g, type: 'Log level' },
            { regex: /\[(?:ERROR|WARN|WARNING|INFO|DEBUG|FATAL|CRITICAL|TRACE)\]/g, type: 'Log level (bracketed)' }
        ]}
    ];

    // ==================== TEMPLATES (multi-select) ====================
    var templates = [
        { id: 'custom', name: 'Custom', description: 'Email, ФИО, ИНН, Паспорт, Организации, СИБУР, Логины, IP-адреса.', icon: '🎯', rules: ['email','russian_names','inn','passport','company_name','sibur','usernames_tech','ip_address'], mode: 'preserve', category: 'custom' },
        { id: 'personal', name: 'Персональные данные', description: 'ФИО, паспорт, СНИЛС, ИНН, телефон, email, адрес.', icon: '👤', rules: ['russian_names','english_names','phone','email','inn','snils','passport','address','birth_date','credit_card','vehicle','medical','usernames_tech'], mode: 'preserve', category: 'personal' },
        { id: 'commercial', name: 'Коммерческая тайна', description: 'Банковские реквизиты, ОГРН, КПП, ИНН, организации, налоги.', icon: '🏢', rules: ['inn','bank_details','ogrn','kpp','company_name','sibur','english_companies','tax_rate','document_numbers'], mode: 'preserve', category: 'commercial' },
        { id: 'technical', name: 'Технические данные', description: 'IP, MAC, URL, UUID, хеши, API-ключи, пути, порты, Git, Base64, connection strings.', icon: '💻', rules: ['ip_address','mac_address','urls','document_numbers','uuid','hashes','api_keys','hostnames','file_paths','ports','usernames_tech','git_commits','base64','connection_strings','environment_vars','session_ids','docker_images','kubernetes','certificates','log_patterns'], mode: 'replace', category: 'technical' },
        { id: 'minimal', name: 'Минимальное', description: 'Только телефон и email.', icon: '📧', rules: ['phone','email'], mode: 'partial', category: 'minimal' },
        { id: 'listmask', name: 'Маскирование по списку', description: 'Использует загруженные файлы-списки для точного поиска и замены значений.', icon: '📋', rules: [], mode: 'preserve', isListTemplate: true, category: 'list' }
    ];

    // ==================== INIT ====================
    var APP_VERSION = window.APP_VERSION || '5.7.53'; // Bump this on every release to force cache refresh

    function clearAllCachesAndReload() {
        var reloaded = false;
        function doReload() {
            if (reloaded) return;
            reloaded = true;
            // v5.7.53: Use version-only cache busting (no Date.now()) to prevent infinite reload loops
            var bustParam = '_cb=' + APP_VERSION;
            var href = window.location.href;
            var cbIdx = href.indexOf('_cb=');
            if (cbIdx !== -1) {
                var before = href.substring(0, cbIdx);
                var afterAmp = href.indexOf('&', cbIdx);
                var after = afterAmp !== -1 ? href.substring(afterAmp + 1) : '';
                href = before + bustParam + (after ? '&' + after : '');
            } else {
                var sep = href.indexOf('?') === -1 ? '?' : '&';
                href = href + sep + bustParam;
            }
            // Mark as reloaded in sessionStorage to prevent loop if localStorage fails
            try { sessionStorage.setItem('app_reloaded', APP_VERSION); } catch(e) {}
            window.location.replace(href);
        }
        var promises = [];
        // Unregister all service workers (they can cache old HTML/JS)
        if ('serviceWorker' in navigator) {
            promises.push(
                navigator.serviceWorker.getRegistrations().then(function(regs) {
                    return Promise.all(regs.map(function(r) { return r.unregister(); }));
                }).catch(function() {})
            );
        }
        // Clear Cache API storage
        if ('caches' in window) {
            promises.push(
                caches.keys().then(function(names) {
                    return Promise.all(names.map(function(n) { return caches.delete(n); }));
                }).catch(function() {})
            );
        }
        // Reload after caches are cleared (or timeout)
        Promise.all(promises).catch(function() {}).then(doReload);
        setTimeout(doReload, 600);
    }

    function unregisterServiceWorkers() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(regs) {
                regs.forEach(function(r) { r.unregister(); });
            }).catch(function() {});
        }
    }

    function init() {
        // Version-based cache busting: if version changed, clear app caches and reload
        // Hash dictionary is NEVER cleared — preserved across all version updates
        var storedVersion = localStorage.getItem('maskingAppVersion');
        // v5.7.53: Prevent infinite reload loop if localStorage fails or _cb already in URL
        var alreadyReloaded = sessionStorage.getItem('app_reloaded') === APP_VERSION;
        if (storedVersion !== APP_VERSION && !alreadyReloaded) {
            // Selective remove: delete only app cache keys, NEVER touch hash dictionary
            // This avoids the race condition of clear() + setItem() before location.replace()
            var keysToRemove = ['masking_settings','masking_templates_cache','masking_preview_cache',
                                 'masking_quality_cache','masking_column_cache'];
            for (var i = 0; i < keysToRemove.length; i++) {
                try { localStorage.removeItem(keysToRemove[i]); } catch(e) {}
            }
            localStorage.setItem('maskingAppVersion', APP_VERSION);
            // Aggressive cache purge: SW unregister + Cache API clear + force reload with cache-busting URL
            clearAllCachesAndReload();
            return;
        }
        // Always unregister service workers on every load to prevent stale caching
        unregisterServiceWorkers();
        loadSettings();
        // v5.7.53: Always reset to Custom template on page load (default behavior)
        // This ensures consistent starting state regardless of saved settings
        state.activeTemplates = ['custom'];
        Promise.all([detectUser(), detectInternalIP()]).then(function(){ initApp(); });
    }
    // ==================== UPDATE MODAL ====================
    // v5.7.53: Show changelog once per version from vendor/update.md
    // Variable: APP_VERSION (line 427) — current app version
    // Variable: localStorage.getItem('docmask_lastVersionSeen') — last shown version
    function checkForUpdates() {
        try {
            var lastVersion = localStorage.getItem('docmask_lastVersionSeen');
            if (lastVersion === APP_VERSION) return; // Already shown for this version

            fetch('vendor/update.md?v=' + APP_VERSION)
                .then(function(r) { return r.ok ? r.text() : ''; })
                .then(function(text) {
                    if (!text) return;
                    var body = document.getElementById('updateModalBody');
                    var modal = document.getElementById('updateModal');
                    if (!body || !modal) return;
                    // Simple markdown to HTML conversion
                    var html = text
                        .replace(/^##\s+(.*$)/gim, '<h3>$1</h3>')
                        .replace(/^###\s+(.*$)/gim, '<h4>$1</h4>')
                        .replace(/^\*\s+(.*$)/gim, '<li>$1</li>')
                        .replace(/^-\s+(.*$)/gim, '<li>$1</li>')
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\n/g, '<br>');
                    // Wrap consecutive <li> in <ul>
                    html = html.replace(/(<li>.*?<\/li>)(?:<br>\s*)+/g, '<ul>$1</ul>');
                    body.innerHTML = html;
                    modal.classList.remove('hidden');
                })
                .catch(function() {});
        } catch(e) {}
    }
    function closeUpdateModal() {
        var modal = document.getElementById('updateModal');
        if (modal) modal.classList.add('hidden');
        try { localStorage.setItem('docmask_lastVersionSeen', APP_VERSION); } catch(e) {}
    }

    function initApp() {
        // Ensure hashFields always contains essential fields (email, phone, urls)
        var defaultHashFields = ['company_name', 'russian_names', 'usernames_tech', 'english_companies', 'english_names', 'list', 'sibur', 'email', 'phone', 'urls'];
        if (!state.hashFields) state.hashFields = [];
        for (var i = 0; i < defaultHashFields.length; i++) {
            if (state.hashFields.indexOf(defaultHashFields[i]) === -1) {
                state.hashFields.push(defaultHashFields[i]);
            }
        }
        // Rebuild trie from restored list data (including saved list files)
        companyNameTrie = new CompanyNameTrie();
        listBasedCompanyNames.clear();
        state.listData.forEach(function (values) {
            values.forEach(function(v) {
                if (v.length >= 3) companyNameTrie.insert(v);
                listBasedCompanyNames.add(v.toLowerCase());
            });
        });
        rebuildListTrie(); // Build O(n) trie for list-based masking
        applyMultiTemplates();
        renderTemplates();
        renderSettings();
        renderDigitMaskColumns();
        renderCustomPatterns();
        renderColumnSettings();
        renderListFiles();
        setupDragDrop();
        setupListDragDrop();
        setupDeobfDragDrop();
        // Defer ka.csv loading to let UI render first (important for large files > 4 MB)
        setTimeout(function(){ loadKaCsv(); }, 100);
        // v5.7.53: Check for updates — shows modal once per version
        // Uses APP_VERSION (line 427) and localStorage 'docmask_lastVersionSeen'
        setTimeout(checkForUpdates, 500);
    }
    function loadSettings() {
        try {
            var saved = localStorage.getItem('masking_settings');
            if (saved) {
                var parsed = JSON.parse(saved);
                state.settings = parsed.rules || {};
                state.maskChar = parsed.maskChar || '*';
                state.maskMode = parsed.maskMode || 'preserve';
                state.customPatterns = parsed.customPatterns || [];
                state.activeTemplate = parsed.activeTemplate || 'personal';
                state.activeTemplates = parsed.activeTemplates || ['custom'];
                state.removeMetadata = parsed.removeMetadata !== undefined ? parsed.removeMetadata : true;
                state.customCommercialColumns = parsed.customCommercialColumns || [];
                state.customPersonalColumns = parsed.customPersonalColumns || [];
                state.excludedColumns = parsed.excludedColumns || [];
                state.softMaskColumns = parsed.softMaskColumns || [];
                state.digitMaskColumns = parsed.digitMaskColumns || [];
                state.enableSoftMaskAll = parsed.enableSoftMaskAll !== undefined ? parsed.enableSoftMaskAll : true;
				state.enableSelfLearning = parsed.enableSelfLearning !== undefined ? parsed.enableSelfLearning : false;
				state.enableHeaderDetection = parsed.enableHeaderDetection !== undefined ? parsed.enableHeaderDetection : false;
                state.hashMode = parsed.hashMode !== undefined ? parsed.hashMode : true;
                state.hashAccumulateMode = parsed.hashAccumulateMode !== undefined ? parsed.hashAccumulateMode : true;
                state.hashFields = parsed.hashFields || ['company_name', 'russian_names', 'usernames_tech', 'english_companies', 'english_names', 'list', 'sibur', 'email', 'phone', 'urls'];
                state.customHashFields = parsed.customHashFields || [];
                // v5.7.52: Only restore hashDictionary if it has actual entries
                if (parsed.hashDictionary && Object.keys(parsed.hashDictionary).length > 0) {
                    state.hashDictionary = parsed.hashDictionary;
                }
                // Restore hashDictionary from separate key (survives version updates)
                var savedHashDict = localStorage.getItem('maskingHashDictionary');
                if (savedHashDict) {
                    try { var hd = JSON.parse(savedHashDict); if (hd && Object.keys(hd).length > 0) state.hashDictionary = hd; } catch(e) {}
                }
                state.enableEnglishProcessing = parsed.enableEnglishProcessing !== undefined ? parsed.enableEnglishProcessing : true;
                state.maskSelectedColumnsOnly = parsed.maskSelectedColumnsOnly || false;
                state.enableKaCsv = parsed.enableKaCsv !== undefined ? parsed.enableKaCsv : true;
                // Restore list files and their data
                if (parsed.listFiles) {
                    state.listFiles = parsed.listFiles;
                    // Rebuild listData from serialized object
                    if (parsed.listData) {
                        state.listData = new Map();
                        for (var listKey in parsed.listData) {
                            if (parsed.listData.hasOwnProperty(listKey)) {
                                state.listData.set(listKey, new Set(parsed.listData[listKey]));
                            }
                        }
                    }
                    rebuildListTrie(); // Rebuild O(n) trie from restored data
                }
            }
        } catch(e){}
    }
    function saveSettings() {
        var rules = {};
        var toggles = document.querySelectorAll('.rule-toggle');
        for (var i = 0; i < toggles.length; i++) rules[toggles[i].getAttribute('data-rule-id')] = toggles[i].checked;
        state.settings = rules;
        state.maskChar = document.getElementById('maskChar').value || '*';
        state.maskMode = document.getElementById('maskMode').value;
        state.removeMetadata = document.getElementById('removeMetadata').checked;
        // Serialize listData (Map) as plain object for JSON
        var listDataObj = {};
        state.listData.forEach(function(values, key) {
            listDataObj[key] = Array.from(values);
        });
        localStorage.setItem('masking_settings', JSON.stringify({
            rules: state.settings, maskChar: state.maskChar, maskMode: state.maskMode,
            customPatterns: state.customPatterns, activeTemplate: state.activeTemplate,
            activeTemplates: state.activeTemplates, removeMetadata: state.removeMetadata,
            customCommercialColumns: state.customCommercialColumns, customPersonalColumns: state.customPersonalColumns,
            excludedColumns: state.excludedColumns,
            softMaskColumns: state.softMaskColumns,
            digitMaskColumns: state.digitMaskColumns,
            enableSoftMaskAll: state.enableSoftMaskAll,
			enableSelfLearning: state.enableSelfLearning,
			enableHeaderDetection: state.enableHeaderDetection,
            hashMode: state.hashMode,
            hashAccumulateMode: state.hashAccumulateMode,
            hashFields: state.hashFields,
            customHashFields: state.customHashFields,
            hashDictionary: state.hashDictionary,
            maskSelectedColumnsOnly: state.maskSelectedColumnsOnly,
            enableEnglishProcessing: state.enableEnglishProcessing,
            enableKaCsv: state.enableKaCsv,
            listFiles: state.listFiles,
            listData: listDataObj
        }));
        // Save hashDictionary to separate key for persistence across version updates
        // v5.7.52: Delete key if dictionary is empty, don't save empty object
        try {
            var dictKeys = Object.keys(state.hashDictionary);
            if (dictKeys.length > 0) {
                localStorage.setItem('maskingHashDictionary', JSON.stringify(state.hashDictionary));
            } else {
                localStorage.removeItem('maskingHashDictionary');
            }
        } catch(e) {
            console.warn('Failed to save hash dictionary to localStorage:', e);
        }
        showNotification('Настройки сохранены');
    }
    function resetAllSettings() {
        state.settings = {}; state.maskChar = '*'; state.maskMode = 'preserve'; state.customPatterns = [];
        state.activeTemplate = 'custom'; state.activeTemplates = ['custom']; state.removeMetadata = true;
        state.customCommercialColumns = []; state.customPersonalColumns = []; state.excludedColumns = []; state.softMaskColumns = []; state.digitMaskColumns = []; state.enableSoftMaskAll = true; state.maskSelectedColumnsOnly = false;
        state.hashMode = true;
        state.enableSelfLearning = false;
        state.enableHeaderDetection = false;
        state.hashAccumulateMode = true;
        state.hashFields = ['company_name', 'russian_names', 'usernames_tech', 'english_companies', 'english_names', 'list', 'sibur', 'email', 'phone', 'urls'];
        state.customHashFields = [];
        state.enableEnglishProcessing = true;
        state.enableKaCsv = true;
		applyMultiTemplates();
        var mdToggle = document.getElementById('removeMetadata'); if (mdToggle) mdToggle.checked = true;
        var mdToggleVis = document.getElementById('removeMetadataToggle');
        if (mdToggleVis) { mdToggleVis.classList.remove('toggle-off'); mdToggleVis.classList.add('toggle-on'); }
        renderColumnSettings();
        renderDeobfuscationTab();
    }

    // ==================== MULTI-TEMPLATE LOGIC ====================
    function toggleTemplate(templateId) {
        // Checkbox behavior: toggle template in/out of active list
        var idx = state.activeTemplates.indexOf(templateId);
        if (idx !== -1) {
            // Don't uncheck if it's the last remaining template
            if (state.activeTemplates.length > 1) {
                state.activeTemplates.splice(idx, 1);
            }
        } else {
            state.activeTemplates.push(templateId);
        }
        applyMultiTemplates();
        renderTemplates();
        renderSettings();
        saveSettings();
    }
    function selectAllTemplates() {
        state.activeTemplates = ['custom','personal','commercial','technical','minimal','listmask'];
        applyMultiTemplates();
        renderTemplates();
        renderSettings();
        saveSettings();
    }
    function clearAllTemplates() {
        // Reset to default custom template
        state.activeTemplates = ['custom'];
        applyMultiTemplates();
        renderTemplates();
        renderSettings();
        saveSettings();
    }
    function applyMultiTemplates() {
        var allRuleIds = [];
        for (var t = 0; t < state.activeTemplates.length; t++) {
            var tmpl = null;
            for (var i = 0; i < templates.length; i++) { if (templates[i].id === state.activeTemplates[t]) { tmpl = templates[i]; break; } }
            if (tmpl && tmpl.rules) {
                for (var r = 0; r < tmpl.rules.length; r++) {
                    if (allRuleIds.indexOf(tmpl.rules[r]) === -1) allRuleIds.push(tmpl.rules[r]);
                }
            }
        }
        // Update toggle states in settings:
        // Enable all rules that belong to active templates, disable all others
        for (var i = 0; i < defaultRules.length; i++) {
            var ruleId = defaultRules[i].id;
            var isInActiveTemplate = allRuleIds.indexOf(ruleId) !== -1;
            // English rules controlled ONLY by enableEnglishProcessing toggle, never by template
            if (ruleId === 'english_names' || ruleId === 'english_companies') {
                state.settings[ruleId] = state.enableEnglishProcessing;
            } else {
                state.settings[ruleId] = isInActiveTemplate;
            }
        }
        // Apply mode from first template
        if (state.activeTemplates.length > 0) {
            var firstTmpl = null;
            for (var i = 0; i < templates.length; i++) { if (templates[i].id === state.activeTemplates[0]) { firstTmpl = templates[i]; break; } }
            if (firstTmpl) state.maskMode = firstTmpl.mode;
        }
        var modeSelect = document.getElementById('maskMode');
        if (modeSelect) modeSelect.value = state.maskMode;
    }
// Возвращает активные правила с учётом выбранных шаблонов И переключателей в настройках
function getActiveRulesFromTemplates() {
  var activeRuleIds = [];

  // 1) Собираем все rule.id из активных шаблонов (как и раньше)
  for (var t = 0; t < state.activeTemplates.length; t++) {
    var tmpl = null;

    for (var i = 0; i < templates.length; i++) {
      if (templates[i].id === state.activeTemplates[t]) {
        tmpl = templates[i];
        break;
      }
    }

    if (tmpl && tmpl.rules) {
      for (var r = 0; r < tmpl.rules.length; r++) {
        var ruleId = tmpl.rules[r];
        if (activeRuleIds.indexOf(ruleId) === -1) {
          activeRuleIds.push(ruleId);
        }
      }
    }
  }

  // 2) Фильтруем defaultRules:
  //    - только те, что есть в activeRuleIds
  //    - и не отключены в state.settings
  return defaultRules.filter(function (rule) {
    // правило не входит ни в один активный шаблон
    if (activeRuleIds.indexOf(rule.id) === -1) return false;

    // если в настройках явно стоит false — считаем правило отключенным
    if (state.settings && state.settings[rule.id] === false) return false;

    // английские правила только при включённой опции
    if ((rule.id === 'english_names' || rule.id === 'english_companies') && !state.enableEnglishProcessing) return false;

    // иначе правило активно
    return true;
  });
}

// Возвращает только те правила, которые явно включены переключателями в Настройках
function getSoftMaskRules() {
  // Always include these rules for hash detection in mixed columns
  var alwaysInclude = ['company_name', 'sibur', 'english_companies', 'russian_names', 'english_names', 'usernames_tech', 'email', 'phone'];
  return defaultRules.filter(function (rule) {
    // English rules: controlled ONLY by enableEnglishProcessing toggle, always active when it's on
    if ((rule.id === 'english_names' || rule.id === 'english_companies') && state.enableEnglishProcessing) return true;
    // If explicitly disabled in settings — NOT included (even if in alwaysInclude)
    if (state.settings && state.settings[rule.id] === false) return false;
    // Explicitly enabled in settings OR always included for hash detection
    var isEnabled = (state.settings && state.settings[rule.id] === true) || alwaysInclude.indexOf(rule.id) !== -1;
    if (!isEnabled) return false;
    if ((rule.id === 'english_names' || rule.id === 'english_companies') && !state.enableEnglishProcessing) return false;
    return true;
  });
}

