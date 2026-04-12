#!/usr/bin/env bash
# ============================================================
# Tech Guardian — Deploy RepairTicket entity to existing EspoCRM
#
# For: Ubuntu VPS at /opt/krayin with container named "espocrm"
# Run:
#   chmod +x deploy_remote.sh && ./deploy_remote.sh
#
# This does NOT spin up new containers. It writes custom files
# into your ALREADY RUNNING EspoCRM container and rebuilds the
# cache.
# ============================================================

set -euo pipefail

CONTAINER="${1:-espocrm}"
CUSTOM_BASE="/var/www/html/custom/Espo/Custom"

echo "=============================================="
echo "  Tech Guardian — EspoCRM Entity Deployer"
echo "  Container: $CONTAINER"
echo "=============================================="
echo ""

# Verify container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo "ERROR: Container '$CONTAINER' is not running."
    echo "Available containers:"
    docker ps --format '  {{.Names}}  ({{.Image}})'
    exit 1
fi

echo "[1/7] Creating directory structure..."
docker exec "$CONTAINER" bash -c "
mkdir -p ${CUSTOM_BASE}/Resources/metadata/entityDefs
mkdir -p ${CUSTOM_BASE}/Resources/metadata/scopes
mkdir -p ${CUSTOM_BASE}/Resources/metadata/clientDefs
mkdir -p ${CUSTOM_BASE}/Resources/layouts/RepairTicket
mkdir -p ${CUSTOM_BASE}/Resources/i18n/en_US
mkdir -p ${CUSTOM_BASE}/Hooks/RepairTicket
"

