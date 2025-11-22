// this was vibe coded w gemini 3

import React, { useState, useMemo, useCallback } from 'react';
import { 
  Upload, 
  FileJson, 
  Filter, 
  Search, 
  ArrowRight, 
  Settings, 
  Copy, 
  Trash2, 
  Play, 
  ChevronRight, 
  ChevronDown,
  AlertCircle,
  Code
} from 'lucide-react';

// --- Types ---

interface HarEntry {
  startedDateTime: string;
  time: number;
  request: {
    method: string;
    url: string;
    headers: { name: string; value: string }[];
    queryString: { name: string; value: string }[];
    postData?: {
      mimeType: string;
      text: string;
      params?: { name: string; value: string }[];
    };
  };
  response: {
    status: number;
    statusText: string;
    headers: { name: string; value: string }[];
    content: {
      mimeType: string;
      size: number;
      text?: string;
    };
  };
}

interface HarData {
  log: {
    entries: HarEntry[];
  };
}

interface VariantRule {
  id: string;
  targetType: 'query' | 'header' | 'body';
  targetKey: string;
  payloads: string; // Newline separated
  strategy: 'replace' | 'append';
}

interface GeneratedVariant {
  id: string;
  description: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  curl: string;
}

// --- Helper Functions ---

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getDomain = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return 'Invalid URL';
  }
};

