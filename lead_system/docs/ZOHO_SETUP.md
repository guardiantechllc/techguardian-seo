# Zoho Mail setup — Yelp lead email reader

Goal: every Yelp lead email that lands in your Zoho inbox gets
automatically parsed and written to your Leads spreadsheet / Airtable
base. Same deal for Google Voice missed-call emails if you also forward
your calls through Voice.

Takes about 3 minutes.

---

## 1. Generate an app-specific password

Zoho blocks "basic auth" (your normal password) for IMAP by default —
that's good for security. We use an app password instead.

1. Go to https://accounts.zoho.com/home#security/device_management
2. Click **App Passwords**
3. Click **Generate New Password**
4. Name it `TechGuardian Lead Monitor`
5. Zoho shows you a 16-character string. **Copy it now — you only see it once.**

## 2. Find your IMAP server

Zoho's IMAP host depends on plan + data center:

| Plan                  | Server            |
| --------------------- | ----------------- |
| Zoho Mail (personal)  | `imap.zoho.com`   |
| Zoho Mail Lite / Pro  | `imappro.zoho.com`|
| Zoho EU data center   | `imap.zoho.eu`    |

Default in `settings.yaml` is `imappro.zoho.com`. If you're on the free
personal plan, change it to `imap.zoho.com`.

## 3. Add to .env

```env
ZOHO_EMAIL_USER=repairs@techguardiankc.com
ZOHO_APP_PASSWORD=the-16-char-string-zoho-gave-you
```

## 4. (Optional) Set up Yelp forwarding

If your Yelp Biz account emails go to a different address (like
Gmail), set up a forwarding rule in that inbox so Yelp emails also
land in Zoho. Alternatively, change your Yelp Biz notification email
to your Zoho address.

## 5. (Optional) Hook up Google Voice for call leads

Since you're using your personal cell for business right now, the
cleanest missed-call-to-lead flow is:

1. Set up a free Google Voice number at https://voice.google.com
2. Forward it to your cell (so real calls ring through)
3. In Voice settings → **Voicemail & text** → turn on **Get email
   alerts for missed calls and voicemails**
4. Set the email address to your Zoho address
5. Done — every missed call emails you, the parser catches it, you
   get a new lead row with the caller's number and voicemail transcript

Now your personal cell effectively has a lead-capture system attached
to it, with zero changes to how you answer calls.

## 6. Test it

```bash
cd lead_system
source .venv/bin/activate
python -c "
from lead_system.config import load_config
from lead_system.sources.zoho_email_source import ZohoEmailSource
from lead_system.utils.logger import setup_logging
c = load_config()
setup_logging(log_file=c.log_file())
s = ZohoEmailSource(c, None)
leads = s.fetch()
for l in leads:
    print(f'{l.platform}: {l.title}')
    print(f'  customer={l.author_or_listing_name}  notes={l.notes}')
"
```

If you've got unread Yelp / Voice emails, they'll show up. They also
get marked read (or moved to `Processed-Leads`, depending on the
`processed_folder` setting in `config/settings.yaml`).

---

## Troubleshooting

- **"Zoho IMAP login failed"** → You're using your normal password,
  not the app-specific one. Generate a new one in step 1.
- **Connects but finds 0 messages** → Either your Yelp emails are
  already marked read, or they're in a different folder. Check
  `sources.zoho_email.folder` in `settings.yaml` — default is `INBOX`.
- **Wrong IMAP host** → Try `imap.zoho.com` instead of `imappro.zoho.com`.
- **Parser missed customer name** → The regex in `_parse_yelp` is
  tuned for common Yelp formats but Yelp occasionally changes their
  template. The email still gets ingested — customer name just says
  "Unknown customer". Open `sources/zoho_email_source.py` and add a
  new regex case to `_parse_yelp`.
