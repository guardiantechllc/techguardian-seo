# EspoCRM Setup Guide — Tech Guardian Repair Shop
# Production-Ready Configuration for Electronics Repair Business
# Created: July 2026

---

## TABLE OF CONTENTS

1. Architecture Overview
2. Installation
3. Entity Design & Schema
4. Field Definitions (Copy/Paste Ready)
5. Relationships
6. Formulas
7. Status Pipeline & Kanban
8. Layouts
9. List Views & Filters
10. Dashboards
11. Phase 1 vs Phase 2 Features
12. Automation Suggestions

---

## 1. ARCHITECTURE OVERVIEW

### Entities You Need

| Entity           | Type          | Purpose                                      |
|------------------|---------------|-----------------------------------------------|
| Contact          | Built-in      | Customer records (name, phone, email)         |
| RepairTicket     | Custom Entity | Core repair job tracking                      |
| Device           | Custom Entity | Device catalog linked to customers            |
| Part             | Custom Entity | Parts used in repairs (cost tracking)         |
| Appointment      | Custom Entity | Booking/scheduling                            |

### Why This Structure

- **Contact** (built-in) — EspoCRM already has a solid Contact entity. Don't reinvent it.
- **RepairTicket** — This is your main workflow entity. Everything revolves around it.
- **Device** — Separate from ticket so repeat customers don't re-enter device info.
- **Part** — Track parts cost per ticket for profit calculations.
- **Appointment** — Separate from ticket because appointments happen before a ticket exists.

### Entity Relationships

```
Contact (1) ──── (Many) Device
Contact (1) ──── (Many) RepairTicket
Contact (1) ──── (Many) Appointment
Device   (1) ──── (Many) RepairTicket
RepairTicket (1) ──── (Many) Part
Appointment  (1) ──── (0 or 1) RepairTicket
```

---

## 2. INSTALLATION (Ubuntu/Debian VPS)

### Requirements
- VPS: 1 CPU, 1GB RAM minimum ($5-6/month on DigitalOcean, Hetzner, or Vultr)
- Ubuntu 22.04 or 24.04 LTS
- Domain name (optional but recommended for HTTPS)

### Step-by-Step Install

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install dependencies
sudo apt install -y apache2 mariadb-server php8.1 php8.1-cli php8.1-common \
  php8.1-mysql php8.1-zip php8.1-gd php8.1-mbstring php8.1-curl \
  php8.1-xml php8.1-bcmath php8.1-imap php8.1-intl php8.1-ldap \
  libapache2-mod-php8.1 unzip curl wget

# Note: If on Ubuntu 24.04, replace php8.1 with php8.3 everywhere above

# 3. Enable Apache modules
sudo a2enmod rewrite
sudo systemctl restart apache2

# 4. Secure MariaDB
sudo mysql_secure_installation
# Set root password, answer Y to all prompts

# 5. Create database
sudo mysql -u root -p
```

```sql
CREATE DATABASE espocrm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'espocrm'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON espocrm.* TO 'espocrm'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

```bash
# 6. Download EspoCRM (check https://www.espocrm.com/download/ for latest version)
cd /var/www
sudo wget https://www.espocrm.com/downloads/EspoCRM-8.4.2.zip
sudo unzip EspoCRM-8.4.2.zip
sudo mv EspoCRM-8.4.2 espocrm
sudo chown -R www-data:www-data /var/www/espocrm
sudo chmod -R 755 /var/www/espocrm

# 7. Configure Apache
sudo nano /etc/apache2/sites-available/espocrm.conf
```

Apache config:
```apache
<VirtualHost *:80>
    ServerName crm.yourdomain.com
    DocumentRoot /var/www/espocrm/public

    <Directory /var/www/espocrm/public>
        AllowOverride All
        Require all granted
    </Directory>

    <Directory /var/www/espocrm>
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/espocrm_error.log
    CustomLog ${APACHE_LOG_DIR}/espocrm_access.log combined
</VirtualHost>
```

```bash
# 8. Enable site
sudo a2ensite espocrm.conf
sudo a2dissite 000-default.conf
sudo systemctl restart apache2

# 9. Set up cron job (required for scheduled jobs, workflows, notifications)
sudo crontab -u www-data -e
# Add this line:
# * * * * * cd /var/www/espocrm && php bin/cron.php > /dev/null 2>&1

# 10. Open browser and go to http://your-server-ip
# Follow the web installer:
#   - Database: espocrm / espocrm / YOUR_STRONG_PASSWORD_HERE
#   - Admin user: set your admin username and password
#   - Choose your timezone (America/Chicago for KC)
```

