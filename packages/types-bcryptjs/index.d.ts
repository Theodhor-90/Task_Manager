export function hash(plain: string, rounds?: number): Promise<string>;
export function compare(plain: string, hash: string): Promise<boolean>;

declare const bcrypt: {
  hash: typeof hash;
  compare: typeof compare;
};

export default bcrypt;
