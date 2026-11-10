import coverage from '../../../src/data/legal-coverage.json';

/** ISR: contenido publico aprobado que se revalida cada intervalo. */
export const revalidate = 3600;

interface CoverageFile {
  file: string;
  tema: string;
  count: number;
  minFuenteVerificadaEn: string;
}

interface CoverageManifest {
  generatedAt: string;
  jurisdiction: string;
  total: number;
  files: CoverageFile[];
}

const manifest = coverage as CoverageManifest;

export default async function CoberturaPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1rem' }}>
      <h1>Cobertura legal verificada</h1>
      <p>
        Jurisdicción {manifest.jurisdiction} · {manifest.total} provisiones curadas ·
        generado {manifest.generatedAt}
      </p>
      <ul>
        {manifest.files.map((entry) => (
          <li key={entry.file}>
            {entry.tema}: {entry.count} provisiones (verificadas desde {entry.minFuenteVerificadaEn})
          </li>
        ))}
      </ul>
      <p>
        <small>
          Esta página se regenera cada hora; si la actualización falla se
          conserva la última versión válida. Nada aquí es asesoría legal.
        </small>
      </p>
    </main>
  );
}
