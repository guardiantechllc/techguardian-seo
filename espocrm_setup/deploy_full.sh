#!/usr/bin/env bash
# ============================================================
# Tech Guardian — Full EspoCRM entity deployer
#
# Creates TWO custom entities in your running EspoCRM container:
#   1. Lead         — for the Python pipeline (Yelp, Craigslist, Reddit)
#   2. RepairTicket — repair jobs, pricing, pipeline tracking
#
# Matches your Airtable base schema exactly so both systems
# stay in sync.
#
# Usage (SSH into your VPS first):
#   curl -fsSL <raw_url> -o deploy_full.sh
#   chmod +x deploy_full.sh
#   ./deploy_full.sh espocrm
# ============================================================

set -euo pipefail

CONTAINER="${1:-espocrm}"
CB="/var/www/html/custom/Espo/Custom"

echo "=============================================="
echo "  Tech Guardian — Full EspoCRM Deployer"
echo "  Container: $CONTAINER"
echo "=============================================="

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo "ERROR: Container '$CONTAINER' not running."
    docker ps --format '  {{.Names}}  ({{.Image}})'
    exit 1
fi

echo ""
echo "[1/12] Creating directories..."
docker exec "$CONTAINER" bash -c "
mkdir -p ${CB}/Resources/metadata/entityDefs
mkdir -p ${CB}/Resources/metadata/scopes
mkdir -p ${CB}/Resources/metadata/clientDefs
mkdir -p ${CB}/Resources/layouts/Lead
mkdir -p ${CB}/Resources/layouts/RepairTicket
mkdir -p ${CB}/Resources/i18n/en_US
mkdir -p ${CB}/Hooks/Lead
mkdir -p ${CB}/Hooks/RepairTicket
"

# ==============================================================
#  LEAD ENTITY — Python pipeline writes here
# ==============================================================

echo "[2/12] Lead — entityDefs..."
docker exec "$CONTAINER" bash -c "cat > ${CB}/Resources/metadata/entityDefs/Lead.json" << 'EOF'
{
    "fields": {
        "name": {
            "type": "varchar",
            "maxLength": 200,
            "required": true
        },
        "leadId": {
            "type": "varchar",
            "maxLength": 20,
            "readOnly": true,
            "unique": true,
            "index": true
        },
        "source": {
            "type": "enum",
            "options": ["", "craigslist", "reddit", "zoho_email", "manual", "phone", "yelp", "google", "facebook", "website"],
            "isSorted": false
        },
        "platform": {
            "type": "varchar",
            "maxLength": 200
        },
        "customerName": {
            "type": "varchar",
            "maxLength": 200
        },
        "phoneNumber": {
            "type": "phone"
        },
        "email": {
            "type": "email"
        },
        "textSnippet": {
            "type": "text",
            "rowsMin": 3
        },
        "url": {
            "type": "url"
        },
        "cityOrLocation": {
            "type": "varchar",
            "maxLength": 100
        },
        "matchedKeywords": {
            "type": "text"
        },
        "leadType": {
            "type": "varchar",
            "maxLength": 50
        },
        "intentScore": {
            "type": "int",
            "min": 1,
            "max": 5
        },
        "outreachDraft": {
            "type": "text",
            "rowsMin": 3
        },
        "outreachVariants": {
            "type": "text"
        },
        "status": {
            "type": "enum",
            "options": ["New", "Reviewed", "Contacted", "Skipped", "Booked"],
            "default": "New",
            "style": {
                "New": "primary",
                "Reviewed": "info",
                "Contacted": "warning",
                "Skipped": "danger",
                "Booked": "success"
            },
            "audited": true
        },
        "notes": {
            "type": "text"
        },
        "assignedUser": {
            "type": "link"
        },
        "teams": {
            "type": "linkMultiple"
        },
        "createdAt": {
            "type": "datetime",
            "readOnly": true
        },
        "modifiedAt": {
            "type": "datetime",
            "readOnly": true
        }
    },
    "links": {
        "assignedUser": {
            "type": "belongsTo",
            "entity": "User"
        },
        "teams": {
            "type": "hasMany",
            "entity": "Team",
            "relationName": "entityTeam",
            "layoutRelationshipsDisabled": true
        }
    },
    "collection": {
        "orderBy": "createdAt",
        "order": "desc",
        "textFilterFields": ["name", "leadId", "customerName", "platform"]
    },
    "indexes": {
        "leadId": {"columns": ["leadId"], "unique": true},
        "status": {"columns": ["status"]},
        "createdAt": {"columns": ["createdAt"]}
    }
}
EOF

