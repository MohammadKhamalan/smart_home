// Map stock item id (from backend) to local asset image
import smartcurtain from './smartcurtain.png';
import smartswitch1gang from './smartswitch1gang.png';
import smartswitch2gang from './smartswitch2gang.png';
import smartswitch3gang from './smartswitch3gang.png';
import inchsmartcontrolpanel from './inchsmartcontrolpanel.png';
import inch10controlpanel from './10inchsnartcontrolpanel.png';
import smartdoorlock from './smartdoorlock.png';
import smartdoorlock2 from './smartdoorlock2.png';
import motionsensor from './motionsensor.png';
import smartthermostat from './smartthermostat.png';
import smartthermostatcontroller2 from './smartthermostatcontroller2.png';

export const itemImages = {
  1: smartcurtain,
  2: smartswitch1gang,
  3: smartswitch2gang,
  4: smartswitch3gang,
  5: inchsmartcontrolpanel,
  6: inch10controlpanel,
  7: smartdoorlock,
  8: smartdoorlock2,
  9: motionsensor,
  10: smartthermostat,
  11: smartthermostatcontroller2,
};

/** Get image URL for a stock item; falls back to item.photo or placeholder. */
export function getItemImage(item) {
  if (!item) return null;
  const url = itemImages[item.id];
  if (url) return url;
  return item.photo || null;
}
