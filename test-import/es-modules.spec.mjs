import { expect } from 'chai';

// Stub browser objects that RavelinJS uses on initialisation
globalThis.document = { cookie: '', attachEvent: () => void 0 };
globalThis.window = { navigator: {}, location: {} };

describe('ES module resolution', () => {
  it('should import ravelinjs/core without errors', async () => {
    const Ravelin = (await import('ravelinjs/core')).default;

    const ravelin = new Ravelin({ init: false });
    await ravelin.core.ids();

    expect(ravelin).to.be.an('object');
    expect(ravelin.core).to.be.an('object');
  });

  it('should import ravelinjs/core+encrypt without errors', async () => {
    const Ravelin = (await import('ravelinjs/core+encrypt')).default;

    const ravelin = new Ravelin({ init: false });
    await ravelin.core.ids();

    expect(ravelin).to.be.an('object');
    expect(ravelin.core).to.be.an('object');
    expect(ravelin.encrypt).to.be.an('object');
  });

  it('should import ravelinjs/core+track without errors', async () => {
    const Ravelin = (await import('ravelinjs/core+track')).default;

    const ravelin = new Ravelin({ init: false, track: false });
    await ravelin.core.ids();

    expect(ravelin).to.be.an('object');
    expect(ravelin.core).to.be.an('object');
    expect(ravelin.track).to.be.an('object');
  });

  it('should import ravelinjs/core+track+encrypt without errors', async () => {
    const Ravelin = (await import('ravelinjs/core+track+encrypt')).default;

    const ravelin = new Ravelin({ init: false, track: false });
    await ravelin.core.ids();

    expect(ravelin).to.be.an('object');
    expect(ravelin.core).to.be.an('object');
    expect(ravelin.track).to.be.an('object');
    expect(ravelin.encrypt).to.be.an('object');
  });
});
