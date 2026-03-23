import '@gershy/clearing';
import Logger from '@gershy/logger';

const { isCls, getClsName, inCls, skip } = cl;
const at:      typeof cl.at      = cl.at;
const count:   typeof cl.count   = cl.count;
const map:     typeof cl.map     = cl.map;
const has:     typeof cl.has     = cl.has;
const indent:  typeof cl.indent  = cl.indent;
const limn:    typeof cl.limn    = cl.limn;
const empty:   typeof cl.empty   = cl.empty;
const toArr:   typeof cl.toArr   = cl.toArr;
const slice:   typeof cl.slice   = cl.slice;
const mapk:    typeof cl.mapk    = cl.mapk;
const padTail: typeof cl.padTail = cl.padTail;

const modMapping = {
  
  // https://stackoverflow.com/a/41407246/830905
  
  red:       '\u001b[31m',
  green:     '\u001b[32m',
  yellow:    '\u001b[33m',
  blue:      '\u001b[34m',
  
  subtle:    '\u001b[2m',
  
  bold:      '\u001b[1m',
  italic:    '\u001b[3;22m',
  underline: '\u001b[4;22m',
  
  rgbRed:    '\u001b[38;2;255;0;0m', // Must be "[38,2,R;G;Bm]" where R, G, B are 0-255 colour values
  
  reset:     '\u001b[0m'
  
};
const ansi = {
  set: (str: string, modName: keyof typeof modMapping) => {
    return str.split('\n')[map](ln => `${modMapping[modName]}${ln}${modMapping.reset}`).join('\n')
  },
  rem: (str: string) => str.replace(/\u{1b}\[[^a-zA-Z]+[a-zA-Z]/ug, '')
};

type FormatArgs = {
  ansiSet?: (...args: any[]) => string,
  ansiRem?: (str: string) => string,
  indentSize?: number,
  stringFormat?: 'inline' | 'multiline',
  objDepth?: number,  // How many levels to recurse into objects
  lineWidth?: number  // How wide a line can be
};
const format = (val, opts: FormatArgs = { objDepth: 7, lineWidth: 100 }, d = 0, pfx = '', seen = new Map()): string => {
  
  // Converts any value to a human-readable string
  
  const { ansiSet=ansi.set, ansiRem=ansi.rem, indentSize=2, stringFormat='multiline', objDepth = 7, lineWidth = 100 } = opts;
  const pfxLen = pfx.length;
  const bold = (str: string) => ansiSet(str, 'bold');
  
  if (val === undefined) return ansiSet('undefined', 'green');
  if (val === null) return ansiSet('null', 'green');
  if (val !== val) return ansiSet('nan', 'green');
  
  if (isCls(val, Number)) return ansiSet(val.toString(10), 'green');
  if (isCls(val, Boolean)) return ansiSet(val ? 'T' : 'F', 'green');
  if (isCls(val, Buffer)) return ansiSet(`Buffer { length: ${val.length} }`, 'green');
  
  if (isCls(val, String)) {
    
    const maxW = Math.max(8, lineWidth - pfxLen - d * indentSize - 1); // Subtract 1 for the trailing ","
    
    if (stringFormat === 'inline' || !val[has]('\n')) {
      
      // The ascii range 0x0007 - 0x000f are nasty control characters which don't appear in most
      // terminals as exactly 1 inline character
      let inline = val.replaceAll('\n', '\\n').replaceAll(/[\u0007-\u000f]/g, '');
      if (inline.length > maxW) inline = inline.slice(0, maxW - 1) + '\u2026';
      return ansiSet(`'${inline}'`, 'green');
      
    } else if (stringFormat === 'multiline') {
      
      const mw = maxW - indentSize; // Subtract an indent, as we indent the multi-line string
      
      // Remove all nasty control chars, except "\n" (whose hex value, '\u000a', is the only
      // value permitted by the break in the range in the following regex)
      const lines = val.replaceAll(/[\u0007-\u0009\u000b-\u000f]/g, '')
        .split('\n')
        [map](ln => ansiSet(ln.length <= mw ? ln : (ln.slice(0, mw - 1) + '\u2026'), 'green'));
      
      const indentStr = ansiSet('\u00a6', 'subtle') + ' '.repeat(indentSize - 1);
      return `"""\n${lines.join('\n')[indent](indentStr)}\n"""`;
      
    }
    
  }
  
  if (d > objDepth) return ansiSet('<limit>', 'red');
  
  if (seen.has(val)) return seen.get(val);
  
  if (Object.getPrototypeOf(val) === null) {
    
    seen.set(val, '<cyc> PlainObject(...)');
    const str = `PlainObject ${format({ ...val }, opts, d, 'PlainObject ', seen)}`;
    seen.set(val, str);
    return str;
    
  }
  
  if (isCls(val[limn], Function)) {
    
    const f = format(val[limn](), opts, d + 1, '', seen);
    seen.set(val, f);
    return f;
    
    // const str = ansiFn(v, 'blue');
    // seen.set(val, str);
    // return str;
    
  }
  
  if (inCls(val, Function)) {
    
    let str = 'Fn: ' + val.toString().split('\n')[map](ln => ln.trim() ?? skip).join(' ').replace(/[ ]+/g, ' ');
    
    const maxW = Math.max(8, lineWidth - pfxLen - d * indentSize - 1); // Subtract 1 for a possible trailing ","
    if (str.length > maxW) str = str.slice(0, maxW - 1) + '\u2026';
    
    str = ansiSet(str, 'blue');
    
    seen.set(val, str);
    return str;
    
  }
  
  if (isCls(val, Set)) {
    
    seen.set(val, '<cyc> Set(...)');
    const str = `Set ${format([ ...val ], opts, d, 'Set ', seen)}`;
    seen.set(val, str);
    return str;
    
  }
  
  if (isCls(val, Map)) {
    
    seen.set(val, '<cyc> Map(...)');
    const str = `Map ${format(Object.fromEntries(val), opts, d, 'Map ', seen)}`;
    seen.set(val, str);
    return str;
    
  }
  
  if (isCls(val, Object)) {
    
    if (val[empty]()) return bold('{}');
    
    seen.set(val, '<cyc> { ... }');
    const pureKeyReg = /^[a-zA-Z$_][a-zA-Z0-9$_]*/;
    const slottableKey = (k: string) => {
      if (pureKeyReg.test(k)) return k;
      else if (!k[has](`'`))  return `'${k}'`;
      else if (!k[has]('"'))  return `"${k}"`;
      else                    return `'${k.replaceAll(`'`, `\\'`)}'`;
    };
    const keyLen = Math.max(...val[toArr]((v, k) => slottableKey(k).length));
    const maxOneLineValueLen = lineWidth - (d * indentSize) - (keyLen + 2); // Remove space from indentation and key; `+ 2` is for ": "
    
    const str = (() => {
      
      const formatted = val[mapk]((v, k) => {
        
        if (!isCls(k, String)) return skip;
        
        return [
          slottableKey(k),
          format(v, opts, d + 1, `${k[padTail](keyLen, ' ')}: `, seen)
        ];
        
      });
      
      const oneLine = `${bold('{')} ${formatted[toArr]((v, k) => `${k}${bold(':')} ${v}`).join(bold(',') + ' ')} ${bold('}')}`;
      
      const canOneLine = true
        && !oneLine[has]('\n')
        && ansiRem(oneLine).length < maxOneLineValueLen;
      if (canOneLine) return oneLine;
      
      const multiLineItems = formatted[toArr]((v, k) => {
        
        const paddingAmt = keyLen - k.length;
        let padding = '';
        if (paddingAmt) padding += ' ';
        padding += '-'.repeat(Math.max(paddingAmt - 1, 0));
        const paddedKey = k + ansiSet(padding, 'subtle');
        return `${paddedKey}${bold(':')} ${v}`;
        
      });
      
      // Using `Math.max` means there's no sorting preference for items less than 10 chars long
      const indentStr = ansiSet('\u00a6', 'subtle') + ' '.repeat(indentSize - 1);
      const sortScore = v => {
        
        const noAnsi = ansiRem(v);
        const numLines = (noAnsi.match(/\n/g) ?? []).length + 1;
        
        // The first line of `noAnsi` embeds `keyLen` chars and ": "
        let numChars = noAnsi.length - (keyLen + ': '.length);
        if (numLines === 1 && numChars < 50) numChars = 50; // Avoid reordering short single-lines values
        
        return numChars * 1 + numLines * 7;
        
      };
      const multiLine = multiLineItems.sort((a, b) => sortScore(a) - sortScore(b))
        [map](v => v[indent](indentStr))
        .join(bold(',') + '\n')
      
      return `${bold('{')}\n${multiLine}\n${bold('}')}`;
      
    })();
    
    seen.set(val, str);
    return str;
    
  }
  
  if (isCls(val, Array)) {
    
    if (val[empty]()) return bold('[]');
    
    seen.set(val, '<cyc> [ ... ]');
    
    const str = (() => {
      
      const formatted = val[map](v => format(v, opts, d + 1, '', seen));
      
      const oneLine = `${bold('[')} ${formatted.join(bold(',') + ' ')} ${bold(']')}`;
      const canOneLine = true
        && !oneLine[has]('\n')
        && ansiRem(oneLine).length < (lineWidth - d * indentSize);
      if (canOneLine) return oneLine;
      
      const indentStr = ansiSet('\u00a6', 'subtle') + ' '.repeat(indentSize - 1);
      const multiLine = formatted[map](v => v[indent](indentStr)).join(bold(',') + '\n');
      return `${bold('[')}\n${multiLine}\n${bold(']')}`;
      
    })();
    
    seen.set(val, str);
    return str;
    
  }
  
  const formName = getClsName(val);
  seen.set(val, `<cyc> ${formName}(...)`);
  const str = `${ansiSet(formName, 'blue')} ${format({ ...val }, opts, d, `${formName} `, seen)}`;
  seen.set(val, str);
  return str;
  
};

const log = global['cons' + 'ole'].log;
const state: { logger: null | Logger } = { logger: null };
export type GetRootLoggerArgs = {
  out?: (str: string) => void,
  name?: string,
  objDepth?: number,
  lineWidth?: number,
  maxStrLength?: number,
  stringFormat?: 'multiline' | 'inline',
  filter?: (ctx: { $: string } & Obj<any>) => boolean
};
export const getRootLogger = (opts: GetRootLoggerArgs = {}) => {
  
  return state.logger ??= new Logger(opts.name ?? '', opts[slice]([ 'maxStrLength' ]), skip, ctx => {
    
    const { $: domain, ...args } = ctx;
    if (opts?.filter && !opts.filter(ctx)) return;
    
    try {
      
      const { msg, body } = (() => {
        
        // We detect a "message" if the "msg" key is a String, or "msg" is the only property
        if (args[at]('msg') && (isCls(args.msg, String) || args[count]() === 1)) {
          const { msg, ...body } = args;
          return { msg, body } as { msg: Json, body: Obj };
        }
        
        return { msg: null, body: args };
        
      })();

      const formattedBody = body[empty]() ? null : format(body, opts);
      const formattedMsg =  (() => {
        // The message is formatted slightly differently - if it's a string, it's used raw
        if (!msg) return null;
        if (isCls(msg, String)) return msg;
        return format(msg);
      })();
      
      const content = [ formattedMsg, formattedBody ][map](v => v ?? skip).join('\n');
      if (!content.trim()) return;
      (opts.out ?? log)(content[indent](`[${(domain as any).$}] `), '\n');
      
    } catch(err) {
      
      (opts.out ?? log)('FATAL', err);
      process.exit(0);
      
    }
    
  });
  
};