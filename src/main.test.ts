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
  
  { name: 'basic', fn: async () => {
    
    const result = await new Promise(rsv => {
      const logger = getRootLogger({ name: 'test', ansi: false, out: str => rsv(str) });
      logger.log({
        $$: 'haha',
        this: {
          is: {
            my: {
              crazyCoolData: Buffer.alloc(20)
            }
          }
        }
      });
    });
    assertEqual(result, `[test.haha] { this: { is: { my: { crazyCoolData: 'Buffer(...)' } } } }\n`);
    
  }},
  { name: 'mutliline', fn: async () => {
    
    const result = await new Promise(rsv => {
      const logger = getRootLogger({ name: 'test', ansi: false, out: rsv, maxLineLen: 20, maxStrLen: 1000 });
      logger.log({ $$: 'haha', x: BigInt('1'.repeat(100)) });
    });
    
    assertEqual(result, String[cl.baseline](`
      | [test.haha] {
      | [test.haha] ¦ x: 'BigInt(...)'
      | [test.haha] }
      | 
    `));
    
  }},
  { name: 'mutliline2', fn: async () => {
    
    // TODO: The logger output here based on `maxLineLen` and `maxStrLen` is inconsistent and
    // unexpected; needs to be debugged. Most stable approach would be to change the expected value
    // here to be precisely, to-the-character, what we want, and getting the code to produce that.
    
    const result = await new Promise(rsv => {
      const logger = getRootLogger({ name: 'test', ansi: false, out: rsv, maxLineLen: 20, maxStrLen: 1000 });
      logger.log({
        $$: 'haha',
        x: { y: 'x'.repeat(100) },
        xx: 'x'.repeat(100),
        xxx: BigInt('1'.repeat(100)),
        xxxxx: { y: 'x'.repeat(100) },
        a: { b: { c: 'x'.repeat(100) } },
        h: { i: { j: [ 'x'.repeat(100) ] } },
        lines: 'xxx\nxxx\nxxx'
      });
    });
    
    assertEqual(result, String[cl.baseline](`
      | [test.haha] {
      | [test.haha] ¦ x ---: {
      | [test.haha] ¦ ¦ y: 'xxxxxxxxxxx…'
      | [test.haha] ¦ },
      | [test.haha] ¦ xxxxx: {
      | [test.haha] ¦ ¦ y: 'xxxxxxxxxxx…'
      | [test.haha] ¦ },
      | [test.haha] ¦ xx --: 'xxxxxxxxx…',
      | [test.haha] ¦ xxx -: 'BigInt(..…',
      | [test.haha] ¦ lines: """
      | [test.haha] ¦ ¦ | xxx
      | [test.haha] ¦ ¦ | xxx
      | [test.haha] ¦ ¦ | xxx
      | [test.haha] ¦ """,
      | [test.haha] ¦ a ---: {
      | [test.haha] ¦ ¦ b: {
      | [test.haha] ¦ ¦ ¦ c: 'xxxxxxxxx…'
      | [test.haha] ¦ ¦ }
      | [test.haha] ¦ },
      | [test.haha] ¦ h ---: {
      | [test.haha] ¦ ¦ i: {
      | [test.haha] ¦ ¦ ¦ j: [
      | [test.haha] ¦ ¦ ¦ ¦ 'xxxxxxxxxx…'
      | [test.haha] ¦ ¦ ¦ ]
      | [test.haha] ¦ ¦ }
      | [test.haha] ¦ }
      | [test.haha] }
      | 
    `));
    
  }}
  
]);