### Optional: HTTPS with Let's Encrypt
```bash
sudo apt install certbot python3-certbot-apache -y
sudo certbot --apache -d crm.yourdomain.com
```

### Post-Install Config

In EspoCRM Admin panel:
1. **Settings** → Set Date Format: `MM/DD/YYYY`, Time Zone: `America/Chicago`
2. **Settings** → Currency: `USD`
3. **Authentication** → Keep default (can add 2FA later)
4. **Outbound Emails** → Set up Gmail SMTP or similar for notifications

---

## 3. ENTITY DESIGN & FULL SCHEMA

### ENTITY: Contact (Built-in — Customize It)

Use the built-in Contact entity. Remove fields you don't need (like "Account", "Title", "Department") and keep it clean for repair customers.

#### Fields to KEEP (built-in):
| Field               | Type         | Notes                        |
|---------------------|--------------|------------------------------|
| First Name          | varchar      | Built-in                     |
| Last Name           | varchar      | Built-in                     |
| Email Address       | email        | Built-in                     |
| Phone Number        | phone        | Built-in                     |
| Address (Street)    | address      | Built-in                     |
| Description         | text         | Use for general notes        |
| Created At          | datetime     | Built-in, auto               |

#### Fields to ADD:
| Field               | Type         | Options / Notes              |
|---------------------|--------------|------------------------------|
| preferredContact    | enum         | Phone, Text, Email           |
| customerSource      | enum         | Walk-in, Google, Yelp, Referral, Social Media, Repeat, Other |
| isVIP               | bool         | Flag for high-value customers |
| totalSpend          | currency     | Manually updated or formula  |
| totalRepairs        | int          | Count of linked tickets      |

