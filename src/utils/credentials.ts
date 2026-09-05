/** Fixed domain for customer logins — never a real inbox, just a stable identifier. The admin chooses the part before the @; this half is not editable. */
export const LOGIN_DOMAIN = 'zygreen.io';

/** Turns "Prem Kumar" into "prem.kumar" — lowercase, alphanumeric segments joined by dots. Used to prefill the login username, which the admin can then edit. */
export function slugifyLoginName(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '') || 'customer'
  );
}

/**
 * Keeps a hand-typed username to characters that are safe in an email local
 * part (lowercase alphanumerics plus . _ -), so whatever the admin types
 * always composes into a valid address.
 */
export function sanitizeLoginLocalPart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._-]/g, '');
}

/** Composes the full login address from the editable local part. */
export function buildLoginEmail(localPart: string): string {
  return localPart ? `${localPart}@${LOGIN_DOMAIN}` : '';
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
