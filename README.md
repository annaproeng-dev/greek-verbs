# Greek Verbs A2

Тренажёр греческих глаголов с регистрацией по почте и паролю.

## Локальный запуск

```sh
python3 server.py
```

Откройте http://localhost:8000. Для локального запуска достаточно Python 3.9+; пользователи и сессии сохраняются в `.data/auth.sqlite3`. Не запускайте приложение через `file://` или обычный статический сервер: для регистрации нужен API.

## DigitalOcean production

Live URL: https://greekmaster.com/

`deploy/setup-server.sh` runs as root on Ubuntu after the initial upload. It configures the Python environment, the `greek-verbs` systemd service, Nginx, and a TLS certificate with automatic renewal. The application database is stored outside the code directory at `/var/lib/greek-verbs/auth.sqlite3`; back up this directory.

`./deploy/deploy.sh` uploads code and restarts the service. Password authentication uses `sshpass` when installed, otherwise SSH_ASKPASS. The earlier instructions describing upload-only deployment are superseded by this production setup. Before re-running server setup, review the existing Nginx configuration.


Configuration: `deploy/.env` (ignored by Git), template: `deploy/.env.example`. Preview: `./deploy/deploy.sh --dry-run`. Code uploads preserve remote data and do not transfer local secrets.

## Хранение данных

- База пользователей содержит нормализованную почту и хеш PBKDF2-SHA256 с индивидуальной солью и 600 000 итераций. Пароли в открытом виде не сохраняются.
- Вход сохраняется на 30 дней в HttpOnly SameSite cookie (Secure на Vercel). База хранит только хеш случайного токена; выход отзывает текущую сессию.
- Прогресс, ошибки, награды и сложные глаголы сохраняются на сервере через `/api/auth?action=learning` в PostgreSQL (`DATABASE_URL`). IndexedDB используется только для разового импорта при открытии приложения в старом браузере. Данные других аккаунтов импортируются после входа в соответствующий аккаунт. Гость определяется защищённой HttpOnly cookie. Для локальной разработки без DATABASE_URL доступен SQLite.
- Прогресс аккаунта доступен после входа на других устройствах. Гостевой прогресс привязан к cookie браузера; после её удаления доступ к нему теряется.
- Восстановление пароля использует одноразовую ссылку сроком на 30 минут. После смены пароля все старые сессии завершаются. Для доставки писем на production настройте `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` и `APP_ORIGIN` в окружении systemd-сервиса.

## Проверка API

```sh
python3 -m unittest discover -s tests -v
```

Дополнительные проверки авторизации в браузерном коде (при установленном Node.js):

```sh
node tests/auth_security.test.cjs
```

Аудит безопасности и оставшиеся ограничения: [SECURITY_AUDIT_2026-11-02.md](SECURITY_AUDIT_2026-11-02.md).


## Подготовка к A2

Локальная страница: http://localhost:8000/exam.html. Вход также есть на странице
«Глаголы» и в общем меню. Шесть разделов и тренировочный экзамен без аудирования.
Прогресс, аккаунт и награды Олимпа общие с основным тренажёром. Черновики
сохраняются на сервере для текущего аккаунта. Письмо и речь — самопроверка,
закрытые задания — автоматическая проверка и общие награды.

Дополнительная проверка сценариев в браузере:
`NODE_PATH=<путь к node_modules с playwright> node tests/exam_browser.cjs`.
Тест использует отдельный временный профиль браузера и локальный сервер.

## Юридические документы и приватность

`legal/config.json` — реквизиты и сроки; `legal/*.html` — краткие RU/EN исходники документов.
Публичные страницы и хеши генерируются командой `python3 scripts/build_legal.py`;
`--check` проверяет актуальность, `--release --check` дополнительно проверяет обязательные фактические сведения.
Сервер проверяет версии при регистрации и хранит снимки принятой редакции.
Подробности и вопросы перед публикацией: [LEGAL_2026_RU.md](LEGAL_2026_RU.md).

Состав HTTP и загрузки определён в `public-files.json`; `scripts/release_files.py` формирует точный список файлов для rsync.
Просроченные сессии, reset-токены и неактивные гостевые записи удаляет `scripts/maintain_auth.py`.
Сервер выполняет очистку при запуске и каждый час, используя то же подключение к базе, что и приложение; в serverless-режиме очистка выполняется на запросах. Для отдельного запуска CLI требуется то же окружение DATABASE_URL.

Внутренние исходники, юридическая конфигурация и исследовательские артефакты через HTTP не публикуются.
