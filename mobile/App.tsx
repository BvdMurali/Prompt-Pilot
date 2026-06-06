import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Clipboard,
  Alert,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Types
type TabType = 'editor' | 'library' | 'templates' | 'history' | 'settings';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('editor');
  const [token, setToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [apiUrl, setApiUrl] = useState('http://localhost:3000'); // default local dev server

  // Editor states
  const [inputText, setInputText] = useState('');
  const [action, setAction] = useState<'optimize' | 'rewrite'>('optimize');
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState('');
  const [platform, setPlatform] = useState('');
  
  // Processing States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [activeVariation, setActiveVariation] = useState<number | null>(null);

  // Library & History local mock databases (or synced if token is active)
  const [libraryList, setLibraryList] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  
  // Selected items details
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({});
  const [selectedHistory, setSelectedHistory] = useState<any | null>(null);

  // Default templates list
  const templates = [
    {
      id: 'resume',
      title: 'Resume Builder',
      description: 'Revise bullets to align with job descriptions and KPIs.',
      content: 'Act as an expert resume writer. Revise my work history bullets to align with the role of [Target Role] at [Target Company]. Highlight my skills in [Key Skills]. Work history: [Work History]'
    },
    {
      id: 'cover-letter',
      title: 'Cover Letter Generator',
      description: 'Create tailored cover letters emphasizing qualifications.',
      content: 'Write a cover letter for the [Role Name] position at [Company Name]. I have [Years of Experience] years of experience. Target: [Company Focus]'
    },
    {
      id: 'linkedin',
      title: 'LinkedIn Outreach',
      description: 'Craft connection requests or InMail outreach messages.',
      content: 'Write a LinkedIn outreach note to [Recipient Name] who is a [Recipient Title] at [Company Name]. Focus on [Shared Interest]'
    },
    {
      id: 'sql',
      title: 'SQL Generator',
      description: 'Translate natural language queries into SQL.',
      content: 'Write a SQL query to [Describe Goal]. Schema details: [Table Details]'
    }
  ];

  // Auth Handler
  const handleLogin = () => {
    if (!token.trim()) {
      // Demo fallback
      setIsAuthenticated(true);
      setLibraryList([
        { id: '1', title: 'Resume Review Persona', content: 'Act as a professional reviewer...', category: 'Career' },
        { id: '2', title: 'PostgreSQL Optimizer', content: 'Act as a Senior database engineer...', category: 'Coding' }
      ]);
      setHistoryList([
        { id: '1', original_input: 'make sql query for customers', optimized_output: 'SELECT * FROM customers...', action_used: 'optimize_prompt', created_at: new Date().toISOString() }
      ]);
      return;
    }
    // Attempt authentication with token
    setLoading(true);
    fetch(`${apiUrl}/api/prompt/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ text: 'ping', action: 'rewrite' })
    })
      .then(async (res) => {
        if (res.status === 401) throw new Error('Invalid authentication token.');
        setIsAuthenticated(true);
        loadSyncedData();
      })
      .catch((err) => {
        Alert.alert('Auth Failed', err.message || 'Could not verify token. Using local demo instead.');
        setIsAuthenticated(true); // fallback to demo
      })
      .finally(() => setLoading(false));
  };

  const loadSyncedData = async () => {
    // In a fully configured setup, we fetch prompts/history from Supabase using token.
    // For portfolio demo, we load basic mock arrays when connected.
    setLibraryList([
      { id: '1', title: 'LinkedIn Outreach (Synced)', content: 'Write a connection note...', category: 'Social' },
      { id: '2', title: 'SQL Generator (Synced)', content: 'Act as an optimized SQL writer...', category: 'Coding' }
    ]);
  };

  // Processing Handler
  const handleProcess = () => {
    if (!inputText.trim()) {
      Alert.alert('Empty Input', 'Please type or paste some text first.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setActiveVariation(null);

    // Call API Route
    fetch(`${apiUrl}/api/prompt/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || 'mock-token'}`
      },
      body: JSON.stringify({
        text: inputText,
        action,
        tone: tone || undefined,
        length: length || undefined,
        platform: platform || undefined
      })
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Server error occurred.');
        setResult(data);
        
        // Add to history
        const newHist = {
          id: String(Date.now()),
          original_input: inputText,
          optimized_output: data.improved_text,
          action_used: action === 'optimize' ? 'optimize_prompt' : `rewrite_${tone}`,
          metadata: { score: data.score, explanations: data.explanations },
          created_at: new Date().toISOString()
        };
        setHistoryList(prev => [newHist, ...prev]);
      })
      .catch((err) => {
        setError(err.message || 'API request failed.');
      })
      .finally(() => setLoading(false));
  };

  // Compile template
  const compileTemplate = () => {
    if (!selectedTemplate) return '';
    let compiled = selectedTemplate.content;
    Object.entries(templateVars).forEach(([key, value]) => {
      compiled = compiled.replace(new RegExp(`\\[${key}\\]`, 'g'), value || `[${key}]`);
    });
    return compiled;
  };

  const handleCopy = (txt: string) => {
    Clipboard.setString(txt);
    Alert.alert('Copied', 'Prompt copied to system clipboard.');
  };

  const handleSaveToLibrary = (titleText: string, contentText: string) => {
    const newItem = {
      id: String(Date.now()),
      title: titleText,
      content: contentText,
      category: 'Mobile'
    };
    setLibraryList(prev => [newItem, ...prev]);
    Alert.alert('Success', 'Saved to library.');
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar style="light" />
        <View className="flex-1 justify-center px-6 gap-6">
          <View style={styles.logoContainer}>
            <Ionicons name="sparkles" size={40} color="#818cf8" />
            <Text style={styles.authTitle}>PromptPilot</Text>
            <Text style={styles.authSubtitle}>AI Writing Assistant & Prompt Optimizer</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Dashboard API Url</Text>
            <TextInput
              value={apiUrl}
              onChangeText={setApiUrl}
              placeholder="e.g. http://localhost:3000"
              placeholderTextColor="#4b5563"
              style={styles.input}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Access Token (Optional)</Text>
            <TextInput
              value={token}
              onChangeText={setToken}
              secureTextEntry
              placeholder="Paste token from Web Settings to sync"
              placeholderTextColor="#4b5563"
              style={styles.input}
            />
          </View>

          <TouchableOpacity 
            onPress={handleLogin} 
            disabled={loading}
            style={styles.primaryButton}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Authenticate & Sync</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Title Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PromptPilot</Text>
        <Text style={styles.headerBadge}>
          {token ? 'Synced' : 'Local Mode'}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        
        {/* ================= EDITOR TAB ================= */}
        {currentTab === 'editor' && (
          <View style={styles.tabContent}>
            <View style={styles.actionToggle}>
              <TouchableOpacity
                onPress={() => setAction('optimize')}
                style={[styles.toggleBtn, action === 'optimize' && styles.toggleBtnActive]}
              >
                <Text style={[styles.toggleText, action === 'optimize' && styles.toggleTextActive]}>Optimize Prompt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setAction('rewrite')}
                style={[styles.toggleBtn, action === 'rewrite' && styles.toggleBtnActive]}
              >
                <Text style={[styles.toggleText, action === 'rewrite' && styles.toggleTextActive]}>Rewrite Text</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              value={inputText}
              onChangeText={setInputText}
              multiline
              numberOfLines={6}
              placeholder={
                action === 'optimize' 
                  ? 'Type or paste a weak prompt to optimize...' 
                  : 'Type or paste a text message to polish tone...'
              }
              placeholderTextColor="#4b5563"
              style={styles.textarea}
            />

            <View style={styles.optionsRow}>
              <View style={styles.optionCol}>
                <Text style={styles.optionLabel}>Tone</Text>
                <TextInput
                  value={tone}
                  onChangeText={setTone}
                  style={styles.smallInput}
                  placeholder="professional"
                  placeholderTextColor="#4b5563"
                />
              </View>
              <View style={styles.optionCol}>
                <Text style={styles.optionLabel}>Platform</Text>
                <TextInput
                  value={platform}
                  onChangeText={setPlatform}
                  style={styles.smallInput}
                  placeholder="chatgpt"
                  placeholderTextColor="#4b5563"
                />
              </View>
            </View>

            <TouchableOpacity 
              onPress={handleProcess}
              disabled={loading}
              style={styles.primaryButton}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="sparkles" size={16} color="#fff" />
                  <Text style={styles.buttonText}>Process with AI</Text>
                </View>
              )}
            </TouchableOpacity>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {result && (
              <View style={styles.resultContainer}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultTitle}>AI Output</Text>
                  {result.score && (
                    <Text style={styles.scoreBadge}>Score: {result.score.overall}/100</Text>
                  )}
                </View>
                
                <Text style={styles.resultText}>
                  {activeVariation !== null ? result.variations[activeVariation] : result.improved_text}
                </Text>

                <View style={styles.resultActions}>
                  <TouchableOpacity 
                    onPress={() => handleCopy(activeVariation !== null ? result.variations[activeVariation] : result.improved_text)}
                    style={styles.actionButton}
                  >
                    <Ionicons name="copy-outline" size={14} color="#818cf8" />
                    <Text style={styles.actionBtnText}>Copy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => handleSaveToLibrary('Mobile Output', result.improved_text)}
                    style={styles.actionButton}
                  >
                    <Ionicons name="save-outline" size={14} color="#818cf8" />
                    <Text style={styles.actionBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>

                {/* Variations */}
                {result.variations && result.variations.length > 0 && (
                  <View style={{ marginTop: 15 }}>
                    <Text style={styles.sectionLabel}>Variations</Text>
                    <View style={styles.variationsRow}>
                      <TouchableOpacity 
                        onPress={() => setActiveVariation(null)}
                        style={[styles.varBtn, activeVariation === null && styles.varBtnActive]}
                      >
                        <Text style={styles.varBtnText}>Std</Text>
                      </TouchableOpacity>
                      {result.variations.map((_: any, idx: number) => (
                        <TouchableOpacity 
                          key={idx}
                          onPress={() => setActiveVariation(idx)}
                          style={[styles.varBtn, activeVariation === idx && styles.varBtnActive]}
                        >
                          <Text style={styles.varBtnText}>{String.fromCharCode(65 + idx)}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* ================= LIBRARY TAB ================= */}
        {currentTab === 'library' && (
          <View style={styles.tabContent}>
            <Text style={styles.tabHeading}>Saved Prompts</Text>
            {libraryList.length === 0 ? (
              <Text style={styles.emptyText}>No saved prompts in library.</Text>
            ) : (
              libraryList.map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={{ flexDirection: 'row', justifyContent: 'between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={styles.cardCategory}>{item.category}</Text>
                  </View>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardContent}>{item.content}</Text>
                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => handleCopy(item.content)} style={styles.cardActionBtn}>
                      <Ionicons name="copy-outline" size={14} color="#9ca3af" />
                      <Text style={styles.cardActionText}>Copy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => setLibraryList(libraryList.filter(l => l.id !== item.id))} 
                      style={styles.cardActionBtn}
                    >
                      <Ionicons name="trash-outline" size={14} color="#ef4444" />
                      <Text style={[styles.cardActionText, { color: '#ef4444' }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ================= TEMPLATES TAB ================= */}
        {currentTab === 'templates' && (
          <View style={styles.tabContent}>
            {!selectedTemplate ? (
              <>
                <Text style={styles.tabHeading}>Templates Explorer</Text>
                {templates.map((t) => (
                  <TouchableOpacity 
                    key={t.id} 
                    onPress={() => {
                      setSelectedTemplate(t);
                      // Extract bracket variables
                      const regex = /\[(.*?)\]/g;
                      let match;
                      const vars: Record<string, string> = {};
                      while ((match = regex.exec(t.content)) !== null) {
                        vars[match[1]] = '';
                      }
                      setTemplateVars(vars);
                    }} 
                    style={styles.cardClickable}
                  >
                    <Text style={styles.cardTitle}>{t.title}</Text>
                    <Text style={styles.cardDescription}>{t.description}</Text>
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <View>
                <TouchableOpacity onPress={() => setSelectedTemplate(null)} style={styles.backBtn}>
                  <Ionicons name="arrow-back" size={16} color="#818cf8" />
                  <Text style={styles.backBtnText}>Back to templates</Text>
                </TouchableOpacity>

                <Text style={styles.tabHeading}>{selectedTemplate.title}</Text>
                
                {Object.keys(templateVars).map((varName) => (
                  <View key={varName} style={styles.formGroup}>
                    <Text style={styles.label}>{varName}</Text>
                    <TextInput
                      value={templateVars[varName]}
                      onChangeText={(val) => setTemplateVars(v => ({ ...v, [varName]: val }))}
                      placeholder={`Enter ${varName}`}
                      placeholderTextColor="#4b5563"
                      style={styles.input}
                    />
                  </View>
                ))}

                <TouchableOpacity 
                  onPress={() => handleCopy(compileTemplate())}
                  style={styles.primaryButton}
                >
                  <Text style={styles.buttonText}>Compile & Copy</Text>
                </TouchableOpacity>

                <Text style={styles.sectionLabel}>Preview</Text>
                <Text style={styles.previewText}>{compileTemplate()}</Text>
              </View>
            )}
          </View>
        )}

        {/* ================= HISTORY TAB ================= */}
        {currentTab === 'history' && (
          <View style={styles.tabContent}>
            <Text style={styles.tabHeading}>Execution History</Text>
            {historyList.length === 0 ? (
              <Text style={styles.emptyText}>No history logs found.</Text>
            ) : (
              historyList.map((item) => (
                <TouchableOpacity 
                  key={item.id} 
                  onPress={() => setSelectedHistory(selectedHistory?.id === item.id ? null : item)}
                  style={styles.cardClickable}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.cardCategory}>{item.action_used}</Text>
                    <Text style={styles.cardTime}>{new Date(item.created_at).toLocaleTimeString()}</Text>
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.original_input}</Text>
                  
                  {selectedHistory?.id === item.id && (
                    <View style={styles.historyDetail}>
                      <Text style={styles.label}>Before</Text>
                      <Text style={styles.historyText}>{item.original_input}</Text>
                      <Text style={[styles.label, { marginTop: 10 }]}>After</Text>
                      <Text style={styles.historyText}>{item.optimized_output}</Text>
                      <TouchableOpacity 
                        onPress={() => handleCopy(item.optimized_output)}
                        style={[styles.actionButton, { marginTop: 10, alignSelf: 'flex-end' }]}
                      >
                        <Ionicons name="copy-outline" size={14} color="#818cf8" />
                        <Text style={styles.actionBtnText}>Copy Result</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* ================= SETTINGS TAB ================= */}
        {currentTab === 'settings' && (
          <View style={styles.tabContent}>
            <Text style={styles.tabHeading}>App Settings</Text>
            
            <View style={styles.card}>
              <Text style={styles.label}>Preferred Model</Text>
              <Text style={styles.settingsVal}>Gemini 3.5 Flash</Text>
              
              <Text style={[styles.label, { marginTop: 15 }]}>API Gateway Endpoint</Text>
              <Text style={styles.settingsVal}>{apiUrl}</Text>
            </View>

            <TouchableOpacity 
              onPress={() => {
                setIsAuthenticated(false);
                setToken('');
                setResult(null);
              }}
              style={styles.dangerButton}
            >
              <Text style={styles.dangerButtonText}>Sign Out / Unlink Session</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* Navigation Tab Bar */}
      <View style={styles.tabBar}>
        {(['editor', 'library', 'templates', 'history', 'settings'] as TabType[]).map((tab) => {
          let iconName: any = 'sparkles';
          if (tab === 'library') iconName = 'library-outline';
          else if (tab === 'templates') iconName = 'list-outline';
          else if (tab === 'history') iconName = 'time-outline';
          else if (tab === 'settings') iconName = 'settings-outline';

          const isActive = currentTab === tab;

          return (
            <TouchableOpacity 
              key={tab} 
              onPress={() => setCurrentTab(tab)}
              style={styles.tabItem}
            >
              <Ionicons name={iconName} size={20} color={isActive ? '#818cf8' : '#6b7280'} />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617', // slate-950
  },
  authContainer: {
    flex: 1,
    backgroundColor: '#020617',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  authTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  authSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#6b7280',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#fff',
  },
  smallInput: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12,
    color: '#fff',
  },
  textarea: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#fff',
    height: 180,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  primaryButton: {
    backgroundColor: '#4f46e5', // indigo-600
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  dangerButtonText: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 14,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  header: {
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerBadge: {
    fontSize: 10,
    color: '#818cf8',
    fontWeight: 'bold',
    backgroundColor: 'rgba(129, 140, 248, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  tabHeading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  actionToggle: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    padding: 4,
    borderRadius: 10,
    marginBottom: 15,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#4f46e5',
  },
  toggleText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: 'semibold',
  },
  toggleTextActive: {
    color: '#fff',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15,
  },
  optionCol: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6b7280',
    marginBottom: 4,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 10,
  },
  resultContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 8,
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  scoreBadge: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: 'bold',
  },
  resultText: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  resultActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#020617',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  actionBtnText: {
    color: '#818cf8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  variationsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  varBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  varBtnActive: {
    borderColor: '#818cf8',
    backgroundColor: 'rgba(129, 140, 248, 0.05)',
  },
  varBtnText: {
    color: '#fff',
    fontSize: 10,
  },
  tabBar: {
    height: 60,
    borderTopWidth: 1,
    borderTopColor: '#0f172a',
    flexDirection: 'row',
    backgroundColor: '#020617',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 3,
  },
  tabLabelActive: {
    color: '#818cf8',
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#4b5563',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 40,
  },
  card: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
  },
  cardClickable: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardCategory: {
    fontSize: 9,
    color: '#818cf8',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  cardTime: {
    fontSize: 9,
    color: '#4b5563',
  },
  cardDescription: {
    color: '#9ca3af',
    fontSize: 12,
    lineHeight: 16,
  },
  cardContent: {
    color: '#d1d5db',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    backgroundColor: '#020617',
    padding: 8,
    borderRadius: 8,
    fontFamily: 'monospace',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 15,
    marginTop: 10,
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardActionText: {
    fontSize: 10,
    color: '#9ca3af',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 15,
  },
  backBtnText: {
    color: '#818cf8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  previewText: {
    color: '#9ca3af',
    fontSize: 12,
    lineHeight: 18,
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 8,
    fontFamily: 'monospace',
    marginTop: 8,
  },
  settingsVal: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'semibold',
    backgroundColor: '#020617',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginTop: 4,
  },
  historyDetail: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  historyText: {
    color: '#d1d5db',
    fontSize: 12,
    lineHeight: 18,
    backgroundColor: '#020617',
    padding: 8,
    borderRadius: 8,
    fontFamily: 'monospace',
    marginTop: 4,
  }
});
