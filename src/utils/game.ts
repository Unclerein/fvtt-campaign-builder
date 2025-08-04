// some helpers to simplify various repetitive tasks

// localize a string
const localize = (text: string) => game.i18n.localize(`fcb.${text}`);

export { 
  localize,
};