# iPhone Shortcut — one-tap call lead logger

Since Tech Guardian runs on your personal cell and personal cells have
no public API, you can't auto-ingest every call. The next best thing
is a 5-second tap after each call that drops the lead straight into
your Airtable Leads table.

## What you're building

A Shortcut on your iPhone that, when tapped:
1. Asks: "Customer name?"
2. Asks: "Phone number?" (defaults to the last call you received)
3. Asks: "Issue?"
4. Asks: "Status?" (picker: Missed / Answered / Booked)
5. Silently POSTs to the Airtable Leads table
6. Shows a green "Logged ✓" banner

Total time per call: under 10 seconds.

---

## Prereqs

- Airtable base created (see `AIRTABLE_SETUP.md`)
- Your Airtable **Personal Access Token** (PAT)
- Your Airtable **Base ID**

## Build the Shortcut

### Step 1 — Create it
1. iPhone → **Shortcuts** app → hit **`+`** top right
2. Tap **Shortcut Name** → name it **`Log Call Lead`**
3. Tap the settings icon (top) → **Add to Home Screen** so you can
   tap it with your thumb after hanging up

### Step 2 — Ask for details
Add these actions in order (tap **`+ Add Action`** → search by name):

1. **Ask for Input** → Prompt: `Customer name?` → Type: **Text**
2. **Ask for Input** → Prompt: `Phone number?` → Type: **Number** →
   Default: tap the magic variable picker → pick **Clipboard** (so
   if you copied the number from Phone app it pre-fills)
3. **Ask for Input** → Prompt: `What's the issue?` → Type: **Text**
4. **Choose from Menu** → Menu items: `Missed call`, `Answered`, `Booked`

### Step 3 — Build the Airtable request
Still inside **Choose from Menu**, for EACH menu item drop these actions:

1. **Dictionary** (search "Dictionary") → add these keys:

   | Key           | Value                                    |
   | ------------- | ---------------------------------------- |
   | `id`          | `call-` + magic variable **Current Date**|
   | `source`      | `phone`                                  |
   | `platform`    | `Personal cell`                          |
   | `title`       | `Inbound call — ` + **Ask #1** (customer)|
   | `author_or_listing_name` | **Ask #1** (customer)         |
   | `text_snippet`| **Ask #3** (issue)                       |
   | `url`         | `tel:` + **Ask #2** (phone)              |
   | `timestamp`   | **Current Date** (formatted ISO)         |
   | `intent_score`| `4`                                      |
   | `status`      | `new` (or `booked` in the Booked branch) |
   | `notes`       | `Logged from iPhone Shortcut`            |

2. **Dictionary** → create a parent dict with one key:
   - `fields` → set value to the dictionary you just built

3. **Get Dictionary Value** — actually, skip this; Shortcuts will
   serialize the nested dict for us in the next step.

4. **Get Contents of URL**
   - URL: `https://api.airtable.com/v0/appXXXXXXXXXXXXXX/Leads`
     (replace `appXXX...` with your real Base ID, and change the table
     name if you named it differently)
   - Method: **POST**
   - Headers:
     - `Authorization` = `Bearer patYOUR_TOKEN_HERE`
     - `Content-Type` = `application/json`
   - Request Body: **JSON**
     - Add key `records` → type **Array** → inside, add a dictionary
       with key `fields` → value = the dictionary from step 1.

5. **Show Notification** → Title: `Logged ✓` → Body: **Ask #1**
   (customer name) so you get visual confirmation.

### Step 4 — Safety: test before you rely on it

1. Hit the play button at the bottom of the Shortcut editor
2. Fill in test values
3. Check your Airtable Leads table for a new row
4. Delete the test row in Airtable

### Step 5 — Put it on your lock screen / home screen
- **Settings → Face ID & Passcode → Shortcuts** — enable "Allow when locked"
- Long-press home screen → add a **Shortcut widget** with `Log Call Lead`
- Or drag the Shortcut to your dock so it's thumb-distance after hanging up

---

## Alternative: keep it dead simple

If the Shortcut above feels like too much, here's the 30-second version:

1. Create the Shortcut with just **Ask for Input** actions #1–#4
2. Final action: **Send Email** → to yourself at your Zoho address →
   subject: `New call lead: {customer}` → body: `{customer} / {phone} / {issue}`

The email version means the Zoho IMAP source picks it up on the next
run — so it ends up in the same Leads store via the same pipeline,
just with ~2 minutes of delay instead of instantly. Zero Airtable
config needed on the iPhone side.

---

## Tips

- **Pre-fill phone from your last call**: the **Clipboard** trick in
  step 2 works if you long-press the number in the Phone app and hit
  Copy right before tapping the Shortcut.
- **Route both voicemails and quick-tap logs to the same Airtable
  table** — they'll have different `source` values (`zoho_email` vs
  `phone`), so you can filter a "call leads only" view in Airtable
  with `source = phone OR platform = Google Voice`.
- **Don't build an auto-SMS reply**. Every lead goes to manual review.
  That's a compliance decision we made on purpose and I'm holding you
  to it.
