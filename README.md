# 🛡️ Маскирование документов корпоративных систем

Веб-приложение для обфускации чувствительных данных в корпоративных файлах.  
Работает полностью в браузере — данные **не покидают устройство**.

---

## ✅ Поддерживаемые форматы

| Группа | Форматы |
|---|---|
| Текстовые документы | TXT, LOG, CSV, TSV |
| Данные/Конфиг | JSON, XML, YAML/YML, INI, CFG, CONF |
| Office | DOCX, XLSX |
| PDF | PDF (метаданные + текст в незашифрованных) |
| Базы данных | SQL |
| Системные логи | Syslog, Apache access/error log, Nginx |
| Аудит | SAP CRM/ERP, Siebel CRM, Documentum ECM |

---

## 📦 Развёртывание

### Вариант 1 — Открыть локально (самый простой)

```bash
# Скачайте index.html
# Откройте в браузере (двойной клик или)
open index.html          # macOS
start index.html         # Windows
xdg-open index.html     # Linux
```

> ⚠️ При первом открытии DOCX/XLSX браузер загрузит библиотеку JSZip (~50 KB) с CDN.
> Для работы без интернета — см. Вариант 3.

---

### Вариант 2 — Nginx / Apache (production-ready)

**Nginx:**
```bash
# 1. Скопируйте файл на сервер
scp index.html user@server:/var/www/masker/

# 2. Конфиг /etc/nginx/sites-available/masker
server {
    listen 80;
    server_name masker.internal.company.ru;
    root /var/www/masker;
    index index.html;

    # Безопасность
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Content-Security-Policy "default-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com";

    location / {
        try_files $uri $uri/ =404;
    }
}

# 3. Активируйте
ln -s /etc/nginx/sites-available/masker /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

**Apache:**
```bash
cp index.html /var/www/html/masker/
# Создайте /var/www/html/masker/.htaccess:
Options -Indexes
Header set X-Frame-Options DENY
```

---

### Вариант 3 — Полностью автономный (offline bundle)

Для работы без CDN встройте JSZip в HTML:

```bash
# Скачайте JSZip
curl -o jszip.min.js \
  https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js

# Вставьте содержимое jszip.min.js в index.html перед </body>:
# <script>/* ВСТАВЬТЕ СЮДА СОДЕРЖИМОЕ jszip.min.js */</script>

# Затем в loadJSZip() замените загрузку с CDN на:
# if (window.JSZip) return window.JSZip;
# return window.JSZip; // уже встроен
```

Или используйте скрипт:
```bash
# bundle.sh
JSZIP=$(curl -s https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js)
sed "s|// JSZIP_PLACEHOLDER|${JSZIP}|" index.html > index.bundle.html
echo "✅ Создан index.bundle.html — полностью автономный"
```

---

### Вариант 4 — Docker

```dockerfile
# Dockerfile
FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
EXPOSE 80
```

```bash
docker build -t data-masker .
docker run -d -p 8080:80 --name masker data-masker
# Откройте http://localhost:8080
```

Docker Compose:
```yaml
# docker-compose.yml
version: '3.8'
services:
  masker:
    image: nginx:alpine
    volumes:
      - ./index.html:/usr/share/nginx/html/index.html:ro
    ports:
      - "8080:80"
    restart: unless-stopped
```

```bash
docker compose up -d
```

---

### Вариант 5 — Node.js (http-server)

```bash
npm install -g http-server
http-server . -p 3000 -c-1
# Откройте http://localhost:3000
```

---

## 🔒 Безопасность

- **Данные не покидают браузер** — вся обработка локальная (JavaScript)
- Нет backend, нет передачи файлов на сервер
- Рекомендуется развёртывать во внутренней сети (intranet)
- Добавьте HTTP Basic Auth на уровне Nginx при необходимости

---

## 📋 Категории маскирования

| Категория | Что маскируется |
|---|---|
| Персональные данные | Email, телефон, ФИО, паспорт, СНИЛС, адрес |
| Коммерческая информация | ИНН, ОГРН, БИК, расчётные счета |
| Технические данные | IP, MAC, пароли, API ключи, JWT токены |

## 🏷️ Шаблоны систем

| Шаблон | Поля |
|---|---|
| Универсальный | 25+ паттернов для ПДн и техданных |
| SAP CRM/ERP | GUID, BNAME, KUNNR, TCODE, MANDT |
| Siebel CRM | ROW_ID, BusObject |
| Documentum | r_object_id, workflow_id |
| Веб-сервер | IP, User-Agent, Cookie, Referer |
| База данных | Password, UID, DSN |
| Пользовательский | Произвольные regex |

---

## ⚙️ Требования

- Современный браузер: Chrome 90+, Firefox 88+, Edge 90+, Safari 14+
- Интернет нужен только для загрузки JSZip при обработке DOCX/XLSX
- Для полностью offline — см. Вариант 3

---

*Версия 2.1 · Разработано для корпоративного использования*
