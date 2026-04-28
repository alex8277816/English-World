import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy, where, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, setDoc, getDocs, writeBatch } from 'firebase/firestore';
import { Vocabulary, VocabularyItem, Category, Article, GrammarNote, GrammarItem } from '../types';
import { Plus, Search, Filter, LogOut, Tags, LayoutGrid, List, BrainCircuit, Youtube, Trash2, Edit3, Save, X, Volume2, FolderPlus, ChevronRight, ChevronDown, Video as VideoIcon, Link as LinkIcon, FileText, Sparkles, Loader2, Settings, User as UserIcon, Mail, BookOpen, Send, Check, Clock, PenTool, Radio, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getWordEntries, getSingleWordDetails, analyzeArticle, analyzeGrammar } from '../services/geminiService';
import QuizView from './QuizView';

const BROADCAST_JINGLE = "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const playNewsBroadcast = (text: string, title: string) => {
    setIsBroadcasting(true);
    window.speechSynthesis.cancel();
    
    // Play intro jingle
    const audio = new Audio(BROADCAST_JINGLE);
    audio.volume = 0.2;
    audio.play().catch(e => console.log("Audio play blocked"));

    const intro = `This is CNN breaking news. We are reporting on: ${title}. `;
    const fullText = intro + text;

    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.lang = 'en-US';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    const newsVoice = voices.find(v => v.name.includes("Samantha") || v.name.includes("Daniel") || v.name.includes("Google US English")) || voices[0];
    if (newsVoice) utterance.voice = newsVoice;

    utterance.onend = () => setIsBroadcasting(false);
    utterance.onerror = () => setIsBroadcasting(false);
    
    window.speechSynthesis.speak(utterance);
  };
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [grammarNotes, setGrammarNotes] = useState<GrammarNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedArticleCategory, setSelectedArticleCategory] = useState<string>('all');
  const [selectedGrammarCategory, setSelectedGrammarCategory] = useState<string>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [articleCategorySelection, setArticleCategorySelection] = useState<string[]>([]);
  const [grammarCategorySelection, setGrammarCategorySelection] = useState<string[]>([]);
  const [view, setView] = useState<'notes' | 'quiz' | 'articles' | 'grammar'>('notes');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [selectedGrammarId, setSelectedGrammarId] = useState<string | null>(null);
  const [articleToDeleteId, setArticleToDeleteId] = useState<string | null>(null);
  const [grammarToDeleteId, setGrammarToDeleteId] = useState<string | null>(null);
  
  // Article related states
  const [articleInput, setArticleInput] = useState('');
  const [isArticleLoading, setIsArticleLoading] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  
  // Grammar related states
  const [grammarInput, setGrammarInput] = useState('');
  const [isGrammarLoading, setIsGrammarLoading] = useState(false);
  const [newGrammarItemForm, setNewGrammarItemForm] = useState<{
    sentence: string;
    explanation: string;
    structure: string;
    categoryIds: string[];
    exampleSentences: string;
    notes: string;
  }>({
    sentence: '',
    explanation: '',
    structure: '',
    categoryIds: [],
    exampleSentences: '',
    notes: ''
  });
  const [addingGrammarItemToId, setAddingGrammarItemToId] = useState<string | null>(null);
  const [newInput, setNewInput] = useState('');
  const [currentVideoId, setCurrentVideoId] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Vocabulary>>({});
  const [addingItemToId, setAddingItemToId] = useState<string | null>(null);
  const [editingItemInfo, setEditingItemInfo] = useState<{ vocabId: string, itemIdx: number } | null>(null);
  const [isItemAiLoading, setIsItemAiLoading] = useState(false);
  const [newItemForm, setNewItemForm] = useState<{
    text: string;
    meaning: string;
    exampleSentences: string;
    synonyms: string;
    antonyms: string;
    categoryIds: string[];
    notes: string;
  }>({
    text: '',
    meaning: '',
    exampleSentences: '',
    synonyms: '',
    antonyms: '',
    categoryIds: [],
    notes: ''
  });

  const handleEditItemSave = async () => {
    if (!editingItemInfo || !user) return;
    const { vocabId, itemIdx } = editingItemInfo;
    const vocab = vocabularies.find(v => v.id === vocabId);
    if (!vocab) return;

    const updatedItems = [...(vocab.items || [])];
    updatedItems[itemIdx] = {
      text: newItemForm.text.trim(),
      meaning: newItemForm.meaning.trim(),
      exampleSentences: newItemForm.exampleSentences.split('\n').filter(s => s.trim()),
      synonyms: newItemForm.synonyms.split(',').map(s => s.trim()).filter(s => s),
      antonyms: newItemForm.antonyms.split(',').map(s => s.trim()).filter(s => s),
      categoryIds: newItemForm.categoryIds,
      notes: newItemForm.notes.trim()
    };

    try {
      await updateDoc(doc(db, 'users', user.uid, 'vocabularies', vocabId), {
        items: updatedItems,
        updatedAt: serverTimestamp()
      });
      setEditingItemInfo(null);
      setNewItemForm({ text: '', meaning: '', exampleSentences: '', synonyms: '', antonyms: '', categoryIds: [], notes: '' });
    } catch (err) {
      console.error(err);
      alert("更新失敗");
    }
  };

  const startEditingItem = (vocabId: string, item: any, idx: number) => {
    setEditingItemInfo({ vocabId, itemIdx: idx });
    setNewItemForm({
      text: item.text,
      meaning: item.meaning,
      exampleSentences: (item.exampleSentences || []).join('\n'),
      synonyms: (item.synonyms || []).join(', '),
      antonyms: (item.antonyms || []).join(', '),
      categoryIds: item.categoryIds || [],
      notes: item.notes || ''
    });
  };

  const handleAddItem = async (vocabId: string, vocabItems: any[]) => {
    if (!newItemForm.text.trim() || !user) return;
    
    const newItem = {
      text: newItemForm.text.trim(),
      meaning: newItemForm.meaning.trim(),
      exampleSentences: newItemForm.exampleSentences.split('\n').filter(s => s.trim()),
      synonyms: newItemForm.synonyms.split(',').map(s => s.trim()).filter(s => s),
      antonyms: newItemForm.antonyms.split(',').map(s => s.trim()).filter(s => s),
      categoryIds: newItemForm.categoryIds,
      notes: newItemForm.notes.trim()
    };

    try {
      await updateDoc(doc(db, 'users', user.uid, 'vocabularies', vocabId), {
        items: [...(vocabItems || []), newItem],
        updatedAt: serverTimestamp()
      });
      setNewItemForm({ text: '', meaning: '', exampleSentences: '', synonyms: '', antonyms: '', categoryIds: [], notes: '' });
      setAddingItemToId(null);
    } catch (err) {
      console.error(err);
      alert("儲存失敗");
    }
  };

  const handleAddItemAiFill = async () => {
    if (!newItemForm.text.trim()) return;
    setIsItemAiLoading(true);
    try {
      const details = await getSingleWordDetails(newItemForm.text);
      if (details) {
        setNewItemForm({
          ...newItemForm,
          meaning: details.meaning || '',
          exampleSentences: (details.exampleSentences || []).join('\n'),
          synonyms: (details.synonyms || []).join(', '),
          antonyms: (details.antonyms || []).join(', ')
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsItemAiLoading(false);
    }
  };

  const [selectedAccent, setSelectedAccent] = useState<'en-US' | 'en-GB' | 'en-AU'>('en-US');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const playAudio = (text: string) => {
    // Stop any current speaking
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedAccent;
    
    // Find a voice that matches the selected accent if possible
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith(selectedAccent));
    if (voice) utterance.voice = voice;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const stopAudio = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const [antonyms, setAntonyms] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Load recovery email
    const unsubSettings = onSnapshot(doc(db, 'users', user.uid, 'settings', 'profile'), (snap) => {
      if (snap.exists()) {
        setRecoveryEmail(snap.data().recoveryEmail || '');
      }
    });

    const vQuery = query(
      collection(db, 'users', user.uid, 'vocabularies'),
      orderBy('createdAt', 'desc')
    );
    const cQuery = query(
      collection(db, 'users', user.uid, 'categories'),
      orderBy('name', 'asc')
    );
    const aQuery = query(
      collection(db, 'users', user.uid, 'articles'),
      orderBy('createdAt', 'desc')
    );
    const gQuery = query(
      collection(db, 'users', user.uid, 'grammar'),
      orderBy('createdAt', 'desc')
    );

    const unsubV = onSnapshot(vQuery, (snapshot) => {
      setVocabularies(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Vocabulary)));
      setLoading(false);
    });

    const unsubC = onSnapshot(cQuery, (snapshot) => {
      setCategories(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
    });

    const unsubA = onSnapshot(aQuery, (snapshot) => {
      setArticles(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Article)));
    });

    const unsubG = onSnapshot(gQuery, (snapshot) => {
      setGrammarNotes(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as GrammarNote)));
    });

    return () => {
      unsubV();
      unsubC();
      unsubA();
      unsubG();
      unsubSettings();
    };
  }, [user]);

  const handleDiagnostics = async () => {
    try {
      const response = await fetch('/api/ai/diagnostics');
      const data = await response.json() as any;
      console.log('Diagnostics Result:', data);
      alert(`API 診斷完畢 (雲端版本):\n狀態: ${data.results?.[0]?.status || 'Unknown'}\n訊息: ${data.results?.[0]?.message || '無錯誤'}\nAPI Key 前綴: ${data.apiKeyPrefix}\n\n若狀態為 Error，請確認您的 Cloudflare Secrets 設定。`);
    } catch (err) {
      console.error(err);
      alert('診斷請求失敗，請確認網路連線');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingSettings(true);
    try {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'profile'), {
        recoveryEmail: recoveryEmail.trim(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      setIsSettingsOpen(false);
    } catch (err) {
      console.error(err);
      alert("儲存設定失敗");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInput.trim() || !user) return;

    setIsAiLoading(true);
    try {
      // Check if input is a YouTube URL
      const ytMatch = newInput.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
      let youtubeId = '';
      let textToAnalyze = newInput;

      if (ytMatch) {
        youtubeId = ytMatch[1];
        textToAnalyze = `YouTube Video ID: ${youtubeId}`;
        
        const aiResult = await getWordEntries(textToAnalyze);
        const allItems = aiResult?.items || [];
        
        if (allItems.length === 0) {
          alert("AI 無法從此連結提取單字，請檢查網址或嘗試輸入文字。");
          return;
        }

        // Filter out duplicates
        const uniqueItems = allItems.filter((item: any) => 
          !vocabularies.some(v => v.items.some(vItem => vItem.text.toLowerCase().trim() === item.text.toLowerCase().trim()))
        );

        if (uniqueItems.length === 0 && allItems.length > 0) {
          console.log("All items already exist, but proceeding as requested.");
        }
        
        await addDoc(collection(db, 'users', user.uid, 'vocabularies'), {
          title: aiResult?.title || '影片學習筆記',
          items: (uniqueItems.length > 0 ? uniqueItems : allItems).map((item: any) => ({
            ...item,
            categoryIds: selectedCategory !== 'all' ? [selectedCategory] : [],
            sourceId: youtubeId,
            sourceType: 'video'
          })),
          youtubeId: youtubeId,
          sourceId: youtubeId,
          sourceType: 'video',
          userId: user.uid,
          categoryIds: selectedCategory !== 'all' ? [selectedCategory] : [],
          masteryLevel: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        // Plain text input - create ONE entry PER item to satisfy "one word = one category" request
        const aiResult = await getWordEntries(newInput);
        const items = aiResult?.items || [];
        
        if (items.length === 0) {
          alert("AI 無法分析輸入的內容，請嘗試換個說法或是檢查 API 設定。");
          return;
        }

        // Filter out duplicates
        const uniqueItems = items.filter((item: any) => 
          !vocabularies.some(v => v.items.some(vItem => vItem.text.toLowerCase().trim() === item.text.toLowerCase().trim()))
        );

        const itemsToProcess = uniqueItems.length > 0 ? uniqueItems : [];
        
        if (itemsToProcess.length === 0 && items.length > 0) {
          alert("所有輸入的單字都已在您的筆記中。");
          return;
        }

        if (itemsToProcess.length === 1) {
          // Single word/sentence
          await addDoc(collection(db, 'users', user.uid, 'vocabularies'), {
            title: itemsToProcess[0].text,
            items: [{
              ...itemsToProcess[0],
              categoryIds: selectedCategory !== 'all' ? [selectedCategory] : []
            }],
            youtubeId: '',
            userId: user.uid,
            categoryIds: selectedCategory !== 'all' ? [selectedCategory] : [],
            masteryLevel: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } else {
          // Multiple items - create separate documents for each if not a video
          const promises = itemsToProcess.map((item: any) => 
            addDoc(collection(db, 'users', user.uid, 'vocabularies'), {
              title: item.text,
              items: [{
                ...item,
                categoryIds: selectedCategory !== 'all' ? [selectedCategory] : []
              }],
              youtubeId: '',
              userId: user.uid,
              categoryIds: selectedCategory !== 'all' ? [selectedCategory] : [],
              masteryLevel: 0,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            })
          );
          await Promise.all(promises);
        }
      }
      setNewInput('');
      setIsAdding(false);
    } catch (err) {
      console.error(err);
      alert("學習紀錄新增失敗，請檢查網路連線或 API 設定");
    } finally {
      setIsAiLoading(false);
    }
  };

  const [addMode, setAddMode] = useState<'ai' | 'manual'>('ai');
  const [manualForm, setManualForm] = useState({ text: '', meaning: '', notes: '' });

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.text.trim() || !user) return;

    // Deduplication check
    const isDuplicate = vocabularies.some(v => 
      v.items.some(vItem => vItem.text.toLowerCase().trim() === manualForm.text.toLowerCase().trim())
    );
    
    if (isDuplicate) {
      console.log("Duplicate found, proceeding as requested.");
    }

    try {
      await addDoc(collection(db, 'users', user.uid, 'vocabularies'), {
        title: manualForm.text.trim(),
        items: [{
          text: manualForm.text.trim(),
          meaning: manualForm.meaning.trim(),
          categoryIds: selectedCategory !== 'all' ? [selectedCategory] : [],
          notes: manualForm.notes.trim()
        }],
        youtubeId: '',
        userId: user.uid,
        categoryIds: selectedCategory !== 'all' ? [selectedCategory] : [],
        masteryLevel: 0,
        notes: manualForm.notes.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setManualForm({ text: '', meaning: '', notes: '' });
      setIsAdding(false);
    } catch (err) {
      console.error(err);
      alert("儲存失敗");
    }
  };

  const handleManualAiFill = async () => {
    if (!manualForm.text.trim()) return;
    setIsAiLoading(true);
    try {
      const details = await getSingleWordDetails(manualForm.text);
      if (details) {
        setManualForm({
          ...manualForm,
          meaning: details.meaning || ''
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const [isAddingCategory, setIsAddingCategory] = useState<'vocab' | 'article' | 'grammar' | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingSubTo, setAddingSubTo] = useState<string | null>(null);

  const handleCreateCategory = async (e: React.FormEvent, parentId: string | null = null, type: 'vocab' | 'article' | 'grammar' = 'vocab') => {
    e.preventDefault();
    if (!newCategoryName.trim() || !user) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'categories'), {
        name: newCategoryName.trim(),
        userId: user.uid,
        createdAt: serverTimestamp(),
        parentId: parentId || null,
        type: type
      });
      setNewCategoryName('');
      setIsAddingCategory(null);
      setAddingSubTo(null);
    } catch (err) {
      console.error(err);
      alert("儲存分類失敗");
    }
  };

  const handleDeleteVocab = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user || !id) return;
    
    if (!window.confirm("確定要刪除這個單字筆記嗎？")) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'vocabularies', id));
    } catch (err) {
      console.error("Delete vocab error:", err);
      alert("刪除失敗，請檢查權限");
    }
  };

  const handleDeleteCategory = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user || !id) return;
    
    try {
      // Delete subcategories first
      const subs = categories.filter(c => c.parentId === id);
      for (const sub of subs) {
        await deleteDoc(doc(db, 'users', user.uid, 'categories', sub.id));
      }
      await deleteDoc(doc(db, 'users', user.uid, 'categories', id));
      if (selectedCategory === id) {
        setSelectedCategory('all');
      }
      if (selectedArticleCategory === id) {
        setSelectedArticleCategory('all');
      }
      if (selectedGrammarCategory === id) {
        setSelectedGrammarCategory('all');
      }
    } catch (err) {
      console.error("Delete category error:", err);
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!user || !editingCategoryName.trim()) {
      setEditingCategoryId(null);
      return;
    }
    try {
      await updateDoc(doc(db, 'users', user.uid, 'categories', id), {
        name: editingCategoryName.trim(),
        updatedAt: serverTimestamp()
      });
      setEditingCategoryId(null);
      setEditingCategoryName("");
    } catch (err) {
      console.error("Update category error:", err);
      alert("更新分類名稱失敗");
    }
  };

  const handleAnalyzeArticle = async () => {
    if (!articleInput.trim() || !user) return;
    setIsArticleLoading(true);
    try {
      const result = await analyzeArticle(articleInput);
      const articleRef = doc(collection(db, 'users', user.uid, 'articles'));
      
      const identifiedItems = (result.items || []).map((item: any) => ({
        ...item,
        sourceId: articleRef.id,
        sourceType: 'article' as const
      }));

      const articleData = {
        title: result.title || '未命名文章',
        content: articleInput,
        userId: user.uid,
        items: identifiedItems,
        categoryIds: articleCategorySelection,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      await setDoc(articleRef, articleData);

      // Automatically import items to the general vocabulary list
      // This ensures they persist even if the article is deleted
      for (const item of identifiedItems) {
        try {
          await addDoc(collection(db, 'users', user.uid, 'vocabularies'), {
            title: item.text,
            items: [item],
            sourceId: articleRef.id,
            sourceType: 'article',
            userId: user.uid,
            categoryIds: [],
            masteryLevel: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          console.error("Auto-import failed for item:", item.text, err);
        }
      }

      setArticleInput('');
      setArticleCategorySelection([]);
      setView('articles');
      setSelectedArticleId(articleRef.id);
    } catch (err) {
      console.error(err);
      alert("文章分析失敗");
    } finally {
      setIsArticleLoading(false);
    }
  };

  const handleAnalyzeGrammar = async () => {
    if (!grammarInput.trim() || !user) return;
    setIsGrammarLoading(true);
    try {
      const result = await analyzeGrammar(grammarInput);
      const grammarRef = doc(collection(db, 'users', user.uid, 'grammar'));
      
      const identifiedItems = (result.items || []).map((item: any) => ({
        ...item,
        sourceId: grammarRef.id,
        sourceType: 'grammar' as const
      }));

      const grammarData = {
        title: result.title || '未命名文法筆記',
        content: grammarInput,
        analysis: result.analysis || '',
        userId: user.uid,
        items: identifiedItems,
        categoryIds: grammarCategorySelection,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      await setDoc(grammarRef, grammarData);

      // Automatically import grammar items to the general list
      for (const item of identifiedItems) {
        try {
          await addDoc(collection(db, 'users', user.uid, 'vocabularies'), {
            title: item.sentence || item.text || '文法重點',
            items: [{
              text: item.sentence || item.text || '',
              meaning: item.explanation || item.meaning || '',
              structure: item.structure || '',
              exampleSentences: item.exampleSentences || [],
              sourceId: grammarRef.id,
              sourceType: 'grammar'
            }],
            sourceId: grammarRef.id,
            sourceType: 'grammar',
            userId: user.uid,
            categoryIds: [],
            masteryLevel: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          console.error("Grammar auto-import failed:", err);
        }
      }

      setGrammarInput('');
      setGrammarCategorySelection([]);
      setView('grammar');
      setSelectedGrammarId(grammarRef.id);
    } catch (err) {
      console.error(err);
      alert("文法分析失敗");
    } finally {
      setIsGrammarLoading(false);
    }
  };

  const handleDeleteGrammar = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || !id) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'grammar', id));
      if (selectedGrammarId === id) setSelectedGrammarId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const [editingGrammarField, setEditingGrammarField] = useState<{ id: string, field: 'title' | 'content' | 'analysis', value: string } | null>(null);

  const handleUpdateGrammar = async (id: string, updates: Partial<GrammarNote>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'grammar', id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddGrammarItem = async (noteId: string, currentItems: GrammarItem[]) => {
    if (!user || !newGrammarItemForm.sentence.trim()) return;
    try {
      const newItem: GrammarItem = {
        sentence: newGrammarItemForm.sentence.trim(),
        explanation: newGrammarItemForm.explanation.trim(),
        structure: newGrammarItemForm.structure.trim(),
        categoryIds: newGrammarItemForm.categoryIds,
        exampleSentences: newGrammarItemForm.exampleSentences.split('\n').filter(s => s.trim()),
        notes: newGrammarItemForm.notes.trim()
      };
      await updateDoc(doc(db, 'users', user.uid, 'grammar', noteId), {
        items: [...(currentItems || []), newItem],
        updatedAt: serverTimestamp()
      });
      setNewGrammarItemForm({ sentence: '', explanation: '', structure: '', categoryIds: [], exampleSentences: '', notes: '' });
      setAddingGrammarItemToId(null);
    } catch (err) {
      console.error(err);
      alert("儲存失敗");
    }
  };

  const handleDeleteArticle = async (id: string) => {
    if (!user || !id) return;
    
    try {
      console.log("Deleting article:", id);
      await deleteDoc(doc(db, 'users', user.uid, 'articles', id));
      
      console.log("Successfully deleted article.");
      if (selectedArticleId === id) setSelectedArticleId(null);
      setArticleToDeleteId(null);
    } catch (err) {
      console.error("Critical delete article error:", err);
      // We'll use a silent log but you could add a toast here
    }
  };

  const [editingArticleField, setEditingArticleField] = useState<{ id: string, field: 'title' | 'content', value: string } | null>(null);

  const handleUpdateArticle = async (id: string, updates: Partial<Article>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'articles', id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const jumpToSource = (sourceId?: string, sourceType?: 'article' | 'video') => {
    if (!sourceId || !sourceType) return;
    if (sourceType === 'article') {
      setView('articles');
      setSelectedArticleId(sourceId);
    } else if (sourceType === 'video') {
      // For video, we might want to switch to a video player view or just open YouTube
      window.open(`https://www.youtube.com/watch?v=${sourceId}`, '_blank');
    }
  };

  const handleAnalyzeArticleGrammar = async (article: Article) => {
    if (!user) return;
    if (!article.content || article.content.trim().length === 0) {
      return;
    }
    
    setIsGrammarLoading(true);
    try {
      console.log("Analyzing Article Grammar - ID:", article.id, "Title:", article.title);
      const result = await analyzeGrammar(article.content);
      console.log("AI Analysis Result Received:", result);
      
      const analysisContent = (result && typeof result === 'object' && result.analysis) 
        ? result.analysis 
        : "AI 成功分析此文章文法。";

      const rawItems = (result && typeof result === 'object' && Array.isArray(result.items))
        ? result.items
        : [];

      const grammarData = {
        title: (result && typeof result === 'object' && result.title) ? `[深度分析] ${result.title}` : `[深度分析] ${article.title}`,
        content: article.content,
        analysis: analysisContent,
        userId: user.uid,
        items: rawItems.map((item: any) => ({
          sentence: item.sentence || '',
          explanation: item.explanation || '',
          structure: item.structure || '',
          exampleSentences: Array.isArray(item.exampleSentences) ? item.exampleSentences : [],
          sourceId: article.id,
          sourceType: 'article'
        })),
        categoryIds: article.categoryIds || [], // Copy category context
        sourceId: article.id,
        sourceType: 'article',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'users', user.uid, 'grammar'), grammarData);
      console.log("Created grammar analysis note:", docRef.id);
      
      // Navigate to grammar view and select the new note
      setView('grammar');
      setSelectedGrammarId(docRef.id);
      setSelectedGrammarCategory('all');
    } catch (err) {
      console.error("Article Grammar Analysis Failed:", err);
      alert("分析發生錯誤: " + (err instanceof Error ? err.message : "未知錯誤"));
    } finally {
      setIsGrammarLoading(false);
    }
  };

  const handleImportToNotes = async (item: VocabularyItem, sourceId?: string, sourceType?: 'article' | 'video') => {
    if (!user) return;
    
    // Deduplication check
    const isDuplicate = vocabularies.some(v => 
      v.items.some(vItem => vItem.text.toLowerCase().trim() === item.text.toLowerCase().trim())
    );
    
    if (isDuplicate) {
      console.log("Duplicate found during import, proceeding.");
    }

    try {
      await addDoc(collection(db, 'users', user.uid, 'vocabularies'), {
        title: item.text,
        items: [{
          ...item,
          categoryIds: item.categoryIds || [],
          sourceId: sourceId || item.sourceId || '',
          sourceType: sourceType || item.sourceType || ''
        }],
        youtubeId: sourceType === 'video' ? (sourceId || '') : '',
        sourceId: sourceId || item.sourceId || '',
        sourceType: sourceType || item.sourceType || '',
        userId: user.uid,
        categoryIds: item.categoryIds || [],
        masteryLevel: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      alert("已成功匯入到一般筆記！且保留來源追溯資訊。");
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (vocab: Vocabulary) => {
    setEditingId(vocab.id);
    setEditForm({ ...vocab });
  };

  const saveEdit = async () => {
    if (editingId && user && editForm) {
      await updateDoc(doc(db, 'users', user.uid, 'vocabularies', editingId), {
        ...editForm,
        updatedAt: serverTimestamp()
      });
      setEditingId(null);
    }
  };

  const toggleCategoryOnVocab = async (vocab: Vocabulary, categoryId: string) => {
    if (!user) return;
    const currentCategories = vocab.categoryIds || [];
    const newCategories = currentCategories.includes(categoryId)
      ? currentCategories.filter(id => id !== categoryId)
      : [...currentCategories, categoryId];
    
    await updateDoc(doc(db, 'users', user.uid, 'vocabularies', vocab.id), {
      categoryIds: newCategories,
      updatedAt: serverTimestamp()
    });
  };
  const filteredVocab = useMemo(() => {
    const vocabList = vocabularies.map(v => ({ ...v, source: 'notes' as const }));
    
    // Add individual items from articles as separate entries if they match category
    const articleItemEntries = articles.flatMap(a => {
      return (a.items || [])
        .filter(item => {
          if (selectedCategory === 'all') return (item.categoryIds || []).length > 0; // Only show categorized article items in list if all is selected? No, maybe show all but marked.
          
          const subCategoryIds = categories.filter(c => c.parentId === selectedCategory).map(c => c.id);
          return (item.categoryIds || []).includes(selectedCategory) ||
                 (item.categoryIds || []).some(id => subCategoryIds.includes(id));
        })
        .map((item, idx) => ({
          id: `art-item-${a.id}-${idx}`,
          title: item.text,
          items: [{ ...item, sourceId: a.id, sourceType: 'article' as const }],
          youtubeId: '',
          userId: a.userId,
          categoryIds: item.categoryIds || [],
          masteryLevel: 0,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
          source: 'article' as const,
          realId: a.id,
          itemIndex: idx
        }));
    });

    const combined = [...vocabList, ...articleItemEntries];

    return combined.filter(v => {
      const matchesSearch = (v.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (v.items || []).some((item: any) => 
                              (item.text || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (item.meaning || '').toLowerCase().includes(searchTerm.toLowerCase())
                            );
      
      if (selectedCategory === 'all') return matchesSearch;

      const subCategoryIds = categories.filter(c => c.parentId === selectedCategory).map(c => c.id);
      const matchesCategory = (v.categoryIds || []).includes(selectedCategory) ||
                              (v.categoryIds || []).some((id: string) => subCategoryIds.includes(id)) ||
                              (v.items || []).some((item: any) => 
                                (item.categoryIds || []).includes(selectedCategory) ||
                                (item.categoryIds || []).some((id: string) => subCategoryIds.includes(id))
                              );
                              
      return matchesSearch && matchesCategory;
    });
  }, [vocabularies, articles, searchTerm, selectedCategory, categories]);

  return (
    <div className="max-w-7xl mx-auto min-h-screen flex flex-col md:flex-row bg-vibrant-bg">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-white border-r-2 border-[#EBEBEB] flex flex-col p-6 space-y-8 sticky top-0 h-fit md:h-screen overflow-y-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-vibrant-red rounded-xl flex items-center justify-center text-white font-black text-xl">
            V
          </div>
          <h1 className="font-black text-2xl tracking-tight text-vibrant-ink">VocaFlow</h1>
        </div>

        <nav className="space-y-6">
          <div>
            <p className="text-xs font-bold text-[#A0A0A0] uppercase tracking-widest mb-4">學習進度</p>
            <div className="bg-[#F1F2F6] rounded-2xl p-4 space-y-4">
              <div 
                onClick={() => setView('notes')}
                className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${view === 'notes' ? 'bg-white shadow-sm ring-1 ring-black/5' : 'hover:bg-black/5'}`}
              >
                <div className="flex flex-col w-full gap-2">
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span>掌握度</span>
                    <span>{vocabularies.length > 0 ? Math.round((vocabularies.reduce((acc, v) => acc + v.masteryLevel, 0) / (vocabularies.length * 5)) * 100) : 0}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#EBEBEB] rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${vocabularies.length > 0 ? (vocabularies.reduce((acc, v) => acc + v.masteryLevel, 0) / (vocabularies.length * 5)) * 100 : 0}%` }}
                      className="h-full bg-vibrant-green"
                    />
                  </div>
                </div>
              </div>
              
              <div 
                onClick={() => setView('quiz')}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all font-black text-sm uppercase tracking-widest ${view === 'quiz' ? 'bg-vibrant-ink text-vibrant-green shadow-xl ring-4 ring-vibrant-green/20' : 'bg-white border-2 border-[#EBEBEB] text-vibrant-ink hover:border-vibrant-ink'}`}
              >
                <BrainCircuit className="w-5 h-5" />
                聽力大考驗
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-[#A0A0A0] uppercase tracking-widest mb-4">閱讀專區</p>
            <div 
              onClick={() => { setView('articles'); setSelectedArticleCategory('all'); }}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all font-black text-sm uppercase tracking-widest ${view === 'articles' && selectedArticleCategory === 'all' ? 'bg-vibrant-ink text-vibrant-blue shadow-xl ring-4 ring-vibrant-blue/20' : 'bg-white border-2 border-[#EBEBEB] text-vibrant-ink hover:border-vibrant-ink'}`}
            >
              <BookOpen className="w-5 h-5" />
              所有文章
            </div>

            <ul className="mt-4 space-y-1">
              {categories.filter(c => c.type === 'article' && !c.parentId).map(parent => (
                <div key={parent.id} className="space-y-1">
                  <li 
                    onClick={() => { setSelectedArticleCategory(parent.id); setView('articles'); }}
                    className={`flex items-center justify-between p-3 rounded-xl font-bold cursor-pointer transition-all group ${selectedArticleCategory === parent.id ? 'bg-vibrant-blue text-white' : 'hover:bg-[#F1F2F6] text-vibrant-ink'}`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {editingCategoryId === parent.id ? (
                        <input
                          autoFocus
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          onBlur={() => handleUpdateCategory(parent.id)}
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdateCategory(parent.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-white/20 border-none outline-none px-1 rounded text-white"
                        />
                      ) : (
                        <span className="truncate">{parent.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs opacity-40 shrink-0">
                        {articles.filter(a => (a.categoryIds || []).includes(parent.id)).length}
                      </span>
                      {!editingCategoryId && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setEditingCategoryId(parent.id); setEditingCategoryName(parent.name); }}
                            className="p-1 hover:bg-white/10 text-vibrant-gray hover:text-white rounded transition-all relative z-30 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => handleDeleteCategory(e, parent.id)}
                            className="p-1 hover:bg-white/10 text-vibrant-gray hover:text-white rounded transition-all relative z-30 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                </div>
              ))}
            </ul>
            
            {view === 'articles' && (
              <div className="mt-4">
                {isAddingCategory === 'article' ? (
                  <form onSubmit={(e) => handleCreateCategory(e, null, 'article')} className="space-y-2">
                    <input 
                      autoFocus
                      type="text"
                      placeholder="文章類型名稱..."
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      className="w-full bg-[#f1f2f6] border-2 border-vibrant-blue rounded-xl py-2 px-3 text-sm font-bold outline-none"
                    />
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 bg-vibrant-blue text-white py-2 rounded-xl text-xs font-black">確定</button>
                      <button type="button" onClick={() => setIsAddingCategory(null)} className="px-3 bg-vibrant-bg text-vibrant-gray rounded-xl text-xs font-black">取消</button>
                    </div>
                  </form>
                ) : (
                  <button 
                    onClick={() => setIsAddingCategory('article')}
                    className="w-full border-2 border-dashed border-[#CED6E0] py-2 rounded-xl text-vibrant-gray text-xs font-bold hover:border-vibrant-blue hover:text-vibrant-blue transition-all"
                  >
                    + 新增文章類別
                  </button>
                )}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-bold text-[#A0A0A0] uppercase tracking-widest mb-4">文法專區</p>
            <div 
              onClick={() => { setView('grammar'); setSelectedGrammarCategory('all'); }}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all font-black text-sm uppercase tracking-widest ${view === 'grammar' && selectedGrammarCategory === 'all' ? 'bg-vibrant-ink text-vibrant-green shadow-xl ring-4 ring-vibrant-green/20' : 'bg-white border-2 border-[#EBEBEB] text-vibrant-ink hover:border-vibrant-ink'}`}
            >
              <PenTool className="w-5 h-5" />
              文法筆記
            </div>

            <ul className="mt-4 space-y-1">
              {categories.filter(c => c.type === 'grammar' && !c.parentId).map(parent => (
                <div key={parent.id} className="space-y-1">
                  <li 
                    onClick={() => { setSelectedGrammarCategory(parent.id); setView('grammar'); }}
                    className={`flex items-center justify-between p-3 rounded-xl font-bold cursor-pointer transition-all group ${selectedGrammarCategory === parent.id ? 'bg-vibrant-green text-vibrant-ink' : 'hover:bg-[#F1F2F6] text-vibrant-ink'}`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {editingCategoryId === parent.id ? (
                        <input
                          autoFocus
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          onBlur={() => handleUpdateCategory(parent.id)}
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdateCategory(parent.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-vibrant-ink/10 border-none outline-none px-1 rounded text-vibrant-ink"
                        />
                      ) : (
                        <span className="truncate">{parent.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-xs opacity-40 shrink-0">
                        {grammarNotes.filter(g => (g.categoryIds || []).includes(parent.id)).length}
                      </span>
                      {!editingCategoryId && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setEditingCategoryId(parent.id); setEditingCategoryName(parent.name); }}
                            className="p-1 hover:bg-white/10 text-vibrant-gray rounded transition-all relative z-30 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => handleDeleteCategory(e, parent.id)}
                            className="p-1 hover:bg-white/10 text-vibrant-gray rounded transition-all relative z-30 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                </div>
              ))}
            </ul>
            
            {view === 'grammar' && (
              <div className="mt-4">
                {isAddingCategory === 'grammar' ? (
                  <form onSubmit={(e) => handleCreateCategory(e, null, 'grammar')} className="space-y-2">
                    <input 
                      autoFocus
                      type="text"
                      placeholder="文法類別名稱..."
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      className="w-full bg-[#f1f2f6] border-2 border-vibrant-green rounded-xl py-2 px-3 text-sm font-bold outline-none"
                    />
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 bg-vibrant-green text-vibrant-ink py-2 rounded-xl text-xs font-black">確定</button>
                      <button type="button" onClick={() => setIsAddingCategory(null)} className="px-3 bg-vibrant-bg text-vibrant-gray rounded-xl text-xs font-black">取消</button>
                    </div>
                  </form>
                ) : (
                  <button 
                    onClick={() => setIsAddingCategory('grammar')}
                    className="w-full border-2 border-dashed border-[#CED6E0] py-2 rounded-xl text-vibrant-gray text-xs font-bold hover:border-vibrant-green hover:text-vibrant-green transition-all"
                  >
                    + 新增文法類別
                  </button>
                )}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-bold text-[#A0A0A0] uppercase tracking-widest mb-4">單字分類</p>
            <ul className="space-y-1">
              <li 
                onClick={() => { setSelectedCategory('all'); setView('notes'); }}
                className={`flex items-center justify-between p-3 rounded-xl font-bold cursor-pointer transition-all ${selectedCategory === 'all' && view === 'notes' ? 'bg-vibrant-yellow text-[#D6A217]' : 'hover:bg-[#F1F2F6] text-vibrant-ink'}`}
              >
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 opacity-40" />
                  <span>所有單字</span>
                </div>
                <span className="text-xs opacity-60">{vocabularies.length}</span>
              </li>
              
              {categories.filter(c => (!c.type || c.type === 'vocab') && !c.parentId).map(parent => (
                <div key={parent.id} className="space-y-1">
                  <li 
                    onClick={() => { setSelectedCategory(parent.id); setView('notes'); }}
                    className={`flex items-center justify-between p-3 rounded-xl font-bold cursor-pointer transition-all group ${selectedCategory === parent.id ? 'bg-vibrant-yellow text-[#D6A217]' : 'hover:bg-[#F1F2F6] text-vibrant-ink'}`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <ChevronRight className={`w-3 h-3 transition-transform ${selectedCategory === parent.id || categories.some(sub => sub.parentId === parent.id && sub.id === selectedCategory) ? 'rotate-90' : ''}`} />
                      {editingCategoryId === parent.id ? (
                        <input
                          autoFocus
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          onBlur={() => handleUpdateCategory(parent.id)}
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdateCategory(parent.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-white/30 border-none outline-none px-1 rounded text-vibrant-ink"
                        />
                      ) : (
                        <span className="truncate">{parent.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs opacity-40 shrink-0">
                        {
                          vocabularies.filter(v => v.categoryIds.includes(parent.id) || v.categoryIds.some(id => categories.find(sub => sub.id === id)?.parentId === parent.id)).length +
                          articles.reduce((acc, a) => acc + (a.items || []).filter(item => (item.categoryIds || []).includes(parent.id) || (item.categoryIds || []).some(id => categories.find(sub => sub.id === id)?.parentId === parent.id)).length, 0)
                        }
                      </span>
                      {!editingCategoryId && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setEditingCategoryId(parent.id); setEditingCategoryName(parent.name); }}
                            className="p-1 hover:bg-black/5 rounded transition-all"
                            title="修改名稱"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setAddingSubTo(parent.id); setIsAddingCategory(null); }}
                            className="p-1 hover:bg-black/5 rounded transition-all"
                            title="新增子分類"
                          >
                            <FolderPlus className="w-4 h-4" />
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => handleDeleteCategory(e, parent.id)}
                            className="p-1 hover:bg-vibrant-red/10 text-vibrant-gray hover:text-vibrant-red rounded transition-all relative z-30 cursor-pointer"
                            title="刪除分類"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </li>

                  {/* Sub-categories */}
                  <div className="ml-4 space-y-1 border-l-2 border-[#F1F2F6] pl-2">
                    {categories.filter(sub => sub.parentId === parent.id).map(sub => (
                      <li 
                        key={sub.id}
                        onClick={() => { setSelectedCategory(sub.id); setView('notes'); }}
                        className={`flex items-center justify-between p-2 rounded-lg font-bold cursor-pointer transition-all text-sm ${selectedCategory === sub.id ? 'bg-vibrant-yellow/30 text-vibrant-ink' : 'hover:bg-[#F1F2F6] text-vibrant-gray'}`}
                      >
                        {editingCategoryId === sub.id ? (
                          <input
                            autoFocus
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            onBlur={() => handleUpdateCategory(sub.id)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateCategory(sub.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-white/30 border-none outline-none px-1 rounded text-vibrant-ink"
                          />
                        ) : (
                          <span className="truncate">{sub.name}</span>
                        )}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] opacity-40 shrink-0">
                            {
                              vocabularies.filter(v => v.categoryIds.includes(sub.id)).length +
                              articles.reduce((acc, a) => acc + (a.items || []).filter(item => (item.categoryIds || []).includes(sub.id)).length, 0)
                            }
                          </span>
                        {!editingCategoryId && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setEditingCategoryId(sub.id); setEditingCategoryName(sub.name); }}
                              className="p-1 hover:bg-black/5 rounded transition-all"
                              title="修改名稱"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button 
                              type="button"
                              onClick={(e) => handleDeleteCategory(e, sub.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-vibrant-red/10 text-vibrant-gray hover:text-vibrant-red rounded transition-all relative z-30 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        </div>
                      </li>
                    ))}
                    
                    {addingSubTo === parent.id && (
                      <form onSubmit={(e) => handleCreateCategory(e, parent.id)} className="p-2 space-y-2 bg-[#F1F2F6] rounded-xl">
                        <input 
                          autoFocus
                          type="text"
                          placeholder="次分類名稱..."
                          value={newCategoryName}
                          onChange={e => setNewCategoryName(e.target.value)}
                          className="w-full bg-white border-2 border-vibrant-yellow rounded-lg py-1 px-2 text-xs font-bold outline-none"
                        />
                        <div className="flex gap-1">
                          <button type="submit" className="flex-1 bg-vibrant-yellow text-white py-1 rounded-lg text-[10px] font-black">確定</button>
                          <button type="button" onClick={() => setAddingSubTo(null)} className="px-2 bg-white text-vibrant-gray rounded-lg text-[10px] font-black">X</button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </ul>
            
            {isAddingCategory === 'vocab' ? (
              <form onSubmit={(e) => handleCreateCategory(e, null, 'vocab')} className="mt-4 space-y-2">
                <input 
                  autoFocus
                  type="text"
                  placeholder="新分類名稱..."
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  className="w-full bg-[#f1f2f6] border-2 border-vibrant-yellow rounded-xl py-2 px-3 text-sm font-bold outline-none"
                />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-vibrant-yellow text-white py-2 rounded-xl text-xs font-black">確定</button>
                  <button type="button" onClick={() => setIsAddingCategory(null)} className="px-3 bg-vibrant-bg text-vibrant-gray rounded-xl text-xs font-black">取消</button>
                </div>
              </form>
            ) : (
              <button 
                onClick={() => { setIsAddingCategory('vocab'); setAddingSubTo(null); }}
                className="mt-4 w-full border-2 border-dashed border-[#CED6E0] py-3 rounded-xl text-vibrant-gray font-bold hover:border-vibrant-red hover:text-vibrant-red transition-all"
              >
                + 新增主分類
              </button>
            )}
          </div>
        </nav>

        <div className="mt-auto space-y-2 pt-8">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 text-vibrant-gray hover:text-vibrant-blue transition-colors font-bold text-sm w-full"
          >
            <Settings className="w-4 h-4" />
            個人設定
          </button>
          <button 
            onClick={logout}
            className="flex items-center gap-2 text-vibrant-gray hover:text-vibrant-red transition-colors font-bold text-sm w-full"
          >
            <LogOut className="w-4 h-4" />
            登出帳號
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b border-[#EBEBEB] px-4 md:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="relative w-full max-w-md mr-4">
            <input 
              type="text" 
              placeholder="搜尋單字、片語或中文意思..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#F1F2F6] border-none rounded-2xl py-3 px-12 focus:ring-2 ring-vibrant-red font-medium"
            />
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-vibrant-gray" />
          </div>
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <div className="hidden lg:flex bg-[#F1F2F6] p-1 rounded-xl items-center gap-1">
              {[
                { id: 'en-US', label: 'CNN', title: '美式英文 (CNN)' },
                { id: 'en-GB', label: 'BBC', title: '英式英文 (BBC)' },
                { id: 'en-AU', label: 'AU', title: '澳洲英文' }
              ].map((accent) => (
                <button
                  key={accent.id}
                  onClick={() => setSelectedAccent(accent.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                    selectedAccent === accent.id
                      ? 'bg-white shadow-sm text-vibrant-ink'
                      : 'text-vibrant-gray hover:text-vibrant-ink'
                  }`}
                  title={accent.title}
                >
                  {accent.label}
                </button>
              ))}
            </div>
             <button 
              onClick={() => setIsAdding(true)}
              className="vibrant-btn-primary hidden sm:flex"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden md:inline">新增單字</span>
            </button>
            <div className="w-10 h-10 rounded-full bg-vibrant-blue border-2 border-white shadow-md flex items-center justify-center text-white font-bold overflow-hidden">
              {user?.photoURL ? <img src={user.photoURL} alt="Avatar" /> : user?.displayName?.charAt(0)}
            </div>
          </div>
        </header>

        <section className="p-4 md:p-8 flex-1 overflow-y-auto">
          {view === 'quiz' ? (
            <div className="flex flex-col items-center pt-8">
              <QuizView vocabularies={vocabularies} onClose={() => setView('notes')} />
            </div>
          ) : view === 'articles' ? (
            <div className="space-y-8">
              {!selectedArticleId ? (
                <>
                  <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-black tracking-tight">英文文章閱讀專區</h2>
                  </div>

                  <div className="bg-white rounded-[32px] p-8 border-2 border-[#EBEBEB] shadow-sm">
                    <label className="text-xs font-black uppercase tracking-widest text-vibrant-gray mb-4 block">貼上英文文章進行 AI 深度分析</label>
                    <textarea 
                      rows={6}
                      placeholder="在此貼上英文文章內容..."
                      value={articleInput}
                      onChange={(e) => setArticleInput(e.target.value)}
                      className="w-full bg-[#F1F2F6] border-none rounded-2xl py-4 px-6 text-vibrant-ink placeholder:text-vibrant-gray/50 focus:ring-2 ring-vibrant-blue transition-all font-medium resize-none mb-4"
                    />

                    <div className="mb-6">
                      <p className="text-[10px] font-black uppercase tracking-widest text-vibrant-gray mb-3 pb-1 border-b border-black/5">選擇文章分類 (可複選)</p>
                      <div className="flex flex-wrap gap-2">
                        {categories.filter(c => c.type === 'article').map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => {
                              setArticleCategorySelection(prev => 
                                prev.includes(cat.id) ? prev.filter(id => id !== cat.id) : [...prev, cat.id]
                              );
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                              articleCategorySelection.includes(cat.id)
                                ? 'bg-vibrant-blue text-white shadow-lg'
                                : 'bg-[#F1F2F6] text-vibrant-gray hover:bg-[#E1E2E6]'
                            }`}
                          >
                            {cat.name}
                          </button>
                        ))}
                        {categories.filter(c => c.type === 'article').length === 0 && (
                          <p className="text-[10px] text-vibrant-gray italic">目前尚無分類，可在左側新增文章類別</p>
                        )}
                      </div>
                    </div>

                    <button 
                      onClick={handleAnalyzeArticle}
                      disabled={isArticleLoading || !articleInput.trim()}
                      className="w-full py-4 bg-vibrant-blue text-white rounded-2xl font-black text-lg shadow-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isArticleLoading ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin" />
                          AI 深度分析中... (單字、片語、句子)
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-6 h-6" />
                          開始智慧分析
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {articles
                      .filter(a => selectedArticleCategory === 'all' || (a.categoryIds || []).includes(selectedArticleCategory))
                      .map(article => (
                      <motion.div 
                        key={article.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => setSelectedArticleId(article.id)}
                        className="bg-white p-6 rounded-[24px] border-2 border-[#EBEBEB] hover:border-vibrant-blue cursor-pointer transition-all group relative"
                      >
                        <div className="flex flex-wrap gap-1 mb-3">
                          {(article.categoryIds || []).map(catId => {
                            const cat = categories.find(c => c.id === catId);
                            return cat ? (
                              <span key={catId} className="px-2 py-0.5 bg-vibrant-blue/10 text-vibrant-blue rounded-full text-[8px] font-black uppercase tracking-tighter">
                                {cat.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                        <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-vibrant-gray/60">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            發布於 {article.createdAt?.toDate ? article.createdAt.toDate().toLocaleString() : '處理中...'}
                          </span>
                          {article.updatedAt && (
                            <span className="flex items-center gap-1">
                              <Edit3 className="w-3 h-3" />
                              最後編輯 {article.updatedAt?.toDate ? article.updatedAt.toDate().toLocaleString() : '處理中...'}
                            </span>
                          )}
                        </div>
                        <h4 className="font-black text-lg mb-2 group-hover:text-vibrant-blue transition-colors pr-8">{article.title}</h4>
                        <p className="text-sm text-vibrant-gray line-clamp-3 leading-relaxed mb-4">
                          {article.content}
                        </p>
                        <div className="flex justify-between items-center border-t pt-4 border-[#F1F2F6]">
                          <div className="flex flex-wrap gap-1">
                            {(article.categoryIds || []).map(catId => {
                              const cat = categories.find(c => c.id === catId);
                              if (!cat) return null;
                              return (
                                <button 
                                  key={catId}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const newCats = (article.categoryIds || []).filter(id => id !== catId);
                                    await updateDoc(doc(db, 'users', user?.uid!, 'articles', article.id), {
                                      categoryIds: newCats,
                                      updatedAt: serverTimestamp()
                                    });
                                  }}
                                  className="px-2 py-0.5 bg-vibrant-blue/10 text-vibrant-blue rounded-full text-[8px] font-black uppercase flex items-center gap-1 hover:bg-vibrant-red hover:text-white transition-all"
                                >
                                  <Check className="w-2 h-2" />
                                  {cat.name}
                                </button>
                              );
                            })}
                            <div className="relative group/articlecats">
                              <button 
                                onClick={(e) => e.stopPropagation()}
                                className="px-2.5 py-1 bg-black/5 text-vibrant-gray rounded-full text-[8px] font-black hover:bg-vibrant-blue hover:text-white transition-all flex items-center gap-1 shadow-sm uppercase tracking-wider"
                              >
                                <Plus className="w-2 h-2" />
                                分類
                              </button>
                              <AnimatePresence>
                                <div className="absolute left-0 bottom-full z-50 hidden group-hover/articlecats:block pt-4 pb-1">
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                                    className="bg-white border-2 border-[#EBEBEB] rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] p-2 min-w-[140px] max-h-[180px] overflow-y-auto"
                                  >
                                    <p className="text-[9px] font-black text-vibrant-gray uppercase tracking-widest mb-2 px-1 border-b pb-1 opacity-50">更改分類</p>
                                    {categories.filter(c => c.type === 'article' && !(article.categoryIds || []).includes(c.id)).map(cat => (
                                      <button
                                        key={cat.id}
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          const newCats = [...(article.categoryIds || []), cat.id];
                                          await updateDoc(doc(db, 'users', user?.uid!, 'articles', article.id), {
                                            categoryIds: newCats,
                                            updatedAt: serverTimestamp()
                                          });
                                        }}
                                        className="w-full text-left px-2 py-1.5 text-[10px] font-bold text-vibrant-ink hover:bg-vibrant-blue/10 rounded-lg transition-all"
                                      >
                                        {cat.name}
                                      </button>
                                    ))}
                                    {categories.filter(c => c.type === 'article').length === 0 && <p className="text-[8px] text-vibrant-gray p-2 italic">尚未建立文章分類</p>}
                                  </motion.div>
                                </div>
                              </AnimatePresence>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black uppercase tracking-widest text-vibrant-gray/40">
                               標註 {article.items?.length || 0}
                            </span>
                            <div className="relative">
                                  <button 
                                    type="button"
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      if (articleToDeleteId === article.id) {
                                        handleDeleteArticle(article.id);
                                        setArticleToDeleteId(null);
                                      } else {
                                        setArticleToDeleteId(article.id);
                                        // Extended timeout for better UX
                                        setTimeout(() => setArticleToDeleteId(null), 5000);
                                      }
                                    }}
                                    className={`p-2 rounded-lg transition-all flex items-center gap-1 ${
                                      articleToDeleteId === article.id 
                                        ? 'bg-vibrant-red text-white text-[10px] font-black scale-105' 
                                        : 'text-vibrant-gray hover:text-vibrant-red bg-transparent'
                                    } relative z-[60] cursor-pointer pointer-events-auto shadow-lg border-none`}
                                    title={articleToDeleteId === article.id ? "再次點擊以確認永久刪除" : "刪除文章"}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    {articleToDeleteId === article.id && <span>點擊確認</span>}
                                  </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {articles.length === 0 && !isArticleLoading && (
                      <div className="col-span-full py-12 text-center bg-[#F1F2F6] rounded-[24px] border-2 border-dashed border-[#CED6E0]">
                        <p className="text-vibrant-gray font-bold italic">尚無文章紀錄，開始貼上一份文章吧！</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-8">
                  {/* Article Reader View */}
                  {(() => {
                    const article = articles.find(a => a.id === selectedArticleId);
                    if (!article) return null;
                    return (
                      <>
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => setSelectedArticleId(null)}
                            className="p-3 bg-white rounded-xl border-2 border-[#EBEBEB] hover:border-vibrant-ink transition-all"
                          >
                            <ChevronRight className="w-5 h-5 rotate-180" />
                          </button>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {editingArticleField?.id === article.id && editingArticleField.field === 'title' ? (
                                  <div className="flex items-center gap-2">
                                    <input 
                                      autoFocus
                                      value={editingArticleField.value}
                                      onChange={(e) => setEditingArticleField({ ...editingArticleField, value: e.target.value })}
                                      onBlur={() => {
                                        handleUpdateArticle(article.id, { title: editingArticleField.value });
                                        setEditingArticleField(null);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleUpdateArticle(article.id, { title: editingArticleField.value });
                                          setEditingArticleField(null);
                                        }
                                      }}
                                      className="text-2xl font-black bg-[#F1F2F6] px-2 py-1 rounded-lg border-2 border-vibrant-blue outline-none"
                                    />
                                  </div>
                                ) : (
                                  <h2 
                                    className="text-2xl font-black cursor-pointer hover:text-vibrant-blue transition-colors group"
                                    onClick={() => setEditingArticleField({ id: article.id, field: 'title', value: article.title })}
                                  >
                                    {article.title}
                                    <Edit3 className="w-4 h-4 inline-block ml-2 opacity-0 group-hover:opacity-100" />
                                  </h2>
                                )}
                                <div className="flex gap-2">
                                  <button 
                                   onClick={() => isSpeaking || isBroadcasting ? stopAudio() : playAudio(article.content)} 
                                   className={`p-2 rounded-xl transition-all ${isSpeaking ? 'bg-vibrant-red/10 text-vibrant-red animate-pulse' : 'bg-vibrant-blue/10 text-vibrant-blue hover:scale-110'}`}
                                   title={isSpeaking ? "停止播放" : "播放整篇文章發音"}
                                 >
                                   {isSpeaking ? <X className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                 </button>
                                 <button 
                                   onClick={() => isBroadcasting ? stopAudio() : playNewsBroadcast(article.content, article.title)} 
                                   className={`p-2 rounded-xl transition-all flex items-center gap-1 ${isBroadcasting ? 'bg-vibrant-red/20 text-vibrant-red animate-pulse' : 'bg-vibrant-ink/10 text-vibrant-ink hover:scale-110'}`}
                                   title="CNN 模式播放 (臨場感)"
                                 >
                                   <Radio className="w-5 h-5" />
                                   {isBroadcasting && <span className="text-[8px] font-black uppercase">News On</span>}
                                 </button>
                                 <button 
                                   onClick={() => handleAnalyzeArticleGrammar(article)} 
                                   disabled={isGrammarLoading}
                                   className="px-4 py-2 bg-vibrant-green text-vibrant-ink hover:brightness-110 rounded-xl transition-all flex items-center gap-2 text-xs font-bold uppercase shadow-lg shadow-vibrant-green/20 disabled:opacity-70"
                                   title="AI 文法分析此文章"
                                 >
                                   {isGrammarLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                   {isGrammarLoading ? "AI 分析中..." : "深度文法分析"}
                                 </button>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                    <button 
                                      type="button"
                                      onClick={(e) => { 
                                        e.stopPropagation();
                                        if (articleToDeleteId === article.id) {
                                          handleDeleteArticle(article.id);
                                          setArticleToDeleteId(null);
                                        } else {
                                          setArticleToDeleteId(article.id);
                                          setTimeout(() => setArticleToDeleteId(null), 5000);
                                        }
                                      }}
                                      className={`p-3 rounded-xl transition-all flex items-center gap-2 font-black ${
                                        articleToDeleteId === article.id 
                                          ? 'bg-vibrant-red text-white scale-105' 
                                          : 'text-vibrant-gray hover:text-vibrant-red hover:bg-vibrant-red/5'
                                      } relative z-[100] cursor-pointer pointer-events-auto shadow-lg`}
                                      title={articleToDeleteId === article.id ? "再次點擊以確認永久刪除" : "刪除本篇文章"}
                                    >
                                    <Trash2 className="w-5 h-5" />
                                      {articleToDeleteId === article.id && <span>點擊確認刪除記事</span>}
                                    </button>
                                </div>
                              </div>
                            </div>
                            <p className="text-xs text-vibrant-gray font-bold">閱讀與學習專區</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                          {/* Article Content */}
                          <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white rounded-[32px] p-8 border-2 border-[#EBEBEB] shadow-sm">
                              <h3 className="text-xs font-black uppercase tracking-widest text-vibrant-gray mb-4">我的備註 (學習心得)</h3>
                              <textarea 
                                placeholder="在此記錄關於這篇文章的學習心得或背景資訊..."
                                value={article.notes || ''}
                                onChange={(e) => handleUpdateArticle(article.id, { notes: e.target.value })}
                                className="w-full bg-[#F1F2F6] p-4 rounded-2xl border-none outline-none font-medium text-vibrant-ink h-32 resize-none"
                              />
                            </div>

                            <div className="bg-white rounded-[32px] p-8 border-2 border-[#EBEBEB] shadow-sm min-h-[400px]">
                              {editingArticleField?.id === article.id && editingArticleField.field === 'content' ? (
                                <textarea 
                                  autoFocus
                                  value={editingArticleField.value}
                                  onChange={(e) => setEditingArticleField({ ...editingArticleField, value: e.target.value })}
                                  onBlur={() => {
                                    handleUpdateArticle(article.id, { content: editingArticleField.value });
                                    setEditingArticleField(null);
                                  }}
                                  className="w-full h-full min-h-[400px] bg-[#F1F2F6] p-4 rounded-2xl border-2 border-vibrant-blue outline-none font-serif text-lg leading-loose"
                                />
                              ) : (
                                <div 
                                  className="prose prose-blue max-w-none text-vibrant-ink font-serif text-lg leading-loose whitespace-pre-wrap cursor-text group"
                                  onClick={() => setEditingArticleField({ id: article.id, field: 'content', value: article.content })}
                                >
                                  {article.content}
                                  <div className="mt-4 opacity-0 group-hover:opacity-100 flex items-center gap-2 text-vibrant-blue text-xs font-black uppercase">
                                    <Edit3 className="w-3 h-3" />
                                    點擊修改文章內容
                                  </div>
                                </div>
                              )}

                              <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-[#F1F2F6]">
                                {(article.categoryIds || []).map(catId => {
                                  const cat = categories.find(c => c.id === catId);
                                  if (!cat) return null;
                                  return (
                                    <button 
                                      key={catId}
                                      onClick={async () => {
                                        const newCats = (article.categoryIds || []).filter(id => id !== catId);
                                        await handleUpdateArticle(article.id, { categoryIds: newCats });
                                      }}
                                      className="px-3 py-1 bg-vibrant-blue text-white rounded-full text-[10px] font-black uppercase flex items-center gap-2 hover:bg-vibrant-red transition-all shadow-sm"
                                    >
                                      <Check className="w-3 h-3" />
                                      {cat.name}
                                    </button>
                                  );
                                })}
                                <div className="relative group/articlecats-detail">
                                  <button className="px-4 py-1.5 bg-vibrant-bg border-2 border-[#EBEBEB] text-vibrant-gray rounded-full text-[10px] font-black hover:border-vibrant-blue hover:text-vibrant-blue hover:shadow-md transition-all flex items-center gap-2 uppercase tracking-widest">
                                    <Plus className="w-3 h-3" />
                                    分類文章
                                  </button>
                                  <div className="absolute left-0 top-full z-[100] hidden group-hover/articlecats-detail:block pt-2 pb-4">
                                    <motion.div 
                                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                      whileInView={{ opacity: 1, scale: 1, y: 0 }}
                                      className="bg-white border-2 border-[#EBEBEB] rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] p-2 min-w-[180px] max-h-[250px] overflow-y-auto"
                                    >
                                      <p className="text-[9px] font-black text-vibrant-gray uppercase tracking-widest mb-2 px-2 border-b pb-1 opacity-50">遷移至分類...</p>
                                      {categories.filter(c => c.type === 'article' && !(article.categoryIds || []).includes(c.id)).map(cat => (
                                        <button
                                          key={cat.id}
                                          onClick={async () => {
                                            const newCats = [...(article.categoryIds || []), cat.id];
                                            await handleUpdateArticle(article.id, { categoryIds: newCats });
                                          }}
                                          className="w-full text-left px-3 py-2 text-[11px] font-bold text-vibrant-ink hover:bg-vibrant-blue/10 rounded-xl transition-all"
                                        >
                                          {cat.name}
                                        </button>
                                      ))}
                                      {categories.filter(c => c.type === 'article').length === 0 && <p className="text-[9px] text-vibrant-gray p-3 italic">請先在左側建立文章類別</p>}
                                    </motion.div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Extracted Items */}
                          <div className="space-y-4">
                            <div className="flex justify-between items-center mb-2">
                              <h3 className="font-black text-sm uppercase tracking-widest text-vibrant-gray">學習標註 ({article.items?.length || 0})</h3>
                              <button 
                                onClick={async () => {
                                  const text = window.prompt("手動新增單字或片語：");
                                  if (!text) return;
                                  const meaning = window.prompt("中文意思：") || "";
                                  const newItems = [...(article.items || []), { text, meaning, exampleSentences: [] }];
                                  await updateDoc(doc(db, 'users', user?.uid!, 'articles', article.id), {
                                    items: newItems,
                                    updatedAt: serverTimestamp()
                                  });
                                }}
                                className="p-2 bg-vibrant-ink text-white rounded-lg flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter"
                              >
                                <Plus className="w-3 h-3" />
                                手動新增
                              </button>
                            </div>
                            <div className="space-y-3">
                              {article.items?.map((item, idx) => (
                                <motion.div 
                                  key={idx}
                                  initial={{ opacity: 0, x: 20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className="bg-white p-4 rounded-2xl border-2 border-[#EBEBEB] shadow-sm relative group"
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                      <h5 className="font-black text-vibrant-ink flex items-center gap-2">
                                        {item.text}
                                        <button 
                                          onClick={() => isSpeaking ? stopAudio() : playAudio(item.text)} 
                                          className={`transition-transform ${isSpeaking ? 'text-vibrant-red animate-pulse' : 'text-vibrant-blue hover:scale-110'}`}
                                        >
                                          {isSpeaking ? <X className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                                        </button>
                                      </h5>
                                      <p className="text-sm font-bold text-vibrant-gray underline decoration-vibrant-green decoration-2 underline-offset-4">{item.meaning}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button 
                                        onClick={() => handleImportToNotes(item, article.id, 'article')}
                                        className="p-2 opacity-0 group-hover:opacity-100 text-vibrant-blue hover:scale-110 transition-all"
                                        title="匯入到一般筆記"
                                      >
                                        <Send className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={async () => {
                                          const newItems = (article.items || []).filter((_, i) => i !== idx);
                                          await updateDoc(doc(db, 'users', user?.uid!, 'articles', article.id), {
                                            items: newItems,
                                            updatedAt: serverTimestamp()
                                          });
                                        }}
                                        className="p-2 opacity-0 group-hover:opacity-100 text-vibrant-gray hover:text-vibrant-red transition-all"
                                        title="刪除標註"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="space-y-2 mb-3">
                                    {item.exampleSentences && item.exampleSentences.length > 0 && (
                                      <p className="text-[10px] italic text-vibrant-gray/60 leading-tight border-l-2 border-[#F1F2F6] pl-2">
                                        {item.exampleSentences[0]}
                                      </p>
                                    )}
                                    
                                    <div className="flex gap-4">
                                      {item.synonyms && item.synonyms.length > 0 && (
                                        <div className="flex-1">
                                          <p className="text-[8px] font-black text-vibrant-green uppercase tracking-widest opacity-50 mb-0.5">同義詞</p>
                                          <p className="text-[10px] font-bold text-vibrant-ink">{item.synonyms.join(', ')}</p>
                                        </div>
                                      )}
                                      {item.antonyms && item.antonyms.length > 0 && (
                                        <div className="flex-1">
                                          <p className="text-[8px] font-black text-vibrant-red uppercase tracking-widest opacity-50 mb-0.5">反義詞</p>
                                          <p className="text-[10px] font-bold text-vibrant-ink">{item.antonyms.join(', ')}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-1 mt-1 pt-2 border-t border-[#F1F2F6]">
                                    {/* Active Tags */}
                                    {(item.categoryIds || []).map(catId => {
                                      const cat = categories.find(c => c.id === catId);
                                      if (!cat) return null;
                                      return (
                                        <button 
                                          key={catId}
                                          onClick={async () => {
                                            const newCats = (item.categoryIds || []).filter(id => id !== catId);
                                            const newItems = [...article.items];
                                            newItems[idx] = { ...item, categoryIds: newCats };
                                            await updateDoc(doc(db, 'users', user?.uid!, 'articles', article.id), {
                                              items: newItems,
                                              updatedAt: serverTimestamp()
                                            });
                                          }}
                                          className="px-2 py-0.5 bg-vibrant-yellow text-vibrant-ink rounded-full text-[8px] font-black uppercase flex items-center gap-1 hover:bg-vibrant-red hover:text-white transition-all"
                                        >
                                          <Check className="w-2 h-2" />
                                          {cat.name}
                                        </button>
                                      );
                                    })}
                                    
                                    {/* Add Tag Dropdown/Selector */}
                                    <div className="relative group/tags">
                                      <button className="px-2.5 py-1 bg-black/5 text-vibrant-gray rounded-full text-[8px] font-black hover:bg-vibrant-yellow hover:text-vibrant-ink transition-all flex items-center gap-1 shadow-sm uppercase tracking-tight">
                                        <Plus className="w-2 h-2" />
                                        選擇分類
                                      </button>
                                      <div className="absolute left-0 top-full z-50 hidden group-hover/tags:block pt-2 pb-4">
                                        <motion.div 
                                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                          whileInView={{ opacity: 1, scale: 1, y: 0 }}
                                          className="bg-white border-2 border-[#EBEBEB] rounded-xl shadow-[0_15px_40px_-10px_rgba(0,0,0,0.2)] p-2 min-w-[140px] max-h-[200px] overflow-y-auto"
                                        >
                                          <p className="text-[9px] font-black text-vibrant-gray uppercase tracking-widest mb-2 px-1 border-b pb-1 opacity-50">加入標籤</p>
                                          {categories.filter(c => !(item.categoryIds || []).includes(c.id)).map(cat => (
                                            <button
                                              key={cat.id}
                                              onClick={async () => {
                                                const newCats = [...(item.categoryIds || []), cat.id];
                                                const newItems = [...article.items];
                                                newItems[idx] = { ...item, categoryIds: newCats };
                                                await updateDoc(doc(db, 'users', user?.uid!, 'articles', article.id), {
                                                  items: newItems,
                                                  updatedAt: serverTimestamp()
                                                });
                                              }}
                                              className="w-full text-left px-2 py-1.5 text-[10px] font-bold text-vibrant-ink hover:bg-vibrant-yellow/30 rounded-lg transition-all"
                                            >
                                              {cat.name}
                                            </button>
                                          ))}
                                          {categories.length === 0 && <p className="text-[8px] text-vibrant-gray p-2 italic">請先建立分類</p>}
                                        </motion.div>
                                      </div>
                                    </div>
                                  </div>
                                  {item.exampleSentences && item.exampleSentences.length > 0 && (
                                    <p className="text-[10px] italic text-vibrant-gray/60 leading-tight border-l-2 border-[#F1F2F6] pl-2 mt-2">
                                      {item.exampleSentences[0]}
                                    </p>
                                  )}
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : view === 'grammar' ? (
            <div className="space-y-8">
              {!selectedGrammarId ? (
                <>
                  <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-black tracking-tight">英文文法深度分析專區</h2>
                  </div>

                  <div className="bg-white rounded-[32px] p-8 border-2 border-[#EBEBEB] shadow-sm">
                    <label className="text-xs font-black uppercase tracking-widest text-vibrant-gray mb-4 block">輸入英文句子或段落進行 AI 文法分析</label>
                    <textarea 
                      rows={4}
                      placeholder="在此輸入想要分析的文法內容..."
                      value={grammarInput}
                      onChange={(e) => setGrammarInput(e.target.value)}
                      className="w-full bg-[#F1F2F6] border-none rounded-2xl py-4 px-6 text-vibrant-ink placeholder:text-vibrant-gray/50 focus:ring-2 ring-vibrant-green transition-all font-medium resize-none mb-4"
                    />

                    <div className="mb-6">
                      <p className="text-[10px] font-black uppercase tracking-widest text-vibrant-gray mb-3 pb-1 border-b border-black/5">選擇文法分類 (可複選)</p>
                      <div className="flex flex-wrap gap-2">
                        {categories.filter(c => c.type === 'grammar').map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => {
                              setGrammarCategorySelection(prev => 
                                prev.includes(cat.id) ? prev.filter(id => id !== cat.id) : [...prev, cat.id]
                              );
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                              grammarCategorySelection.includes(cat.id)
                                ? 'bg-vibrant-green text-vibrant-ink shadow-lg'
                                : 'bg-[#F1F2F6] text-vibrant-gray hover:bg-[#E1E2E6]'
                            }`}
                          >
                            {cat.name}
                          </button>
                        ))}
                        {categories.filter(c => c.type === 'grammar').length === 0 && (
                          <p className="text-[10px] text-vibrant-gray italic">目前尚無分類，可在左側新增文法類別</p>
                        )}
                      </div>
                    </div>

                    <button 
                      onClick={handleAnalyzeGrammar}
                      disabled={isGrammarLoading || !grammarInput.trim()}
                      className="w-full py-4 bg-vibrant-green text-vibrant-ink rounded-2xl font-black text-lg shadow-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isGrammarLoading ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin" />
                          AI 正在解析文法結構...
                        </>
                      ) : (
                        <>
                          <PenTool className="w-6 h-6" />
                          智慧分析文法
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {grammarNotes
                      .filter(g => {
                        if (selectedGrammarCategory === 'all') return true;
                        const matchNoteCat = (g.categoryIds || []).includes(selectedGrammarCategory);
                        const matchItemCat = g.items?.some(item => (item.categoryIds || []).includes(selectedGrammarCategory));
                        return matchNoteCat || matchItemCat;
                      })
                      .map(note => (
                      <motion.div 
                        key={note.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => setSelectedGrammarId(note.id)}
                        className="bg-white p-6 rounded-[24px] border-2 border-[#EBEBEB] hover:border-vibrant-green cursor-pointer transition-all group relative"
                      >
                        <div className="flex flex-wrap gap-1 mb-3">
                          {(note.categoryIds || []).map(catId => {
                            const cat = categories.find(c => c.id === catId);
                            return cat ? (
                              <span key={catId} className="px-2 py-0.5 bg-vibrant-green/20 text-vibrant-ink rounded-full text-[8px] font-black uppercase tracking-tighter">
                                {cat.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                        <h4 className="font-black text-lg mb-2 group-hover:text-vibrant-green transition-colors pr-8">{note.title}</h4>
                        <p className="text-sm text-vibrant-gray line-clamp-2 italic mb-4">
                          "{note.content}"
                        </p>
                        <div className="flex justify-between items-center border-t pt-4 border-[#F1F2F6]">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-vibrant-gray/40">
                               分析點 {note.items?.length || 0}
                            </span>
                            {note.sourceId && (
                              <div className="flex items-center gap-1 text-[9px] font-black text-vibrant-blue uppercase">
                                <LinkIcon className="w-2.5 h-2.5" />
                                {note.sourceType === 'article' ? '來自文章' : '來自影片'}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (grammarToDeleteId === note.id) {
                                    handleDeleteGrammar(e, note.id);
                                  } else {
                                    setGrammarToDeleteId(note.id);
                                    setTimeout(() => setGrammarToDeleteId(null), 3000);
                                  }
                                }}
                                className={`p-2 rounded-lg transition-all flex items-center gap-1 ${
                                  grammarToDeleteId === note.id 
                                    ? 'bg-vibrant-red text-white text-[10px] font-black' 
                                    : 'text-vibrant-gray hover:text-vibrant-red'
                                } relative z-10`}
                              >
                                <Trash2 className="w-4 h-4" />
                                {grammarToDeleteId === note.id && "確認刪除？"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-8">
                  {(() => {
                    const note = grammarNotes.find(n => n.id === selectedGrammarId);
                    if (!note) return null;
                    return (
                      <>
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => setSelectedGrammarId(null)}
                            className="p-3 bg-white rounded-xl border-2 border-[#EBEBEB] hover:border-vibrant-ink transition-all"
                          >
                            <ChevronRight className="w-5 h-5 rotate-180" />
                          </button>
                          <div>
                            <h2 className="text-2xl font-black">{note.title}</h2>
                            <div className="flex items-center gap-3">
                              <p className="text-xs text-vibrant-gray font-bold uppercase tracking-widest">文法深度解析</p>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => isBroadcasting ? stopAudio() : playNewsBroadcast(note.content, note.title)} 
                                  className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${isBroadcasting ? 'bg-vibrant-red/20 text-vibrant-red animate-pulse' : 'bg-vibrant-ink/10 text-vibrant-ink hover:scale-110'}`}
                                  title="CNN 模式播放"
                                >
                                  <Radio className="w-4 h-4" />
                                  {isBroadcasting && <span className="text-[8px] font-black">On Air</span>}
                                </button>
                              </div>
                              {note.sourceId && (
                                <button 
                                  onClick={() => jumpToSource(note.sourceId, note.sourceType)}
                                  className="flex items-center gap-1.5 px-2 py-0.5 bg-vibrant-blue/10 text-vibrant-blue rounded-lg text-[9px] font-black uppercase hover:bg-vibrant-blue hover:text-white transition-all shadow-sm"
                                >
                                  <LinkIcon className="w-3 h-3" />
                                  來源文章
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 px-4">
                          {categories.filter(c => c.type === 'grammar').map(cat => (
                            <button
                              key={cat.id}
                              onClick={() => {
                                const newCats = (note.categoryIds || []).includes(cat.id)
                                  ? (note.categoryIds || []).filter(id => id !== cat.id)
                                  : [...(note.categoryIds || []), cat.id];
                                handleUpdateGrammar(note.id, { categoryIds: newCats });
                              }}
                              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border-2 ${
                                (note.categoryIds || []).includes(cat.id)
                                  ? 'bg-vibrant-green border-vibrant-green text-vibrant-ink shadow-sm'
                                  : 'bg-transparent border-[#EBEBEB] text-vibrant-gray hover:border-vibrant-green'
                              }`}
                            >
                              {cat.name}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-8">
                          <div className="bg-white rounded-[32px] p-8 border-2 border-[#EBEBEB] shadow-sm">
                            <h3 className="text-xs font-black uppercase tracking-widest text-vibrant-gray mb-4">我的備註 (學習心得)</h3>
                            <textarea 
                              placeholder="在此記錄關於這段文法分析的學習筆記..."
                              value={note.notes || ''}
                              onChange={(e) => handleUpdateGrammar(note.id, { notes: e.target.value })}
                              className="w-full bg-[#F1F2F6] p-4 rounded-2xl border-none outline-none font-medium text-vibrant-ink h-32 resize-none text-sm mb-6"
                            />

                            <h3 className="text-xs font-black uppercase tracking-widest text-vibrant-gray mb-4">待分析句型</h3>
                            <div className="bg-vibrant-bg p-6 rounded-2xl border-l-4 border-vibrant-green mb-8">
                              <p className="text-xl font-bold font-serif italic text-vibrant-ink">"{note.content}"</p>
                            </div>

                            <h3 className="text-xs font-black uppercase tracking-widest text-vibrant-gray mb-4">完整解析</h3>
                            <div className="prose prose-green max-w-none text-vibrant-ink leading-relaxed whitespace-pre-wrap">
                              {note.analysis}
                            </div>
                          </div>

                          <div className="space-y-4">
                             <div className="flex justify-between items-center px-4">
                               <h3 className="text-xs font-black uppercase tracking-widest text-vibrant-gray">重點句型解析 ({note.items?.length || 0})</h3>
                               <button 
                                 onClick={() => setAddingGrammarItemToId(note.id)}
                                 className="px-3 py-1 bg-vibrant-ink text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-vibrant-green hover:text-vibrant-ink transition-all shadow-sm"
                               >
                                 + 手動新增句型
                               </button>
                             </div>

                             {addingGrammarItemToId === note.id && (
                               <motion.div 
                                 initial={{ opacity: 0, y: -10 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 className="mx-4 p-6 bg-white rounded-2xl border-2 border-vibrant-ink shadow-xl space-y-4"
                               >
                                 <h4 className="text-sm font-black uppercase">新增文法分析項</h4>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                   <div className="space-y-2">
                                     <label className="text-[10px] font-black uppercase text-vibrant-gray">分析句子</label>
                                     <input 
                                       value={newGrammarItemForm.sentence}
                                       onChange={e => setNewGrammarItemForm({...newGrammarItemForm, sentence: e.target.value})}
                                       className="w-full p-3 bg-[#F1F2F6] rounded-xl border-none outline-none font-bold"
                                       placeholder="輸入英文句子..."
                                     />
                                   </div>
                                   <div className="space-y-2">
                                     <label className="text-[10px] font-black uppercase text-vibrant-gray">文法結構</label>
                                     <input 
                                       value={newGrammarItemForm.structure}
                                       onChange={e => setNewGrammarItemForm({...newGrammarItemForm, structure: e.target.value})}
                                       className="w-full p-3 bg-[#F1F2F6] rounded-xl border-none outline-none font-bold"
                                       placeholder="例如：Present Perfect"
                                     />
                                   </div>
                                 </div>
                                 <div className="space-y-2">
                                   <label className="text-[10px] font-black uppercase text-vibrant-gray">文法解釋</label>
                                   <textarea 
                                     value={newGrammarItemForm.explanation}
                                     onChange={e => setNewGrammarItemForm({...newGrammarItemForm, explanation: e.target.value})}
                                     className="w-full p-3 bg-[#F1F2F6] rounded-xl border-none outline-none font-medium text-sm h-24 resize-none"
                                     placeholder="詳細解釋此文法重點..."
                                   />
                                 </div>
                                 <div className="space-y-2">
                                   <label className="text-[10px] font-black uppercase text-vibrant-gray">其他例句 (每行一句)</label>
                                   <textarea 
                                     value={newGrammarItemForm.exampleSentences}
                                     onChange={e => setNewGrammarItemForm({...newGrammarItemForm, exampleSentences: e.target.value})}
                                     className="w-full p-3 bg-[#F1F2F6] rounded-xl border-none outline-none font-medium text-sm h-20 resize-none"
                                     placeholder="提供更多的使用範例..."
                                   />
                                 </div>
                                 <div className="space-y-2">
                                   <label className="text-[10px] font-black uppercase text-vibrant-gray">學習備註 (自訂筆記)</label>
                                   <textarea 
                                     value={newGrammarItemForm.notes}
                                     onChange={e => setNewGrammarItemForm({...newGrammarItemForm, notes: e.target.value})}
                                     className="w-full p-3 bg-[#F1F2F6] rounded-xl border-none outline-none font-medium text-sm h-20 resize-none"
                                     placeholder="在此記錄該句型的學習重點..."
                                   />
                                 </div>
                                 <div className="space-y-2">
                                   <label className="text-[10px] font-black uppercase text-vibrant-gray">選擇分類 (文法類別)</label>
                                   <div className="flex flex-wrap gap-2">
                                     {categories.filter(c => c.type === 'grammar').map(cat => (
                                       <button
                                         key={cat.id}
                                         type="button"
                                         onClick={() => {
                                           setNewGrammarItemForm(prev => ({
                                             ...prev,
                                             categoryIds: prev.categoryIds.includes(cat.id)
                                               ? prev.categoryIds.filter(id => id !== cat.id)
                                               : [...prev.categoryIds, cat.id]
                                           }));
                                         }}
                                         className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all ${
                                           newGrammarItemForm.categoryIds.includes(cat.id)
                                             ? 'bg-vibrant-ink text-vibrant-green'
                                             : 'bg-[#F1F2F6] text-vibrant-gray'
                                         }`}
                                       >
                                         {cat.name}
                                       </button>
                                     ))}
                                   </div>
                                 </div>
                                 <div className="flex gap-2">
                                   <button 
                                     onClick={() => handleAddGrammarItem(note.id, note.items || [])}
                                     className="flex-1 py-3 bg-vibrant-green text-vibrant-ink rounded-xl font-black uppercase shadow-lg shadow-vibrant-green/20"
                                   >
                                     儲存句型
                                   </button>
                                   <button 
                                     onClick={() => setAddingGrammarItemToId(null)}
                                     className="px-6 py-3 bg-vibrant-bg text-vibrant-gray rounded-xl font-black uppercase"
                                   >
                                     取消
                                   </button>
                                 </div>
                               </motion.div>
                             )}

                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                               {note.items?.map((item, idx) => (
                                 <motion.div 
                                   key={idx}
                                   initial={{ opacity: 0, y: 10 }}
                                   animate={{ opacity: 1, y: 0 }}
                                   className="bg-white p-6 rounded-2xl border-2 border-[#EBEBEB] shadow-sm relative group"
                                 >
                                   {item.structure && (
                                     <span className="inline-block px-2 py-0.5 bg-vibrant-green text-vibrant-ink rounded-full text-[9px] font-black uppercase tracking-widest mb-2 shadow-sm">
                                       {item.structure}
                                     </span>
                                   )}
                                   <div className="flex items-center gap-2 mb-3">
                                      <p className="font-bold text-vibrant-ink flex-1">{item.sentence}</p>
                                      <button 
                                        onClick={() => playAudio(item.sentence)}
                                        className="p-2 bg-vibrant-bg rounded-xl text-vibrant-gray hover:text-vibrant-ink transition-all"
                                      >
                                        <Volume2 className="w-4 h-4" />
                                      </button>
                                   </div>
                                   <p className="text-sm text-vibrant-gray leading-relaxed border-t pt-3 border-[#F1F2F6] mb-4">
                                      {item.explanation}
                                   </p>

                                   <div className="mb-4 space-y-2">
                                     <p className="text-[9px] font-black uppercase text-vibrant-gray/50 tracking-widest">個人學習備註</p>
                                      <textarea 
                                        placeholder="點擊此處新增或修改備註..."
                                        value={item.notes || ''}
                                        onChange={async (e) => {
                                          const newItems = [...(note.items || [])];
                                          newItems[idx] = { ...item, notes: e.target.value };
                                          await handleUpdateGrammar(note.id, { items: newItems });
                                        }}
                                        className="w-full p-3 bg-vibrant-bg rounded-xl border-none outline-none font-medium text-[11px] h-20 resize-none italic text-vibrant-ink"
                                      />
                                   </div>

                                   {item.exampleSentences && item.exampleSentences.length > 0 && (
                                     <div className="mb-4 bg-vibrant-bg p-3 rounded-xl space-y-2">
                                       <p className="text-[9px] font-black uppercase text-vibrant-gray/50 tracking-widest border-b pb-1">更多例句</p>
                                       {item.exampleSentences.map((ex, exIdx) => (
                                         <div key={exIdx} className="flex gap-2 group/ex">
                                           <div className="w-1.5 h-1.5 bg-vibrant-green rounded-full mt-1.5 shrink-0" />
                                           <p className="text-[11px] font-medium text-vibrant-ink italic flex-1">{ex}</p>
                                           <button 
                                             onClick={() => playAudio(ex)}
                                             className="opacity-0 group-hover/ex:opacity-100 transition-all text-vibrant-gray"
                                           >
                                             <Volume2 className="w-3 h-3" />
                                           </button>
                                         </div>
                                       ))}
                                     </div>
                                   )}

                                    <div className="flex flex-wrap gap-1 border-t pt-3 border-[#F1F2F6]">
                                      {item.sourceId && (
                                        <button 
                                          onClick={() => jumpToSource(item.sourceId, item.sourceType)}
                                          className="mr-2 flex items-center gap-1 px-3 py-1 bg-vibrant-blue/10 text-vibrant-blue rounded-lg text-[9px] font-black uppercase hover:bg-vibrant-blue hover:text-white transition-all shadow-sm mb-2"
                                        >
                                          <LinkIcon className="w-3 h-3" />
                                          追溯原文
                                        </button>
                                      )}
                                      <p className="w-full text-[9px] font-black uppercase text-vibrant-gray/50 mb-1">自訂標籤</p>
                                      {categories.filter(c => c.type === 'grammar').map(cat => (
                                        <button
                                          key={cat.id}
                                          onClick={async () => {
                                            const newItems = [...(note.items || [])];
                                            const itemCats = item.categoryIds || [];
                                            const updatedCats = itemCats.includes(cat.id)
                                              ? itemCats.filter(id => id !== cat.id)
                                              : [...itemCats, cat.id];
                                            
                                            newItems[idx] = { ...item, categoryIds: updatedCats };
                                            await handleUpdateGrammar(note.id, { items: newItems });
                                          }}
                                          className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase transition-all ${
                                            (item.categoryIds || []).includes(cat.id)
                                              ? 'bg-vibrant-ink text-vibrant-green'
                                              : 'bg-[#F1F2F6] text-vibrant-gray hover:bg-vibrant-green/20'
                                          }`}
                                        >
                                          {cat.name}
                                        </button>
                                      ))}
                                      <button 
                                        onClick={async () => {
                                          const newItems = (note.items || []).filter((_, i) => i !== idx);
                                          await handleUpdateGrammar(note.id, { items: newItems });
                                        }}
                                        className="ml-auto p-1.5 text-vibrant-gray hover:text-vibrant-red transition-colors"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                   </div>
                                 </motion.div>
                               ))}
                             </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black tracking-tight">
                  {selectedCategory === 'all' ? '最近學習' : categories.find(c => c.id === selectedCategory)?.name}
                </h2>
                <div className="flex gap-2 text-sm font-bold text-vibrant-gray">
                  <span>排序方式:</span>
                  <select className="bg-transparent text-vibrant-ink outline-none border-none p-0 cursor-pointer font-bold">
                    <option>最新</option>
                    <option>最舊</option>
                  </select>
                </div>
              </div>

              <AnimatePresence>
                {isAdding && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="mb-8 p-8 bg-vibrant-ink rounded-[32px] text-white shadow-2xl overflow-hidden relative"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-2xl font-black flex items-center gap-3">
                        <BrainCircuit className="text-vibrant-green" />
                        {addMode === 'ai' ? 'AI 智慧學習紀錄' : '手動新增單字'}
                      </h3>
                      <div className="flex bg-white/10 p-1 rounded-xl">
                        <button 
                          onClick={() => setAddMode('ai')}
                          className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${addMode === 'ai' ? 'bg-vibrant-green text-vibrant-ink' : 'text-white/60 hover:text-white'}`}
                        >
                          AI 分析
                        </button>
                        <button 
                          onClick={() => setAddMode('manual')}
                          className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${addMode === 'manual' ? 'bg-vibrant-green text-vibrant-ink' : 'text-white/60 hover:text-white'}`}
                        >
                          手動輸入
                        </button>
                      </div>
                    </div>

                    {addMode === 'ai' ? (
                      <form onSubmit={handleAddEntry} className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                          <label className="text-xs font-black uppercase tracking-widest text-white/40 mb-2 block">貼上 YouTube 網址或輸入多個單字</label>
                          <textarea 
                            autoFocus
                            rows={1}
                            placeholder="例如：貼上網址 或 輸入 apple, banana, cherry..."
                            value={newInput}
                            onChange={(e) => setNewInput(e.target.value)}
                            className="w-full bg-white/10 border-none rounded-2xl py-4 px-6 text-white placeholder:text-white/20 focus:ring-2 ring-vibrant-green transition-all text-lg font-bold resize-none overflow-hidden"
                          />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                          <button 
                            disabled={isAiLoading}
                            type="submit"
                            className="vibrant-btn-secondary h-[60px] flex-1 md:px-10"
                          >
                            {isAiLoading ? 'AI 分析中...' : '開始學習'}
                          </button>
                          <button 
                            type="button"
                            onClick={() => setIsAdding(false)}
                            className="bg-white/10 h-[60px] w-[60px] rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all"
                          >
                            <X className="w-6 h-6" />
                          </button>
                        </div>
                      </form>
                    ) : (
                      <form onSubmit={handleManualAdd} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-white/40 block">單字或句子</label>
                            <div className="flex gap-2">
                              <input 
                                autoFocus
                                value={manualForm.text}
                                onChange={e => setManualForm({...manualForm, text: e.target.value})}
                                className="flex-1 bg-white/10 border-none rounded-2xl py-4 px-6 text-white font-bold text-lg outline-none ring-vibrant-green focus:ring-2"
                                placeholder="輸入原文..."
                              />
                              <button 
                                type="button"
                                onClick={handleManualAiFill}
                                disabled={isAiLoading || !manualForm.text.trim()}
                                className="bg-vibrant-green text-vibrant-ink px-4 rounded-2xl flex items-center gap-2 text-xs font-black hover:brightness-110 disabled:opacity-50"
                              >
                                {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                AI 翻譯
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-white/40 block">中文意思</label>
                            <input 
                              value={manualForm.meaning}
                              onChange={e => setManualForm({...manualForm, meaning: e.target.value})}
                              className="w-full bg-white/10 border-none rounded-2xl py-4 px-6 text-white font-bold text-lg outline-none ring-vibrant-green focus:ring-2"
                              placeholder="輸入含義..."
                            />
                          </div>
                          <div className="space-y-2">
                             <label className="text-xs font-black uppercase tracking-widest text-white/40 block">學習備註 (自訂筆記)</label>
                             <textarea 
                               value={manualForm.notes}
                               onChange={e => setManualForm({...manualForm, notes: e.target.value})}
                               className="w-full bg-white/10 border-none rounded-2xl py-4 px-6 text-white font-bold text-sm outline-none ring-vibrant-green focus:ring-2 resize-none h-24"
                               placeholder="在此輸入您的學習重點..."
                             />
                           </div>
                        </div>
                        <div className="flex gap-4">
                          <button 
                            type="submit"
                            className="flex-1 bg-vibrant-green text-vibrant-ink py-4 rounded-2xl font-black text-lg shadow-xl hover:brightness-110 active:scale-95 transition-all"
                          >
                            儲存單字
                          </button>
                          <button 
                            type="button"
                            onClick={() => setIsAdding(false)}
                            className="bg-white/10 px-8 rounded-2xl text-white font-black hover:bg-white/20 transition-all"
                          >
                            取消
                          </button>
                        </div>
                      </form>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <AnimatePresence initial={false}>
              {vocabularies.length === 0 && !isAdding && (
                <div className="col-span-full py-20 text-center bg-white rounded-[32px] border-4 border-dashed border-[#DFE4EA]">
                   <p className="text-vibrant-gray font-black text-xl uppercase tracking-widest">展開您的單字之旅</p>
                   <button onClick={() => setIsAdding(true)} className="mt-4 text-vibrant-red font-black underline underline-offset-8">點此新增第一個單字</button>
                </div>
              )}
              {filteredVocab.map((v) => (
                <motion.div
                  key={v.id}
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="vibrant-card relative group flex flex-col"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${v.source === 'article' ? 'bg-vibrant-blue/10 text-vibrant-blue' : (v.youtubeId ? 'bg-vibrant-red/10 text-vibrant-red' : 'bg-vibrant-blue/10 text-vibrant-blue')}`}>
                        {v.source === 'article' ? <BookOpen className="w-5 h-5" /> : (v.youtubeId ? <Youtube className="w-5 h-5" /> : <FileText className="w-5 h-5" />)}
                      </div>
                      <div>
                        <h3 className="font-black text-xl text-vibrant-ink leading-tight">{v.title}</h3>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-vibrant-gray font-black uppercase tracking-widest">
                            {v.source === 'article' ? '文章重點標註' : (v.youtubeId ? '影片學習筆記' : '一般單字筆記')}
                          </p>
                          {((v.source === 'article' && (v as any).realId) || ((v as any).sourceType === 'article' && (v as any).sourceId)) && (
                            <button 
                              onClick={() => jumpToSource((v as any).realId || (v as any).sourceId, 'article')}
                              className="flex items-center gap-1 text-[9px] font-black text-vibrant-blue hover:underline uppercase"
                            >
                              <LinkIcon className="w-2.5 h-2.5" />
                              追溯原文
                            </button>
                          )}
                          {(((v as any).sourceType === 'video' && (v as any).sourceId)) && (
                            <button 
                              onClick={() => jumpToSource((v as any).sourceId, 'video')}
                              className="flex items-center gap-1 text-[9px] font-black text-vibrant-red hover:underline uppercase"
                            >
                              <Youtube className="w-2.5 h-2.5" />
                              觀看影片
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                      <div className="flex gap-2 shrink-0">
                        <button 
                          onClick={() => {
                            const newNotes = window.prompt("更新學習備註:", (v as any).notes || "");
                            if (newNotes !== null) {
                              updateDoc(doc(db, 'users', user?.uid!, 'vocabularies', v.id), { notes: newNotes, updatedAt: serverTimestamp() });
                            }
                          }}
                          className="p-3 text-vibrant-gray hover:text-vibrant-blue hover:bg-vibrant-blue/10 rounded-2xl transition-all relative z-[999] cursor-pointer pointer-events-auto hover:scale-125 active:scale-90"
                          title="修改學習備註"
                        >
                          <PenTool className="w-5 h-5" />
                        </button>
                        <button 
                          type="button"
                          onClick={async (e) => {
                            if (v.source === 'article') {
                              // Delete specific item from article - more robust by checking content match if needed
                              const article = articles.find(a => a.id === v.realId);
                              if (!article) return;
                              
                              // Verify the item at this index matches what we're looking at to avoid accidental deletion
                              const targetItem = article.items[v.itemIndex];
                              if (targetItem && targetItem.text === v.title) {
                                const newItems = (article.items || []).filter((_, i) => i !== v.itemIndex);
                                await updateDoc(doc(db, 'users', user?.uid!, 'articles', v.realId), {
                                  items: newItems,
                                  updatedAt: serverTimestamp()
                                });
                              }
                            } else {
                              handleDeleteVocab(e, v.id);
                            }
                          }}
                          className="p-3 text-vibrant-gray hover:text-vibrant-red hover:bg-vibrant-red/10 rounded-2xl transition-all relative z-[999] cursor-pointer pointer-events-auto hover:scale-125 active:scale-90"
                          title={v.source === 'article' ? "移除此標註" : "直接刪除筆記"}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                  </div>

                  {v.youtubeId && (
                    <div className="aspect-video rounded-2xl overflow-hidden mb-6 bg-black shadow-lg relative">
                      <iframe 
                        className="absolute inset-0 w-full h-full"
                        src={`https://www.youtube.com/embed/${v.youtubeId}?rel=0&modestbranding=1&origin=${window.location.origin}`}
                        title="YouTube player"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                  )}

                  {(v as any).notes && (
                    <div className="mb-6 bg-vibrant-blue/5 p-4 rounded-2xl border border-vibrant-blue/10">
                      <p className="text-[10px] font-black text-vibrant-blue uppercase tracking-widest mb-1 opacity-50">總體備註</p>
                      <p className="text-sm text-vibrant-ink font-medium italic">{(v as any).notes}</p>
                    </div>
                  )}

                  <div className="flex-1 space-y-4">
                    {(v.items || []).map((item, idx) => (
                      editingItemInfo?.vocabId === v.id && editingItemInfo?.itemIdx === idx ? (
                        <motion.div 
                          key={idx}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-vibrant-ink p-6 rounded-2xl space-y-4 border-2 border-vibrant-yellow shadow-xl"
                        >
                          <div className="flex justify-between items-center mb-2">
                             <p className="text-vibrant-yellow font-black text-xs uppercase tracking-widest">編輯單字項目</p>
                             <button onClick={() => setEditingItemInfo(null)} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
                          </div>
                          <div className="flex gap-2">
                            <input 
                              autoFocus
                              placeholder="單字或片語..."
                              value={newItemForm.text}
                              onChange={e => setNewItemForm({...newItemForm, text: e.target.value})}
                              className="flex-1 bg-white/10 border-2 border-white/20 rounded-xl py-2 px-3 text-sm font-bold text-white outline-none focus:border-vibrant-yellow"
                            />
                            <button 
                              type="button"
                              onClick={handleAddItemAiFill}
                              disabled={isItemAiLoading}
                              className="bg-vibrant-yellow text-vibrant-ink px-3 rounded-xl flex items-center gap-2 text-xs font-black hover:bg-[#FFD93D]"
                            >
                              {isItemAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                              AI 更新
                            </button>
                          </div>
                          <input 
                            placeholder="中文意思..."
                            value={newItemForm.meaning}
                            onChange={e => setNewItemForm({...newItemForm, meaning: e.target.value})}
                            className="w-full bg-white/10 border-2 border-white/20 rounded-xl py-2 px-3 text-sm font-bold text-white outline-none focus:border-vibrant-yellow"
                          />
                          <textarea 
                            placeholder="例句 (一行一句)..."
                            value={newItemForm.exampleSentences}
                            onChange={e => setNewItemForm({...newItemForm, exampleSentences: e.target.value})}
                            className="w-full bg-white/10 border-2 border-white/20 rounded-xl py-2 px-3 text-xs font-bold text-white outline-none focus:border-vibrant-yellow h-24"
                          />
                          <div className="space-y-1">
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest pl-1">分類標籤</p>
                            <div className="flex flex-wrap gap-2 p-2 bg-white/5 rounded-xl border border-white/10">
                              {categories.map(cat => (
                                <button 
                                  key={cat.id}
                                  type="button"
                                  onClick={() => {
                                    const exists = newItemForm.categoryIds.includes(cat.id);
                                    setNewItemForm({
                                      ...newItemForm,
                                      categoryIds: exists 
                                        ? newItemForm.categoryIds.filter(id => id !== cat.id)
                                        : [...newItemForm.categoryIds, cat.id]
                                    });
                                  }}
                                  className={`px-3 py-1 rounded-full text-[10px] font-black transition-all ${newItemForm.categoryIds.includes(cat.id) ? 'bg-vibrant-yellow text-vibrant-ink' : 'bg-white/10 text-white/40 hover:bg-white/20'}`}
                                >
                                  {cat.name}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <p className="text-[9px] font-black text-vibrant-green uppercase tracking-widest pl-1">同義詞</p>
                              <input 
                                placeholder="用逗號隔開"
                                value={newItemForm.synonyms}
                                onChange={e => setNewItemForm({...newItemForm, synonyms: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-2 text-[10px] font-bold text-white outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <p className="text-[9px] font-black text-vibrant-red uppercase tracking-widest pl-1">反義詞</p>
                              <input 
                                placeholder="用逗號隔開"
                                value={newItemForm.antonyms}
                                onChange={e => setNewItemForm({...newItemForm, antonyms: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-2 text-[10px] font-bold text-white outline-none"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest pl-1">學習備註 (自訂筆記)</p>
                            <textarea 
                              placeholder="在此輸入您的學習重點或備註..."
                              value={newItemForm.notes}
                              onChange={e => setNewItemForm({...newItemForm, notes: e.target.value})}
                              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs font-bold text-white outline-none focus:border-vibrant-yellow h-20 resize-none"
                            />
                          </div>
                          <button 
                            onClick={handleEditItemSave}
                            className="w-full bg-vibrant-green text-vibrant-ink py-3 rounded-xl text-sm font-black uppercase shadow-lg hover:brightness-110 transition-all"
                          >
                            儲存變更
                          </button>
                        </motion.div>
                      ) : (
                        <div key={idx} className="bg-vibrant-bg p-4 rounded-2xl border-l-4 border-vibrant-ink hover:border-vibrant-red transition-all group/item relative">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-black text-xl text-vibrant-ink group-hover/item:text-vibrant-red transition-colors">{item.text}</h4>
                            <div className="flex gap-1">
                              <button 
                                onClick={() => playAudio(item.text)}
                                className="p-2 hover:bg-white rounded-lg transition-all text-vibrant-gray hover:text-vibrant-ink"
                              >
                                <Volume2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => startEditingItem(v.id, item, idx)}
                                className="p-2 opacity-0 group-hover/item:opacity-100 hover:bg-white rounded-lg transition-all text-vibrant-gray hover:text-vibrant-blue"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button 
                                type="button"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  try {
                                    if (v.source === 'article') {
                                      // Find the original article and remove this item
                                      const article = articles.find(a => a.id === v.realId);
                                      if (!article) return;
                                      const newItems = (article.items || []).filter(it => it.text !== item.text || it.meaning !== item.meaning);
                                      await updateDoc(doc(db, 'users', user?.uid!, 'articles', v.realId), {
                                        items: newItems,
                                        updatedAt: serverTimestamp()
                                      });
                                    } else {
                                      const newItems = (v.items || []).filter((_, i) => i !== idx);
                                      await updateDoc(doc(db, 'users', user?.uid!, 'vocabularies', v.id), {
                                        items: newItems,
                                        updatedAt: serverTimestamp()
                                      });
                                    }
                                  } catch (err) {
                                    console.error("Delete item error:", err);
                                  }
                                }}
                                className="p-2 opacity-0 group-hover/item:opacity-100 hover:bg-white rounded-lg transition-all text-vibrant-gray hover:text-vibrant-red relative z-30 cursor-pointer pointer-events-auto"
                                title="直接刪除單字"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <p className="text-vibrant-ink font-bold text-base mb-3">{item.meaning}</p>
                          
                          {item.notes && (
                            <div className="mb-4 bg-vibrant-yellow/10 p-3 rounded-xl border border-vibrant-yellow/20">
                              <p className="text-[10px] font-black text-vibrant-yellow/80 uppercase tracking-widest mb-1">備註</p>
                              <p className="text-xs text-vibrant-ink font-medium leading-relaxed italic">{item.notes}</p>
                            </div>
                          )}
                          
                          {(item.exampleSentences && item.exampleSentences.length > 0) && (
                            <div className="mt-3 space-y-1 mb-3">
                              <p className="text-[10px] font-black text-vibrant-gray uppercase tracking-widest opacity-50">例句</p>
                              {item.exampleSentences.map((s, i) => (
                                <div key={i} className="flex items-start gap-2 group/sent">
                                  <p className="text-xs text-vibrant-gray italic flex-1">
                                    <span className="text-vibrant-red">"</span> {s}
                                  </p>
                                  <button 
                                    onClick={() => isSpeaking ? stopAudio() : playAudio(s)}
                                    className={`p-1 transition-all ${isSpeaking ? 'text-vibrant-red animate-pulse' : 'text-vibrant-gray hover:text-vibrant-ink'}`}
                                  >
                                    {isSpeaking ? <X className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <div className="flex flex-wrap gap-4 mt-3 pb-3">
                            {item.sourceId && (
                              <button 
                                onClick={() => jumpToSource(item.sourceId, item.sourceType)}
                                className="flex items-center gap-1.5 px-3 py-1 bg-vibrant-blue/10 text-vibrant-blue rounded-lg text-[10px] font-black uppercase hover:bg-vibrant-blue hover:text-white transition-all shadow-sm"
                              >
                                <LinkIcon className="w-3 h-3" />
                                追溯原文
                              </button>
                            )}
                            {(item.synonyms && item.synonyms.length > 0) && (
                              <div className="flex-1">
                                <p className="text-[10px] font-black text-vibrant-green uppercase tracking-widest opacity-50 mb-1">同義詞</p>
                                <div className="flex flex-wrap gap-2">
                                  {item.synonyms.map((s, i) => (
                                    <button key={i} onClick={() => playAudio(s)} className="text-xs font-bold text-vibrant-ink hover:text-vibrant-green transition-colors flex items-center gap-1 group/s">
                                      {s}{i < item.synonyms!.length - 1 && ','}
                                      <Volume2 className="w-2.5 h-2.5 opacity-0 group-hover/s:opacity-100 dark:invert" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {(item.antonyms && item.antonyms.length > 0) && (
                              <div className="flex-1">
                                <p className="text-[10px] font-black text-vibrant-red uppercase tracking-widest opacity-50 mb-1">反義詞</p>
                                <div className="flex flex-wrap gap-2">
                                  {item.antonyms.map((a, i) => (
                                    <button key={i} onClick={() => playAudio(a)} className="text-xs font-bold text-vibrant-ink hover:text-vibrant-red transition-colors flex items-center gap-1 group/a">
                                      {a}{i < item.antonyms!.length - 1 && ','}
                                      <Volume2 className="w-2.5 h-2.5 opacity-0 group-hover/a:opacity-100 dark:invert" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Editable Classification below synonyms/antonyms */}
                          <div className="flex flex-wrap gap-1 mt-1 pt-3 border-t border-black/5">
                            {(item.categoryIds || []).map(catId => {
                               const cat = categories.find(c => c.id === catId);
                               if (!cat) return null;
                               return (
                                 <button 
                                   key={catId}
                                   onClick={async () => {
                                     const newCats = (item.categoryIds || []).filter(id => id !== catId);
                                     if (v.source === 'article') {
                                       const article = articles.find(a => a.id === v.realId);
                                       if (!article) return;
                                       const newItems = [...article.items];
                                       newItems[v.itemIndex] = { ...item, categoryIds: newCats };
                                       await updateDoc(doc(db, 'users', user?.uid!, 'articles', v.realId), {
                                         items: newItems,
                                         updatedAt: serverTimestamp()
                                       });
                                     } else {
                                       const newItems = [...(v.items || [])];
                                       newItems[idx] = { ...item, categoryIds: newCats };
                                       await updateDoc(doc(db, 'users', user?.uid!, 'vocabularies', v.id), {
                                         items: newItems,
                                         updatedAt: serverTimestamp()
                                       });
                                     }
                                   }}
                                   className="px-2 py-0.5 bg-vibrant-yellow text-vibrant-ink rounded-full text-[8px] font-black uppercase flex items-center gap-1 hover:bg-vibrant-red hover:text-white transition-all shadow-sm"
                                 >
                                   <Check className="w-2 h-2" />
                                   {cat.name}
                                 </button>
                               );
                            })}
                            
                            <div className="relative group/tagpick">
                              <button className="px-2.5 py-1 bg-vibrant-bg border-2 border-[#DFE4EA] text-vibrant-gray rounded-full text-[8px] font-black hover:border-vibrant-red hover:text-vibrant-red hover:shadow-sm transition-all flex items-center gap-1 uppercase tracking-widest">
                                <Plus className="w-2 h-2" />
                                分類此單字
                              </button>
                              <div className="absolute left-0 bottom-full z-[100] hidden group-hover/tagpick:block pb-2 pt-8">
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                                  className="bg-white border-2 border-[#EBEBEB] rounded-2xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.3)] p-2 min-w-[160px] max-h-[220px] overflow-y-auto"
                                >
                                  <p className="text-[9px] font-black text-vibrant-gray uppercase tracking-widest mb-2 px-2 border-b pb-1 opacity-50">標籤至...</p>
                                  {categories.filter(c => !(item.categoryIds || []).includes(c.id)).map(cat => (
                                    <button
                                      key={cat.id}
                                      onClick={async () => {
                                        const newCats = [...(item.categoryIds || []), cat.id];
                                        if (v.source === 'article') {
                                          const article = articles.find(a => a.id === v.realId);
                                          if (!article) return;
                                          const newItems = [...article.items];
                                          newItems[v.itemIndex] = { ...item, categoryIds: newCats };
                                          await updateDoc(doc(db, 'users', user?.uid!, 'articles', v.realId), {
                                            items: newItems,
                                            updatedAt: serverTimestamp()
                                          });
                                        } else {
                                          const newItems = [...(v.items || [])];
                                          newItems[idx] = { ...item, categoryIds: newCats };
                                          await updateDoc(doc(db, 'users', user?.uid!, 'vocabularies', v.id), {
                                            items: newItems,
                                            updatedAt: serverTimestamp()
                                          });
                                        }
                                      }}
                                      className="w-full text-left px-3 py-2 text-[10px] font-bold text-vibrant-ink hover:bg-vibrant-yellow/30 rounded-xl transition-all"
                                    >
                                      {cat.name}
                                    </button>
                                  ))}
                                  {categories.length === 0 && <p className="text-[8px] text-vibrant-gray p-3 italic">請先建立分類</p>}
                                </motion.div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    ))}
                    
                    {addingItemToId === v.id ? (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-[#F1F2F6] p-4 rounded-2xl space-y-3"
                      >
                        <div className="flex gap-2">
                          <input 
                            autoFocus
                            placeholder="單字或片語..."
                            value={newItemForm.text}
                            onChange={e => setNewItemForm({...newItemForm, text: e.target.value})}
                            className="flex-1 bg-white border-2 border-[#DFE4EA] rounded-xl py-2 px-3 text-sm font-bold focus:border-vibrant-blue outline-none"
                          />
                          <button 
                            type="button"
                            onClick={handleAddItemAiFill}
                            disabled={isItemAiLoading || !newItemForm.text.trim()}
                            className="bg-vibrant-ink text-vibrant-green px-4 rounded-xl flex items-center gap-2 text-xs font-black hover:bg-black transition-all disabled:opacity-50"
                          >
                            {isItemAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            AI 填寫
                          </button>
                        </div>
                        <input 
                          placeholder="中文意思..."
                          value={newItemForm.meaning}
                          onChange={e => setNewItemForm({...newItemForm, meaning: e.target.value})}
                          className="w-full bg-white border-2 border-[#DFE4EA] rounded-xl py-2 px-3 text-sm font-bold focus:border-vibrant-blue outline-none"
                        />
                        <textarea 
                          placeholder="例句 (一行一句)..."
                          value={newItemForm.exampleSentences}
                          onChange={e => setNewItemForm({...newItemForm, exampleSentences: e.target.value})}
                          className="w-full bg-white border-2 border-[#DFE4EA] rounded-xl py-2 px-3 text-xs font-bold focus:border-vibrant-blue outline-none h-20"
                        />
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-vibrant-gray uppercase tracking-widest pl-1">分類標籤</p>
                          <div className="flex flex-wrap gap-2 p-2 bg-white rounded-xl border border-[#DFE4EA]">
                            {categories.map(cat => (
                              <button 
                                key={cat.id}
                                type="button"
                                onClick={() => {
                                  const exists = newItemForm.categoryIds.includes(cat.id);
                                  setNewItemForm({
                                    ...newItemForm,
                                    categoryIds: exists 
                                      ? newItemForm.categoryIds.filter(id => id !== cat.id)
                                      : [...newItemForm.categoryIds, cat.id]
                                  });
                                }}
                                className={`px-3 py-1 rounded-full text-[10px] font-black transition-all ${newItemForm.categoryIds.includes(cat.id) ? 'bg-vibrant-yellow text-vibrant-ink' : 'bg-[#F1F2F6] text-vibrant-gray hover:bg-[#EBEBEB]'}`}
                              >
                                {cat.name}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input 
                            placeholder="同義詞 (用逗號隔開)"
                            value={newItemForm.synonyms}
                            onChange={e => setNewItemForm({...newItemForm, synonyms: e.target.value})}
                            className="w-full bg-white border-2 border-[#DFE4EA] rounded-xl py-2 px-2 text-[10px] font-bold outline-none"
                          />
                          <input 
                            placeholder="反義詞 (用逗號隔開)"
                            value={newItemForm.antonyms}
                            onChange={e => setNewItemForm({...newItemForm, antonyms: e.target.value})}
                            className="w-full bg-white border-2 border-[#DFE4EA] rounded-xl py-2 px-2 text-[10px] font-bold outline-none"
                          />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button 
                            onClick={() => handleAddItem(v.id, v.items)}
                            className="flex-1 bg-vibrant-blue text-white py-2 rounded-xl text-xs font-black uppercase"
                          >
                            確認新增
                          </button>
                          <button 
                            onClick={() => setAddingItemToId(null)}
                            className="px-4 bg-white text-vibrant-gray rounded-xl text-xs font-black"
                          >
                            取消
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <button 
                        onClick={() => setAddingItemToId(v.id)}
                        className="w-full py-3 border-2 border-dashed border-[#CED6E0] rounded-2xl text-vibrant-gray font-bold text-xs hover:border-vibrant-ink hover:text-vibrant-ink transition-all"
                      >
                        + 新增單字項目到此筆記
                      </button>
                    )}
                  </div>

                  <div className="mt-8 pt-6 border-t border-[#EBEBEB] flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] font-black text-vibrant-gray uppercase tracking-widest pl-1 opacity-50">歸類至單字本</p>
                      <div className="flex flex-wrap gap-1.5">
                        {categories.map(c => (
                          <button 
                            key={c.id} 
                            onClick={() => toggleCategoryOnVocab(v, c.id)}
                            className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border-2 ${
                              (v.categoryIds || []).includes(c.id) 
                                ? 'bg-vibrant-yellow border-vibrant-yellow text-vibrant-ink' 
                                : 'bg-transparent border-[#EBEBEB] text-vibrant-gray hover:border-vibrant-yellow hover:text-vibrant-ink'
                            }`}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-vibrant-gray uppercase tracking-widest pl-1">學習進度</p>
                      <span className="text-[9px] font-bold text-vibrant-gray/50 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        建立於 {v.createdAt?.toDate ? v.createdAt.toDate().toLocaleDateString() : '處理中...'}
                      </span>
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <div 
                            key={i} 
                            onClick={async () => {
                              await updateDoc(doc(db, 'users', user?.uid!, 'vocabularies', v.id), {
                                masteryLevel: i + 1,
                                updatedAt: serverTimestamp()
                              });
                            }}
                            className={`w-3 h-3 rounded-full cursor-pointer transition-all ${i < v.masteryLevel ? 'bg-vibrant-red' : 'bg-vibrant-gray opacity-20 hover:opacity-50'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}
    </section>
  </main>
      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl p-8 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-vibrant-blue/5 rounded-full -mr-16 -mt-16" />
              
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-vibrant-blue/10 rounded-2xl text-vibrant-blue">
                    <UserIcon className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-black text-vibrant-ink">個人設定</h2>
                </div>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-2 hover:bg-vibrant-bg rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-vibrant-gray" />
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-vibrant-gray ml-2">主要信箱 (不可修改)</label>
                  <div className="bg-vibrant-bg p-4 rounded-2xl text-vibrant-ink font-bold opacity-60">
                    {user?.email}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-vibrant-gray ml-2">備用/救援信箱</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 w-5 h-5 text-vibrant-gray" />
                    <input 
                      type="email" 
                      placeholder="recovery@example.com"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      className="w-full bg-vibrant-bg border-none rounded-2xl py-3.5 pl-12 pr-4 focus:ring-4 ring-vibrant-blue/10 font-bold text-vibrant-ink transition-all"
                    />
                  </div>
                  <p className="text-[10px] text-vibrant-gray font-medium ml-2">作為帳號救援或通知使用的備用信箱。</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-vibrant-gray ml-2">系統診斷</label>
                  <button 
                    type="button"
                    onClick={handleDiagnostics}
                    className="w-full bg-vibrant-bg border-2 border-[#EBEBEB] text-vibrant-ink font-bold py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-[#F1F2F6] transition-all"
                  >
                    <Activity className="w-4 h-4 text-vibrant-blue" />
                    執行 AI API 診斷測試
                  </button>
                  <p className="text-[10px] text-vibrant-gray font-medium ml-2">測試您的 Gemini API Key 是否能在此環境正常運行。</p>
                </div>

                <button 
                  disabled={isSavingSettings}
                  type="submit"
                  className="w-full bg-vibrant-ink text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-lg disabled:opacity-50"
                >
                  {isSavingSettings ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 text-vibrant-green" />}
                  {isSavingSettings ? '儲存中...' : '儲存設定'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
