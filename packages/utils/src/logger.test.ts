import { logger } from './logger';

beforeEach(() => {
  logger.setLevel('info');
  logger.onError(() => {
    /* noop */
  });
  vi.restoreAllMocks();
});

describe('logger', () => {
  describe('setLevel / getLevel', () => {
    it('defaults to info', () => {
      expect(logger.getLevel()).toBe('info');
    });

    it('changes the active level', () => {
      logger.setLevel('debug');
      expect(logger.getLevel()).toBe('debug');
    });
  });

  describe('level filtering', () => {
    it('logs warn and error at info level', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        /* noop */
      });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        /* noop */
      });

      logger.warn('tag', 'warning');
      logger.error('tag', 'error');

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });

    it('suppresses debug at info level', () => {
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {
        /* noop */
      });

      logger.debug('tag', 'should not appear');

      expect(debugSpy).not.toHaveBeenCalled();
    });

    it('shows debug when level is debug', () => {
      logger.setLevel('debug');
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {
        /* noop */
      });

      logger.debug('tag', 'visible');

      expect(debugSpy).toHaveBeenCalledWith('[tag]', 'visible');
    });

    it('suppresses everything at silent level', () => {
      logger.setLevel('silent');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        /* noop */
      });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        /* noop */
      });

      logger.warn('tag', 'nope');
      logger.error('tag', 'nope');

      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('only shows error at error level', () => {
      logger.setLevel('error');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        /* noop */
      });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        /* noop */
      });

      logger.warn('tag', 'suppressed');
      logger.error('tag', 'visible');

      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('output format', () => {
    it('prefixes with [tag]', () => {
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {
        /* noop */
      });

      logger.info('MyHook', 'something happened');

      expect(infoSpy).toHaveBeenCalledWith('[MyHook]', 'something happened');
    });

    it('includes data when provided', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        /* noop */
      });

      logger.warn('api', 'request failed', { status: 500 });

      expect(warnSpy).toHaveBeenCalledWith('[api]', 'request failed', { status: 500 });
    });

    it('omits data argument when not provided', () => {
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {
        /* noop */
      });

      logger.info('tag', 'no data');

      expect(infoSpy).toHaveBeenCalledWith('[tag]', 'no data');
    });
  });

  describe('onError hook', () => {
    it('calls hook on logger.error', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {
        /* noop */
      });
      const hook = vi.fn();
      logger.onError(hook);

      logger.error('tag', 'boom', { detail: 42 });

      expect(hook).toHaveBeenCalledWith('tag', 'boom', { detail: 42 });
    });

    it('calls hook on logger.warn', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {
        /* noop */
      });
      const hook = vi.fn();
      logger.onError(hook);

      logger.warn('tag', 'careful');

      expect(hook).toHaveBeenCalledWith('tag', 'careful', undefined);
    });

    it('still calls hook even when log level suppresses output', () => {
      logger.setLevel('silent');
      const hook = vi.fn();
      logger.onError(hook);

      logger.error('tag', 'suppressed but hooked');

      expect(hook).toHaveBeenCalledTimes(1);
    });

    it('does not call hook on info or debug', () => {
      logger.setLevel('debug');
      vi.spyOn(console, 'debug').mockImplementation(() => {
        /* noop */
      });
      vi.spyOn(console, 'info').mockImplementation(() => {
        /* noop */
      });
      const hook = vi.fn();
      logger.onError(hook);

      logger.debug('tag', 'debug msg');
      logger.info('tag', 'info msg');

      expect(hook).not.toHaveBeenCalled();
    });
  });
});