echo "[3/12] Lead — scopes..."
docker exec "$CONTAINER" bash -c "cat > ${CB}/Resources/metadata/scopes/Lead.json" << 'EOF'
{
    "entity": true,
    "layouts": true,
    "tab": true,
    "acl": true,
    "customizable": true,
    "importable": true,
    "notifications": true,
    "stream": true,
    "disabled": false,
    "type": "Base",
    "module": "Custom",
    "isCustom": true,
    "kanbanStatusIgnoreList": ["Skipped", "Booked"],
    "color": "#2196F3",
    "iconClass": "fas fa-bullseye"
}
EOF

echo "[4/12] Lead — clientDefs..."
docker exec "$CONTAINER" bash -c "cat > ${CB}/Resources/metadata/clientDefs/Lead.json" << 'EOF'
{
    "controller": "controllers/record",
    "statusField": "status",
    "kanbanViewMode": true,
    "filterList": ["status", "source", "intentScore", "assignedUser"],
    "iconClass": "fas fa-bullseye",
    "color": "#2196F3"
}
EOF

echo "[5/12] Lead — layouts..."
docker exec "$CONTAINER" bash -c "cat > ${CB}/Resources/layouts/Lead/detail.json" << 'EOF'
[
    {
        "label": "Lead Info",
        "rows": [
            [{"name": "leadId"}, {"name": "status"}],
            [{"name": "name", "fullWidth": true}],
            [{"name": "source"}, {"name": "platform"}],
            [{"name": "intentScore"}, {"name": "leadType"}]
        ]
    },
    {
        "label": "Contact",
        "rows": [
            [{"name": "customerName"}, {"name": "phoneNumber"}],
            [{"name": "email"}, {"name": "cityOrLocation"}],
            [{"name": "url"}, false]
        ]
    },
    {
        "label": "Content",
        "rows": [
            [{"name": "textSnippet", "fullWidth": true}],
            [{"name": "matchedKeywords", "fullWidth": true}]
        ]
    },
    {
        "label": "Outreach Drafts",
        "rows": [
            [{"name": "outreachDraft", "fullWidth": true}],
            [{"name": "outreachVariants", "fullWidth": true}]
        ]
    },
    {
        "label": "Tracking",
        "rows": [
            [{"name": "assignedUser"}, false],
            [{"name": "notes", "fullWidth": true}]
        ]
    }
]
EOF

docker exec "$CONTAINER" bash -c "cat > ${CB}/Resources/layouts/Lead/list.json" << 'EOF'
[
    {"name": "leadId", "width": 8, "link": true},
    {"name": "name", "width": 20, "link": true},
    {"name": "status", "width": 10},
    {"name": "source", "width": 10},
    {"name": "customerName", "width": 14},
    {"name": "intentScore", "width": 8},
    {"name": "cityOrLocation", "width": 12},
    {"name": "createdAt", "width": 12}
]
EOF

docker exec "$CONTAINER" bash -c "cat > ${CB}/Resources/layouts/Lead/listSmall.json" << 'EOF'
[
    {"name": "leadId", "link": true},
    {"name": "name", "link": true},
    {"name": "status"},
    {"name": "source"}
]
EOF

