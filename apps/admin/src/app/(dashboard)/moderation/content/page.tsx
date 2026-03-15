import { fetchPendingContent } from './actions';
import { ContentList } from './content-list';

export default async function ContentModerationPage() {
  const initialData = await fetchPendingContent({ limit: 20 });

  return (
    <div className="space-y-6">
      <ContentList initialData={initialData} />
    </div>
  );
}
