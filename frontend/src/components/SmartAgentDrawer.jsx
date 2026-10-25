import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  X, 
  Camera, 
  Settings, 
  Check, 
  Bot,
  CheckCircle2,
  Paperclip
} from 'lucide-react';
import { smartAgentChat, scanReceiptPreset, uploadReceiptFile } from '../utils/api';

export default function SmartAgentDrawer({
  isOpen,
  onClose,
  group,
  currentUser,
  currency,
  onAddBillFromAgent
}) {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'ocr' | 'settings'
  const [messages, setMessages] = useState([
    {
      sender: 'agent',
      text: `Hello! I'm your AI Splitter Agent. 🪄\n\nYou can describe any bill in plain English, and I'll parse the details, determine payers, and calculate the splits automatically!\n\nTry typing something like:\n• "Dinner at Barbeque Nation 1800 paid by Harshith split equally"\n• "Groceries 1200 paid by Hari Krishna, Harshith 40%, Hari Krishna 40%, Chiranjeeva 20%"`
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedBill, setParsedBill] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // n8n Webhook settings
  const [n8nUrl, setN8nUrl] = useState(() => localStorage.getItem('n8n_webhook_url') || '');

  // Receipt Scanner preset state
  const [receiptResult, setReceiptResult] = useState(null);
  const [scanning, setScanning] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, parsedBill]);

  const handleSendMessage = async (textToSend = null) => {
    const prompt = (textToSend || inputValue).trim();
    if (!prompt) return;

    const newMsgs = [...messages, { sender: 'user', text: prompt }];
    setMessages(newMsgs);
    setInputValue('');
    setIsLoading(true);

    try {
      const res = await smartAgentChat({
        message: prompt,
        group_id: group?.id,
        user_id: currentUser?.id,
        n8n_webhook_url: n8nUrl.trim() || undefined
      });

      setMessages(prev => [
        ...prev,
        { sender: 'agent', text: res.agent_message || 'I have extracted the bill details.' }
      ]);

      if (res.is_ready_to_save) {
        setParsedBill(res);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { sender: 'agent', text: `Sorry, I encountered an issue: ${err.message}` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveParsedBill = async () => {
    if (!parsedBill || isSaving) return;
    setIsSaving(true);
    try {
      await onAddBillFromAgent({
        title: parsedBill.title,
        amount: parsedBill.amount,
        category: parsedBill.category,
        date: parsedBill.extracted_date || new Date().toISOString().split('T')[0],
        paid_by: parsedBill.paid_by,
        split_type: parsedBill.split_type,
        splits: parsedBill.splits,
        notes: 'Added via Smart AI Agent'
      });
      setMessages(prev => [
        ...prev,
        { sender: 'agent', text: `🎉 Perfect! "${parsedBill.title}" for ${currency}${parsedBill.amount} has been saved to "${group.name}". Balances are now updated!` }
      ]);
      setParsedBill(null);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { sender: 'agent', text: `❌ Could not save bill: ${err.message}` }
      ]);
    } finally {
      setIsSaving(false);
    }
  };

  const handleScanPreset = async (preset) => {
    setScanning(true);
    try {
      const data = await scanReceiptPreset(preset);
      setReceiptResult(data);
    } catch (err) {
      alert('Scanning failed: ' + err.message);
    } finally {
      setScanning(false);
    }
  };

  const handleSaveReceiptAsBill = () => {
    if (!receiptResult) return;
    // Equal split among members
    const memberIds = group.members.map(m => m.id);
    const perPerson = Math.round((receiptResult.total / memberIds.length) * 100) / 100;
    const splits = {};
    memberIds.forEach(mid => splits[mid] = perPerson);

    onAddBillFromAgent({
      title: receiptResult.store || 'Receipt Scan',
      amount: receiptResult.total,
      category: receiptResult.category || 'Groceries',
      date: receiptResult.date,
      paid_by: currentUser?.id || memberIds[0],
      split_type: 'equal',
      splits,
      receipt_url: receiptResult.receipt_url || '',
      notes: `Scanned items: ${receiptResult.items?.map(i => i.name).join(', ')}`
    });

    setReceiptResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="chat-drawer">
      {/* Drawer Header */}
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <Sparkles size={15} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Smart Splitter AI</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
              {n8nUrl ? 'Connected to n8n' : 'Built-in NLP Agent'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button 
            className="btn-icon" 
            style={{ width: '30px', height: '30px' }}
            title="Chat Mode"
            onClick={() => setActiveTab('chat')}
          >
            <Bot size={15} color={activeTab === 'chat' ? 'var(--accent-primary)' : 'inherit'} />
          </button>
          <button 
            className="btn-icon" 
            style={{ width: '30px', height: '30px' }}
            title="Receipt Scanner"
            onClick={() => setActiveTab('ocr')}
          >
            <Camera size={15} color={activeTab === 'ocr' ? 'var(--accent-primary)' : 'inherit'} />
          </button>
          <button 
            className="btn-icon" 
            style={{ width: '30px', height: '30px' }}
            title="n8n Webhook Settings"
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={15} color={activeTab === 'settings' ? 'var(--accent-primary)' : 'inherit'} />
          </button>
          <button 
            className="btn-icon" 
            style={{ width: '30px', height: '30px' }}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* 1. Chat Tab */}
      {activeTab === 'chat' && (
        <>
          <div className="chat-body">
            {messages.map((m, idx) => (
              <div key={idx} className={`chat-msg ${m.sender}`}>
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
              </div>
            ))}

            {/* Structured Card if Parsed */}
            {parsedBill && (
              <div className="glass-card" style={{
                padding: '16px',
                border: '1px solid var(--accent-primary)',
                background: 'rgba(9, 132, 227, 0.12)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '1rem' }}>{parsedBill.title}</strong>
                  <span className="badge badge-purple">{parsedBill.category}</span>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--emerald)' }}>
                  {currency}{Number(parsedBill.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>
                    Paid by:{' '}
                    <strong style={{ color: 'var(--text-main)' }}>
                      {typeof parsedBill.paid_by === 'object' && parsedBill.paid_by !== null
                        ? Object.entries(parsedBill.paid_by)
                            .map(([pid, pval]) => {
                              const m = group?.members?.find(mem => mem.id === pid);
                              return `${m?.name || pid} (${currency}${pval})`;
                            })
                            .join(', ')
                        : (group?.members?.find(m => m.id === parsedBill.paid_by)?.name || 'You')}
                    </strong>
                  </div>
                  <div>Split Type: <strong style={{ textTransform: 'capitalize' }}>{parsedBill.split_type}</strong></div>
                  <div>Allocated Shares:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                    {Object.entries(parsedBill.splits || {}).map(([mid, val]) => {
                      const member = group.members?.find(m => m.id === mid);
                      return (
                        <span key={mid} className="badge badge-sky" style={{ fontSize: '0.7rem' }}>
                          {member?.name || mid}: {currency}{val}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <button 
                  className="btn-primary" 
                  style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }}
                  onClick={handleSaveParsedBill}
                  disabled={isSaving}
                >
                  <CheckCircle2 size={16} /> {isSaving ? 'Logging Bill...' : 'Confirm & Log Bill to Group'}
                </button>
              </div>
            )}

            {isLoading && (
              <div className="chat-msg agent" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={14} className="pulseGlow" /> Thinking & calculating splits...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Starter Prompts */}
          <div style={{ padding: '6px 14px', display: 'flex', gap: '6px', overflowX: 'auto', background: 'var(--bg-card-solid)', borderTop: '1px solid var(--border-subtle)' }}>
            <button 
              className="btn-secondary" 
              style={{ fontSize: '0.725rem', padding: '4px 10px', whiteSpace: 'nowrap' }}
              onClick={() => handleSendMessage('Dinner at Barbeque Nation 1800 paid by Harshith split equally')}
            >
              🍗 BBQ Nation 1800
            </button>
            <button 
              className="btn-secondary" 
              style={{ fontSize: '0.725rem', padding: '4px 10px', whiteSpace: 'nowrap' }}
              onClick={() => handleSendMessage('Groceries 850 paid by Hari Krishna, Harshith 40%, Hari Krishna 40%, Chiranjeeva 20%')}
            >
              🛒 Groceries % split
            </button>
            <button 
              className="btn-secondary" 
              style={{ fontSize: '0.725rem', padding: '4px 10px', whiteSpace: 'nowrap' }}
              onClick={() => handleSendMessage('WiFi bill 1299 paid by Harsha Vardhan')}
            >
              ⚡ WiFi 1299
            </button>
          </div>

          {/* Input Bar */}
          <div className="chat-input-bar">
            <input 
              type="text" 
              className="form-input"
              style={{ flex: 1, padding: '8px 12px', fontSize: '0.875rem' }}
              placeholder="e.g. Swiggy 640 paid by Rahul split equally..."
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSendMessage();
              }}
            />
            <button className="btn-primary" style={{ padding: '8px 14px' }} onClick={() => handleSendMessage()}>
              <Send size={15} />
            </button>
          </div>
        </>
      )}

      {/* 2. Receipt Scanner Tab */}
      {activeTab === 'ocr' && (
        <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <Camera size={36} color="var(--accent-primary)" style={{ marginBottom: '8px' }} />
            <h3 style={{ fontSize: '1.1rem' }}>Simulated Receipt OCR</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Select a sample receipt to test instant optical extraction & itemization:
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button 
              className="btn-secondary" 
              style={{ justifyContent: 'space-between', padding: '10px 14px' }}
              onClick={() => handleScanPreset('supermarket')}
              disabled={scanning}
            >
              <span>🛒 Fresh Supermarket Mart</span>
              <span className="badge badge-emerald">₹1,344.00</span>
            </button>

            <button 
              className="btn-secondary" 
              style={{ justifyContent: 'space-between', padding: '10px 14px' }}
              onClick={() => handleScanPreset('restaurant')}
              disabled={scanning}
            >
              <span>🍽️ The Royal Spice Bistro</span>
              <span className="badge badge-amber">₹1,921.50</span>
            </button>

            <button 
              className="btn-secondary" 
              style={{ justifyContent: 'space-between', padding: '10px 14px' }}
              onClick={() => handleScanPreset('utilities')}
              disabled={scanning}
            >
              <span>⚡ State Electricity Board</span>
              <span className="badge badge-purple">₹2,420.00</span>
            </button>

            <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '4px 0' }} />

            <label className="btn-secondary" style={{ justifyContent: 'center', padding: '10px 14px', cursor: 'pointer', gap: '8px' }}>
              <Paperclip size={16} color="var(--accent-primary)" />
              <span>{scanning ? 'Processing Receipt...' : '📁 Upload Custom Receipt Photo'}</span>
              <input 
                type="file" 
                accept="image/*" 
                style={{ display: 'none' }}
                disabled={scanning}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setScanning(true);
                  try {
                    const up = await uploadReceiptFile(file);
                    const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
                    const storeTitle = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
                    setReceiptResult({
                      store: storeTitle || 'Uploaded Store Receipt',
                      date: new Date().toISOString().slice(0, 10),
                      category: 'Food & Dining',
                      receipt_url: up.url,
                      items: [
                        { name: "Scanned Item A", price: 420.00 },
                        { name: "Scanned Item B", price: 290.00 }
                      ],
                      total: 710.00
                    });
                  } catch (err) {
                    alert('Upload failed: ' + err.message);
                  } finally {
                    setScanning(false);
                  }
                }}
              />
            </label>
          </div>

          {receiptResult && (
            <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{receiptResult.store}</strong>
                <span className="badge badge-emerald">{receiptResult.category}</span>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Extracted Items:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.825rem' }}>
                {receiptResult.items?.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{item.name}</span>
                    <span>₹{item.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                <span>Total Amount:</span>
                <span style={{ color: 'var(--emerald)' }}>₹{receiptResult.total.toFixed(2)}</span>
              </div>

              <button className="btn-primary" onClick={handleSaveReceiptAsBill} style={{ width: '100%', justifyContent: 'center' }}>
                <Check size={16} /> Log Receipt to Group
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. n8n Settings Tab */}
      {activeTab === 'settings' && (
        <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem' }}>n8n Webhook Integration</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Connect your external n8n AI workflow to handle advanced receipt parsing and multi-payer dialogues.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">n8n Webhook URL</label>
            <input 
              type="text" 
              className="form-input"
              placeholder="https://n8n.example.com/webhook/bill-agent"
              value={n8nUrl}
              onChange={e => {
                setN8nUrl(e.target.value);
                localStorage.setItem('n8n_webhook_url', e.target.value);
              }}
            />
          </div>

          <div style={{
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-subtle)',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8rem',
            color: 'var(--text-dim)',
            lineHeight: 1.5
          }}>
            <strong>How it works:</strong>
            <br />
            1. User prompts are forwarded via HTTP POST to this URL.
            <br />
            2. n8n workflow executes custom agents / OCR nodes.
            <br />
            3. Response is sent directly back to the app and saved to Flask SQLite.
            <br />
            (If left blank, the app uses its built-in Python NLP extractor!)
          </div>
        </div>
      )}
    </div>
  );
}
