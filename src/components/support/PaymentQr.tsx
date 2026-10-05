import { create } from "qrcode";
import { parish } from "@/content/site";
import { czechIban, spayd } from "@/lib/support/payment";

/** Empty modules around the code: scanners need a light frame. */
const QUIET_ZONE = 2;

/** The dark modules as one SVG path, a 1×1 square per module. */
function modulesPath(text: string): { size: number; d: string } {
  const { modules } = create(text, { errorCorrectionLevel: "M" });
  let d = "";
  for (let y = 0; y < modules.size; y++)
    for (let x = 0; x < modules.size; x++) if (modules.get(x, y)) d += `M${x} ${y}h1v1h-1z`;
  return { size: modules.size, d };
}

type Props = { variableSymbol: string; project: string };

/**
 * QR Platba for a gift to one project (§22.1): the parish account, the variable symbol and "Dar – <project>",
 * no amount. Drawn at build time (a Server Component), so the QR library never reaches the browser. Always black
 * on white, also in the dark theme. Hidden on mobile: you cannot scan your own screen.
 */
export function PaymentQr({ variableSymbol, project }: Props) {
  const iban = czechIban(parish.bankAccount);
  const { size, d } = modulesPath(spayd({ iban, variableSymbol, message: `Dar – ${project}` }));
  const box = size + 2 * QUIET_ZONE;
  return (
    <div className="hidden flex-none flex-col items-center gap-1 md:flex">
      <svg
        role="img"
        aria-label={`QR Platba: dar na ${project}, variabilní symbol ${variableSymbol}`}
        viewBox={`${-QUIET_ZONE} ${-QUIET_ZONE} ${box} ${box}`}
        shapeRendering="crispEdges"
        className="block size-24 rounded-8 bg-white fill-black"
      >
        <path d={d} />
      </svg>
      <span aria-hidden="true" className="text-12 font-bold text-orange-ink-deep">
        QR Platba
      </span>
    </div>
  );
}
