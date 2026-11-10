import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FileSearch, FileUp, Globe, Info, PenLine, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ContractApiError, uploadAndAnalyzeContract } from '../services/contracts';
import { preHashFile } from '../lib/fileHash';
import { FileDropzone } from '../components/FileDropzone';

const MODULES = [
  { icon: FileSearch, titleKey: 'features.scan.title', descKey: 'features.scan.desc' },
  { icon: Sparkles, titleKey: 'features.analyze.title', descKey: 'features.analyze.desc' },
  { icon: PenLine, titleKey: 'features.protect.title', descKey: 'features.protect.desc' },
];

const TRUST = [
  { icon: FileUp, textKey: 'home.trust_files' },
  { icon: ShieldCheck, textKey: 'home.trust_private' },
  { icon: Globe, textKey: 'home.trust_bilingual' },
];

export function Home() {
  const { t, i18n } = useTranslation();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [externalAi, setExternalAi] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/ready')
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { provider?: string } | null) => {
        const provider = body?.provider ?? '';
        if (!cancelled && provider !== '' && provider !== 'local' && provider !== 'fake') {
          setExternalAi(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadStage(null);
    setUploadError(null);
    try {
      if (!token) throw new ContractApiError('errors.unauthorized');
      // Non-blocking pre-hash in a Web Worker: keeps the main thread free (INP)
      // and never delays the upload; result is only used for client-side dedupe hints.
      void preHashFile(file);
      const data = await uploadAndAnalyzeContract(
        file,
        i18n.language.substring(0, 2),
        token,
        (stage) => setUploadStage(stage),
      );
      navigate('/results', { state: { contractData: data } });
    } catch (err: unknown) {
      const messageKey = err instanceof ContractApiError ? err.messageKey : 'errors.api_error';
      setUploadError(t(messageKey, { defaultValue: t('errors.analysis_failed') }));
    } finally {
      setIsUploading(false);
      setUploadStage(null);
    }
  };

  const firstName = user?.name.split(' ')[0];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[var(--color-action)] to-[var(--color-accent)] px-3.5 py-1.5 text-[12px] font-bold text-white shadow-sm">
          <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
          {t('home.badge')}
        </span>
        {firstName && (
          <p className="mt-3 text-[14px] font-medium text-[var(--color-text-muted)]">
            {t('home.greeting', { name: firstName, defaultValue: `Hello, ${firstName}` })}
          </p>
        )}
        <h1 className="mt-2 text-[32px] font-bold leading-tight tracking-tight sm:text-[42px]">
          {t('home.headline', 'Analyze your contracts')}
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[var(--color-text-muted)]">
          {t('home.subtitle', 'Identify risks, understand your clauses and make informed decisions.')}
        </p>
        <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          {TRUST.map(({ icon: Icon, textKey }) => (
            <li key={textKey} className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-text-muted)]">
              <Icon aria-hidden="true" className="h-4 w-4 text-[var(--color-action-text)]" />
              {t(textKey)}
            </li>
          ))}
        </ul>
      </motion.div>

      {externalAi && (
        <p className="flex items-start gap-2 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
          <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {t('consent.external_notice')}{' '}
            <Link to="/privacy" className="font-semibold text-[var(--color-action-text)] hover:underline">
              {t('consent.learn_more')}
            </Link>
          </span>
        </p>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.08 }}
        className="floating-panel p-4! sm:p-5!"
      >
        <FileDropzone isUploading={isUploading} stage={uploadStage} onFile={(f) => void uploadFile(f)} />
        {uploadError && (
          <p role="alert" className="px-2 pb-1 pt-3 text-[13px] font-medium text-[var(--color-risk-high-text)]">
            {uploadError}
          </p>
        )}
      </motion.div>

      <div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-3">
        {MODULES.map(({ icon: Icon, titleKey, descKey }, i) => (
          <motion.div
            key={titleKey}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.12 + i * 0.06 }}
            className="floating-card group flex h-full flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-popover)]"
          >
            <div className="flex items-start justify-between">
              <span className="inline-flex self-start rounded-[13px] bg-[var(--color-action-soft)] p-2.5 transition-transform duration-200 group-hover:scale-110">
                <Icon aria-hidden="true" className="h-5 w-5 text-[var(--color-action-text)]" />
              </span>
              <span aria-hidden="true" className="text-gradient text-[28px] font-bold leading-none opacity-80">
                {String(i + 1).padStart(2, '0')}
              </span>
            </div>
            <h2 className="mt-3 text-[15px] font-bold">{t(titleKey)}</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-text-muted)]">{t(descKey)}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
