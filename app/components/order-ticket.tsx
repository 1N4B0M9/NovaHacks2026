import type { Language } from "../../lib/locale";

const notes = {
  en: {
    title: "Order slip",
    items: ["Eggs", "Oat milk"],
    unit: "1 case",
    count: "2 items",
  },
  es: {
    title: "Nota de pedido",
    items: ["Huevos", "Leche de avena"],
    unit: "1 caja",
    count: "2 productos",
  },
  zh: {
    title: "订货清单",
    items: ["鸡蛋", "燕麦奶"],
    unit: "1 箱",
    count: "2 项食材",
  },
};
export function OrderTicket({ language }: { language: Language }) {
  const note = notes[language];
  return (
    <figure className="ticket-scene" aria-label={note.title}>
      <div className="ticket-shadow">
        <div className="order-ticket">
          <figcaption>
            <span>{note.title}</span>
            <i aria-hidden="true" className="ticket-clip" />
          </figcaption>
          <ul>
            {note.items.map((item) => (
              <li key={item}>
                <span>{item}</span>
                <strong>{note.unit}</strong>
              </li>
            ))}
          </ul>
          <div className="ticket-foot">
            <span>{note.count}</span>
            <b>mise.</b>
          </div>
        </div>
      </div>
    </figure>
  );
}