echo "[6/12] Lead — i18n..."
docker exec "$CONTAINER" bash -c "cat > ${CB}/Resources/i18n/en_US/Lead.json" << 'EOF'
{
    "labels": {
        "Create Lead": "New Lead"
    },
    "fields": {
        "name": "Title",
        "leadId": "Lead ID",
        "source": "Source",
        "platform": "Platform",
        "customerName": "Customer Name",
        "phoneNumber": "Phone",
        "email": "Email",
        "textSnippet": "Post / Message",
        "url": "Source URL",
        "cityOrLocation": "City / Location",
        "matchedKeywords": "Matched Keywords",
        "leadType": "Lead Type",
        "intentScore": "Intent Score",
        "outreachDraft": "Best Outreach Draft",
        "outreachVariants": "All Draft Variants",
        "status": "Status",
        "notes": "Notes",
        "assignedUser": "Assigned To"
    },
    "tooltips": {
        "leadId": "Auto-generated: TGL-0001, TGL-0002, etc.",
        "intentScore": "1 = cold, 5 = hot. Set by the scoring pipeline.",
        "outreachDraft": "Best of 3 generated variants. Review before sending."
    }
}
EOF

echo "[7/12] Lead — TGL-#### hook..."
docker exec "$CONTAINER" bash -c "cat > ${CB}/Hooks/Lead/LeadId.php" << 'PHPEOF'
<?php
namespace Espo\Custom\Hooks\Lead;

use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

class LeadId
{
    public static int $order = 1;
    private EntityManager $entityManager;

    public function __construct(EntityManager $entityManager)
    {
        $this->entityManager = $entityManager;
    }

    public function beforeSave(Entity $entity, array $options): void
    {
        if (!$entity->isNew() || $entity->get('leadId')) {
            return;
        }
        $collection = $this->entityManager
            ->getRDBRepository('Lead')
            ->select(['leadId'])
            ->order('createdAt', 'DESC')
            ->limit(0, 100)
            ->find();

        $max = 0;
        foreach ($collection as $record) {
            $id = $record->get('leadId');
            if ($id && preg_match('/TGL-(\d+)/', $id, $m)) {
                $num = (int) $m[1];
                if ($num > $max) $max = $num;
            }
        }
        $entity->set('leadId', sprintf('TGL-%04d', $max + 1));
    }
}
PHPEOF

# ==============================================================
#  REPAIR TICKET ENTITY — matches Airtable Repairs table
# ==============================================================

