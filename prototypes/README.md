# Prototypes

Throwaway, **non-functional** prototype layouts for spiking GDS journeys.

This directory is deliberately **separate from and parallel to** the real
application under [`../src/`](../src). Nothing in here is wired into the live
service:

- It is **not** registered in `src/server/router.js`.
- It has **no** controllers, validation, session or persistence.
- It is **not** part of the webpack build or the Docker image.
- It exists purely to play with page layouts and journey flow using the
  GOV.UK Design System.

> ⚠️ Prototype code only. Do not import anything in here from `src/`, and do
> not import anything here into `src/`. When a layout is ready to become real,
> rebuild it properly inside `src/server/<feature>/` with controllers, routes
> and tests.

## Prototypes

| Folder | Journey |
|--------|---------|
| [`car-insurance/`](car-insurance) | Example car insurance quote journey (spike — EUDPA-249) |
