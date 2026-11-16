# A service sheet from a PDF

Only when the user gives a **PDF of the week** (page 1 exported by the user) because there is no DOCX or no converter.
It replaces steps 1 and 2 of **`parish-create-service-sheet`** up to "The fields"; everything from "The fields" on
(the fields, "Finding `newsId`", the placeholder dots, steps 3 to 5) applies as written there.

## 1. Read the PDF

Read it with both:

- the `Read` tool, to see the table (which rows belong to which day and place), and
- `pdftotext -layout <file> -`, for exact wording. In the layout text a day's date and feast sit in the middle of
  its rows and long intentions wrap onto the next line: use the rendered page to assign them.

Read the **whole** page: the announcements are the paragraphs below the table.

Get the week, its dates and the events for `newsId` (it refuses a week before the current sheet or overlapping
another). When it prints `state: staged` (the week was staged before) or refuses with `state: published` (the week is
released), take it to **`parish-correct-service-sheet`**.

```sh
pnpm stage-content sheet "<source>" --check
```

## 2. Write the record

Write `record.json` in the session's scratchpad (never in the repo) from scratch, with `days` and `announcements`
only, from the rendered page and the `pdftotext` wording. The week is the one `--check` printed from the heading, as
step 2 of `parish-create-service-sheet` says (a heading over two weeks is still one sheet).

- Assign each row to its day and place from the rendered page: in the layout text the date and feast sit in the
  middle of the day's rows.
- Join the wrapped lines of a long intention into one `detail`.
- Enter every day of the week, a day without services with `"rows": []`.
- Copy the announcements below the table word for word, one per notice (as "One notice per announcement" says), and add their `<strong>`, links and `newsId` yourself.

Then check the record against "The fields" and continue with step 3 of `parish-create-service-sheet`.

## Common mistakes

- Assigning a row to the wrong day: the date sits in the middle of the day's rows in the layout text.
- Leaving a wrapped intention cut in half.
- Reading only the table: the announcements below it are published word for word too.