echo "[8/12] RepairTicket — entityDefs..."
docker exec "$CONTAINER" bash -c "cat > ${CB}/Resources/metadata/entityDefs/RepairTicket.json" << 'EOF'
{
    "fields": {
        "name": {
            "type": "varchar",
            "maxLength": 200,
            "required": true
        },
        "ticketId": {
            "type": "varchar",
            "maxLength": 20,
            "readOnly": true,
            "unique": true,
            "index": true
        },
        "status": {
            "type": "enum",
            "options": ["New Lead", "Diagnosed", "Awaiting Parts", "In Progress", "Ready for Pickup", "Completed", "No Fix", "No Show"],
            "default": "New Lead",
            "style": {
                "New Lead": "primary",
                "Diagnosed": "info",
                "Awaiting Parts": "warning",
                "In Progress": "info",
                "Ready for Pickup": "success",
                "Completed": "success",
                "No Fix": "danger",
                "No Show": "danger"
            },
            "audited": true
        },
        "customerName": {
            "type": "varchar",
            "maxLength": 200,
            "required": true
        },
        "phoneNumber": {
            "type": "phone"
        },
        "email": {
            "type": "email"
        },
        "deviceType": {
            "type": "enum",
            "options": ["", "PS5", "PS4", "Xbox Series X", "Xbox Series S", "Xbox One", "Nintendo Switch", "iPhone", "iPad", "MacBook", "PC / Laptop", "Android Phone", "Android Tablet", "Other"]
        },
        "deviceModel": {
            "type": "varchar",
            "maxLength": 100
        },
        "repairIssue": {
            "type": "enum",
            "options": ["", "HDMI Port", "No Signal / Black Screen", "Disc Drive", "Overheating", "Power Issue", "Controller Drift", "Screen Replacement", "Battery Replacement", "Charging Port", "Water Damage", "Software Issue", "Other"]
        },
        "issueDescription": {
            "type": "text",
            "required": true,
            "rowsMin": 3
        },
        "intakeDate": {
            "type": "date"
        },
        "dateOut": {
            "type": "date"
        },
        "appointmentDate": {
            "type": "date"
        },
        "appointmentTime": {
            "type": "enum",
            "options": ["", "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM"]
        },
        "sameDayFlag": {
            "type": "bool",
            "default": false
        },
        "quotedRevenue": {
            "type": "currency"
        },
        "partsCost": {
            "type": "currency"
        },
        "otherCost": {
            "type": "currency"
        },
        "totalJobCost": {
            "type": "currency",
            "readOnly": true
        },
        "grossProfit": {
            "type": "currency",
            "readOnly": true
        },
        "leadSource": {
            "type": "enum",
            "options": ["", "Yelp", "Google", "Facebook", "Craigslist", "Reddit", "Walk-in", "Referral", "Phone Call", "Website", "Other"]
        },
        "waitingOnParts": {
            "type": "bool",
            "default": false
        },
        "noShow": {
            "type": "bool",
            "default": false
        },
        "flagged": {
            "type": "bool",
            "default": false
        },
        "flagReason": {
            "type": "varchar",
            "maxLength": 200,
            "readOnly": true
        },
        "completedAt": {
            "type": "datetime",
            "readOnly": true
        },
        "internalNotes": {
            "type": "text",
            "rowsMin": 2
        },
        "contact": {
            "type": "link"
        },
        "assignedUser": {
            "type": "link"
        },
        "teams": {
            "type": "linkMultiple"
        },
        "createdAt": {
            "type": "datetime",
            "readOnly": true
        },
        "modifiedAt": {
            "type": "datetime",
            "readOnly": true
        }
    },
    "links": {
        "contact": {
            "type": "belongsTo",
            "entity": "Contact",
            "foreign": "repairTickets"
        },
        "assignedUser": {
            "type": "belongsTo",
            "entity": "User"
        },
        "teams": {
            "type": "hasMany",
            "entity": "Team",
            "relationName": "entityTeam",
            "layoutRelationshipsDisabled": true
        }
    },
    "collection": {
        "orderBy": "createdAt",
        "order": "desc",
        "textFilterFields": ["name", "ticketId", "customerName"]
    },
    "indexes": {
        "ticketId": {"columns": ["ticketId"], "unique": true},
        "status": {"columns": ["status"]},
        "createdAt": {"columns": ["createdAt"]}
    },
    "optimisticConcurrencyControl": true,
    "beforeSaveCustomScript": "$parts = ifThenElse(partsCost == null, 0, partsCost);\n$other = ifThenElse(otherCost == null, 0, otherCost);\n$quoted = ifThenElse(quotedRevenue == null, 0, quotedRevenue);\ntotalJobCost = $parts + $other;\ngrossProfit = $quoted - totalJobCost;\nifThen(status == 'Completed' && completedAt == null, completedAt = datetime\\now());\nifThen(status == 'No Show', noShow = true);\nifThen(status == 'Awaiting Parts', waitingOnParts = true);\nifThen(status != 'Awaiting Parts' && waitingOnParts == true, waitingOnParts = false);"
}
EOF

echo "[9/12] RepairTicket — scopes + clientDefs..."
docker exec "$CONTAINER" bash -c "cat > ${CB}/Resources/metadata/scopes/RepairTicket.json" << 'EOF'
{
    "entity": true,
    "layouts": true,
    "tab": true,
    "acl": true,
    "customizable": true,
    "importable": true,
    "notifications": true,
    "stream": true,
    "disabled": false,
    "type": "Base",
    "module": "Custom",
    "isCustom": true,
    "kanbanStatusIgnoreList": ["Completed", "No Fix", "No Show"],
    "color": "#4CAF50",
    "iconClass": "fas fa-tools"
}
EOF

