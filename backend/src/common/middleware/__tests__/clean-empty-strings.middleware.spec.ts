import { CleanEmptyStringsMiddleware } from '../clean-empty-strings.middleware';
import { Request, Response } from 'express';

describe('CleanEmptyStringsMiddleware', () => {
  let middleware: CleanEmptyStringsMiddleware;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFn: jest.Mock;

  beforeEach(() => {
    middleware = new CleanEmptyStringsMiddleware();
    nextFn = jest.fn();
  });

  describe('use()', () => {
    it('should call next when no body is provided', () => {
      mockReq = {};
      mockRes = {};

      middleware.use(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should call next when body is null', () => {
      mockReq = { body: null };
      mockRes = {};

      middleware.use(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should call next when body is not an object', () => {
      mockReq = { body: 'string' };
      mockRes = {};

      middleware.use(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should call next when body is an empty object', () => {
      mockReq = { body: {} };
      mockRes = {};

      middleware.use(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should clean empty strings in body and call next', () => {
      mockReq = {
        body: {
          name: '  ',
          email: 'test@example.com',
        },
      };
      mockRes = {};

      middleware.use(mockReq as Request, mockRes as Response, nextFn);

      expect(mockReq.body.name).toBeUndefined();
      expect(mockReq.body.email).toBe('test@example.com');
      expect(nextFn).toHaveBeenCalled();
    });

    it('should convert whitespace-only strings to undefined', () => {
      mockReq = {
        body: {
          name: '   ',
          description: '\t\n',
          value: '  \t  ',
        },
      };
      mockRes = {};

      middleware.use(mockReq as Request, mockRes as Response, nextFn);

      expect(mockReq.body.name).toBeUndefined();
      expect(mockReq.body.description).toBeUndefined();
      expect(mockReq.body.value).toBeUndefined();
      expect(nextFn).toHaveBeenCalled();
    });

    it('should preserve non-empty strings', () => {
      mockReq = {
        body: {
          name: 'John',
          email: 'john@example.com',
          note: 'Some note',
        },
      };
      mockRes = {};

      middleware.use(mockReq as Request, mockRes as Response, nextFn);

      expect(mockReq.body.name).toBe('John');
      expect(mockReq.body.email).toBe('john@example.com');
      expect(mockReq.body.note).toBe('Some note');
      expect(nextFn).toHaveBeenCalled();
    });

    it('should preserve strings with leading/trailing whitespace and content', () => {
      mockReq = {
        body: {
          name: '  John  ',
          email: '\ttest@example.com\n',
        },
      };
      mockRes = {};

      middleware.use(mockReq as Request, mockRes as Response, nextFn);

      expect(mockReq.body.name).toBe('  John  ');
      expect(mockReq.body.email).toBe('\ttest@example.com\n');
      expect(nextFn).toHaveBeenCalled();
    });

    it('should recursively clean nested objects', () => {
      mockReq = {
        body: {
          user: {
            name: 'John',
            address: {
              street: '',
              city: 'New York',
              zip: '   ',
            },
          },
        },
      };
      mockRes = {};

      middleware.use(mockReq as Request, mockRes as Response, nextFn);

      expect(mockReq.body.user.name).toBe('John');
      expect(mockReq.body.user.address.street).toBeUndefined();
      expect(mockReq.body.user.address.city).toBe('New York');
      expect(mockReq.body.user.address.zip).toBeUndefined();
      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle multiple levels of nested objects', () => {
      mockReq = {
        body: {
          level1: {
            level2: {
              level3: {
                name: '  ',
                value: 'test',
              },
            },
          },
        },
      };
      mockRes = {};

      middleware.use(mockReq as Request, mockRes as Response, nextFn);

      expect(mockReq.body.level1.level2.level3.name).toBeUndefined();
      expect(mockReq.body.level1.level2.level3.value).toBe('test');
      expect(nextFn).toHaveBeenCalled();
    });

    it('should not process arrays recursively', () => {
      mockReq = {
        body: {
          items: ['  ', 'value', '   '],
          nested: {
            tags: ['', 'tag1'],
          },
        },
      };
      mockRes = {};

      middleware.use(mockReq as Request, mockRes as Response, nextFn);

      // Arrays should not be modified
      expect(mockReq.body.items).toEqual(['  ', 'value', '   ']);
      expect(mockReq.body.nested.tags).toEqual(['', 'tag1']);
      expect(nextFn).toHaveBeenCalled();
    });

    it('should skip null values in objects', () => {
      mockReq = {
        body: {
          name: 'John',
          middleName: null,
          lastName: '  ',
        },
      };
      mockRes = {};

      middleware.use(mockReq as Request, mockRes as Response, nextFn);

      expect(mockReq.body.name).toBe('John');
      expect(mockReq.body.middleName).toBeNull();
      expect(mockReq.body.lastName).toBeUndefined();
      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle objects with numeric values', () => {
      mockReq = {
        body: {
          name: '  ',
          age: 30,
          salary: 0,
          height: null,
        },
      };
      mockRes = {};

      middleware.use(mockReq as Request, mockRes as Response, nextFn);

      expect(mockReq.body.name).toBeUndefined();
      expect(mockReq.body.age).toBe(30);
      expect(mockReq.body.salary).toBe(0);
      expect(mockReq.body.height).toBeNull();
      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle objects with boolean values', () => {
      mockReq = {
        body: {
          name: '  ',
          isActive: true,
          isDeleted: false,
        },
      };
      mockRes = {};

      middleware.use(mockReq as Request, mockRes as Response, nextFn);

      expect(mockReq.body.name).toBeUndefined();
      expect(mockReq.body.isActive).toBe(true);
      expect(mockReq.body.isDeleted).toBe(false);
      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle complex nested structures with mixed types', () => {
      mockReq = {
        body: {
          user: {
            name: 'John',
            email: '',
            profile: {
              bio: '   ',
              avatar: null,
              tags: ['tag1', 'tag2'],
            },
            age: 30,
            active: true,
          },
          metadata: {
            created: '2024-01-01',
            updated: '',
          },
        },
      };
      mockRes = {};

      middleware.use(mockReq as Request, mockRes as Response, nextFn);

      expect(mockReq.body.user.name).toBe('John');
      expect(mockReq.body.user.email).toBeUndefined();
      expect(mockReq.body.user.profile.bio).toBeUndefined();
      expect(mockReq.body.user.profile.avatar).toBeNull();
      expect(mockReq.body.user.profile.tags).toEqual(['tag1', 'tag2']);
      expect(mockReq.body.user.age).toBe(30);
      expect(mockReq.body.user.active).toBe(true);
      expect(mockReq.body.metadata.created).toBe('2024-01-01');
      expect(mockReq.body.metadata.updated).toBeUndefined();
      expect(nextFn).toHaveBeenCalled();
    });

    it('should preserve zero-length empty string property keys', () => {
      mockReq = {
        body: {
          '': 'empty key',
          name: '  ',
        },
      };
      mockRes = {};

      middleware.use(mockReq as Request, mockRes as Response, nextFn);

      expect(mockReq.body['']).toBe('empty key');
      expect(mockReq.body.name).toBeUndefined();
      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle inherited properties from prototype chain', () => {
      const proto = { inherited: '  ' };
      mockReq = {
        body: Object.create(proto),
      };
      mockReq.body.own = 'value';
      mockReq.body[''] = '   ';

      mockRes = {};

      middleware.use(mockReq as Request, mockRes as Response, nextFn);

      // Only own properties should be checked (hasOwnProperty check)
      expect(mockReq.body.own).toBe('value');
      expect(mockReq.body['']).toBeUndefined();
      // Inherited property may or may not be touched depending on the middleware implementation
      expect(nextFn).toHaveBeenCalled();
    });
  });
});
