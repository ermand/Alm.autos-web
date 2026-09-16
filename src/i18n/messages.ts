/**
 * Page copy lives in code, not the CMS — it changes about once a year and wants
 * review, not a rich-text editor. Only vehicle descriptions are translatable
 * content in the database. See the Q1 decision in docs/PLAN.md.
 *
 * The Albanian below is a first draft and must be reviewed by the client before
 * launch.
 */

export const LOCALES = ["en", "sq"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

const en = {
  brand: "ALM Autos",
  nav: { home: "Home", fleet: "Our cars", about: "About", contact: "Contact" },
  home: {
    title: "Rent a car in Tirana",
    subtitle: "Reliable cars, honest prices, and someone who picks up the phone.",
    cta: "See the cars",
    callUs: "Call us",
    whatsapp: "Message on WhatsApp",
    stepsTitle: "Three steps",
    steps: [
      {
        title: "Get in touch",
        body: "Call, WhatsApp us, or send the form. We reply the same day.",
      },
      { title: "Collect the car", body: "Pick it up in Kashar, or we bring it to Tirana airport." },
      { title: "Drive", body: "Full tank, clean car, and a number to ring if anything comes up." },
    ],
  },
  fleet: {
    title: "Our cars",
    subtitle:
      "Every car below is one we actually own. Prices are per day and drop the longer you stay.",
    from: "from",
    perDay: "/day",
    empty: "No cars match those filters.",
    filters: { all: "All", transmission: "Gearbox", bodyType: "Type", reset: "Clear filters" },
  },
  vehicle: {
    specs: "Specifications",
    year: "Year",
    transmission: "Gearbox",
    fuel: "Fuel",
    bodyType: "Type",
    seats: "Seats",
    doors: "Doors",
    airConditioning: "Air conditioning",
    pricing: "Prices",
    pricingNote: "Prices per day, in euro. Longer rentals cost less per day.",
    days: "days",
    enquire: "Ask about this car",
    whatsappPrefill: "Hi, I'm interested in renting the",
    back: "All cars",
  },
  enquiry: {
    title: "Ask about a car",
    subtitle: "Tell us the dates and we will come back to you the same day.",
    name: "Your name",
    email: "Email",
    phone: "Phone",
    pickup: "Pick-up date",
    dropoff: "Drop-off date",
    message: "Anything else?",
    submit: "Send",
    sending: "Sending…",
    success: "Thank you. We have your message and will reply shortly.",
    error: "Something went wrong. Please call or WhatsApp us instead.",
    required: "Please fill in your name, email and phone.",
    noBooking: "Sending this does not reserve a car — we will confirm availability with you.",
  },
  transmission: { manual: "Manual", automatic: "Automatic" },
  fuel: { petrol: "Petrol", diesel: "Diesel", lpg: "LPG", hybrid: "Hybrid", electric: "Electric" },
  bodyType: {
    hatchback: "Hatchback",
    sedan: "Sedan",
    suv: "SUV",
    van: "Van",
    pickup: "Pick-up",
    convertible: "Convertible",
  },
  footer: { rights: "All rights reserved", privacy: "Privacy" },
  privacy: { title: "Privacy" },
  about: { title: "About us" },
  contact: { title: "Contact", location: "Where to find us" },
  yes: "Yes",
  no: "No",
};

type Messages = typeof en;

const sq: Messages = {
  brand: "ALM Autos",
  nav: { home: "Kryefaqja", fleet: "Makinat", about: "Rreth nesh", contact: "Kontakt" },
  home: {
    title: "Merr makinë me qira në Tiranë",
    subtitle: "Makina të besueshme, çmime të ndershme dhe dikush që të përgjigjet në telefon.",
    cta: "Shiko makinat",
    callUs: "Na telefono",
    whatsapp: "Shkruaj në WhatsApp",
    stepsTitle: "Tre hapa",
    steps: [
      {
        title: "Na kontakto",
        body: "Telefono, shkruaj në WhatsApp ose plotëso formularin. Përgjigjemi po atë ditë.",
      },
      { title: "Merr makinën", body: "Merre në Kashar, ose ta sjellim në aeroportin e Tiranës." },
      { title: "Nisu", body: "Depozitë plot, makinë e pastër dhe një numër për çdo gjë që del." },
    ],
  },
  fleet: {
    title: "Makinat tona",
    subtitle:
      "Çdo makinë më poshtë është e jona. Çmimet janë për ditë dhe ulen sa më gjatë të qëndroni.",
    from: "nga",
    perDay: "/ditë",
    empty: "Asnjë makinë nuk përputhet me filtrat.",
    filters: {
      all: "Të gjitha",
      transmission: "Marshi",
      bodyType: "Lloji",
      reset: "Pastro filtrat",
    },
  },
  vehicle: {
    specs: "Specifikimet",
    year: "Viti",
    transmission: "Marshi",
    fuel: "Karburanti",
    bodyType: "Lloji",
    seats: "Vende",
    doors: "Dyer",
    airConditioning: "Kondicioner",
    pricing: "Çmimet",
    pricingNote: "Çmimet për ditë, në euro. Qiratë e gjata kushtojnë më pak për ditë.",
    days: "ditë",
    enquire: "Pyet për këtë makinë",
    whatsappPrefill: "Përshëndetje, jam i interesuar të marr me qira",
    back: "Të gjitha makinat",
  },
  enquiry: {
    title: "Pyet për një makinë",
    subtitle: "Na thuaj datat dhe të kthejmë përgjigje po atë ditë.",
    name: "Emri juaj",
    email: "Email",
    phone: "Telefoni",
    pickup: "Data e marrjes",
    dropoff: "Data e dorëzimit",
    message: "Diçka tjetër?",
    submit: "Dërgo",
    sending: "Duke dërguar…",
    success: "Faleminderit. E morëm mesazhin tuaj dhe kthehemi shumë shpejt.",
    error: "Diçka shkoi keq. Na telefononi ose na shkruani në WhatsApp.",
    required: "Ju lutemi plotësoni emrin, email-in dhe telefonin.",
    noBooking:
      "Dërgimi i këtij mesazhi nuk rezervon makinë — do t'ju konfirmojmë disponueshmërinë.",
  },
  transmission: { manual: "Manual", automatic: "Automatik" },
  fuel: { petrol: "Benzinë", diesel: "Naftë", lpg: "Gaz", hybrid: "Hibrid", electric: "Elektrik" },
  bodyType: {
    hatchback: "Hatchback",
    sedan: "Sedan",
    suv: "SUV",
    van: "Furgon",
    pickup: "Pick-up",
    convertible: "Kabriolet",
  },
  footer: { rights: "Të gjitha të drejtat e rezervuara", privacy: "Privatësia" },
  privacy: { title: "Privatësia" },
  about: { title: "Rreth nesh" },
  contact: { title: "Kontakt", location: "Ku të na gjeni" },
  yes: "Po",
  no: "Jo",
};

const catalogues: Record<Locale, Messages> = { en, sq };

export function messagesFor(locale: Locale): Messages {
  return catalogues[locale];
}

export type { Messages };