docker exec "$CONTAINER" bash -c "cat > ${CB}/Resources/metadata/clientDefs/RepairTicket.json" << 'EOF'
{
    "controller": "controllers/record",
    "statusField": "status",
    "kanbanViewMode": true,
    "filterList": ["status", "deviceType", "repairIssue", "leadSource", "flagged", "waitingOnParts", "assignedUser"],
    "iconClass": "fas fa-tools",
    "color": "#4CAF50"
}
EOF

echo "[10/12] RepairTicket — layouts..."
docker exec "$CONTAINER" bash -c "cat > ${CB}/Resources/layouts/RepairTicket/detail.json" << 'EOF'
[
    {
        "label": "Job Info",
        "rows": [
            [{"name": "ticketId"}, {"name": "status"}],
            [{"name": "name", "fullWidth": true}],
            [{"name": "intakeDate"}, {"name": "appointmentDate"}],
            [{"name": "appointmentTime"}, {"name": "sameDayFlag"}]
        ]
    },
    {
        "label": "Customer",
        "rows": [
            [{"name": "customerName"}, {"name": "phoneNumber"}],
            [{"name": "email"}, {"name": "contact"}]
        ]
    },
    {
        "label": "Device & Repair",
        "rows": [
            [{"name": "deviceType"}, {"name": "deviceModel"}],
            [{"name": "repairIssue"}, {"name": "waitingOnParts"}],
            [{"name": "issueDescription", "fullWidth": true}]
        ]
    },
    {
        "label": "Financials",
        "rows": [
            [{"name": "quotedRevenue"}, {"name": "partsCost"}],
            [{"name": "otherCost"}, {"name": "totalJobCost"}],
            [{"name": "grossProfit"}, false]
        ]
    },
    {
        "label": "Tracking",
        "rows": [
            [{"name": "leadSource"}, {"name": "assignedUser"}],
            [{"name": "flagged"}, {"name": "flagReason"}],
            [{"name": "noShow"}, {"name": "completedAt"}],
            [{"name": "dateOut"}, false],
            [{"name": "internalNotes", "fullWidth": true}]
        ]
    }
]
EOF

docker exec "$CONTAINER" bash -c "cat > ${CB}/Resources/layouts/RepairTicket/list.json" << 'EOF'
[
    {"name": "ticketId", "width": 8, "link": true},
    {"name": "name", "width": 18, "link": true},
    {"name": "status", "width": 11},
    {"name": "customerName", "width": 14},
    {"name": "deviceType", "width": 9},
    {"name": "repairIssue", "width": 10},
    {"name": "quotedRevenue", "width": 9},
    {"name": "grossProfit", "width": 9},
    {"name": "createdAt", "width": 11}
]
EOF

docker exec "$CONTAINER" bash -c "cat > ${CB}/Resources/layouts/RepairTicket/listSmall.json" << 'EOF'
[
    {"name": "ticketId", "link": true},
    {"name": "name", "link": true},
    {"name": "status"},
    {"name": "customerName"}
]
EOF

