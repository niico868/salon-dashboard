import { buildBirthday, parseBirthday, phoneLooksValid } from '../birthdayInput';

const now = new Date(2026, 10, 2);

describe('buildBirthday', () => {
  it('is empty when nothing is entered', () => expect(buildBirthday('', null, '', now)).toEqual({ value: null }));
  it('stores a full date', () => expect(buildBirthday('21', 5, '1985', now).value).toBe('1985-05-21'));
  it('stores 1900 when the year is unknown', () => expect(buildBirthday('6', 10, '', now).value).toBe('1900-10-06'));
  it('needs the month', () => expect(buildBirthday('6', null, '', now).error).toBeTruthy());
  it('rejects an impossible date', () => expect(buildBirthday('31', 2, '1990', now).error).toBeTruthy());
  it('rejects a future year', () => expect(buildBirthday('1', 1, '2030', now).error).toBeTruthy());
  it('needs a year for 29 February', () => {
    expect(buildBirthday('29', 2, '', now).error).toBeTruthy();
    expect(buildBirthday('29', 2, '2000', now).value).toBe('2000-02-29');
  });
});

describe('parseBirthday', () => {
  it('reads a full date', () => expect(parseBirthday('1985-05-21')).toEqual({ day: '21', month: 5, year: '1985' }));
  it('hides the placeholder year', () => expect(parseBirthday('1900-10-06')).toEqual({ day: '6', month: 10, year: '' }));
  it('copes with nothing saved', () => expect(parseBirthday(null)).toEqual({ day: '', month: null, year: '' }));
});

describe('phoneLooksValid', () => {
  it('accepts local and full numbers', () => {
    expect(phoneLooksValid('868 555 1234')).toBe(true);
    expect(phoneLooksValid('555 1234')).toBe(true);
    expect(phoneLooksValid('')).toBe(true);
  });
  it('rejects too few digits', () => expect(phoneLooksValid('12345')).toBe(false));
});
