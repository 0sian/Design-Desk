import { ProcessEditor } from '../components/ProcessEditor';
import { PageHeader } from '../components/ui';

export function ProcessPage() {
  return (
    <div className="page narrow">
      <PageHeader
        title="Design process"
        subtitle="Your reusable starting point. New projects can copy this checklist; changing it here never affects existing projects. Treat it as a guide, not a rulebook."
      />
      <ProcessEditor projectId={null} />
    </div>
  );
}
