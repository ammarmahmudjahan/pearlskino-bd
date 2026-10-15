/*
|--------------------------------------------------------------------------
| ONE place for the Google Apps Script web-app address
|--------------------------------------------------------------------------
| Before this file the address was copied into three files. Now every part
| of the site (shop, checkout, accounts, admin) reads it from here.
|
| To point the site at a different backend (for example a test copy of the
| Apps Script), create a file named .env.local next to package.json with:
|
|     VITE_API_URL=https://script.google.com/macros/s/XXXX/exec
*/

export const API_URL = String(
  import.meta.env.VITE_API_URL ||
    "https://script.google.com/macros/s/AKfycby_VLzhMXlfpPuCSwUERETrCw9DbeLxufrVZXAMurklCKdg3OWar5znlxKwgqEMiaN5jA/exec"
).trim();

export const ADMIN_TOKEN_KEY = "pearlskino_admin_token";
export const ADMIN_EXPIRES_KEY = "pearlskino_admin_expires_at";
export const ADMIN_USER_KEY = "pearlskino_admin_user";
export const CUSTOMER_TOKEN_KEY = "pearlskino_customer_token";
export const EDIT_MODE_KEY = "pearlskino_edit_mode";
