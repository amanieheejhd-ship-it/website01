import {
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../index';
import { CORRELATION_ID_HEADER, REQUEST_ID_HEADER } from '../config/correlation';
import { EVENT_PUBLISHER } from '../ports/event-publisher.port';

describe('DomainError', () => {
  it('is an Error carrying code, message and details', () => {
    const err = new DomainError('X_CODE', 'something broke', [{ field: 'x' }]);
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('X_CODE');
    expect(err.message).toBe('something broke');
    expect(err.name).toBe('DomainError');
    expect(err.details).toEqual([{ field: 'x' }]);
  });

  it('toAppError() projects to a plain transport object', () => {
    const err = new DomainError('X_CODE', 'msg', ['d']);
    expect(err.toAppError()).toEqual({ code: 'X_CODE', message: 'msg', details: ['d'] });
  });

  it('names each subclass after its own constructor', () => {
    expect(new ValidationError('v').name).toBe('ValidationError');
    expect(new NotFoundError('project').name).toBe('NotFoundError');
  });
});

describe('subclass → code mapping', () => {
  it('NotFoundError builds an uppercased <RESOURCE>_NOT_FOUND code', () => {
    const err = new NotFoundError('project');
    expect(err.code).toBe('PROJECT_NOT_FOUND');
    expect(err.message).toBe('project not found');
    expect(err.toAppError().code).toBe('PROJECT_NOT_FOUND');
  });

  it('ValidationError → VALIDATION_ERROR and keeps details', () => {
    const err = new ValidationError('bad input', [{ path: 'slug' }]);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.details).toEqual([{ path: 'slug' }]);
  });

  it('ConflictError → CONFLICT', () => {
    expect(new ConflictError('duplicate').code).toBe('CONFLICT');
  });

  it('UnauthorizedError → UNAUTHORIZED with a default message', () => {
    const err = new UnauthorizedError();
    expect(err.code).toBe('UNAUTHORIZED');
    expect(err.message).toBe('Unauthorized');
    expect(new UnauthorizedError('nope').message).toBe('nope');
  });

  it('ForbiddenError → FORBIDDEN with a default message', () => {
    const err = new ForbiddenError();
    expect(err.code).toBe('FORBIDDEN');
    expect(err.message).toBe('Forbidden');
    expect(new ForbiddenError('denied').message).toBe('denied');
  });
});

describe('shared constants + ports', () => {
  it('exposes correlation header names', () => {
    expect(CORRELATION_ID_HEADER).toBe('x-correlation-id');
    expect(REQUEST_ID_HEADER).toBe('x-request-id');
  });
  it('exposes the EVENT_PUBLISHER DI token as a symbol', () => {
    expect(typeof EVENT_PUBLISHER).toBe('symbol');
  });
});