#### Fields to REMOVE or HIDE:
- Account (not needed — you're B2C)
- Title
- Department
- Do Not Call (unless you want it)
- Campaign (not needed in Phase 1)
- Any "Opportunity" related fields

---

### ENTITY: RepairTicket (Custom — Create This)

This is your MAIN entity. Everything revolves around this.

**Admin → Entity Manager → Create Entity**
- Name: `RepairTicket`
- Label: `Repair Ticket`
- Label (Plural): `Repair Tickets`
- Type: `Base`
- Check: "Stream" (enables activity log)

#### Complete Field List:

| Field Name           | Label                | Type       | Options / Config                                                  | Required |
|----------------------|----------------------|------------|-------------------------------------------------------------------|----------|
| ticketNumber         | Ticket #             | varchar    | Auto-generated (see formula section)                              | Yes      |
| status               | Status               | enum       | See status list below                                             | Yes      |
| intakeDate           | Intake Date          | date       | Default: today                                                    | Yes      |
| appointmentDate      | Appointment Date     | date       |                                                                   | No       |
| appointmentTime      | Appointment Time     | varchar    | Use varchar for flexibility (e.g. "2:00 PM")                     | No       |
| deviceType           | Device Type          | enum       | iPhone, iPad, Samsung Phone, Samsung Tablet, MacBook, Laptop (Other), PlayStation, Xbox, Nintendo Switch, Steam Deck, Desktop PC, Other |Yes|
| deviceModel          | Device Model         | varchar    | Free text (e.g. "iPhone 15 Pro Max")                             | Yes      |
| serialOrIMEI         | Serial / IMEI        | varchar    |                                                                   | No       |
| deviceCondition      | Device Condition     | enum       | Good, Fair, Poor, Non-functional                                  | No       |
| repairIssue          | Repair Issue         | text       | Description of the problem                                        | Yes      |
| repairType           | Repair Type          | enum       | Screen Repair, Battery Replace, Charging Port, Water Damage, Board Repair, Data Recovery, Diagnostic, Console Repair, Other |No|
| quotedRevenue        | Quoted Revenue       | currency   | What you quoted the customer                                      | Yes      |
| partsCost            | Parts Cost           | currency   | Total parts cost for this job                                     | No       |
| otherJobCost         | Other Job Cost       | currency   | Shipping, labor subcontract, etc.                                 | No       |
| totalJobCost         | Total Job Cost       | currency   | Formula: partsCost + otherJobCost                                 | Auto     |
| grossProfit          | Gross Profit         | currency   | Formula: quotedRevenue - totalJobCost                             | Auto     |
| grossMargin          | Gross Margin %       | float      | Formula: (grossProfit / quotedRevenue) * 100                     | Auto     |
| isSameDay            | Same-Day Repair      | bool       | Default: false                                                    | No       |
| isReadyForPickup     | Ready for Pickup     | bool       | Default: false                                                    | No       |
| isPickedUp           | Picked Up            | bool       | Default: false                                                    | No       |
| isNoShow             | No Show              | bool       | Default: false                                                    | No       |
| pickupDate           | Pickup Date          | date       | Date customer picked up device                                    | No       |
| completedDate        | Completed Date       | date       | Date repair was finished                                          | No       |
| techNotes            | Tech Notes           | text       | Internal notes (not customer-facing)                              | No       |
| customerNotes        | Customer Notes       | text       | What the customer told you                                        | No       |
| partsOrdered         | Parts Ordered        | bool       | Waiting on parts flag                                             | No       |
| partsOrderedDate     | Parts Ordered Date   | date       |                                                                   | No       |
| partsETA             | Parts ETA            | date       |                                                                   | No       |
| warrantyExpires      | Warranty Expires     | date       | Auto: intakeDate + 45 days (formula)                              | Auto     |
| paymentMethod        | Payment Method       | enum       | Cash, Card, Square, Zelle, Other                                  | No       |
| paymentReceived      | Payment Received     | bool       | Default: false                                                    | No       |

#### Status Options (in exact order for pipeline):

| Value              | Label              | Style/Color    |
|--------------------|--------------------|----------------|
| New Intake         | New Intake         | Primary (blue) |
| Booked             | Booked             | Info (cyan)    |
| Dropped Off        | Dropped Off        | Default (gray) |
| In Progress        | In Progress        | Warning (amber)|
| Waiting on Parts   | Waiting on Parts   | Danger (red)   |
| Ready for Pickup   | Ready for Pickup   | Success (green)|
| Picked Up          | Picked Up          | Success (green)|
| No Show            | No Show            | Danger (red)   |
| Cancelled          | Cancelled          | Default (gray) |

---

### ENTITY: Device (Custom — Create This)

Separate entity so repeat customers keep their device history.

**Admin → Entity Manager → Create Entity**
- Name: `Device`
- Label: `Device`
- Label (Plural): `Devices`
- Type: `Base`

#### Fields:

| Field Name         | Label              | Type       | Options / Config                                                  | Required |
|--------------------|--------------------|------------|-------------------------------------------------------------------|----------|
| deviceType         | Device Type        | enum       | Same options as RepairTicket.deviceType                           | Yes      |
| deviceModel        | Model              | varchar    | e.g. "iPhone 15 Pro Max 256GB Blue"                              | Yes      |
| serialOrIMEI       | Serial / IMEI      | varchar    |                                                                   | No       |
| color              | Color              | varchar    |                                                                   | No       |
| storageSize        | Storage            | varchar    | e.g. "256GB"                                                     | No       |
| condition          | Condition          | enum       | Good, Fair, Poor, Non-functional                                  | No       |
| notes              | Notes              | text       |                                                                   | No       |
| totalRepairs       | Total Repairs      | int        | Count of linked tickets                                           | No       |

---

### ENTITY: Part (Custom — Create This)

Track individual parts used per repair. Linked to RepairTicket.

**Admin → Entity Manager → Create Entity**
- Name: `Part`
- Label: `Part`
- Label (Plural): `Parts`
- Type: `Base`

#### Fields:

| Field Name         | Label              | Type       | Options / Config                                                  | Required |
|--------------------|--------------------|------------|-------------------------------------------------------------------|----------|
| partName           | Part Name          | varchar    | e.g. "iPhone 15 Pro OLED Screen - OEM"                           | Yes      |
| partType           | Part Type          | enum       | Screen, Battery, Charging Port, Logic Board, Housing, Cable, Connector, IC Chip, Other |No|
| partQuality        | Quality            | enum       | OEM, Aftermarket, Refurbished, Used                               | No       |
| cost               | Cost               | currency   | What you paid                                                     | Yes      |
| supplier           | Supplier           | varchar    |                                                                   | No       |
| trackingNumber     | Tracking #         | varchar    | Shipping tracking for ordered parts                               | No       |
| isOrdered          | Ordered            | bool       | Default: false                                                    | No       |
| isReceived         | Received           | bool       | Default: false                                                    | No       |
| orderDate          | Order Date         | date       |                                                                   | No       |
| receivedDate       | Received Date      | date       |                                                                   | No       |
| notes              | Notes              | text       |                                                                   | No       |

---

### ENTITY: Appointment (Custom — Create This)

For pre-booking before a ticket is created.

**Admin → Entity Manager → Create Entity**
- Name: `Appointment`
- Label: `Appointment`
- Label (Plural): `Appointments`
- Type: `Event` (gives you calendar features for free)

#### Fields:

| Field Name         | Label              | Type       | Options / Config                                                  | Required |
|--------------------|--------------------|------------|-------------------------------------------------------------------|----------|
| name               | Title              | varchar    | Auto: "Appointment - [Customer Name]"                             | Yes      |
| dateStart          | Date/Time          | datetime   | Built-in for Event type                                           | Yes      |
| dateEnd            | End Time           | datetime   | Built-in for Event type                                           | Yes      |
| status             | Status             | enum       | Scheduled, Confirmed, Arrived, No Show, Cancelled                 | Yes      |
| deviceType         | Device Type        | enum       | Same as above                                                     | No       |
| issueDescription   | Issue              | text       | Brief description                                                 | No       |
| notes              | Notes              | text       |                                                                   | No       |
| convertedToTicket  | Converted to Ticket| bool       | Default: false                                                    | No       |

---

## 4. RELATIONSHIPS

Set these up in **Admin → Entity Manager → [Entity] → Relationships**

### Contact Relationships:
| Relationship        | Type        | Related Entity  | Notes                          |
|---------------------|-------------|-----------------|--------------------------------|
| Contact → Devices   | One-to-Many | Device          | Customer owns many devices     |
| Contact → Tickets   | One-to-Many | RepairTicket    | Customer has many repair jobs   |
| Contact → Appointments | One-to-Many | Appointment  | Customer has many appointments  |

### RepairTicket Relationships:
| Relationship             | Type        | Related Entity  | Notes                          |
|--------------------------|-------------|-----------------|--------------------------------|
| RepairTicket → Contact   | Many-to-One | Contact         | Each ticket belongs to 1 customer |
| RepairTicket → Device    | Many-to-One | Device          | Each ticket is for 1 device    |
| RepairTicket → Parts     | One-to-Many | Part            | Each ticket can use many parts  |
| RepairTicket → Appointment | One-to-One | Appointment    | Optional link to appointment    |

### Device Relationships:
| Relationship           | Type        | Related Entity  | Notes                          |
|------------------------|-------------|-----------------|--------------------------------|
| Device → Contact       | Many-to-One | Contact         | Each device belongs to 1 customer |
| Device → RepairTickets | One-to-Many | RepairTicket    | Device can have repair history  |

### Part Relationships:
| Relationship         | Type        | Related Entity  | Notes                          |
|----------------------|-------------|-----------------|--------------------------------|
| Part → RepairTicket  | Many-to-One | RepairTicket    | Each part belongs to 1 ticket  |

### Appointment Relationships:
| Relationship              | Type        | Related Entity  | Notes                          |
|---------------------------|-------------|-----------------|--------------------------------|
| Appointment → Contact     | Many-to-One | Contact         | Each appointment for 1 customer |
| Appointment → RepairTicket | One-to-One | RepairTicket    | Optional conversion to ticket   |

---

## 5. FORMULAS

In EspoCRM, go to **Admin → Entity Manager → RepairTicket → Formula**

### Ticket Number (Auto-Generate)
```
// Before Save formula
ifThen(
  entity\isNew(),
  entity\setAttribute('ticketNumber', string\concatenate('TG-', number\format(entity\attribute('id'), 0)))
);
```

Alternative approach — use a number field with auto-increment:
- Create `ticketNumber` as type `autoincrement` if your EspoCRM version supports it
- Prefix will show as just a number, but you can format the display in the layout

### Total Job Cost
```
$totalJobCost = ifThenElse(
  entity\attribute('partsCost') != null || entity\attribute('otherJobCost') != null,
  number\summation(
    ifThenElse(entity\attribute('partsCost') != null, entity\attribute('partsCost'), 0),
    ifThenElse(entity\attribute('otherJobCost') != null, entity\attribute('otherJobCost'), 0)
  ),
  null
);
entity\setAttribute('totalJobCost', $totalJobCost);
```

### Gross Profit
```
$quotedRevenue = entity\attribute('quotedRevenue');
$totalJobCost = entity\attribute('totalJobCost');

ifThen(
  $quotedRevenue != null && $totalJobCost != null,
  entity\setAttribute('grossProfit', number\subtraction($quotedRevenue, $totalJobCost))
);
```

### Gross Margin %
```
$quotedRevenue = entity\attribute('quotedRevenue');
$grossProfit = entity\attribute('grossProfit');

ifThen(
  $quotedRevenue != null && $quotedRevenue > 0 && $grossProfit != null,
  entity\setAttribute('grossMargin', number\round(number\division($grossProfit, $quotedRevenue) * 100, 1))
);
```

### Warranty Expiration (45 days from intake)
```
$intakeDate = entity\attribute('intakeDate');

ifThen(
  $intakeDate != null,
  entity\setAttribute('warrantyExpires', datetime\addDays($intakeDate, 45))
);
```

### Auto-Set Boolean Flags Based on Status
```
$status = entity\attribute('status');

// Ready for Pickup
ifThen(
  $status == 'Ready for Pickup',
  entity\setAttribute('isReadyForPickup', true)
);

// Picked Up
ifThen(
  $status == 'Picked Up',
  entity\setAttribute('isPickedUp', true);
  entity\setAttribute('pickupDate', datetime\today())
);

// No Show
ifThen(
  $status == 'No Show',
  entity\setAttribute('isNoShow', true)
);

// Same-day check
ifThen(
  $status == 'Picked Up' && entity\attribute('intakeDate') == datetime\today(),
  entity\setAttribute('isSameDay', true)
);
```

### Full Before-Save Formula (combine all above)

Paste this into **Admin → Entity Manager → RepairTicket → Formula**:

```
// --- Auto Ticket Number ---
ifThen(
  entity\isNew(),
  entity\setAttribute('ticketNumber', string\concatenate('TG-', number\format(entity\attribute('id'), 0)))
);

// --- Total Job Cost ---
$pc = ifThenElse(entity\attribute('partsCost') != null, entity\attribute('partsCost'), 0);
$ojc = ifThenElse(entity\attribute('otherJobCost') != null, entity\attribute('otherJobCost'), 0);
$totalJobCost = number\summation($pc, $ojc);
entity\setAttribute('totalJobCost', $totalJobCost);

// --- Gross Profit ---
$quotedRevenue = entity\attribute('quotedRevenue');
ifThen(
  $quotedRevenue != null,
  entity\setAttribute('grossProfit', number\subtraction($quotedRevenue, $totalJobCost))
);

// --- Gross Margin % ---
$grossProfit = entity\attribute('grossProfit');
ifThen(
  $quotedRevenue != null && $quotedRevenue > 0 && $grossProfit != null,
  entity\setAttribute('grossMargin', number\round(number\division($grossProfit, $quotedRevenue) * 100, 1))
);

// --- Warranty Expiration (45 days) ---
$intakeDate = entity\attribute('intakeDate');
ifThen(
  $intakeDate != null,
  entity\setAttribute('warrantyExpires', datetime\addDays($intakeDate, 45))
);

// --- Status-Based Flags ---
$status = entity\attribute('status');

ifThen($status == 'Ready for Pickup', entity\setAttribute('isReadyForPickup', true));

ifThen(
  $status == 'Picked Up',
  entity\setAttribute('isPickedUp', true);
  entity\setAttribute('pickupDate', datetime\today())
);

ifThen($status == 'No Show', entity\setAttribute('isNoShow', true));

ifThen(
  $status == 'Picked Up' && entity\attribute('intakeDate') == datetime\today(),
  entity\setAttribute('isSameDay', true)
);
```

---

## 6. STATUS PIPELINE / KANBAN SETUP

### Enable Kanban View

1. **Admin → Entity Manager → RepairTicket → Edit**
2. Check **"Kanban"** option
3. Set **"Kanban Status Field"** to `status`
4. Save

### Configure Kanban Board

1. Go to **Repair Tickets** list view
2. Click the layout icon (top right) → Choose **"Kanban"**
3. Your columns will be the status values in order:

```
| New Intake | Booked | Dropped Off | In Progress | Waiting on Parts | Ready for Pickup | Picked Up | No Show | Cancelled |
```

4. Drag tickets between columns to update status
5. In **Admin → Entity Manager → RepairTicket → Fields → status**:
   - Set the order of options exactly as listed above
   - This controls the column order in Kanban

### Kanban Card Display

In **Admin → Layout Manager → RepairTicket → Kanban**:

Show these fields on each card:
- Ticket # (ticketNumber)
- Device Type (deviceType)
- Device Model (deviceModel)
- Customer Name (contactName — from relationship)
- Quoted Revenue (quotedRevenue)

---

## 7. LAYOUTS — DETAIL VIEW

### RepairTicket Detail View Layout

Go to **Admin → Layout Manager → RepairTicket → Detail**

#### Row 1: Header Info
| Left Column          | Right Column         |
|----------------------|----------------------|
| Ticket #             | Status               |
| Intake Date          | Completed Date       |

#### Row 2: Customer & Device
| Left Column          | Right Column         |
|----------------------|----------------------|
| Contact (link)       | Device (link)        |
| Device Type          | Device Model         |
| Serial / IMEI        | Device Condition     |

#### Row 3: Repair Details
| Left Column          | Right Column         |
|----------------------|----------------------|
| Repair Issue (wide)  |                      |
| Repair Type          |                      |

#### Row 4: Scheduling
| Left Column          | Right Column         |
|----------------------|----------------------|
| Appointment Date     | Appointment Time     |

#### Row 5: Financials
| Left Column          | Right Column         |
|----------------------|----------------------|
| Quoted Revenue       | Parts Cost           |
| Other Job Cost       | Total Job Cost       |
| Gross Profit         | Gross Margin %       |

#### Row 6: Payment
| Left Column          | Right Column         |
|----------------------|----------------------|
| Payment Method       | Payment Received     |

#### Row 7: Status Flags
| Left Column          | Right Column         |
|----------------------|----------------------|
| Same-Day Repair      | Ready for Pickup     |
| Picked Up            | No Show              |
| Pickup Date          | Warranty Expires     |

#### Row 8: Parts Tracking
| Left Column          | Right Column         |
|----------------------|----------------------|
| Parts Ordered        | Parts Ordered Date   |
| Parts ETA            |                      |

#### Row 9: Notes (Full Width)
| Full Width           |
|----------------------|
| Customer Notes       |
| Tech Notes           |

#### Bottom Panel:
- **Parts** (related list — shows linked Part records)
- **Stream** (activity/updates log)

---

## 8. LIST VIEWS & SAVED FILTERS

### RepairTicket Default List View

**Admin → Layout Manager → RepairTicket → List**

Columns (in order):
1. Ticket #
2. Status
3. Contact (customer name)
4. Device Type
5. Device Model
6. Repair Issue
7. Quoted Revenue
8. Intake Date
9. Same-Day Repair

### Saved Filters (Create These)

After setting up, go to **Repair Tickets → List View** and create these saved filters:

#### "Ready for Pickup" Queue
```
Status = Ready for Pickup
Sort by: Completed Date (oldest first)
```

#### "Waiting on Parts"
```
Status = Waiting on Parts
Sort by: Parts ETA (soonest first)
```

#### "Today's Intakes"
```
Intake Date = Today
Sort by: Created At (newest first)
```

#### "In Progress"
```
Status = In Progress
Sort by: Intake Date (oldest first — FIFO)
```

#### "No Shows"
```
Status = No Show
Sort by: Appointment Date (newest first)
```

#### "This Week Revenue"
```
Status = Picked Up
Pickup Date = This Week
```

#### "Unpaid"
```
Payment Received = No
Status = Picked Up OR Ready for Pickup
```

#### "Active Tickets" (most used)
```
Status NOT IN: Picked Up, No Show, Cancelled
Sort by: Intake Date (oldest first)
```

---

## 9. DASHBOARDS

### Main Dashboard Setup

Go to **Dashboard** (home) → Click **"Edit Dashboard"** → Add these dashlets:

#### Row 1: At-a-Glance Counts
| Dashlet                    | Type          | Filter                            |
|----------------------------|---------------|-----------------------------------|
| Active Tickets             | Record List   | Status NOT IN: Picked Up, No Show, Cancelled |
| Ready for Pickup           | Record List   | Status = Ready for Pickup         |
| Waiting on Parts           | Record List   | Status = Waiting on Parts         |

#### Row 2: Financial
| Dashlet                    | Type          | Filter                            |
|----------------------------|---------------|-----------------------------------|
| Revenue This Month         | Report (chart)| Sum of quotedRevenue where Status = Picked Up, Pickup Date = This Month |
| Tickets This Month         | Report (chart)| Count where Status = Picked Up, Pickup Date = This Month |

#### Row 3: Pipeline
| Dashlet                    | Type          | Filter                            |
|----------------------------|---------------|-----------------------------------|
| Kanban Board               | iframe/link   | Link to Repair Tickets Kanban     |
| Today's Appointments       | Record List   | Appointment Date = Today          |

#### Row 4: Alerts
| Dashlet                    | Type          | Filter                            |
|----------------------------|---------------|-----------------------------------|
| No Shows This Week         | Record List   | Status = No Show, Appointment Date = This Week |
| Overdue Pickups (3+ days)  | Record List   | Status = Ready for Pickup, Completed Date < 3 days ago |

### Reports to Create (for Dashboard Charts)

EspoCRM has built-in Reports. Create these:

1. **Monthly Revenue**
   - Entity: RepairTicket
   - Type: List + Total
   - Filter: Status = Picked Up
   - Group By: Month (pickupDate)
   - Column: SUM of quotedRevenue

2. **Revenue by Device Type**
   - Entity: RepairTicket
   - Type: Grid
   - Filter: Status = Picked Up
   - Group By: deviceType
   - Column: SUM of quotedRevenue, COUNT

3. **Monthly Profit**
   - Entity: RepairTicket
   - Type: List + Total
   - Filter: Status = Picked Up
   - Group By: Month (pickupDate)
   - Column: SUM of grossProfit

4. **Average Ticket Value**
   - Entity: RepairTicket
   - Type: Grid
   - Filter: Status = Picked Up
   - Group By: Month (pickupDate)
   - Column: AVG of quotedRevenue

5. **Same-Day Rate**
   - Entity: RepairTicket
   - Type: Grid
   - Filter: Status = Picked Up
   - Group By: Month (pickupDate)
   - Columns: COUNT total, COUNT where isSameDay = true

---

## 10. ENTITY CREATION ORDER (Step by Step)

Follow this exact order to avoid dependency issues:

### Step 1: Create Custom Entities
1. **Device** entity
2. **Part** entity
3. **RepairTicket** entity
4. **Appointment** entity (type: Event)

### Step 2: Add Fields (in this order)
1. **Contact** — add custom fields (preferredContact, customerSource, isVIP)
2. **Device** — add all fields
3. **Part** — add all fields
4. **RepairTicket** — add ALL fields from the table above
5. **Appointment** — add all fields

### Step 3: Create Relationships
1. Contact → Device (One-to-Many)
2. Contact → RepairTicket (One-to-Many)
3. Contact → Appointment (One-to-Many)
4. Device → RepairTicket (One-to-Many)
5. RepairTicket → Part (One-to-Many)
6. Appointment → RepairTicket (One-to-One)

### Step 4: Add Formulas
1. Paste the full before-save formula into RepairTicket

### Step 5: Configure Layouts
1. RepairTicket Detail View
2. RepairTicket List View
3. RepairTicket Kanban
4. Device Detail/List View
5. Part Detail/List View
6. Contact Detail View (add Device and RepairTicket panels)
7. Appointment Detail/List View

### Step 6: Create Saved Filters
1. All filters listed in Section 8

### Step 7: Set Up Dashboard
1. All dashlets listed in Section 9

### Step 8: Clean Up Contact Entity
1. Remove/hide unnecessary built-in fields (Account, Title, etc.)
2. Add RepairTicket and Device panels to Contact detail view

---

## 11. PHASE 1 vs PHASE 2

### PHASE 1 — Do Now (Week 1-2)

| Feature                    | Priority | Notes                              |
|----------------------------|----------|------------------------------------|
| Install EspoCRM            | Must     | VPS setup                          |
| Create RepairTicket entity | Must     | All fields                         |
| Create Device entity       | Must     | Basic device tracking              |
| Create Part entity         | Must     | Cost tracking                      |
| Customize Contact          | Must     | Clean up for repair customers      |
| Set up Kanban              | Must     | Visual pipeline                    |
| Add formulas               | Must     | Profit calculations                |
| Saved filters              | Must     | Ready for pickup queue, etc.       |
| Dashboard basics           | Must     | Active tickets, pickup queue       |
| Start entering real data   | Must     | Use it from day one                |

### PHASE 2 — Add Later (Month 2-3)

| Feature                    | Priority | Notes                              |
|----------------------------|----------|------------------------------------|
| Appointment entity         | Should   | Pre-booking + calendar view        |
| Email notifications        | Should   | "Your device is ready" emails      |
| SMS notifications          | Could    | Via Twilio integration             |
| Workflow automations        | Should   | Auto status change triggers        |
| Customer portal            | Could    | Let customers check status online  |
| Receipt/invoice generation | Should   | PDF from ticket data               |
| Inventory tracking         | Could    | Parts stock levels                 |
| Technician assignment      | Should   | If team grows                      |
| Multi-location support     | Could    | When you expand                    |
| API integration w/ Square  | Could    | Auto-sync payments                 |

---

## 12. AUTOMATION SUGGESTIONS (Phase 2)

These use EspoCRM's built-in **Workflows** (Admin → Workflows):

### 1. Auto-Email: "Your Device is Ready"
- **Trigger:** RepairTicket status changes to "Ready for Pickup"
- **Action:** Send email to linked Contact
- **Template:** "Hi {contactName}, your {deviceModel} repair is complete and ready for pickup at Tech Guardian. Call (816) 697-9268 with any questions."

### 2. Auto-Email: "Appointment Reminder"
- **Trigger:** Appointment dateStart is in 24 hours
- **Action:** Send email to linked Contact
- **Template:** "Reminder: You have a repair appointment tomorrow at Tech Guardian."

### 3. Auto-Status: Mark Overdue
- **Trigger:** Scheduled (daily check)
- **Condition:** Status = "Ready for Pickup" AND completedDate < 7 days ago
- **Action:** Create activity note "Customer hasn't picked up in 7+ days"

### 4. Auto-Flag: No Show Detection
- **Trigger:** Appointment status changes to "No Show"
- **Condition:** Linked RepairTicket exists
- **Action:** Set RepairTicket status to "No Show", set isNoShow = true

### 5. Auto-Email: Follow-Up After Pickup
- **Trigger:** RepairTicket status changes to "Picked Up"
- **Delay:** 3 days
- **Action:** Send email asking for Google review
- **Template:** "Thanks for choosing Tech Guardian! If we did a great job, we'd appreciate a review: [Google Review Link]"

### 6. Auto-Calculate: Contact Total Spend
- **Trigger:** RepairTicket status changes to "Picked Up"
- **Action:** Update Contact.totalSpend = SUM of all linked RepairTicket.quotedRevenue

---

## QUICK REFERENCE CARD

### Daily Workflow

```
Morning:
  1. Open Dashboard → Check "Ready for Pickup" queue
  2. Check "Waiting on Parts" → any ETAs today?
  3. Check "Today's Appointments"

When customer walks in:
  1. Search Contact by phone number
  2. If new → Create Contact → Create Device → Create RepairTicket
  3. If returning → Open Contact → Create new RepairTicket (link existing Device)
  4. Set status: "Dropped Off" (or "New Intake" if just quoting)
  5. Enter quoted revenue

During repair:
  1. Change status to "In Progress"
  2. Add Part records with costs
  3. Update tech notes

When done:
  1. Change status to "Ready for Pickup"
  2. Profit auto-calculates
  3. Customer gets notified (Phase 2)

Customer picks up:
  1. Change status to "Picked Up"
  2. Set payment method + payment received = Yes
  3. Done — next ticket

End of day:
  1. Check Kanban for anything stuck
  2. Review day's numbers on dashboard
```

### Key Shortcuts

| Action                    | Where                                   |
|---------------------------|-----------------------------------------|
| New ticket                | Quick Create (+) → Repair Ticket        |
| Find customer             | Global search (top bar) → type phone #  |
| Kanban board              | Repair Tickets → Kanban tab             |
| Ready for pickup list     | Repair Tickets → Saved Filter           |
| Monthly revenue           | Dashboard or Reports                    |
| Customer history          | Contact → Repair Tickets panel          |

---

## BACKUP STRATEGY

```bash
# Add to crontab — daily database backup
0 2 * * * mysqldump -u espocrm -pYOUR_PASSWORD espocrm | gzip > /home/backups/espocrm_$(date +\%Y\%m\%d).sql.gz

# Keep 30 days of backups
0 3 * * * find /home/backups -name "espocrm_*.sql.gz" -mtime +30 -delete
```

---

## COST SUMMARY

| Item                     | Monthly Cost  | Notes                     |
|--------------------------|---------------|---------------------------|
| EspoCRM Software         | $0            | Open source, forever free |
| VPS (DigitalOcean/Vultr) | $5-6          | 1GB RAM sufficient        |
| Domain (optional)        | ~$1           | $12/year                  |
| SSL Certificate          | $0            | Let's Encrypt             |
| **Total**                | **$5-7/month**| No feature gates, no trials |

---

## NOTES

- EspoCRM is fully open source (GPLv3). No features are locked behind a paywall.
- The "Advanced Pack" extension ($150 one-time) adds BPM workflows and more advanced
  reporting. Not needed for Phase 1, but worth it later.
- You can export all data to CSV at any time from any list view.
- Mobile: EspoCRM is responsive — works in mobile browser. No app needed.
- Updates: Run `php command.php upgrade` periodically for security updates.