# ---------- entityDefs ----------
echo "[2/7] Writing entityDefs/RepairTicket.json..."
docker exec "$CONTAINER" bash -c "cat > ${CUSTOM_BASE}/Resources/metadata/entityDefs/RepairTicket.json" << 'ENTITYDEFS_EOF'
{
    "fields": {
        "name": {
            "type": "varchar",
            "maxLength": 200,
            "required": true,
            "trim": true
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
            "options": [
                "New Lead",
                "Diagnosed",
                "Awaiting Parts",
                "In Progress",
                "Ready for Pickup",
                "Completed",
                "No Fix",
                "No Show"
            ],
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
            "required": true,
            "trim": true
        },
        "phoneNumber": {
            "type": "phone"
        },
        "email": {
            "type": "email"
        },
        "deviceType": {
            "type": "enum",
            "options": [
                "",
                "PS5",
                "PS4",
                "Xbox Series X",
                "Xbox Series S",
                "Xbox One",
                "Nintendo Switch",
                "iPhone",
                "iPad",
                "MacBook",
                "PC / Laptop",
                "Android Phone",
                "Android Tablet",
                "Other"
            ],
            "isSorted": false
        },
        "deviceModel": {
            "type": "varchar",
            "maxLength": 100,
            "trim": true
        },
        "repairIssue": {
            "type": "enum",
            "options": [
                "",
                "HDMI Port",
                "No Signal / Black Screen",
                "Disc Drive",
                "Overheating",
                "Power Issue",
                "Controller Drift",
                "Screen Replacement",
                "Battery Replacement",
                "Charging Port",
                "Water Damage",
                "Software Issue",
                "Other"
            ]
        },
        "issueDescription": {
            "type": "text",
            "required": true,
            "rowsMin": 3
        },
        "intakeDate": {
            "type": "date"
        },
        "appointmentDate": {
            "type": "date"
        },
        "appointmentTime": {
            "type": "enum",
            "options": [
                "",
                "9:00 AM",
                "9:30 AM",
                "10:00 AM",
                "10:30 AM",
                "11:00 AM",
                "11:30 AM",
                "12:00 PM",
                "12:30 PM",
                "1:00 PM",
                "1:30 PM",
                "2:00 PM",
                "2:30 PM",
                "3:00 PM",
                "3:30 PM",
                "4:00 PM",
                "4:30 PM",
                "5:00 PM"
            ]
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
        "leadSource": {
            "type": "enum",
            "options": [
                "",
                "Yelp",
                "Google",
                "Facebook",
                "Craigslist",
                "Reddit",
                "Walk-in",
                "Referral",
                "Phone Call",
                "Website",
                "Other"
            ]
        },
        "assignedUser": {
            "type": "link"
        },
        "teams": {
            "type": "linkMultiple"
        },
        "contact": {
            "type": "link"
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
        },
        "contact": {
            "type": "belongsTo",
            "entity": "Contact",
            "foreign": "repairTickets"
        }
    },
    "collection": {
        "orderBy": "createdAt",
        "order": "desc",
        "textFilterFields": ["name", "ticketId", "customerName"]
    },
    "indexes": {
        "ticketId": {
            "columns": ["ticketId"],
            "unique": true
        },
        "status": {
            "columns": ["status"]
        },
        "createdAt": {
            "columns": ["createdAt"]
        }
    },
    "optimisticConcurrencyControl": true,
    "beforeSaveCustomScript": "$parts = ifThenElse(partsCost == null, 0, partsCost);\n$other = ifThenElse(otherCost == null, 0, otherCost);\n$quoted = ifThenElse(quotedRevenue == null, 0, quotedRevenue);\ntotalJobCost = $parts + $other;\ngrossProfit = $quoted - totalJobCost;\n\nifThen(\n    status == 'Completed' && completedAt == null,\n    completedAt = datetime\\now()\n);\n\nifThen(\n    status == 'No Show',\n    noShow = true\n);\n\nifThen(\n    status == 'Awaiting Parts',\n    waitingOnParts = true\n);\n\nifThen(\n    status != 'Awaiting Parts' && waitingOnParts == true,\n    waitingOnParts = false\n);"
}
ENTITYDEFS_EOF

# ---------- scopes ----------
echo "[3/7] Writing scopes + clientDefs..."
docker exec "$CONTAINER" bash -c "cat > ${CUSTOM_BASE}/Resources/metadata/scopes/RepairTicket.json" << 'SCOPES_EOF'
{
    "entity": true,
    "layouts": true,
    "tab": true,
    "acl": true,
    "aclPortal": false,
    "customizable": true,
    "importable": true,
    "notifications": true,
    "stream": true,
    "disabled": false,
    "type": "Base",
    "module": "Custom",
    "isCustom": true,
    "kanbanStatusIgnoreList": ["Completed", "No Fix", "No Show"],
    "kanbanOrderDisabled": false,
    "color": "#4CAF50",
    "iconClass": "fas fa-tools"
}
SCOPES_EOF

docker exec "$CONTAINER" bash -c "cat > ${CUSTOM_BASE}/Resources/metadata/clientDefs/RepairTicket.json" << 'CLIENTDEFS_EOF'
{
    "controller": "controllers/record",
    "boolFilterList": ["onlyMy"],
    "statusField": "status",
    "kanbanViewMode": true,
    "filterList": [
        "status",
        "deviceType",
        "repairIssue",
        "leadSource",
        "flagged",
        "waitingOnParts",
        "sameDayFlag",
        "assignedUser"
    ],
    "iconClass": "fas fa-tools",
    "color": "#4CAF50"
}
CLIENTDEFS_EOF

# ---------- layouts ----------
echo "[4/7] Writing layouts..."
docker exec "$CONTAINER" bash -c "cat > ${CUSTOM_BASE}/Resources/layouts/RepairTicket/detail.json" << 'DETAIL_EOF'
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
            [{"name": "internalNotes", "fullWidth": true}]
        ]
    }
]
DETAIL_EOF

docker exec "$CONTAINER" bash -c "cat > ${CUSTOM_BASE}/Resources/layouts/RepairTicket/list.json" << 'LIST_EOF'
[
    {"name": "ticketId", "width": 8, "link": true},
    {"name": "name", "width": 18, "link": true},
    {"name": "status", "width": 12},
    {"name": "customerName", "width": 14},
    {"name": "deviceType", "width": 9},
    {"name": "repairIssue", "width": 10},
    {"name": "quotedRevenue", "width": 9},
    {"name": "grossProfit", "width": 9},
    {"name": "createdAt", "width": 11}
]
LIST_EOF

