import { useEffect, useState } from "react";
import { readSeats } from "../session.js";
import { MAX_SEATS } from "../config.js";

// 80 dots, one per seat. Filled = someone is signed in. Refreshes every 30 s.
export default function SeatGrid({ myUid }) {
  const [seats, setSeats] = useState(null); // { live: Map, used }
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      readSeats()
        .then((s) => { if (alive) { setSeats(s); setFailed(false); } })
        .catch(() => { if (alive) setFailed(true); });
    load();
    const t = setInterval(load, 30000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const full = seats && seats.used >= MAX_SEATS;
  let caption = "Checking seats…";
  if (failed) caption = "Seat count unavailable right now.";
  else if (seats) caption = full
    ? `All ${MAX_SEATS} seats are in use. Try again in a few minutes.`
    : `${seats.used} of ${MAX_SEATS} seats in use`;

  return (
    <div className="seats">
      <p className="mono-label">Signed in now</p>
      <div className="seat-grid" role="img" aria-label={caption}>
        {Array.from({ length: MAX_SEATS }, (_, i) => {
          const taken = seats?.live.has(i);
          const mine = taken && myUid && seats.live.get(i) === myUid;
          return <span key={i} className={`seat${taken ? " on" : ""}${mine ? " mine" : ""}`} />;
        })}
      </div>
      <p className="hint" aria-live="polite">{caption}</p>
      <p className="hint">Only {MAX_SEATS} people can be signed in at the same time. Browsing projects doesn't use a seat.</p>
    </div>
  );
}
