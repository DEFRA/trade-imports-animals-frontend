# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: animals/e2e/features/promoted-lifecycle.spec.ts >> Notification lifecycle >> creates, submits, amends, cancels, copies and soft-deletes a notification; fulfilment view reflects each transition; copy no longer dedupes
- Location: tests/animals/e2e/features/promoted-lifecycle.spec.ts:6:3

# Error details

```
RestClientError: POST http://localhost:8085/notifications/GBN-AG-26-KK1YGD/submit responded 400: {"timestamp":"2026-10-08T14:48:13.830+00:00","status":400,"error":"Bad Request","path":"/notifications/GBN-AG-26-KK1YGD/submit"}
```

# Test source

```ts
  1  | import type { APIRequestContext, APIResponse } from '@playwright/test';
  2  | 
  3  | export class RestClientError extends Error {
  4  |   constructor(
  5  |     readonly status: number,
  6  |     readonly method: string,
  7  |     readonly url: string,
  8  |     readonly responseBody: string,
  9  |   ) {
  10 |     super(`${method} ${url} responded ${status}: ${responseBody}`);
  11 |     this.name = 'RestClientError';
  12 |   }
  13 | }
  14 | 
  15 | export class RestClientTransportError extends Error {
  16 |   constructor(
  17 |     readonly method: string,
  18 |     readonly url: string,
  19 |     reason: string,
  20 |   ) {
  21 |     super(`${method} ${url} got no response: ${reason}`);
  22 |     this.name = 'RestClientTransportError';
  23 |   }
  24 | }
  25 | 
  26 | // Playwright's call log lists every request header, x-api-key included.
  27 | const withoutCallLog = (error: unknown): string => {
  28 |   if (error instanceof Error) return error.message.split('\n')[0];
  29 |   return typeof error === 'string' ? error : 'unknown error';
  30 | };
  31 | 
  32 | export class RestClient {
  33 |   constructor(
  34 |     private readonly baseUrl: string,
  35 |     private readonly request: APIRequestContext,
  36 |     private readonly apiKey?: string,
  37 |   ) {}
  38 | 
  39 |   async get<T>(path: string, headers?: Record<string, string>): Promise<T> {
  40 |     return this.send<T>('GET', path, undefined, headers);
  41 |   }
  42 | 
  43 |   async post<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
  44 |     return this.send<T>('POST', path, body, headers);
  45 |   }
  46 | 
  47 |   async put<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  48 |     return this.send<T>('PUT', path, body, headers);
  49 |   }
  50 | 
  51 |   async delete<T = void>(path: string, headers?: Record<string, string>): Promise<T> {
  52 |     return this.send<T>('DELETE', path, undefined, headers);
  53 |   }
  54 | 
  55 |   private async send<T>(method: string, path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
  56 |     const url = `${this.baseUrl}${path}`;
  57 |     const { response, responseBody } = await this.exchange(method, url, body, headers);
  58 | 
  59 |     if (!response.ok()) {
> 60 |       throw new RestClientError(response.status(), method, url, responseBody);
     |             ^ RestClientError: POST http://localhost:8085/notifications/GBN-AG-26-KK1YGD/submit responded 400: {"timestamp":"2026-10-08T14:48:13.830+00:00","status":400,"error":"Bad Request","path":"/notifications/GBN-AG-26-KK1YGD/submit"}
  61 |     }
  62 | 
  63 |     return (responseBody ? JSON.parse(responseBody) : undefined) as T;
  64 |   }
  65 | 
  66 |   private async exchange(
  67 |     method: string,
  68 |     url: string,
  69 |     body: unknown,
  70 |     headers: Record<string, string> | undefined,
  71 |   ): Promise<{ response: APIResponse; responseBody: string }> {
  72 |     try {
  73 |       const response = await this.request.fetch(url, {
  74 |         method,
  75 |         headers: {
  76 |           'content-type': 'application/json',
  77 |           ...(this.apiKey ? { 'x-api-key': this.apiKey } : {}),
  78 |           ...headers,
  79 |         },
  80 |         data: body,
  81 |       });
  82 |       return { response, responseBody: await response.text() };
  83 |     } catch (error) {
  84 |       throw new RestClientTransportError(method, url, withoutCallLog(error));
  85 |     }
  86 |   }
  87 | }
  88 | 
```