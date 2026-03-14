import { describe, it, expect, vi, afterEach } from 'vitest';
import { logger } from '../src/logger.js';

describe('logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logger.info writes to stderr, not stdout', () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    logger.info('test message');

    expect(stderrSpy).toHaveBeenCalledOnce();
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it('logger.warn writes to stderr, not stdout', () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    logger.warn('test warning');

    expect(stderrSpy).toHaveBeenCalledOnce();
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it('logger.error writes to stderr, not stdout', () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    logger.error('test error');

    expect(stderrSpy).toHaveBeenCalledOnce();
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it('logger.debug writes to stderr, not stdout', () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    logger.debug('test debug');

    expect(stderrSpy).toHaveBeenCalledOnce();
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it('logger.info output includes INFO level prefix', () => {
    let captured = '';
    vi.spyOn(process.stderr, 'write').mockImplementation((data) => {
      captured = String(data);
      return true;
    });

    logger.info('hello world');

    expect(captured).toContain('[INFO]');
    expect(captured).toContain('hello world');
  });

  it('logger.warn output includes WARN level prefix', () => {
    let captured = '';
    vi.spyOn(process.stderr, 'write').mockImplementation((data) => {
      captured = String(data);
      return true;
    });

    logger.warn('watch out');

    expect(captured).toContain('[WARN]');
    expect(captured).toContain('watch out');
  });

  it('logger.error output includes ERROR level prefix', () => {
    let captured = '';
    vi.spyOn(process.stderr, 'write').mockImplementation((data) => {
      captured = String(data);
      return true;
    });

    logger.error('something failed');

    expect(captured).toContain('[ERROR]');
    expect(captured).toContain('something failed');
  });

  it('logger output includes nuvemshop-mcp prefix', () => {
    let captured = '';
    vi.spyOn(process.stderr, 'write').mockImplementation((data) => {
      captured = String(data);
      return true;
    });

    logger.info('test');

    expect(captured).toContain('[nuvemshop-mcp]');
  });
});
