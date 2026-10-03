# «Мой баланс» Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Пользователь поручил перейти к реализации; выполняем в этой сессии.

**Goal:** Рабочее персональное веб-приложение для обзоров восьми сфер.
**Architecture:** Статическая страница с тремя представлениями. core.js отвечает за модель, проверки, сравнение и хранилище; app.js — за интерфейс и форму.
**Tech Stack:** HTML, CSS, JavaScript, localStorage, без зависимостей.
**Spec:** docs/superpowers/specs/2026-10-02-my-balance-design.md

## Global Constraints
- Точные восемь сфер из спецификации.
- Оценки 1–10; 1–2 общих действия на период.
- Без backend, базы данных и радарного графика.
- Запуск прямым открытием index.html, без сборки и установки пакетов.

## Review Focus
- Неправильный JSON или недоступное хранилище: не перезаписывать данные.
- Обзор задним числом: сравнивать с более ранним обзором.
- Первый обзор: нет вымышленных оценок и изменений.
- HTML в пояснениях: отображать только текст.
- Узкий экран и длинные названия: без горизонтального скролла.

### Task 1: Модель и сохранение
**Files:** core.js, tests/core.test.js, tests/run.html.
**Interfaces:** BalanceCore.SPHERES; validateReview(input, reviews, today); createReview(input, reviews, today); sortReviews(reviews); previousReview(reviews,date); compareReview(review, previous); loadReviews(storage); saveReviews(storage,reviews); setActionDone(reviews,reviewId,actionId,done).
- [x] Написать поведенческие тесты модели, хронологии, ограничений и ошибок хранилища.
- [x] Выполнить тесты до реализации и получить ожидаемые ошибки отсутствующего API.
- [x] Реализовать core.js; выполнить весь набор, 11/11 PASS.

### Task 2: Интерфейс
**Files:** index.html, styles.css, app.js, README.md.
**Interfaces:** Использует BalanceCore из Task 1, обычные defer-скрипты для работы file://.
- [x] Создать главную с честным пустым состоянием и карточками реального последнего обзора.
- [x] Создать форму с выбором оценок, пояснениями, сравнением, выводом и действиями.
- [x] Создать историю и просмотр; включить сохранение выполнения действий.
- [x] Проверить полный сценарий в браузере: два обзора, сравнение, действия, перезагрузка, история, мобильный размер.
- [x] Добавить инструкции запуска; выполнить итоговую проверку модели и интерфейса.
