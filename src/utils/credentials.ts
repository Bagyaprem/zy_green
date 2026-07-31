/** Fixed domain for auto-generated customer logins — never a real inbox, just a stable, memorable identifier derived from the customer's name. */
const LOGIN_DOMAIN = 'customer.zygreen.io';

/** Cryptographically random integer in [0, max) — Math.random() isn't suitable for generating credentials (predictable, not a CSPRNG). */
function secureRandomInt(max: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

/** Turns "Prem Kumar" into "prem.kumar" — lowercase, alphanumeric segments joined by dots. */
function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '') || 'customer'
  );
}

/** Generates a unique-enough login "username" (as an email, since Supabase Auth requires one) from a customer's name. */
export function generateLoginEmail(customerName: string): string {
  const suffix = Array.from({ length: 4 }, () => secureRandomInt(36).toString(36)).join('');
  return `${slugify(customerName)}.${suffix}@${LOGIN_DOMAIN}`;
}

/**
 * Generates an easy-to-remember password from the customer's own name and
 * phone number: first 4 letters of the name (lowercase) + first 4 digits of
 * the phone number, e.g. "Bagyaprem" + "6374005564" -> "bagy6374".
 *
 * This trades security for memorability - the password is guessable by
 * anyone who knows the customer's name and phone number - so it's meant for
 * an initial/temporary password the customer is expected to change, not a
 * long-term credential.
 */
export function generateSimplePassword(customerName: string, phone: string): string {
  const namePart = customerName
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .padEnd(4, 'x')
    .slice(0, 4);
  const phonePart = phone
    .replace(/[^0-9]/g, '')
    .padEnd(4, '0')
    .slice(0, 4);
  return namePart + phonePart;
}
