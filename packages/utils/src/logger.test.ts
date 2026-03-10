import { logger } from './logger';

beforeEach(() => {
  logger.setLevel('info');
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
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logger.warn('tag', 'warning');
      logger.error('tag', 'error');

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });

    it('suppresses debug at info level', () => {
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      logger.debug('tag', 'should not appear');

      expect(debugSpy).not.toHaveBeenCalled();
    });

    it('shows debug when level is debug', () => {
      logger.setLevel('debug');
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      logger.debug('tag', 'visible');

      expect(debugSpy).toHaveBeenCalledWith('[tag]', 'visible');
    });

    it('suppresses everything at silent level', () => {
      logger.setLevel('silent');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logger.warn('tag', 'nope');
      logger.error('tag', 'nope');

      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('only shows error at error level', () => {
      logger.setLevel('error');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logger.warn('tag', 'suppressed');
      logger.error('tag', 'visible');

      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('output format', () => {
    it('prefixes with [tag]', () => {
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      logger.info('MyHook', 'something happened');

      expect(infoSpy).toHaveBeenCalledWith('[MyHook]', 'something happened');
    });

    it('includes data when provided', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      logger.warn('api', 'request failed', { status: 500 });

      expect(warnSpy).toHaveBeenCalledWith('[api]', 'request failed', { status: 500 });
    });

    it('omits data argument when not provided', () => {
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      logger.info('tag', 'no data');

      expect(infoSpy).toHaveBeenCalledWith('[tag]', 'no data');
    });
  });
});
