import { organizerPrice } from './config';

export function OrganizerPrice() {
  return <div className="organizer-price">
    <span className="organizer-price-label">Preço promocional</span>
    <strong>{organizerPrice}</strong>
    <span>Pagamento único · Licença vitalícia</span>
  </div>;
}