echo "[11/12] RepairTicket — i18n..."
docker exec "$CONTAINER" bash -c "cat > ${CB}/Resources/i18n/en_US/RepairTicket.json" << 'EOF'
{
    "labels": {
        "Create RepairTicket": "New Repair Ticket"
    },
    "fields": {
        "name": "Summary",
        "ticketId": "Ticket ID",
        "status": "Status",
        "customerName": "Customer Name",
        "phoneNumber": "Phone",
        "email": "Email",
        "deviceType": "Device",
        "deviceModel": "Model",
        "repairIssue": "Repair Issue",
        "issueDescription": "Issue Description",
        "intakeDate": "Date In",
        "dateOut": "Date Out",
        "appointmentDate": "Appointment",
        "appointmentTime": "Time",
        "sameDayFlag": "Same Day",
        "quotedRevenue": "Quoted Price",
        "partsCost": "Parts Cost",
        "otherCost": "Other Costs",
        "totalJobCost": "Total Cost",
        "grossProfit": "Gross Profit",
        "leadSource": "Lead Source",
        "waitingOnParts": "Waiting on Parts",
        "noShow": "No Show",
        "flagged": "Stale Flag",
        "flagReason": "Flag Reason",
        "completedAt": "Completed At",
        "internalNotes": "Internal Notes",
        "contact": "Contact",
        "assignedUser": "Assigned To"
    },
    "tooltips": {
        "ticketId": "Auto-generated: TG-0001, TG-0002, etc.",
        "totalJobCost": "Parts + Other (auto-calculated on save)",
        "grossProfit": "Quoted Price minus Total Cost (auto-calculated)",
        "flagged": "Auto-set when no update in 48 hours"
    }
}
EOF

docker exec "$CONTAINER" bash -c "cat > ${CB}/Resources/i18n/en_US/Global.json" << 'EOF'
{
    "scopeNames": {
        "RepairTicket": "Repair Tickets",
        "Lead": "Leads"
    },
    "scopeNamesPlural": {
        "RepairTicket": "Repair Tickets",
        "Lead": "Leads"
    }
}
EOF

echo "[12/12] Hooks + permissions + rebuild..."
docker exec "$CONTAINER" bash -c "cat > ${CB}/Hooks/RepairTicket/TicketId.php" << 'PHPEOF'
<?php
namespace Espo\Custom\Hooks\RepairTicket;

use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

class TicketId
{
    public static int $order = 1;
    private EntityManager $entityManager;

    public function __construct(EntityManager $entityManager)
    {
        $this->entityManager = $entityManager;
    }

    public function beforeSave(Entity $entity, array $options): void
    {
        if (!$entity->isNew() || $entity->get('ticketId')) return;
        $collection = $this->entityManager
            ->getRDBRepository('RepairTicket')
            ->select(['ticketId'])
            ->order('createdAt', 'DESC')
            ->limit(0, 100)
            ->find();
        $max = 0;
        foreach ($collection as $r) {
            $id = $r->get('ticketId');
            if ($id && preg_match('/TG-(\d+)/', $id, $m)) {
                $n = (int) $m[1];
                if ($n > $max) $max = $n;
            }
        }
        $entity->set('ticketId', sprintf('TG-%04d', $max + 1));
    }
}
PHPEOF

docker exec "$CONTAINER" chown -R www-data:www-data /var/www/html/custom/
docker exec "$CONTAINER" chmod -R 755 /var/www/html/custom/

echo ""
echo "Clearing cache..."
docker exec "$CONTAINER" php /var/www/html/command.php clear-cache 2>/dev/null || true
docker exec "$CONTAINER" php /var/www/html/command.php rebuild 2>/dev/null || true

echo ""
echo "=============================================="
echo "  DONE. Two entities deployed:"
echo ""
echo "  Leads        (TGL-0001)  — Kanban: New > Reviewed > Contacted > Booked"
echo "  RepairTicket (TG-0001)   — Kanban: New Lead > Diagnosed > ... > Completed"
echo ""
echo "  Auto-calculated on every save:"
echo "    totalJobCost = partsCost + otherCost"
echo "    grossProfit  = quotedRevenue - totalJobCost"
echo "    completedAt  = auto-stamped when Completed"
echo "    waitingOnParts / noShow = auto-toggled by status"
echo ""
echo "  Next:"
echo "    1. Open EspoCRM in browser"
echo "    2. Admin > Rebuild"
echo "    3. Both tabs should appear in the nav bar"
echo "    4. Create a test Repair Ticket — gets TG-0001"
echo "    5. Create a test Lead — gets TGL-0001"
echo "=============================================="
