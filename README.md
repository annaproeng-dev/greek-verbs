# Greek Verbs A2

Тренажёр греческих глаголов с регистрацией по почте и паролю.

## Локальный запуск

```sh
python3 server.py
```

Откройте http://localhost:8000. Для локального запуска достаточно Python 3.9+; пользователи и сессии сохраняются в `.data/auth.sqlite3`. Не запускайте приложение через `file://` или обычный статический сервер: для регистрации нужен API.

## DigitalOcean production

Live URL: https://greek-verbs.161.35.40.15.sslip.io/

`deploy/setup-server.sh` runs as root on Ubuntu after the initial upload. It configures the Python environment, the `greek-verbs` systemd service, Nginx, and a TLS certificate with automatic renewal. The application database is stored outside the code directory at `/var/lib/greek-verbs/auth.sqlite3`; back up this directory.

`./deploy/deploy.sh` uploads code and restarts the service. Password authentication uses `sshpass` when installed, otherwise SSH_ASKPASS. The earlier instructions describing upload-only deployment are superseded by this production setup. Before re-running server setup, review the existing Nginx configuration.


Configuration: `deploy/.env` (ignored by Git), template: `deploy/.env.example`. Preview: `./deploy/deploy.sh --dry-run`. Code uploads preserve remote data and do not transfer local secrets.

## Хранение данных

- База пользователей содержит нормализованную почту и хеш PBKDF2-SHA256 с индивидуальной солью и 600 000 итераций. Пароли в открытом виде не сохраняются.
- Вход сохраняется на 30 дней в HttpOnly SameSite cookie (Secure на Vercel). База хранит только хеш случайного токена; выход отзывает текущую сессию.
- Прогресс, ошибки, награды и сложные глаголы сохраняются в IndexedDB `greek-verbs`, отдельно для гостя и каждого аккаунта. При регистрации гостевой прогресс переносится в новый аккаунт; при обычном входе загружается прогресс этого аккаунта. Старый прогресс из localStorage автоматически переносится в IndexedDB.
- Прогресс доступен только в том же браузере на том же домене. Очистка данных сайта удаляет прогресс. Между устройствами прогресс не синхронизируется.
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
сохраняются для текущего аккаунта в том же браузере. Письмо и речь — самопроверка,
закрытые задания — автоматическая проверка и общие награды.

Дополнительная проверка сценариев в браузере:
`NODE_PATH=<путь к node_modules с playwright> node tests/exam_browser.cjs`.
Тест использует отдельный временный профиль браузера и локальный сервер.
