/** Token variables the diagram colors come from, so a drawing follows the theme like everything else. */
const TOKEN_VARIABLES = {
  background: '--surface',
  primaryColor: '--raised',
  primaryBorderColor: '--line-strong',
  primaryTextColor: '--fg',
  secondaryColor: '--canvas',
  tertiaryColor: '--canvas',
  lineColor: '--faint',
  textColor: '--fg-soft',
  noteBkgColor: '--warn-soft',
  noteTextColor: '--fg',
  noteBorderColor: '--warn-line',
  actorBkg: '--raised',
  actorBorder: '--line-strong',
  actorTextColor: '--fg',
  signalColor: '--fg-soft',
  signalTextColor: '--fg-soft',
} satisfies Record<string, `--${string}`>;

let diagramCount = 0;

async function loadMermaid() {
  const { default: mermaid } = await import('mermaid');
  const styles = getComputedStyle(document.documentElement);
  const themeVariables = Object.fromEntries(
    Object.entries(TOKEN_VARIABLES).map(([name, variable]) => [name, styles.getPropertyValue(variable).trim()]),
  );
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    fontFamily: styles.getPropertyValue('font-family'),
    themeVariables: { ...themeVariables, fontSize: '13px' },
  });
  return mermaid;
}

/** Draws Mermaid source as sanitized SVG markup; throws when the source does not parse. */
export async function renderMermaid(source: string) {
  const mermaid = await loadMermaid();
  diagramCount += 1;
  const { svg } = await mermaid.render(`chaff-diagram-${diagramCount}`, source);
  return svg;
}
