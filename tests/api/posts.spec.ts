import { test, expect } from '@playwright/test';

/**
 * IMPORTANT CONTEXT ON THE API UNDER TEST
 *
 * JSONPlaceholder is a mock REST API: it validates and echoes requests, but it does NOT
 * persist writes server-side (this is documented behavior, confirmed by manual probing below).
 *   - POST /posts always returns a new resource with id 101 (fake data is never actually saved).
 *   - A GET for that new id 404s, because only ids 1-100 exist in the fixed seed dataset.
 *   - PATCH/PUT echo back what you sent, but a follow-up GET returns the ORIGINAL seed data.
 *   - DELETE always returns 200 with an empty body, regardless of whether the id exists.
 *
 * Given that, "verify the change was applied via a fresh GET" cannot show real persistence here.
 * The tests below validate what this API actually guarantees at each step (status codes and the
 * shape/content of each individual response), and explicitly assert + document the simulated
 * (non-persistent) behavior rather than silently asserting something that would give false
 * confidence about a real backend.
 */

const NEW_POST = {
  title: 'QA automation coverage post',
  body: 'This post was created by an automated Playwright API test.',
  userId: 1,
};

test.describe('Posts API - full CRUD lifecycle (same id throughout)', () => {
  test('create -> read -> update -> verify update -> delete -> verify deletion', async ({ request }) => {
    let createdId: number;

    await test.step('CREATE - POST a new post', async () => {
      const response = await request.post('/posts', { data: NEW_POST });

      expect(response.status()).toBe(201);
      const created = await response.json();

      // The response should echo back exactly what we sent, plus a server-assigned id.
      expect(created).toMatchObject(NEW_POST);
      expect(created.id).toBeGreaterThan(0);

      createdId = created.id;
    });

    await test.step('READ - GET the post just created', async () => {
      const response = await request.get(`/posts/${createdId}`);

      // JSONPlaceholder never actually stores the created resource, so the id it just
      // handed back does not exist in its dataset. We assert that documented behavior
      // explicitly instead of assuming the naive "GET returns what I created" outcome.
      expect(response.status()).toBe(404);
    });

    await test.step('UPDATE - PATCH the post to modify the title', async () => {
      const response = await request.patch(`/posts/${createdId}`, {
        data: { title: 'QA automation coverage post (updated)' },
      });

      expect(response.status()).toBe(200);
      const updated = await response.json();
      expect(updated.title).toBe('QA automation coverage post (updated)');
    });

    await test.step('VERIFY UPDATE - GET the post again', async () => {
      const response = await request.get(`/posts/${createdId}`);

      // Consistent with the READ step: still 404, because the update was never persisted.
      // (Against a real backend this step would instead assert the updated title changed
      // and every other field, e.g. body/userId, stayed equal to their original values.)
      expect(response.status()).toBe(404);
    });

    await test.step('DELETE - DELETE the post', async () => {
      const response = await request.delete(`/posts/${createdId}`);

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toEqual({});
    });

    await test.step('VERIFY DELETION - GET the deleted post', async () => {
      const response = await request.get(`/posts/${createdId}`);
      expect(response.status()).toBe(404);
    });
  });
});

test.describe('Posts API - update semantics against an existing resource', () => {
  // Complements the lifecycle test above: PATCH-ing a post that genuinely exists in the
  // seed data lets us verify partial-update semantics (only the targeted field changes in
  // the immediate response, everything else is left untouched) without the 404 noise that
  // comes from operating on a freshly (and fakely) created id.
  test('PATCH only changes the targeted field in the response, other fields are unchanged', async ({ request }) => {
    const original = await (await request.get('/posts/2')).json();

    const response = await request.patch('/posts/2', {
      data: { title: 'a single updated word' },
    });

    expect(response.status()).toBe(200);
    const updated = await response.json();

    expect(updated.title).toBe('a single updated word');
    expect(updated.body).toBe(original.body);
    expect(updated.userId).toBe(original.userId);
    expect(updated.id).toBe(original.id);
  });
});

test.describe('Posts API - supporting validations', () => {
  test('GET /posts/:id returns the expected schema for an existing post', async ({ request }) => {
    const response = await request.get('/posts/1');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');

    const post = await response.json();
    expect(post).toEqual(
      expect.objectContaining({
        id: 1,
        userId: expect.any(Number),
        title: expect.any(String),
        body: expect.any(String),
      }),
    );
  });

  test('GET /posts/:id returns 404 for an id that does not exist', async ({ request }) => {
    const response = await request.get('/posts/999999');
    expect(response.status()).toBe(404);
  });
});
