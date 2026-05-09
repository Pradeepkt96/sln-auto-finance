const TAMIL_CHAR_REGEX = /[\u0B80-\u0BFF]/;
const LETTER_REGEX = /[a-z]/i;
const PULLI = '\u0BCD';

const INDEPENDENT_VOWELS = {
  a: '\u0B85',
  aa: '\u0B86',
  ai: '\u0B90',
  au: '\u0B94',
  e: '\u0B8E',
  ee: '\u0B88',
  ei: '\u0B8F',
  i: '\u0B87',
  ii: '\u0B88',
  o: '\u0B92',
  oo: '\u0B8A',
  ou: '\u0B94',
  u: '\u0B89',
  uu: '\u0B8A',
};

const VOWEL_SIGNS = {
  a: '',
  aa: '\u0BBE',
  ai: '\u0BC8',
  au: '\u0BCC',
  e: '\u0BC6',
  ee: '\u0BC0',
  ei: '\u0BC7',
  i: '\u0BBF',
  ii: '\u0BC0',
  o: '\u0BCA',
  oo: '\u0BC2',
  ou: '\u0BCC',
  u: '\u0BC1',
  uu: '\u0BC2',
};

const CONSONANTS = {
  bh: '\u0BAA',
  ch: '\u0B9A',
  dh: '\u0BA4',
  gh: '\u0B95',
  kh: '\u0B95',
  ng: '\u0B99',
  nj: '\u0B9E',
  ny: '\u0B9E',
  ph: '\u0BAA',
  sh: '\u0BB7',
  th: '\u0BA4',
  zh: '\u0BB4',
  b: '\u0BAA',
  c: '\u0B95',
  d: '\u0B9F',
  f: '\u0B83\u0BAA',
  g: '\u0B95',
  h: '\u0BB9',
  j: '\u0B9C',
  k: '\u0B95',
  l: '\u0BB2',
  m: '\u0BAE',
  n: '\u0BA8',
  p: '\u0BAA',
  q: '\u0B95',
  r: '\u0BB0',
  s: '\u0BB8',
  t: '\u0B9F',
  v: '\u0BB5',
  w: '\u0BB5',
  x: '\u0B95\u0BCD\u0BB8',
  y: '\u0BAF',
  z: '\u0B9C',
};

const VOWEL_TOKENS = Object.keys(INDEPENDENT_VOWELS).sort((a, b) => b.length - a.length);
const CONSONANT_TOKENS = Object.keys(CONSONANTS).sort((a, b) => b.length - a.length);

const getTokenAt = (text, index, tokens) => {
  for (const token of tokens) {
    if (text.startsWith(token, index)) {
      return token;
    }
  }
  return null;
};

const isInitialLetter = (word, index) => {
  if (index !== 0) return false;
  if (word.length === 1) return true;
  return word.length === 2 && word.endsWith('.');
};

const transliterateWord = (word) => {
  if (!word || TAMIL_CHAR_REGEX.test(word)) {
    return word;
  }

  const lower = word.toLowerCase();
  let result = '';
  let index = 0;

  while (index < lower.length) {
    const current = lower[index];

    if (!LETTER_REGEX.test(current)) {
      result += word[index];
      index += 1;
      continue;
    }

    const vowelToken = getTokenAt(lower, index, VOWEL_TOKENS);
    if (vowelToken) {
      result += INDEPENDENT_VOWELS[vowelToken];
      index += vowelToken.length;
      continue;
    }

    const consonantToken = getTokenAt(lower, index, CONSONANT_TOKENS);
    if (!consonantToken) {
      result += word[index];
      index += 1;
      continue;
    }

    if (consonantToken === 'g' && isInitialLetter(word, index)) {
      result += '\u0B9C\u0BC0';
      index += 1;
      continue;
    }

    let base = CONSONANTS[consonantToken];

    // Use 'ன' (\u0BA9) for 'n' when it's not the first letter
    if (consonantToken === 'n' && index > 0) {
      base = '\u0BA9';
    }

    const nextIndex = index + consonantToken.length;
    const nextVowel = getTokenAt(lower, nextIndex, VOWEL_TOKENS);

    if (nextVowel) {
      result += base + VOWEL_SIGNS[nextVowel];
      index = nextIndex + nextVowel.length;
      continue;
    }

    result += base + PULLI;
    index = nextIndex;
  }

  return result;
};

export const transliterateTamilName = (name) => {
  if (!name || TAMIL_CHAR_REGEX.test(name)) {
    return name;
  }

  return name
    .split(/(\s+|-)/)
    .map((part) => (/^\s+$|^-$/.test(part) ? part : transliterateWord(part)))
    .join('');
};
