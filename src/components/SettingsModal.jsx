import { useState } from 'react';
import { 
  X, 
  Settings, 
  Link, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Trash2, 
  
  Copy, 
  CheckCheck, 
  ChevronDown, 
  ChevronUp,
  FileSpreadsheet,

} from 'lucide-react';
import { api, getScriptUrl, setScriptUrl } from '../services/api';
import { storage } from '../services/storage';

export default function SettingsModal({ 
  isOpen, 
  onClose, 
  syncState, 
  onTriggerSync
}) {
  const [url, setUrl] = useState(() => getScriptUrl());
  const [testStatus, setTestStatus] = useState(null); // { type: 'success'|'error'|'loading', message: '' }
  const [copiedCode, setCopiedCode] = useState(false);
  const [showCodeGuide, setShowCodeGuide] = useState(false);

  if (!isOpen) return null;

  const handleSaveUrl = () => {
    setScriptUrl(url);
    setTestStatus({ type: 'success', message: 'URL saved to local storage!' });
    setTimeout(() => setTestStatus(null), 3000);
  };

  const handleTestConnection = async () => {
    if (!url.trim()) {
      setTestStatus({ type: 'error', message: 'Please enter a valid Google Apps Script Web App URL first.' });
      return;
    }
    setTestStatus({ type: 'loading', message: 'Connecting to Google Apps Script...' });
    try {
      const res = await api.testConnection(url);
      setTestStatus({ 
        type: 'success', 
        message: `Connected successfully! Found ${res.count} existing records in Google Sheets.` 
      });
      // Save it automatically on successful test
      setScriptUrl(url);
    } catch (err) {
      setTestStatus({ 
        type: 'error', 
        message: `Connection failed: ${err.message}. Ensure "Execute as: Me" and "Who has access: Anyone" are set in Apps Script deployment.` 
      });
    }
  };

  const appsScriptTemplate = `function doGet(e) {
  var action = e.parameter.action;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  
  if (action === "readAll") {
    var records = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0] && !row[1]) continue;
      records.push({
        id: i + 1, // Row number as record ID
        Date: row[0] ? Utilities.formatDate(new Date(row[0]), Session.getScriptTimeZone(), "yyyy-MM-dd") : "",
        Exercise: row[1] || "",
        Sets: row[2] || 0,
        Reps: row[3] || 0,
        "Weight/Intensity": row[4] || "",
        "Duration (min)": row[5] || 0,
        Notes: row[6] || ""
      });
    }
    return ContentService.createTextOutput(JSON.stringify(records))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === "readOne") {
    var rowId = parseInt(e.parameter.id);
    var row = sheet.getRange(rowId, 1, 1, 7).getValues()[0];
    return ContentService.createTextOutput(JSON.stringify({
      id: rowId,
      Date: row[0] ? Utilities.formatDate(new Date(row[0]), Session.getScriptTimeZone(), "yyyy-MM-dd") : "",
      Exercise: row[1] || "",
      Sets: row[2] || 0,
      Reps: row[3] || 0,
      "Weight/Intensity": row[4] || "",
      "Duration (min)": row[5] || 0,
      Notes: row[6] || ""
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ error: "Invalid action" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var contents = JSON.parse(e.postData.contents);
  var action = contents.action;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  if (action === "create") {
    var d = contents.data;
    sheet.appendRow([
      d.Date,
      d.Exercise,
      d.Sets,
      d.Reps,
      d["Weight/Intensity"],
      d["Duration (min)"],
      d.Notes
    ]);
    var newRowId = sheet.getLastRow();
    return ContentService.createTextOutput(JSON.stringify({ success: true, id: newRowId }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === "update") {
    var rowId = parseInt(contents.id);
    var d = contents.data;
    sheet.getRange(rowId, 1, 1, 7).setValues([[
      d.Date,
      d.Exercise,
      d.Sets,
      d.Reps,
      d["Weight/Intensity"],
      d["Duration (min)"],
      d.Notes
    ]]);
    return ContentService.createTextOutput(JSON.stringify({ success: true, id: rowId }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === "delete") {
    var rowId = parseInt(contents.id);
    sheet.deleteRow(rowId);
    return ContentService.createTextOutput(JSON.stringify({ success: true, id: rowId }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: "Unknown action" }))
    .setMimeType(ContentService.MimeType.JSON);
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(appsScriptTemplate);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet glass-panel animate-slide-up" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex-align-center">
            <div className="modal-icon-badge">
              <Settings size={18} className="text-accent-primary" />
            </div>
            <div>
              <h3 className="modal-title">Settings & Backend</h3>
              <p className="modal-subtitle">Google Sheets Apps Script API Configuration</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close settings">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body p-4 scrollable-body">
          {/* 1. Google Apps Script Web App URL */}
          <div className="settings-section mb-4">
            <label className="input-label flex-align-center">
              <Link size={14} className="mr-1 text-accent-cyan" />
              Google Apps Script Web App URL
            </label>
            <p className="text-xs text-muted mb-2">
              Paste your deployed Apps Script URL (ending with <code className="text-accent-primary">/exec</code>).
            </p>
            
            <input
              type="url"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="form-input mb-2"
            />

            <div className="flex-gap-2">
              <button 
                type="button" 
                className="btn-primary flex-1"
                onClick={handleSaveUrl}
              >
                <Check size={16} className="mr-1" /> Save URL
              </button>

              <button 
                type="button" 
                className="btn-secondary"
                onClick={handleTestConnection}
                disabled={testStatus?.type === 'loading'}
              >
                {testStatus?.type === 'loading' ? (
                  <RefreshCw size={15} className="animate-spin-slow mr-1" />
                ) : (
                  <Check size={15} className="mr-1" />
                )}
                Test Connection
              </button>
            </div>

            {testStatus && (
              <div className={`status-alert-box mt-3 ${testStatus.type === 'error' ? 'alert-error' : 'alert-success'}`}>
                {testStatus.type === 'error' ? <AlertCircle size={15} /> : <Check size={15} />}
                <span>{testStatus.message}</span>
              </div>
            )}
          </div>

          {/* 2. Synchronization & Queue Status */}
          <div className="settings-section mb-4">
            <h4 className="settings-section-title flex-align-center">
              <RefreshCw size={15} className="mr-1 text-accent-primary" />
              Sync Engine & Queue
            </h4>
            <div className="sync-info-box glass-panel mt-2">
              <div className="flex-between mb-2">
                <span className="text-xs text-muted">Network Status:</span>
                <span className={`text-xs font-bold ${syncState.isOnline ? 'text-accent-primary' : 'text-accent-rose'}`}>
                  {syncState.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="flex-between mb-2">
                <span className="text-xs text-muted">Pending Offline Changes:</span>
                <span className="text-xs font-bold text-accent-amber">{syncState.pendingCount} operations</span>
              </div>
              <div className="flex-between">
                <span className="text-xs text-muted">Active Engine Mode:</span>
                <span className="text-xs font-bold text-accent-cyan">
                  {syncState.hasBackendUrl ? 'Google Sheets Sync' : 'Local / Offline Demo'}
                </span>
              </div>
            </div>

            <div className="flex-gap-2 mt-3">
              <button 
                className="btn-secondary flex-1" 
                onClick={onTriggerSync}
                disabled={syncState.isSyncing}
              >
                <RefreshCw size={14} className={syncState.isSyncing ? 'animate-spin-slow mr-1' : 'mr-1'} />
                {syncState.isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>

              {syncState.pendingCount > 0 && (
                <button 
                  className="btn-danger" 
                  onClick={() => {
                    storage.clearSyncQueue();
                    alert('Sync queue cleared.');
                  }}
                  title="Clear pending operations queue"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>



          {/* 4. Google Sheets Apps Script Setup Guide */}
          <div className="settings-section">
            <div 
              className="guide-header-toggle glass-panel"
              onClick={() => setShowCodeGuide(!showCodeGuide)}
              role="button"
              tabIndex={0}
            >
              <div className="flex-align-center">
                <FileSpreadsheet size={16} className="text-accent-green mr-2" />
                <span className="text-xs font-semibold">Google Sheets Apps Script Template</span>
              </div>
              {showCodeGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>

            {showCodeGuide && (
              <div className="guide-content glass-panel p-3 mt-2 animate-fade-in">
                <p className="text-xs text-secondary mb-2">
                  1. Open your Google Sheet with columns:
                  <br />
                  <code className="text-accent-primary font-mono text-2xs">
                    Date | Exercise | Sets | Reps | Weight/Intensity | Duration (min) | Notes
                  </code>
                </p>
                <p className="text-xs text-secondary mb-2">
                  2. Go to <strong>Extensions &gt; Apps Script</strong> and paste the following script:
                </p>

                <div className="code-block-wrapper mb-2">
                  <button onClick={copyToClipboard} className="copy-code-btn">
                    {copiedCode ? <CheckCheck size={14} className="text-accent-primary" /> : <Copy size={14} />}
                    <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                  <pre className="code-snippet font-mono text-2xs">
                    {appsScriptTemplate}
                  </pre>
                </div>

                <p className="text-xs text-secondary">
                  3. Click <strong>Deploy &gt; New deployment</strong> &gt; Select type: <strong>Web app</strong>.
                  <br />
                  - Execute as: <strong>Me</strong>
                  <br />
                  - Who has access: <strong>Anyone</strong>
                  <br />
                  4. Copy the Web App URL and paste it into the field above!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
