<?php
/**
 * Tech Guardian — Auto-generate TG-#### Ticket IDs.
 *
 * Runs before every save. On new records, generates the next
 * sequential TG-#### id by finding the current maximum and adding 1.
 * Thread-safe enough for a single-user repair shop; if you ever
 * have concurrent ticket creation at volume, add a MySQL sequence
 * table.
 */

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
        // Find the highest existing ticket number.
        $last = $this->entityManager
            ->getRDBRepository('RepairTicket')
            ->select(['ticketId'])
            ->order('createdAt', 'DESC')
            ->limit(0, 100)
            ->find();

        $max = 0;
        foreach ($last as $record) {
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
