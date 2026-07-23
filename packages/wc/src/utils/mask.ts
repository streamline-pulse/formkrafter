const matches = (maskChar: string, char: string): boolean => {
  if (maskChar === '9') return /\d/.test(char);
  if (maskChar === 'a') return /[a-zA-Z]/.test(char);
  if (maskChar === 'A') return /[a-zA-Z]/.test(char);
  return /[0-9a-zA-Z]/.test(char);
};

const isPlaceholder = (maskChar: string): boolean =>
  maskChar === '9' || maskChar === 'a' || maskChar === 'A' || maskChar === '*';

export const applyMask = (raw: string, mask?: string): string => {
  if (!mask) return raw;

  let out = '';
  let cursor = 0;

  for (let index = 0; index < mask.length && cursor < raw.length; index++) {
    const maskChar = mask[index];

    if (isPlaceholder(maskChar)) {
      while (cursor < raw.length) {
        const char = raw[cursor++];
        if (matches(maskChar, char)) {
          out += maskChar === 'A' ? char.toUpperCase() : char;
          break;
        }
      }
    } else {
      out += maskChar;
      if (raw[cursor] === maskChar) cursor++;
    }
  }

  return out;
};
