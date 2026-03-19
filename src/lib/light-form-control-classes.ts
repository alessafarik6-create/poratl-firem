/**
 * Jednotný světlý styl pro input / textarea / select trigger.
 * Vynucuje čitelnost i při dark módu aplikace (#fff / #000, šedý border a placeholder, oranžový focus).
 */
export const LIGHT_FORM_CONTROL_CLASS =
  "rounded-md border border-gray-300 bg-white text-black placeholder:text-gray-500 " +
  "focus-visible:border-orange-500 focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white " +
  "dark:border-gray-300 dark:bg-white dark:text-black dark:placeholder:text-gray-500";

/** SelectTrigger: zarovnání barvy hodnoty s textem pole. */
export const LIGHT_SELECT_TRIGGER_CLASS =
  `${LIGHT_FORM_CONTROL_CLASS} [&>span]:line-clamp-1 [&>span]:text-black dark:[&>span]:text-black`;

/** Rozbalovací seznam selectu. */
export const LIGHT_SELECT_CONTENT_CLASS =
  "border border-gray-300 bg-white text-black dark:border-gray-300 dark:bg-white dark:text-black";
