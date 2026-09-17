# ALM Autos

A car rental company in Kashar, Tirana. This site showcases the fleet and turns
visitors into enquiries handled over WhatsApp and phone. It does not take
bookings: no dates are reserved, no money changes hands online.

## Language

### Fleet

**Vehicle**:
One physical car the company owns, with its own year, specification and photos.
Two cars of the same make and model are two Vehicles.
_Avoid_: Auto, Car, Qera, Listing, Service

**Fleet**:
The set of all Vehicles the company owns, whatever their Status.

**Status**:
Where a Vehicle sits in its life with the company: `published` (visible on the
site), `hidden` (kept, with its photos and URL, but off the site), `retired`
(no longer owned).
_Avoid_: Active, Deleted, Archived

**Featured**:
A flag that floats a Vehicle to the top of the fleet grid. Independent of
Status.

**Gallery**:
The ordered photos of a Vehicle. The first is the card image shown in the grid.
_Avoid_: Primary photo, Thumbnail, Cover

### Pricing

**Base Rate**:
A Vehicle's price per day before any Season applies. Stored per Tier, so a
Vehicle has four Base Rates.
_Avoid_: Price, Daily rate, Standard price

**Tier**:
A rental-length band that sets which Base Rate applies: 1–3, 4–7, 8–29, or 30+
days. Longer rentals fall in cheaper Tiers.
_Avoid_: Bracket, Band, Duration discount

**Season**:
A date range across the whole Fleet carrying a Multiplier, e.g. High Season,
1 Jul–31 Aug, ×1.35. A Season recurs every year and carries no year of its own,
so the owner sets it once; a one-off surcharge for a single named year is
therefore not expressible. Seasons need not cover the year; days no Season
matches use the Base Rate unchanged.
_Avoid_: Period, Peak, Surge

**Multiplier**:
The factor a Season applies to a Base Rate. Global, not per-Vehicle.

**Quote**:
The total price of a rental. Each day is priced independently by the Season it
falls in, then summed; the Tier is fixed once by the rental's total length. A
rental spanning a Season boundary is therefore priced part at one rate and part
at another.
_Avoid_: Total, Estimate, Booking price

**From price**:
The headline figure on a Vehicle card — the cheapest of its four Base Rates,
shown as "from €X/day". Usually that is the 30+ day Tier, but the cheapest is
taken rather than assumed, so the card can never advertise a rate no rental
length can actually obtain. Shown without the "from" when all four Tiers are
equal, because then there is nothing to count up from.

### Demand

**Enquiry**:
A request from a visitor to rent a Vehicle, captured through the site form and
stored. An Enquiry reserves nothing and commits no one; the conversation
continues on WhatsApp or the phone.
_Avoid_: Booking, Reservation, Lead, Request

**Availability**:
Deliberately absent. The site never claims a Vehicle is free on given dates.
Introducing it would mean tracking real rentals, which is out of scope.