const generateCurl = (method: string, url: string, headers: Record<string, string>, body?: string) => {
  let cmd = `curl -X ${method} "${url}"`;
  
  Object.entries(headers).forEach(([key, val]) => {
    cmd += ` \\\n  -H '${key}: ${val}'`;
  });

  if (body) {
    // Escape single quotes for shell
    const escapedBody = body.replace(/'/g, "'\\''");
    cmd += ` \\\n  -d '${escapedBody}'`;
  }
  
  return cmd;
};

// --- Components ---

const App = () => {
  const [harData, setHarData] = useState<HarData | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [selectedHosts, setSelectedHosts] = useState<Set<string>>(new Set());
  const [selectedEntryIndex, setSelectedEntryIndex] = useState<number | null>(null);
  const [filterText, setFilterText] = useState('');
  
  // Drag and Drop handlers
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.har')) {
      processFile(file);
    } else {
      alert("Please drop a valid .har file");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        setHarData(json);
        
        // Auto-select all hosts initially
        const hosts = new Set<string>();
        json.log.entries.forEach((entry: HarEntry) => {
          hosts.add(getDomain(entry.request.url));
        });
        setSelectedHosts(hosts);
        setSelectedEntryIndex(null);
      } catch (err) {
        alert("Error parsing HAR JSON");
      }
    };
    reader.readAsText(file);
  };

  // Derived Data
  const hosts = useMemo(() => {
    if (!harData) return [];
    const h = new Set<string>();
    harData.log.entries.forEach(entry => h.add(getDomain(entry.request.url)));
    return Array.from(h).sort();
  }, [harData]);

  const filteredEntries = useMemo(() => {
    if (!harData) return [];
    return harData.log.entries
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => {
        const domain = getDomain(entry.request.url);
        const matchesHost = selectedHosts.has(domain);
        const matchesText = filterText === '' || 
          entry.request.url.toLowerCase().includes(filterText.toLowerCase());
        return matchesHost && matchesText;
      });
  }, [harData, selectedHosts, filterText]);

  const selectedEntry = selectedEntryIndex !== null && harData 
    ? harData.log.entries[selectedEntryIndex] 
    : null;

  // Render
  if (!harData) {
    return (
      <div 
        className="min-h-screen bg-slate-50 flex items-center justify-center p-8"
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <div className="bg-white max-w-2xl w-full p-12 rounded-xl shadow-lg border-2 border-dashed border-slate-300 text-center">
          <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Upload className="w-10 h-10 text-blue-500" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-4">HAR File Analyzer</h1>
          <p className="text-slate-600 mb-8 text-lg">
            Drag and drop your HTTP Archive (.har) file here to begin analysis.
            <br />
            <span className="text-sm text-slate-400">All processing happens locally in your browser.</span>
          </p>
          <label className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
            <FileJson className="w-5 h-5 mr-2" />
            Select File
            <input type="file" accept=".har" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      {/* Sidebar - Hostnames */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col z-10">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="font-bold text-slate-700 flex items-center">
            <Filter className="w-4 h-4 mr-2" /> Hostnames
          </h2>
          {hosts.length > 0 && (
            <label className="flex items-center space-x-2 cursor-pointer" title="Toggle all hosts">
              <input 
                type="checkbox" 
                checked={selectedHosts.size === hosts.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedHosts(new Set(hosts));
                  } else {
                    setSelectedHosts(new Set());
                  }
                }}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span className="text-xs font-medium text-slate-600">All</span>
            </label>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {hosts.map(host => (
            <label key={host} className="flex items-center space-x-2 text-sm text-slate-600 cursor-pointer hover:bg-slate-50 p-1 rounded">
              <input 
                type="checkbox" 
                checked={selectedHosts.has(host)}
                onChange={(e) => {
                  const newHosts = new Set(selectedHosts);
                  if (e.target.checked) newHosts.add(host);
                  else newHosts.delete(host);
                  setSelectedHosts(newHosts);
                }}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="truncate" title={host}>{host}</span>
            </label>
          ))}
        </div>
        <div className="p-4 border-t border-slate-200 text-xs text-slate-500">
          {fileName}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm">
          <h1 className="font-bold text-xl text-slate-800 flex items-center">
             <FileJson className="w-6 h-6 mr-2 text-blue-600" />
             HarVary <span className="text-slate-400 font-normal ml-2 text-sm">| {filteredEntries.length} Requests Found</span>
          </h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Filter URL..." 
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
        </div>

        {/* Content Split */}
        <div className="flex-1 flex overflow-hidden">
          {/* Request List */}
          <div className="w-1/3 bg-white border-r border-slate-200 flex flex-col min-w-[350px]">
            <div className="flex-1 overflow-y-auto">
              {filteredEntries.map(({ entry, index }) => (
                <div 
                  key={index}
                  onClick={() => setSelectedEntryIndex(index)}
                  className={`p-4 border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50 ${selectedEntryIndex === index ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${getMethodColor(entry.request.method)}`}>
                      {entry.request.method}
                    </span>
                    <span className={`text-xs font-bold ${getStatusColor(entry.response.status)}`}>
                      {entry.response.status}
                    </span>
                  </div>
                  <div className="text-sm text-slate-700 font-medium truncate mb-1" title={entry.request.url}>
                    {entry.request.url.split('?')[0].split('/').pop() || '/'}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {getDomain(entry.request.url)}
                  </div>
                </div>
              ))}
              {filteredEntries.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                  No requests match your filter.
                </div>
              )}
            </div>
          </div>

          {/* Request Detail & Analyzer */}
          <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
            {selectedEntry ? (
              <RequestAnalyzer entry={selectedEntry} />
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <ArrowRight className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Select a request from the list to analyze</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Sub-components for Analysis ---

const RequestAnalyzer = ({ entry }: { entry: HarEntry }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'variants'>('details');

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 pt-4 flex space-x-6">
        <button 
          onClick={() => setActiveTab('details')}
          className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Request Details
        </button>
        <button 
          onClick={() => setActiveTab('variants')}
          className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors flex items-center ${activeTab === 'variants' ? 'border-purple-500 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Settings className="w-4 h-4 mr-2" />
          Variant Generator
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'details' ? (
          <RequestDetailsView entry={entry} />
        ) : (
          <VariantGeneratorView entry={entry} />
        )}
      </div>
    </div>
  );
};

const RequestDetailsView = ({ entry }: { entry: HarEntry }) => {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Overview Card */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Overview</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider">URL</label>
            <div className="text-sm break-all font-mono text-slate-700 mt-1">{entry.request.url}</div>
          </div>
          <div>
             <label className="text-xs text-slate-400 uppercase tracking-wider">Status</label>
             <div className="flex items-center mt-1">
               <span className={`text-sm font-bold px-2 py-0.5 rounded ${getStatusColor(entry.response.status)}`}>
                 {entry.response.status} {entry.response.statusText}
               </span>
             </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider">Time</label>
            <div className="text-sm text-slate-700 mt-1">{Math.round(entry.time)} ms</div>
          </div>
          <div>
             <label className="text-xs text-slate-400 uppercase tracking-wider">Response Size</label>
             <div className="text-sm text-slate-700 mt-1">{formatSize(entry.response.content.size)}</div>
          </div>
        </div>
      </div>

      {/* Params */}
      {entry.request.queryString.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Query Parameters</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entry.request.queryString.map((p, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 font-mono text-blue-600">{p.name}</td>
                    <td className="px-4 py-2 font-mono text-slate-600 break-all">{p.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Headers */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center justify-between">
          <span>Request Headers</span>
          <span className="text-xs font-normal text-slate-400">{entry.request.headers.length} headers</span>
        </h3>
        <div className="bg-slate-50 rounded p-4 font-mono text-xs overflow-x-auto max-h-60 overflow-y-auto">
          {entry.request.headers.map((h, i) => (
            <div key={i} className="mb-1">
              <span className="text-purple-700 font-semibold">{h.name}:</span> <span className="text-slate-600">{h.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      {entry.request.postData && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Request Body</h3>
          <div className="text-xs text-slate-500 mb-2">{entry.request.postData.mimeType}</div>
          <pre className="bg-slate-900 text-green-400 p-4 rounded text-xs overflow-x-auto whitespace-pre-wrap font-mono">
            {entry.request.postData.text}
          </pre>
        </div>
      )}
    </div>
  );
};

const VariantGeneratorView = ({ entry }: { entry: HarEntry }) => {
  const [rules, setRules] = useState<VariantRule[]>([]);
  const [variants, setVariants] = useState<GeneratedVariant[]>([]);
  
  // Potential targets for fuzzing
  const queryKeys = useMemo(() => entry.request.queryString.map(q => q.name), [entry]);
  const headerKeys = useMemo(() => entry.request.headers.map(h => h.name), [entry]);
  
  const [newRule, setNewRule] = useState<Partial<VariantRule>>({
    targetType: 'query',
    strategy: 'replace',
    payloads: "' OR '1'='1\n<script>alert(1)</script>\n-1"
  });

  const bodyIsJson = useMemo(() => {
    return entry.request.postData?.mimeType.includes('json') && entry.request.postData?.text;
  }, [entry]);

  // If body is JSON, we can parse keys
  const bodyKeys = useMemo(() => {
    if (!bodyIsJson) return [];
    try {
      const json = JSON.parse(entry.request.postData!.text);
      return Object.keys(json);
    } catch {
      return [];
    }
  }, [bodyIsJson, entry]);

  const addRule = () => {
    if (!newRule.targetKey) return;
    const rule: VariantRule = {
      id: Math.random().toString(36).substr(2, 9),
      targetType: newRule.targetType as any,
      targetKey: newRule.targetKey,
      payloads: newRule.payloads || '',
      strategy: newRule.strategy as any
    };
    setRules([...rules, rule]);
  };

  const removeRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  const generateVariants = () => {
    const newVariants: GeneratedVariant[] = [];
    
    // Base Request
    const baseUrl = entry.request.url.split('?')[0];
    const baseHeaders = entry.request.headers.reduce((acc, h) => ({...acc, [h.name]: h.value}), {});
    const baseQuery = entry.request.queryString.reduce((acc, q) => ({...acc, [q.name]: q.value}), {} as Record<string, string>);
    const baseBodyStr = entry.request.postData?.text || '';
    let baseBodyJson = {};
    if (bodyIsJson) {
      try { baseBodyJson = JSON.parse(baseBodyStr); } catch {}
    }

    rules.forEach(rule => {
      const payloads = rule.payloads.split('\n').filter(p => p.trim() !== '');
      
      payloads.forEach(payload => {
        // Clone base
        const currentQuery = { ...baseQuery };
        const currentHeaders = { ...baseHeaders };
        let currentBodyStr = baseBodyStr;
        let description = `${rule.strategy.toUpperCase()} ${rule.targetType} [${rule.targetKey}] with "${payload}"`;

        // Apply Logic
        if (rule.targetType === 'query') {
          if (rule.strategy === 'replace') currentQuery[rule.targetKey] = payload;
          if (rule.strategy === 'append') currentQuery[rule.targetKey] = (currentQuery[rule.targetKey] || '') + payload;
        } else if (rule.targetType === 'header') {
          if (rule.strategy === 'replace') currentHeaders[rule.targetKey] = payload;
          if (rule.strategy === 'append') currentHeaders[rule.targetKey] = (currentHeaders[rule.targetKey] || '') + payload;
        } else if (rule.targetType === 'body' && bodyIsJson) {
          const newBodyJson: any = { ...baseBodyJson };
          if (rule.strategy === 'replace') newBodyJson[rule.targetKey] = payload;
          if (rule.strategy === 'append') newBodyJson[rule.targetKey] = (newBodyJson[rule.targetKey] || '') + payload;
          currentBodyStr = JSON.stringify(newBodyJson);
        }

        // Reconstruct URL
        const params = new URLSearchParams();
        Object.entries(currentQuery).forEach(([k, v]) => params.append(k, v));
        const fullUrl = `${baseUrl}${params.toString() ? '?' + params.toString() : ''}`;

        newVariants.push({
          id: Math.random().toString(36),
          description,
          method: entry.request.method,
          url: fullUrl,
          headers: currentHeaders as any,
          body: currentBodyStr,
          curl: generateCurl(entry.request.method, fullUrl, currentHeaders as any, currentBodyStr)
        });
      });
    });

    setVariants(newVariants);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-8">
      {/* Configuration Section */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-slate-700">Mutation Rules</h3>
          <button 
            onClick={generateVariants}
            disabled={rules.length === 0}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            <Play className="w-4 h-4 mr-2" />
            Generate Variants
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Add New Rule Form */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Target Type</label>
              <select 
                className="w-full text-sm border-slate-300 rounded p-2"
                value={newRule.targetType}
                onChange={e => setNewRule({...newRule, targetType: e.target.value as any, targetKey: ''})}
              >
                <option value="query">Query Param</option>
                <option value="header">Header</option>
                <option value="body" disabled={!bodyIsJson}>JSON Body</option>
              </select>
            </div>
            
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Key / Parameter</label>
              <select 
                className="w-full text-sm border-slate-300 rounded p-2"
                value={newRule.targetKey}
                onChange={e => setNewRule({...newRule, targetKey: e.target.value})}
              >
                <option value="">Select Target...</option>
                {newRule.targetType === 'query' && queryKeys.map(k => <option key={k} value={k}>{k}</option>)}
                {newRule.targetType === 'header' && headerKeys.map(k => <option key={k} value={k}>{k}</option>)}
                {newRule.targetType === 'body' && bodyKeys.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Strategy</label>
              <select 
                className="w-full text-sm border-slate-300 rounded p-2"
                value={newRule.strategy}
                onChange={e => setNewRule({...newRule, strategy: e.target.value as any})}
              >
                <option value="replace">Replace Value</option>
                <option value="append">Append to Value</option>
              </select>
            </div>

            <div className="md:col-span-4">
               <label className="block text-xs font-semibold text-slate-500 mb-1">Payloads (One per line)</label>
               <textarea 
                 rows={3}
                 className="w-full text-sm border-slate-300 rounded p-2 font-mono"
                 value={newRule.payloads}
                 onChange={e => setNewRule({...newRule, payloads: e.target.value})}
                 placeholder="' OR 1=1"
               />
            </div>

            <div className="md:col-span-1 flex items-end h-full pb-1">
              <button 
                onClick={addRule}
                disabled={!newRule.targetKey}
                className="p-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>

          {/* Active Rules List */}
          {rules.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-500">Active Rules</h4>
              {rules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between bg-white p-3 rounded border border-slate-200 shadow-sm text-sm">
                  <div className="flex items-center space-x-4">
                    <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold uppercase">{rule.targetType}</span>
                    <span className="font-mono text-slate-700">{rule.targetKey}</span>
                    <span className="text-slate-400 text-xs">Strategy: {rule.strategy}</span>
                    <span className="text-slate-400 text-xs">{rule.payloads.split('\n').filter(x=>x).length} payloads</span>
                  </div>
                  <button onClick={() => removeRule(rule.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results Section */}
      {variants.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-end">
             <h3 className="font-bold text-slate-800 text-lg">Generated Variants ({variants.length})</h3>
             <span className="text-xs text-orange-600 flex items-center bg-orange-50 px-3 py-1 rounded border border-orange-200">
               <AlertCircle className="w-3 h-3 mr-1" />
               CORS Restriction: Execute via Terminal
             </span>
          </div>

          <div className="space-y-3">
            {variants.map((v, idx) => (
              <div key={v.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-500">#{idx + 1} - {v.description}</span>
                  <button 
                    onClick={() => copyToClipboard(v.curl)}
                    className="flex items-center text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <Copy className="w-3 h-3 mr-1" /> Copy cURL
                  </button>
                </div>
                <div className="p-4">
                   <div className="flex items-center space-x-2 mb-2">
                      <span className="font-mono text-xs font-bold bg-slate-200 px-2 py-0.5 rounded">{v.method}</span>
                      <div className="font-mono text-xs text-slate-700 truncate w-full" title={v.url}>{v.url}</div>
                   </div>
                   {v.body && (
                     <div className="mt-2 text-xs font-mono bg-slate-50 p-2 rounded text-slate-600 border border-slate-100">
                        Body: {v.body.substring(0, 100)}{v.body.length > 100 ? '...' : ''}
                     </div>
                   )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Utilities ---

const getMethodColor = (method: string) => {
  switch (method.toUpperCase()) {
    case 'GET': return 'bg-blue-100 text-blue-700';
    case 'POST': return 'bg-green-100 text-green-700';
    case 'PUT': return 'bg-orange-100 text-orange-700';
    case 'DELETE': return 'bg-red-100 text-red-700';
    default: return 'bg-slate-100 text-slate-700';
  }
};

const getStatusColor = (status: number) => {
  if (status >= 200 && status < 300) return 'text-green-600';
  if (status >= 300 && status < 400) return 'text-yellow-600';
  if (status >= 400 && status < 500) return 'text-orange-600';
  if (status >= 500) return 'text-red-600';
  return 'text-slate-600';
};

export default App;

