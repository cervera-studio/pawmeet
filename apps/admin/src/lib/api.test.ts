import { ApiError, api } from './api';

// -- ApiError --

describe('ApiError', () => {
  it('sets status and statusText properties', () => {
    const error = new ApiError(404, 'Not Found');
    expect(error.status).toBe(404);
    expect(error.statusText).toBe('Not Found');
  });

  it('has a descriptive message', () => {
    const error = new ApiError(500, 'Internal Server Error');
    expect(error.message).toBe('API Error: 500 Internal Server Error');
  });

  it('has name set to ApiError', () => {
    const error = new ApiError(403, 'Forbidden');
    expect(error.name).toBe('ApiError');
  });

  it('is an instance of Error', () => {
    const error = new ApiError(400, 'Bad Request');
    expect(error).toBeInstanceOf(Error);
  });
});

// -- ApiClient (via the exported `api` singleton) --

describe('api client', () => {
  const mockResponseData = { id: 1, name: 'Test Dog' };

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponseData),
        }),
      ),
    );
    // Reset token between tests
    api.setToken(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends GET requests', async () => {
    const result = await api.get('/dogs');
    expect(result).toEqual(mockResponseData);

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    expect(fetchCall[0]).toContain('/dogs');
    expect(fetchCall[1]?.method).toBe('GET');
  });

  it('sends POST requests with a JSON body', async () => {
    const body = { name: 'Buddy', breed: 'Labrador' };
    await api.post('/dogs', body);

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    expect(fetchCall[1]?.method).toBe('POST');
    expect(fetchCall[1]?.body).toBe(JSON.stringify(body));
  });

  it('sends PUT requests', async () => {
    await api.put('/dogs/1', { name: 'Updated' });

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    expect(fetchCall[1]?.method).toBe('PUT');
  });

  it('sends PATCH requests', async () => {
    await api.patch('/dogs/1', { name: 'Patched' });

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    expect(fetchCall[1]?.method).toBe('PATCH');
  });

  it('sends DELETE requests', async () => {
    await api.delete('/dogs/1');

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    expect(fetchCall[1]?.method).toBe('DELETE');
  });

  it('appends query params to the URL', async () => {
    await api.get('/dogs', { params: { page: 2, search: 'labrador' } });

    const url = vi.mocked(fetch).mock.calls[0][0];
    expect(url).toContain('page=2');
    expect(url).toContain('search=labrador');
  });

  it('skips undefined params', async () => {
    await api.get('/dogs', { params: { page: 1, search: undefined } });

    const url = vi.mocked(fetch).mock.calls[0][0];
    expect(url).toContain('page=1');
    expect(url).not.toContain('search');
  });

  it('includes Authorization header when token is set', async () => {
    api.setToken('test-jwt-token');
    await api.get('/dogs');

    const headers = vi.mocked(fetch).mock.calls[0][1]?.headers;
    expect(headers).toHaveProperty('Authorization', 'Bearer test-jwt-token');
  });

  it('does not include Authorization header when token is null', async () => {
    api.setToken(null);
    await api.get('/dogs');

    const headers = vi.mocked(fetch).mock.calls[0][1]?.headers;
    expect(headers).not.toHaveProperty('Authorization');
  });

  it('always sends Content-Type application/json', async () => {
    await api.get('/dogs');

    const headers = vi.mocked(fetch).mock.calls[0][1]?.headers;
    expect(headers).toHaveProperty('Content-Type', 'application/json');
  });

  it('throws ApiError on non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 422,
          statusText: 'Unprocessable Entity',
        }),
      ),
    );

    await expect(api.get('/dogs')).rejects.toThrow(ApiError);
    await expect(api.post('/dogs', {})).rejects.toThrow('API Error: 422 Unprocessable Entity');
  });
});
