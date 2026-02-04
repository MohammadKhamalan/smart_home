import { useState, useEffect } from 'react';
import QuotationForm from '../components/QuotationForm';
import { API_BASE } from '../api';
import './Section.css';

// Dummy data: cost per room (buttons + AC typically)
const DEFAULT_COST_PER_ROOM = 170; // ~2 buttons * 50 + 1 AC * 120 = 220, use 170 as base
const SHAPE_MULTIPLIER = { square: 1, rectangle: 1.05, l_shape: 1.15 };
const AREA_PER_ROOM = 25; // m² approx

export default function SmartHomeRough({ user }) {
  const [roomCosts, setRoomCosts] = useState([]);
  const [rooms, setRooms] = useState(3);
  const [area, setArea] = useState(100);
  const [shape, setShape] = useState('rectangle');

  useEffect(() => {
    fetch(`${API_BASE}/api/room-costs`)
      .then((res) => res.json())
      .then(setRoomCosts)
      .catch(() => setRoomCosts([]));
  }, []);

  const buildQuotation = () => {
    const basePerRoom = roomCosts.length
      ? roomCosts.reduce((acc, r) => acc + r.default_buttons * r.cost_per_button + r.default_ac_units * r.cost_per_ac, 0) / roomCosts.length
      : DEFAULT_COST_PER_ROOM;
    const mult = SHAPE_MULTIPLIER[shape] || 1;
    const areaFactor = Math.min(1.5, 0.8 + (area / (rooms * AREA_PER_ROOM)) * 0.2);
    const total = Math.round(rooms * basePerRoom * mult * areaFactor);
    const perRoom = Math.round(total / rooms);
    const lines = [
      { name: `Rough estimate: ${rooms} rooms, ${area} m², ${shape}`, qty: 1, unitPrice: total, subtotal: total },
      { name: `(≈ ${perRoom} per room, incl. typical buttons & AC)`, qty: 1, unitPrice: 0, subtotal: 0 },
    ];
    return { lines, total };
  };

  return (
    <section className="section">
      <h2>Smart Home (Rough)</h2>
      <p className="section-desc">Select number of rooms, area, and house shape for an approximate quotation based on typical room data.</p>
      <QuotationForm
        mode="rough"
        rooms={rooms}
        onRoomsChange={setRooms}
        area={area}
        onAreaChange={setArea}
        shape={shape}
        onShapeChange={setShape}
        buildQuotation={buildQuotation}
        user={user}
      />
    </section>
  );
}
