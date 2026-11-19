# release-please для монорепо call-calendar

Исследование к issue #12. Дата: 2026-11-19. Состояние репозитория взято с ветки `Call-calendar` (коммит `bfeb1f8`). На `main` пока лежат только README и `hexlet-check.yml`.

## Коротко

- Делать **один релиз на всё приложение**: один компонент `"."`, тег `v0.1.0`, один `CHANGELOG.md` в корне.
- Взять `release-type: node`. Версия хранится в корневом `package.json`.
- Использовать manifest-режим: `release-please-config.json` и `.release-please-manifest.json` в корне.
- Action: `googleapis/release-please-action@v5`, запускать на push в `main`. Нужны права `contents: write` и `pull-requests: write` (README добавляет ещё `issues: write`). Нужен токен (с PAT запускается CI на релизном PR) и разрешение Actions создавать PR.
- Сначала делать версии `0.x` (`initial-version: 0.1.0`, `bump-minor-pre-major: true`). Если начальную версию не задать, первым релизом будет `1.0.0`.
- hk проверяет только локальные коммиты. Release-please читает историю `main`, поэтому при squash-merge заголовок PR тоже должен быть в формате Conventional Commits.
- Docker-образ пока не привязывать к релизам. Хекслет собирает образ сам по `Dockerfile`. Публикацию в GHCR с тегом версии можно добавить позже: шаг с `if: release_created`.

## 1. Один релиз или по пакету

Рекомендация: **один релиз**.

Почему:

- Все три пакета (`contract`, `backend`, `frontend`) имеют `"private": true` и в npm не публикуются. Пользователю поставляется один артефакт: Docker-образ, где бекенд отдаёт API и собранный фронтенд (`Dockerfile`, AGENTS.md).
- Пакеты жёстко связаны. Контракт генерирует типы бекенда и SDK фронтенда (`mise run gen`), поэтому отдельная версия `contract@1.2.0` при `frontend@0.4.0` ничего не сообщает.
- Компонент `"."` означает, что release-please создаёт релиз при любом изменении в кодовой базе. Изменения в `backend/`, `frontend/` и `contract/` попадут в один changelog ([manifest-releaser.md, раздел про root package](https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md)).
- Режим по пакетам понадобится, только если какой-то пакет начнут публиковать отдельно (например, SDK в npm). Тогда добавляются пути в `packages` и плагин `node-workspace` или `linked-versions` ([manifest-releaser.md, раздел Plugins](https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md)).

## 2. release-type

