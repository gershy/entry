import { assertEqual, testRunner } from '../build/utils.test.ts';
import './main.ts';
import { getRootLogger } from './main.ts';

// Type testing
(async () => {
  
  type Enforce<Provided, Expected extends Provided> = { provided: Provided, expected: Expected };
  
  type Tests = {
    1: Enforce<{ x: 'y' }, { x: 'y' }>,
  };
  if (0) ((v?: Tests) => void 0)();
  
})();

testRunner([
  
  { name: 'basic test', fn: async () => {
    
    assertEqual(null, null);
    
    const result = await new Promise(rsv => {
      const logger = getRootLogger({ name: 'test', ansi: false, out: str => rsv(str) });
      logger.log({
        $$: 'haha!',
        this: {
          is: {
            my: {
              crazyCoolData: Buffer.alloc(20)
            }
          }
        }
      });
    });
    assertEqual(result, `[test.haha!] { this: { is: { my: { crazyCoolData: 'Buffer(...)' } } } }`);
    
  }}
  
]);