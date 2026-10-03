/** `tel:` link of a Czech phone number written with spaces ("541 230 183"). */
export const telHref = (phone: string) => `tel:+420${phone.replace(/\s/g, "")}`;

/** Mapy.cz search. */
export const mapHref = (query: string) => `https://mapy.cz/zakladni?q=${encodeURIComponent(query)}`;
