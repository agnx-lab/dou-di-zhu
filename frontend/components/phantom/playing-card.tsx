export type Suit = "spade" | "heart" | "club" | "diamond" | "joker";

const suitGlyph: Record<Suit, string> = {
  spade: "♠",
  heart: "♥",
  club: "♣",
  diamond: "♦",
  joker: "幻",
};

export function PlayingCard({
  rank,
  suit,
  selected = false,
  facedown = false,
  small = false,
}: {
  rank: string;
  suit: Suit;
  selected?: boolean;
  facedown?: boolean;
  small?: boolean;
}) {
  if (facedown) {
    return (
      <div className={`playing-card card-back ${small ? "small" : ""}`}>
        <div className="back-frame"><span>幻</span></div>
      </div>
    );
  }

  const red = suit === "heart" || suit === "diamond";
  const centerGlyph = suit === "joker" ? "王" : suitGlyph[suit];
  return (
    <div className={`playing-card ${small ? "small" : ""} ${selected ? "selected" : ""} ${red ? "red" : ""} ${suit === "joker" ? "joker" : ""}`}>
      <span className="card-index">
        <strong>{rank}</strong>
        <em>{suitGlyph[suit]}</em>
      </span>
      <span className="card-center">{centerGlyph}</span>
      <span className="card-stamp">幻</span>
    </div>
  );
}
