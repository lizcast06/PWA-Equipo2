// Identidad de la versión publicada (semana 10). Se fija al compilar en next.config.mjs:
// así la imagen Docker siempre informa la versión y el commit con los que se construyó.
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
export const GIT_SHA = process.env.NEXT_PUBLIC_GIT_SHA ?? "local";