docker exec "$CONTAINER" bash -c "cat > ${CUSTOM_BASE}/Resources/layouts/RepairTicket/listSmall.json" << 'LISTSMALL_EOF'
[
    {"name": "ticketId", "link": true},
    {"name": "name", "link": true},
    {"name": "status"},
    {"name": "customerName"}
]
LISTSMALL_EOF

# ---------- i18n ----------
echo "[5/7] Writing i18n labels..."
docker exec "$CONTAINER" bash -c "cat > ${CUSTOM_BASE}/Resources/i18n/en_US/RepairTicket.json" << 'I18N_EOF'
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
        "intakeDate": "Intake Date",
        "appointmentDate": "Appointment Date",
        "appointmentTime": "Appointment Time",
        "sameDayFlag": "Same Day",
        "quotedRevenue": "Quoted Price",
        "partsCost": "Parts Cost",
        "otherCost": "Other Costs",
        "totalJobCost": "Total Cost",
        "grossProfit": "Gross Profit",
        "waitingOnParts": "Waiting on Parts",
        "noShow": "No Show",
        "flagged": "Stale Flag",
        "flagReason": "Flag Reason",
        "completedAt": "Completed At",
        "internalNotes": "Internal Notes",
        "leadSource": "Lead Source",
        "assignedUser": "Assigned To",
        "teams": "Teams",
        "contact": "Contact"
    },
    "tooltips": {
        "ticketId": "Auto-generated: TG-0001, TG-0002, etc.",
        "totalJobCost": "Parts Cost + Other Costs (auto-calculated)",
        "grossProfit": "Quoted Price minus Total Cost (auto-calculated)",
        "flagged": "Auto-set when ticket has no update in 48 hours"
    }
}
I18N_EOF

docker exec "$CONTAINER" bash -c "cat > ${CUSTOM_BASE}/Resources/i18n/en_US/Global.json" << 'GLOBAL_EOF'
{
    "scopeNames": {
        "RepairTicket": "Repair Tickets"
    },
    "scopeNamesPlural": {
        "RepairTicket": "Repair Tickets"
    }
}
GLOBAL_EOF

# ---------- PHP Hook ----------
echo "[6/7] Writing TG-#### ticket ID hook..."
docker exec "$CONTAINER" bash -c "cat > ${CUSTOM_BASE}/Hooks/RepairTicket/TicketId.php" << 'PHP_EOF'
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
        if (!$entity->isNew()) {
            return;
        }
        if ($entity->get('ticketId')) {
            return;
        }
        $nextNumber = $this->getNextNumber();
        $entity->set('ticketId', sprintf('TG-%04d', $nextNumber));
    }

    private function getNextNumber(): int
    {
        $collection = $this->entityManager
            ->getRDBRepository('RepairTicket')
            ->select(['ticketId'])
            ->order('createdAt', 'DESC')
            ->limit(0, 100)
            ->find();

        $max = 0;
        foreach ($collection as $record) {
            $id = $record->get('ticketId');
            if ($id && preg_match('/TG-(\d+)/', $id, $m)) {
                $num = (int) $m[1];
                if ($num > $max) {
                    $max = $num;
                }
            }
        }
        return $max + 1;
    }
}
PHP_EOF

# ---------- Permissions + rebuild ----------
echo "[7/7] Fixing permissions and rebuilding cache..."
docker exec "$CONTAINER" chown -R www-data:www-data /var/www/html/custom/
docker exec "$CONTAINER" chmod -R 755 /var/www/html/custom/
docker exec "$CONTAINER" php /var/www/html/command.php clear-cache
docker exec "$CONTAINER" php /var/www/html/rebuild.php 2>/dev/null || \
    docker exec "$CONTAINER" php /var/www/html/command.php rebuild 2>/dev/null || \
    echo "  (rebuild command not found — clear-cache should be enough)"

echo ""
echo "=============================================="
echo "  DONE. RepairTicket entity deployed."
echo ""
echo "  Next:"
echo "  1. Open your EspoCRM in a browser"
echo "  2. Admin (top right) > Rebuild"
echo "  3. Repair Tickets should appear in the top nav"
echo "  4. Create a test ticket — should get TG-0001"
echo "=============================================="
