import { useEffect, useState } from 'react';
import { products, release } from './config';

type Release = {
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  published_at: string | null;
  assets: { name: string; state: string; size: number; download_count: number }[];
};

type Version = { tag: string; downloads: number };

export function DownloadStats() {
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    let mounted = true;

    async function load() {
      const versions: Version[] = [];
      try {
        for (let page = 1; release.enabled; page++) {
          const response = await fetch(
            'https://api.github.com/repos/' + release.repository + '/releases?per_page=100&page=' + page,
            { signal: controller.signal },
          );
          if (!response.ok) throw new Error('GitHub Releases indisponível');
          const entries: Release[] = await response.json();
          for (const entry of entries) {
            if (entry.draft || entry.prerelease || !entry.published_at) continue;
            const asset = entry.assets.find(item => item.name === release.asset && item.state === 'uploaded' && item.size > 0);
            if (asset && Number.isSafeInteger(asset.download_count) && asset.download_count >= 0) {
              versions.push({ tag: entry.tag_name, downloads: asset.download_count });
            }
          }
          if (entries.length < 100) break;
        }
        if (mounted) setVersions(versions);
      } catch {
        if (mounted) setFailed(true);
      } finally {
        clearTimeout(timer);
      }
    }

    void load();
    return () => {
      mounted = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  return <section className="card" aria-labelledby="download-stats-title">
    <h2 id="download-stats-title">Downloads dos produtos</h2>
    <p>O GitHub conta downloads do instalador. Uma pessoa pode baixar o arquivo mais de uma vez.</p>
    <h3>{products[0].name}</h3>
    {failed ? <p role="status">Não foi possível consultar os downloads no GitHub. Atualize a página para tentar novamente.</p> :
      versions === null ? <p role="status">Consultando downloads…</p> :
      versions.length ? <>
        <p><strong>{versions.reduce((total, version) => total + version.downloads, 0).toLocaleString('pt-BR')}</strong> downloads no total</p>
        <ul>{versions.map(version => <li key={version.tag}>
          {version.tag} · {version.downloads.toLocaleString('pt-BR')} {version.downloads === 1 ? 'download' : 'downloads'}
        </li>)}</ul>
      </> : <p>Nenhum instalador publicado para contabilizar.</p>}
    <h3>{products[1].name}</h3>
    <p>Contagem disponível quando o instalador oficial for publicado e configurado.</p>
  </section>;
}