`node`. Стратегия `node` обновляет `package.json` (`version`), `CHANGELOG.md`, а также `package-lock.json` и `npm-shrinkwrap.json`, если они есть ([src/strategies/node.ts](https://github.com/googleapis/release-please/blob/main/src/strategies/node.ts)).

- `pnpm-lock.yaml` стратегия **не трогает**. Для этого репозитория это не проблема: в pnpm-lock для importer-а записаны только зависимости, без собственной версии пакета. Поэтому `pnpm install --frozen-lockfile` после релиза не сломается.
- В корневом `package.json` сейчас нет поля `version`. Updater просто записывает `parsed.version = …` ([src/updaters/node/package-json.ts](https://github.com/googleapis/release-please/blob/main/src/updaters/node/package-json.ts)), но для ясности лучше сразу добавить `"version": "0.0.0"`.
- Имя компонента берётся из `name` в `package.json` (`call-calendar`). По умолчанию оно попадает в тег: `call-calendar-v0.1.0`. Чтобы тег был просто `v0.1.0`, нужен `include-component-in-tag: false` ([schemas/config.json](https://github.com/googleapis/release-please/blob/main/schemas/config.json)).
- Альтернатива: `simple`, где версия хранится в файле `version.txt`. Но `node` удобнее: версия лежит в `package.json`, бекенд при желании может прочитать её оттуда.

## 3. Файлы конфигурации

`release-please-config.json`:

```json
{
  "$schema": "https://raw.githubusercontent.com/googleapis/release-please/main/schemas/config.json",
  "release-type": "node",
  "include-component-in-tag": false,
  "bump-minor-pre-major": true,
  "bump-patch-for-minor-pre-major": false,
  "initial-version": "0.1.0",
  "changelog-sections": [
    { "type": "feat", "section": "Features" },
    { "type": "fix", "section": "Bug Fixes" },
    { "type": "perf", "section": "Performance Improvements" },
    { "type": "docs", "section": "Documentation", "hidden": true },
    { "type": "chore", "section": "Miscellaneous", "hidden": true }
  ],
  "packages": {
    ".": {
      "exclude-paths": [".claude", "docs/research"]
    }
  }
}
```

`.release-please-manifest.json` (до первого релиза):

```json
{
  ".": "0.0.0"
}
```

Пояснения:

- Оба файла должны лежать на вершине целевой ветки (`main`). Манифест может быть пустым `{}` ([manifest-releaser.md](https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md)).
- `bump-minor-pre-major`: пока версия ниже 1.0.0, breaking change поднимает minor, а не major. `bump-patch-for-minor-pre-major`: `feat` поднимает patch. Оставляем `false`, чтобы `feat` давал minor.
- `exclude-paths` убирает из changelog коммиты, которые затрагивают только указанные пути. Например, обновления скиллов в `.claude/`. Это по желанию.
- `changelog-sections` можно не задавать, по умолчанию будут похожие секции. Пример показывает, как скрыть `docs` и `chore`.

## 4. GitHub Action

`.github/workflows/release-please.yml`:

```yaml
name: release-please

on:
  push:
    branches:
      - main

permissions:
  contents: write
  issues: write
  pull-requests: write

jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v5
        id: release
        with:
          token: ${{ secrets.RELEASE_PLEASE_TOKEN }}
          # release-type НЕ указываем: тогда action читает release-please-config.json и манифест
```

- Текущая major-версия: **v5** (v5.0.0, 22.04.2026, помечена Latest). Единственный breaking change относительно v4.4.1: action работает на Node 24. Внутри release-please 17.6.0 ([releases](https://github.com/googleapis/release-please-action/releases)). README на теге v5.0.0 в примерах всё ещё пишет `@v4`, но входы и выходы те же.
- Если указать `release-type` во входах action, конфигурация упрощается и дальнейшая настройка становится недоступна. Для manifest-режима вход не указывают ([README](https://github.com/googleapis/release-please-action/blob/main/README.md)). Пути по умолчанию: `config-file: release-please-config.json`, `manifest-file: .release-please-manifest.json`.
- Выходы для корневого компонента: `release_created`, `tag_name`, `version`. Общие выходы: `releases_created`, `prs_created`, `paths_released`.
- **Токен.** По умолчанию используется `GITHUB_TOKEN`. Но события, которые он создаёт, не запускают другие workflow. Значит, на релизном PR не пойдёт `ci.yml`, а на теге не запустится `hexlet-check.yml`. Чтобы CI работал на релизном PR, README советует PAT в секрете. Здесь это fine-grained PAT с правами Contents RW и Pull requests RW на этот репозиторий ([README](https://github.com/googleapis/release-please-action/blob/main/README.md)).
- Ещё нужно включить Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests", если PR создаётся через `GITHUB_TOKEN`.

## 5. Conventional Commits и hk

- Release-please разбирает Conventional Commits из истории целевой ветки. `feat` даёт minor (до 1.0.0), `fix` даёт patch, `!` или `BREAKING CHANGE:` дают major (до 1.0.0 при `bump-minor-pre-major` это minor). Конкретную версию можно задать футером `Release-As: x.y.z` ([src/strategies/base.ts](https://github.com/googleapis/release-please/blob/main/src/strategies/base.ts), обработка `RELEASE AS`).
- `hk.pkl` проверяет сообщения хуком `commit-msg` (`Builtins.check_conventional_commit`), но только локально. Squash-merge на GitHub создаёт коммит из **заголовка PR**, и hk этот коммит не видит. Варианты: писать заголовки PR в формате Conventional Commits, мержить rebase/merge-коммитом, сохраняя исходные коммиты, или добавить проверку заголовка PR. По правилам проекта такую проверку нужно встраивать в `mise run check`, но заголовок PR туда не попадает, так что это отдельный вопрос.
- Release-please называет свой PR `chore(main): release 0.1.0`, и это валидный Conventional Commit. Мерж релизного PR создаёт тег и GitHub Release (метка PR меняется с `autorelease: pending` на `autorelease: tagged`, [src/manifest.ts](https://github.com/googleapis/release-please/blob/main/src/manifest.ts)).
- Коммиты на `main` до внедрения (`Add README.md`, `Add hexlet-check.yml`) не в формате Conventional Commits. Release-please их пропустит. Это не ошибка, но в первый changelog они не попадут.

## 6. Docker-образ и релизы

- Хекслет собирает образ сам по `Dockerfile` в корне (AGENTS.md). Своего registry в проекте нет. Привязывать что-то к релизу сейчас **не нужно**.
- Если понадобится публиковать образ, добавьте в тот же job шаги с условием `if: ${{ steps.release.outputs.release_created }}`. Это паттерн из README ("publication only occurs when a new release is created"). Шаги: `docker/login-action` в GHCR, затем `docker/build-push-action` с тегами `ghcr.io/<owner>/call-calendar:${{ steps.release.outputs.version }}` и `:latest`, плюс `packages: write` в permissions. Делать это в том же job надёжнее, чем отдельным workflow `on: release`: релиз, созданный через `GITHUB_TOKEN`, не запускает другие workflow.
- Версию приложения можно передать в образ как `ARG`/`ENV` (например, `APP_VERSION`) и отдавать в `/api/health`, но это отдельная задача.

## 7. Подводные камни

1. **Первый релиз без `initial-version` будет 1.0.0.** Если тега для версии из манифеста нет, `latestRelease` пуст и вызывается `initialReleaseVersion()`. Без `initial-version` он возвращает `1.0.0` ([src/strategies/base.ts](https://github.com/googleapis/release-please/blob/main/src/strategies/base.ts)).
2. **Bootstrap.** Без тегов release-please соберёт в первый changelog всю историю. Чтобы обрезать её, задайте `bootstrap-sha` на верхнем уровне конфига. Параметр учитывается только до первого релизного PR. Не путать с `last-release-sha`: тот действует всегда, и его нужно удалять ([manifest-releaser.md](https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md)). CLI `release-please bootstrap` может сам открыть PR с конфигом и манифестом, но проще закоммитить два файла вручную.
3. **Ветка.** Работа сейчас идёт в `Call-calendar`, а `main` почти пуст. Release-please смотрит в `main` (или в `target-branch`). Пока код не влит в `main`, релизы не появятся.
4. **Версии пакетов workspace.** У `frontend` есть `"version": "0.0.0"`, у `backend` и `contract` поля нет. В режиме одного компонента их не трогают. Поскольку пакеты private, это ни на что не влияет. Не подключайте `node-workspace` без отдельных пакетов в `packages`: плагин работает только с компонентами из конфига.
5. **Private-пакеты.** Release-please ничего не публикует в npm, а `private: true` ему не мешает.
6. **CI на релизном PR** не запускается с `GITHUB_TOKEN` (см. раздел 4). Нужен PAT или согласие на то, что релизный PR мержится без зелёной проверки. Он меняет только `package.json`, `CHANGELOG.md` и манифест.
7. **`hexlet-check.yml`** реагирует на push тегов. Тег, созданный через `GITHUB_TOKEN`, его не запустит, а созданный через PAT запустит. Оба варианта допустимы.

## Источники

- release-please-action README: https://github.com/googleapis/release-please-action/blob/main/README.md
- release-please-action releases: https://github.com/googleapis/release-please-action/releases
- Manifest releaser: https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md
- Схема конфигурации: https://github.com/googleapis/release-please/blob/main/schemas/config.json
- Стратегия node: https://github.com/googleapis/release-please/blob/main/src/strategies/node.ts
- Базовая стратегия (начальная версия, Release-As): https://github.com/googleapis/release-please/blob/main/src/strategies/base.ts
- Updater для package.json: https://github.com/googleapis/release-please/blob/main/src/updaters/node/package-json.ts
- Файлы репозитория (ветка `Call-calendar`): `package.json`, `pnpm-workspace.yaml`, `*/package.json`, `mise.toml`, `hk.pkl`, `.github/workflows/ci.yml`, `.github/workflows/hexlet-check.yml`, `Dockerfile`, `AGENTS.md`.
