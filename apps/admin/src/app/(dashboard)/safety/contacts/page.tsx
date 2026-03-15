import { fetchEmergencyContacts } from '../actions';
import { ContactsTable } from './contacts-table';

const DEFAULT_PAGE_SIZE = 20;

export default async function EmergencyContactsPage() {
  const initialData = await fetchEmergencyContacts({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Contatti di emergenza
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400">
          Contatti di emergenza registrati dagli utenti
        </p>
      </div>

      <ContactsTable initialData={initialData} pageSize={DEFAULT_PAGE_SIZE} />
    </div>
  );
}
