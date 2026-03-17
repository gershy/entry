import { assertEqual, testRunner } from '../build/utils.test.ts';
import './main.ts';
import { getRootLogger } from './main.ts';

// Type testing
(async () => {
  
  type Enforce<Provided, Expected extends Provided> = { provided: Provided, expected: Expected };
  
  type Tests = {
    1: Enforce<{ x: 'y' }, { x: 'y' }>,
  };
  
})();

testRunner([
  
  { name: 'not implemented', fn: async () => {
    
    const logger = getRootLogger({ name: 'test' });
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
    
  }}
  
]);