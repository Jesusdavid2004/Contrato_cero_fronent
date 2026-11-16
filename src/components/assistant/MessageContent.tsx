import { Fragment, type ReactNode } from 'react';
import type { AssistantCitation } from '../../services/assistant';

const CITATION_MARKER = /\[(S\d+)\]/g;
const BULLET_PREFIX = '- ';

function withCitationMarkers(text: string, citations: readonly AssistantCitation[], anchorPrefix: string): ReactNode[] {
  const known = new Map(citations.map((citation, index) => [citation.source_id, index + 1]));
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(CITATION_MARKER)) {
    const number = known.get(match[1]);
    nodes.push(text.slice(lastIndex, match.index));
    if (number !== undefined) {
      nodes.push(
        <sup key={`${match.index}-${match[1]}`}>
          <a
            href={`#${anchorPrefix}-${match[1]}`}
            className="px-0.5 font-bold text-[var(--color-action-text)] underline-offset-2 hover:underline"
          >
            [{number}]
          </a>
        </sup>,
      );
    }
    lastIndex = (match.index ?? 0) + match[0].length;
  }
  nodes.push(text.slice(lastIndex));
  return nodes;
}

interface Block {
  kind: 'paragraph' | 'list';
  lines: string[];
}

function toBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const isBullet = line.startsWith(BULLET_PREFIX);
    const last = blocks.at(-1);
    if (isBullet && last?.kind === 'list') last.lines.push(line.slice(BULLET_PREFIX.length));
    else if (isBullet) blocks.push({ kind: 'list', lines: [line.slice(BULLET_PREFIX.length)] });
    else blocks.push({ kind: 'paragraph', lines: [line] });
  }
  return blocks;
}

/** Renders assistant text: paragraphs, "- " lists, and [S#] markers as numbered links to the sources. */
export function MessageContent({
  text,
  citations,
  anchorPrefix,
}: {
  text: string;
  citations: readonly AssistantCitation[];
  anchorPrefix: string;
}) {
  return (
    <>
      {toBlocks(text).map((block, index) =>
        block.kind === 'list' ? (
          <ul key={index} className="ml-5 list-disc space-y-1">
            {block.lines.map((line, lineIndex) => (
              <li key={lineIndex}>{withCitationMarkers(line, citations, anchorPrefix)}</li>
            ))}
          </ul>
        ) : (
          <Fragment key={index}>
            <p>{withCitationMarkers(block.lines[0], citations, anchorPrefix)}</p>
          </Fragment>
        ),
      )}
    </>
  );
}
