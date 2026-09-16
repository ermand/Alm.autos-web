# Enquiries, not bookings

The site showcases the fleet and captures Enquiries. It deliberately does not
track Availability: no dates are held, no Vehicle is reserved, no money is
taken. Every Enquiry continues as a WhatsApp or phone conversation, which is how
the business already runs.

## Considered options

Availability-aware listings ("unavailable 3–8 Jul") and full online reservations
were both on the table. Both were rejected for the same reason: they are only as
good as the data the owner keeps current, and a stale calendar is worse than no
calendar — it turns away customers for cars that are sitting on the lot. Online
reservations additionally pull in payments, deposits, cancellation terms and
refunds, none of which the business handles today.

## Consequences

The domain model keeps a Vehicle as a physical car precisely so availability can
be added later without reshaping anything: a rental would attach to a Vehicle,
not to a model or a category. The `Status` field (`published`/`hidden`/
`retired`) is lifecycle, not availability, and must not be repurposed to mean
"currently rented" — that is the back door this decision exists to keep shut.
