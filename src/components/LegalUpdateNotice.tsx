import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Radar } from 'lucide-react';

/** Banner shown on results when recent legal updates may affect this type of contract. */
export function LegalUpdateNotice({ count }: { count: number }) {
  const { t } = useTranslation();
  if (count <= 0) return null;
  return (
    <aside
      aria-label={t('radar.title')}
      className="flex flex-wrap items-center gap-3 rounded-[16px] border border-[var(--color-risk-medium-dot)] bg-[var(--color-risk-medium-bg)] p-4 text-[14px] font-medium text-[var(--color-risk-medium-text)]"
    >
      <Radar aria-hidden="true" className="h-5 w-5 shrink-0" />
      <span className="min-w-0 flex-1">{t('radar.banner', { count })}</span>
      <Link to="/radar" className="font-bold underline underline-offset-2">
        {t('radar.banner_link')}
      </Link>
    </aside>
  );
}
