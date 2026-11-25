# Examples of the event fields

Fragments of past events for the fields of [`SKILL.md`](SKILL.md) step 2 that have a structure, one shape each. Add a
field only when the source has it; the other fields are filled as the table there says.

## Programme

`program` and `body`, for an event with an order of the day. `time` is the source's wording, not only H:MM: `"po mši"`,
`"11:00–13:50"`, a weekday (`"so 20:00"`) for a multi-day event or a date (`"22. 11. 10:00"`) for parts on different
days. `note` holds the detail of a row (the place, who leads it):

```json
{
  "startTime": "9:30",
  "body": "<p>Večer nabídne:</p><ul><li>ticho</li><li>modlitbu</li><li>rozhovor s knězem</li></ul>",
  "program": [
    { "time": "9:30", "title": "Slavnostní mše svatá", "note": "zpívá dětská schola" },
    { "time": "po mši", "title": "Misijní kavárna", "note": "fara, Křížkovského 55/5" }
  ]
}
```

## Links and registration

`links`, `price` and `registrationDeadline`, for an event with a registration. An e-mail is a `mailto:` link labelled
with the address, a web address gets a readable label:

```json
{
  "price": "300 Kč",
  "registrationDeadline": "2026-10-10",
  "links": [
    { "label": "poutnicimkk@seznam.cz", "href": "mailto:poutnicimkk@seznam.cz" },
    { "label": "Přihláška", "href": "https://bit.ly/randeprovsechny" }
  ]
}
```

## Series

`sessions`, for a series with listed dates and one shared time. The first date is `start`, the last is `end`:

```json
{
  "start": "2026-10-11",
  "end": "2026-10-25",
  "startTime": "18:00",
  "endTime": "20:30",
  "sessions": ["2026-10-11", "2026-10-18", "2026-10-25"]
}
```

`sessions` with their own times (and `longTerm: true`), for opening hours that differ by day. Leave out the shared
`startTime`:

```json
{
  "start": "2026-12-19",
  "end": "2027-01-02",
  "longTerm": true,
  "sessions": [
    { "date": "2026-12-19", "startTime": "14:00", "endTime": "17:00" },
    { "date": "2026-12-20", "startTime": "10:30", "endTime": "12:00" },
    { "date": "2027-01-02", "startTime": "14:00", "endTime": "17:00" }
  ]
}
```

`longTerm` with `weeklyAt`, for a weekly series without listed dates. The weekday is that of `start`:

```json
{ "start": "2026-10-01", "end": "2027-04-29", "longTerm": { "weeklyAt": "18:30" } }
```

## Highlights and tags

`highlights` (at most three items) and `tags`:

```json
{
  "highlights": {
    "title": "800 let v datech",
    "items": [
      { "value": "1226", "label": "založení kostela" },
      { "value": "1772", "label": "benedikce" },
      { "value": "1889", "label": "konsekrace" }
    ]
  },
  "tags": [{ "label": "Pro mládež" }, { "label": "Pro rodiny", "color": "orange" }]
}
```
