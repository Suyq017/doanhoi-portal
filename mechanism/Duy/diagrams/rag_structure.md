Optimizing tool selection...Dưới đây là sơ đồ kiến trúc chatbot RAG của hệ thống:

```mermaid
graph TB
    subgraph "Data Ingestion Pipeline (Phase 1)"
        A1[CTXH Activities Database] -->|Query| A2[Data Preparation Service]
        A2 -->|Format & Sanitize| A3[Chunking Service]
        A3 -->|Split into chunks| A4[Embedding Service]
        A4 -->|text-embedding-3-small| A5[OpenAI API]
        A5 -->|1536-dim vectors| A6[Redis Cache]
        A6 -->|Cache embeddings| A7[Vector Store Service]
        A7 -->|Store| A8[(PostgreSQL + pgVector)]
        
        style A1 fill:#e1f5ff
        style A5 fill:#fff4e1
        style A8 fill:#e8f5e9
    end

    subgraph "RAG Query Pipeline (Phase 2)"
        B1[User Query] -->|Text input| B2[Embedding Service]
        B2 -->|Generate query embedding| B3[Vector Store Service]
        B3 -->|Similarity search<br/>HNSW index| B4[Top-K relevant chunks]
        B4 -->|Context| B5[Prompt Constructor]
        B5 -->|Augmented prompt| B6[LLM Service<br/>GPT-4]
        B6 -->|Generate| B7[Response]
        B7 -->|Return| B8[User]
        
        style B1 fill:#f3e5f5
        style B6 fill:#fff4e1
        style B7 fill:#e8f5e9
    end

    subgraph "Auto-Update Mechanism"
        C1[Activity CRUD Operations] -->|TypeORM Events| C2[Activity Subscriber]
        C2 -->|Trigger re-embedding| A4
        
        style C2 fill:#ffebee
    end

    A8 -.->|Retrieve vectors| B3
    A6 -.->|Cache hit| B2

    classDef userNode fill:#f3e5f5,stroke:#9c27b0,stroke-width:2px
    classDef aiNode fill:#fff4e1,stroke:#ff9800,stroke-width:2px
    classDef dbNode fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
    
    class B1,B8 userNode
    class A5,B6 aiNode
    class A8 dbNode
```

```mermaid
sequenceDiagram
    participant U as User
    participant API as Chat Controller
    participant E as Embedding Service
    participant R as Redis Cache
    participant V as Vector Store
    participant P as Prompt Builder
    participant L as LLM (GPT-4)
    
    U->>API: POST /chat (query: "Hoạt động CTXH nào?")
    
    rect rgb(240, 248, 255)
        Note over API,R: Phase 1: Query Embedding
        API->>E: Generate embedding(query)
        E->>R: Check cache
        alt Cache Hit
            R-->>E: Return cached embedding
        else Cache Miss
            E->>OpenAI: Generate embedding
            OpenAI-->>E: Vector [1536 dims]
            E->>R: Store in cache (30 days TTL)
        end
        E-->>API: Query embedding vector
    end
    
    rect rgb(240, 255, 240)
        Note over API,V: Phase 2: Similarity Search
        API->>V: Find similar chunks(vector, k=5)
        V->>PostgreSQL: SELECT * ORDER BY embedding <=> query_vector LIMIT 5
        PostgreSQL-->>V: Top 5 relevant chunks
        V-->>API: Relevant context chunks
    end
    
    rect rgb(255, 250, 240)
        Note over API,L: Phase 3: Response Generation
        API->>P: Build prompt(query, context)
        P-->>API: Augmented prompt
        API->>L: Generate response(prompt)
        L-->>API: AI Response
    end
    
    API-->>U: Return response with metadata
    
    Note over U,L: Total latency: 500-2000ms
```

```mermaid
flowchart LR
    subgraph Input["📥 Input Layer"]
        Q[User Query]
    end
    
    subgraph Retrieval["🔍 Retrieval Layer"]
        E1[Embedding<br/>Generation]
        VS[Vector<br/>Similarity Search]
        RC[Redis Cache<br/>30 days TTL]
        
        E1 --> RC
        RC --> VS
    end
    
    subgraph Context["📚 Context Layer"]
        PG[(PostgreSQL<br/>pgVector)]
        TOP[Top-K<br/>Chunks<br/>k=5]
        
        PG --> TOP
    end
    
    subgraph Generation["🤖 Generation Layer"]
        PR[Prompt<br/>Construction]
        LLM[GPT-4<br/>LLM]
        FMT[Response<br/>Formatting]
        
        PR --> LLM --> FMT
    end
    
    subgraph Output["📤 Output Layer"]
        RESP[Response +<br/>Metadata]
    end
    
    Q --> E1
    VS --> PG
    TOP --> PR
    FMT --> RESP
    
    style Q fill:#e1bee7
    style E1 fill:#fff9c4
    style VS fill:#b2dfdb
    style PG fill:#c8e6c9
    style LLM fill:#ffccbc
    style RESP fill:#bbdefb
```

**Giải thích các thành phần:**

1. **Data Ingestion Pipeline (Phase 1)**: 
   - Xử lý dữ liệu CTXH → Chunking → Embedding → Vector Store

2. **RAG Query Pipeline (Phase 2)**:
   - Query → Embedding → Similarity Search → Context Retrieval → LLM → Response

3. **Auto-Update Mechanism**:
   - TypeORM Subscriber tự động cập nhật embeddings khi dữ liệu thay đổi

4. **Caching Layer**:
   - Redis cache embeddings để tăng tốc độ truy vấn