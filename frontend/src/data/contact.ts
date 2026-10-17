export type Office = {
  city: string;
  street: string;
  zip: string;
  primary?: boolean;
};

export const offices: Office[] = [
  {
    city: "Braunschweig",
    street: "Schloßplatz 1",
    zip: "38100 Braunschweig",
    primary: true,
  },
  {
    city: "Berlin",
    street: "Friedrichstraße 100",
    zip: "10117 Berlin",
  },
  {
    city: "Brandenburg",
    street: "Steinstraße 20",
    zip: "14776 Brandenburg an der Havel",
  },
];

export const contact = {
  email: "hallo@stadtloewe.de",
  phone: "+49 000 000 000",
  phoneHref: "+49000000000",
  addressLine: "Schloßplatz 1, 38100 Braunschweig",
};
