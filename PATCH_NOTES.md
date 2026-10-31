# Argus video/API maintenance patch

## Changes

- Video selection now opens a dedicated browser preview, independent of the image workspace.
- Video preview uses a local `blob:` URL. The video is not uploaded to the server and is not automatically sent to the analysis API.
- Video metadata (dimensions, file name and size) is shown after the browser loads metadata.
- Temporary object URLs are revoked when another file is selected or the view is reset.
- Unsupported/empty files and browser codec failures now produce explicit messages.
- The same file can be selected again because file input values are reset after selection.
- The API client now reports network, HTTP, JSON and response-shape errors instead of silently substituting a fabricated local result.
- `/api/health` reports whether a provider key is configured without exposing upstream URLs or model details. This is a configuration check, not a live provider ping.
- Unknown `/api/*` routes return JSON 404 responses; malformed/oversized API request bodies receive JSON errors.
- Production start now uses `tsx server.ts`; `tsx` is a production dependency and Node >=22.12 is declared.
- TypeScript includes Node types; HTML language is set to Russian.

## Scope

This patch addresses ordinary file preview and general server/API diagnostics only. It does not add video-to-AI processing or change biometric identification, age estimation, face matching, person tracking, or detection of minors. The existing `/api/analyze` route is left as-is.

## Verification

- ZIP input passed `unzip -t` before modification.
- TypeScript syntax transpilation passed for `src/ArgusApp.tsx`, `src/services/argusApi.ts` and `server.ts`.
- Full `npm run build` and type-check could not be completed in this environment because `npm install` timed out and dependencies (`vite`, `@types/node`, `vite/client`) were unavailable. Re-run `npm install` and `npm run build` in the project or on Render.

## Fix: «Загрузить видео» открывал выбор фото

- Скрытые `<input type="file">` находились внутри дропзоны с `onClick={() => fileInputRef.current?.click()}`. Программный `videoInput.click()` всплывал до дропзоны, и та сразу открывала выбор фото (`accept="image/*"`). Браузер показывал диалог для фото, видео выбрать было нельзя.
- Инпуты вынесены за пределы дропзоны, у них добавлен `stopPropagation` на `onClick`. Поведение проверено в Chromium: теперь открывается только диалог выбора видео.

## Анализ курения по всему видео

- Новый маршрут `POST /api/analyze-video`: тело запроса — сам видеофайл (без base64), `Content-Type: video/*`, имя в `X-File-Name`.
- Сервер загружает ролик в Gemini Files API, ждёт обработки (`ACTIVE`) и отправляет модели **весь ролик целиком**, без нарезки на кадры. После анализа файл удаляется у провайдера.
- Ответ: `smokingDetected`, `summary`, `events[]` с таймкодами, типом (сигарета, вейп, кальян, дым), описанием и уверенностью. Ответ модели нормализуется: таймкоды, сортировка, проценты 0–100.
- Модуль намеренно не оценивает возраст, пол, внешность и не опознаёт людей.
- UI: в предпросмотре видео есть кнопка «Анализ курения по всему видео». Клик по таймкоду перематывает плеер к эпизоду. При смене файла или сбросе запрос отменяется.
- Настройки: `GEMINI_VIDEO_MODEL` (по умолчанию `GEMINI_MODEL` или `gemini-2.5-flash`), `VIDEO_MAX_MB` (по умолчанию 100). Нужен прямой `GEMINI_API_KEY`: прокси через `GEMINI_BASE_URL` Files API не поддерживают.
- Фото-анализ (`/api/analyze`) и его интерфейс не менялись.
- Новые файлы: `src/server/videoSmokingService.ts`, `src/services/videoApi.ts`, `src/types/videoSmoking.ts`.

## Видео: AnyModel и анимации

- **AnyModel.** Если задан `ANYMODEL_API_KEY` (и нет `GEMINI_API_KEY`) или указан `VIDEO_PROVIDER=anymodel`, видео уходит в `POST {ANYMODEL_BASE_URL}/chat/completions` целиком как `data:video/...;base64`. Сначала пробуется часть `video_url`, при отказе — `file`. Модели перебираются по порядку: `ANYMODEL_VIDEO_MODEL`, `gemini-2.5-flash`, `gemini-4-argon`, `ANYMODEL_MODEL`. При 401/403 перебор сразу останавливается с понятной ошибкой. Лимит для прокси — `VIDEO_INLINE_MAX_MB` (по умолчанию 20 МБ). Другие OpenAI-совместимые провайдеры из `getProviderInfo()` идут тем же путём.
- **UI.** Видео-блок вынесен в `src/components/VideoAnalysisPanel.tsx`: при каждом новом файле компонент монтируется заново, и состояние сбрасывается само.
- **Анимации** (CSS, классы `argus-v-*` в `index.css`, отключаются при `prefers-reduced-motion`): появление панели, HUD-уголки и сканирующая линия с сеткой во время анализа, пульсирующая подсветка рамки, этапы анализа с таймером, бегущая полоса прогресса, блик на кнопке, таймлайн эпизодов с бегущим плейхедом, поочерёдное появление карточек, анимация шкалы уверенности, мерцающее пламя, оранжевая подсветка при найденном курении, подсветка активного эпизода во время воспроизведения, «встряска» при ошибке.
- Фото-часть не менялась.
- Проверено в Chromium на тестовом стенде с заглушкой AnyModel: загрузка → анализ → 2 эпизода → клик по таймкоду перематывает на 00:12, карточка подсвечивается; ошибок в консоли нет.
