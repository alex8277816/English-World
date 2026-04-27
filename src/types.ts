export interface Category {
  id: string;
  name: string;
  userId: string;
  createdAt: any;
  parentId?: string;
  type?: 'vocab' | 'article' | 'grammar';
}

export interface VocabularyItem {
  text: string;
  meaning: string;
  exampleSentences?: string[];
  synonyms?: string[];
  antonyms?: string[];
  playAudio?: boolean;
  categoryIds?: string[];
  notes?: string;
  sourceId?: string;
  sourceType?: 'article' | 'video';
}

export interface Vocabulary {
  id: string;
  title?: string;
  items: VocabularyItem[];
  youtubeId: string;
  userId: string;
  categoryIds: string[];
  masteryLevel: number; // Aggregate or primary
  notes?: string;
  sourceId?: string;
  sourceType?: 'article' | 'video';
  createdAt: any;
  updatedAt: any;
}

export interface Article {
  id: string;
  title: string;
  content: string;
  userId: string;
  categoryIds?: string[];
  items: VocabularyItem[]; // Extracted words/phrases
  notes?: string;
  createdAt: any;
  updatedAt: any;
}

export interface GrammarItem {
  sentence: string;
  explanation: string;
  structure?: string;
  categoryIds?: string[];
  exampleSentences?: string[];
  notes?: string;
  sourceId?: string;
  sourceType?: 'article' | 'video';
}

export interface GrammarNote {
  id: string;
  title: string;
  content: string;
  analysis: string;
  items: GrammarItem[];
  userId: string;
  categoryIds?: string[];
  notes?: string;
  sourceId?: string;
  sourceType?: 'article' | 'video';
  createdAt: any;
  updatedAt: any;
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: any;
}
