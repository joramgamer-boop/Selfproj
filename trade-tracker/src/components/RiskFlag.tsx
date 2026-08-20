/**
 * That this Plan used more Risk than the default in force when it was sized.
 *
 * It reads the same wherever the Plan appears — waiting, live, closed as a
 * Trade, skipped — because the point of the flag is to be checkable later: the
 * question it exists for is whether the higher-Risk trades earned their extra
 * risk, and that can only be asked if every one of them says so in the same
 * words.
 */
export default function RiskFlag({ aboveDefaultRisk }: { aboveDefaultRisk: boolean }) {
  if (!aboveDefaultRisk) return null;

  return <p className="risk-flag">Above default Risk</p>;
}
