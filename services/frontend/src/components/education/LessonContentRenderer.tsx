import React, { useState } from 'react';
import { CompoundInterestWidget } from './widgets/CompoundInterestWidget';
import { OptionsPayoffWidget } from './widgets/OptionsPayoffWidget';
import { PerBillionForecastWidget } from './widgets/PerBillionForecastWidget';
import { ModelComparisonWidget } from './widgets/ModelComparisonWidget';

interface LessonContentRendererProps {
  content: string;
}

export const LessonContentRenderer: React.FC<LessonContentRendererProps> = ({ content }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const formatInline = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-gray-200">$1</em>')
      .replace(/`(.*?)`/g, '<code class="px-2 py-0.5 bg-gray-800 text-gold-400 font-mono text-xs rounded border border-gold-500/20">$1</code>');
  };

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // 1. Embedded Widgets
    if (trimmed.startsWith('[widget:')) {
      const widgetName = trimmed.replace('[widget:', '').replace(']', '').trim();
      if (widgetName === 'compound-interest') {
        elements.push(<CompoundInterestWidget key={`widget-ci-${i}`} />);
      } else if (widgetName === 'options-payoff') {
        elements.push(<OptionsPayoffWidget key={`widget-op-${i}`} />);
      } else if (widgetName === 'forecast-visualizer') {
        elements.push(<PerBillionForecastWidget key={`widget-fv-${i}`} />);
      } else if (widgetName === 'model-comparison') {
        elements.push(<ModelComparisonWidget key={`widget-mc-${i}`} />);
      }
      i++;
      continue;
    }

    // 2. Fenced Code Blocks (```python ... ```)
    if (trimmed.startsWith('```')) {
      const lang = trimmed.substring(3).trim() || 'code';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      const rawCode = codeLines.join('\n');
      const codeIndex = i;

      elements.push(
        <div key={`code-${i}`} className="my-6 rounded-xl overflow-hidden border border-gray-800 bg-gray-950 shadow-2xl">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 text-xs font-mono text-gray-400">
            <span className="uppercase text-gold-400 font-bold">{lang}</span>
            <button
              onClick={() => copyToClipboard(rawCode, codeIndex)}
              className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded transition-colors text-[11px] font-sans"
            >
              {copiedIndex === codeIndex ? '✓ Copied' : 'Copy Code'}
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-gray-200 overflow-x-auto leading-relaxed bg-black/60">
            <code>{rawCode}</code>
          </pre>
        </div>
      );
      i++;
      continue;
    }

    // 3. Callout Boxes (> 💡, > 🚀, > 🤖, > ⚠️, > )
    if (trimmed.startsWith('>')) {
      const quoteContent: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteContent.push(lines[i].trim().substring(1).trim());
        i++;
      }
      const fullQuote = quoteContent.join(' ');

      let calloutStyle = 'border-l-4 border-gold-400 bg-gradient-to-r from-gold-500/10 to-transparent text-gold-200';
      if (fullQuote.includes('🚀 QUANT') || fullQuote.includes('QUANT INSIGHT')) {
        calloutStyle = 'border-l-4 border-cyan-400 bg-gradient-to-r from-cyan-500/10 to-transparent text-cyan-200';
      } else if (fullQuote.includes('🤖 PERBILLION') || fullQuote.includes('ML MODEL')) {
        calloutStyle = 'border-l-4 border-emerald-400 bg-gradient-to-r from-emerald-500/10 to-transparent text-emerald-200';
      } else if (fullQuote.includes('⚠️ RISK') || fullQuote.includes('WARNING')) {
        calloutStyle = 'border-l-4 border-red-500 bg-gradient-to-r from-red-500/10 to-transparent text-red-200';
      }

      elements.push(
        <blockquote
          key={`quote-${i}`}
          className={`my-6 p-4 rounded-r-xl shadow-lg leading-relaxed text-sm ${calloutStyle}`}
          dangerouslySetInnerHTML={{ __html: formatInline(fullQuote) }}
        />
      );
      continue;
    }

    // 4. Markdown Tables (| col | col |)
    if (trimmed.startsWith('|')) {
      const tableRows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const rowText = lines[i].trim();
        // Ignore separator line like |---|---|
        if (!rowText.includes('---')) {
          const cells = rowText
            .split('|')
            .map((c) => c.trim())
            .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
          if (cells.length > 0) {
            tableRows.push(cells);
          }
        }
        i++;
      }

      if (tableRows.length > 0) {
        const header = tableRows[0];
        const body = tableRows.slice(1);

        elements.push(
          <div key={`table-${i}`} className="my-6 overflow-x-auto rounded-xl border border-gray-800 shadow-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-900 text-gold-400 border-b border-gray-800">
                  {header.map((col, cIdx) => (
                    <th key={cIdx} className="p-3 font-bold uppercase tracking-wider">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 bg-gray-950/80">
                {body.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-gray-900/50 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className="p-3 text-gray-300"
                        dangerouslySetInnerHTML={{ __html: formatInline(cell) }}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // 5. Headers (#, ##, ###)
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${i}`} className="text-3xl font-extrabold text-gold-400 mt-8 mb-4 border-b border-gold-500/20 pb-2">
          {trimmed.substring(2)}
        </h1>
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-2xl font-bold text-gold-300 mt-8 mb-4 flex items-center space-x-2">
          <span>{trimmed.substring(3)}</span>
        </h2>
      );
    } else if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-xl font-semibold text-white mt-6 mb-3">
          {trimmed.substring(4)}
        </h3>
      );
    } 
    // 6. Lists (- or * or 1.)
    else if (trimmed.match(/^[-*]\s/) || trimmed.match(/^\d+\.\s/)) {
      const listItems: string[] = [];
      const isOrdered = Boolean(trimmed.match(/^\d+\.\s/));

      while (
        i < lines.length &&
        (lines[i].trim().match(/^[-*]\s/) || lines[i].trim().match(/^\d+\.\s/))
      ) {
        const itemText = lines[i].trim().replace(/^[-*]\s/, '').replace(/^\d+\.\s/, '');
        listItems.push(itemText);
        i++;
      }

      if (isOrdered) {
        elements.push(
          <ol key={`ol-${i}`} className="list-decimal list-inside space-y-2 my-4 text-gray-300 text-sm ml-2">
            {listItems.map((item, idx) => (
              <li key={idx} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${i}`} className="list-disc list-inside space-y-2 my-4 text-gray-300 text-sm ml-2">
            {listItems.map((item, idx) => (
              <li key={idx} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            ))}
          </ul>
        );
      }
      continue;
    } 
    // 7. Regular Paragraphs
    else {
      elements.push(
        <p
          key={`p-${i}`}
          className="text-gray-300 leading-relaxed mb-4 text-sm"
          dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }}
        />
      );
    }

    i++;
  }

  return <div className="prose-custom max-w-none text-gray-300">{elements}</div>;
};
