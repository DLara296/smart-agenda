const { createDomainServices } = require('../../src/domain');

describe('domain interfaces', () => {
  it('exposes repositories and services for each core domain', () => {
    const services = createDomainServices({ database: ':memory:' });

    expect(services).toEqual(expect.objectContaining({
      school: expect.any(Object),
      family: expect.any(Object),
      session: expect.any(Object),
      assignment: expect.any(Object),
      notification: expect.any(Object),
    }));

    services.close();
  });
});
