const uppercasePattern = /([A-Z])/g;

/**
 * Hyphenates a camel cased CSS property name
 * Highly inspired from:
 * https://github.com/facebook/react/blob/main/packages/react-dom/src/shared/hyphenateStyleName.js
 *
 */
export default function hyphenateStyleName(name: string): string {
  return name.replace(uppercasePattern, '-$1').toLowerCase();
}
