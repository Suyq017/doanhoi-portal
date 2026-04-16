export interface ConversationSession {
  /** Unique session identifier */
  sessionId: string;
  
  /** User ID associated with session */
  userId: string;
  
  /** Conversation messages */
  messages: ConversationMessage[];
  
  /** Session metadata */
  metadata: SessionMetadata;
  
  /** Session context for personalization */
  context: SessionContext;
}

export interface ConversationMessage {
  /** Message role */
  role: 'user' | 'assistant' | 'system';
  
  /** Message content */
  content: string;
  
  /** Message timestamp */
  timestamp: Date;
  
  /** Optional message metadata */
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  /** Source document IDs used for this message */
  sources?: string[];
  
  /** Message type */
  type?: 'summary' | 'query' | 'response';
  
  /** Processing time in milliseconds */
  processingTime?: number;
  
  /** Model used for generation */
  model?: string;
}

export interface SessionMetadata {
  /** Session start time */
  startTime: Date;
  
  /** Last activity timestamp */
  lastActive: Date;
  
  /** Number of user turns */
  turnCount: number;
  
  /** Estimated total tokens used */
  totalTokens: number;
}

export interface SessionContext {
  /** Recently discussed topics */
  recentTopics: string[];

  /** User preferences and settings */
  userPreferences: Record<string, any>;

  /** Last mentioned activity — used by REGISTER_ACTIVITY intent to recall which activity the user refers to */
  lastMentionedActivity?: {
    activityId: string | number;
    activityName: string;
    isRecruiting: boolean;
  };
}
